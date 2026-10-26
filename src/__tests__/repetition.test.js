import { DateTime } from 'luxon';
import { nextRepeatDate, repetitionToUnits, REPEAT_DAILY, REPEAT_WEEKLY, REPEAT_ANNUALLY, REPEAT_HOURLY } from '../repetition';

// moment's diff() truncated to whole units, and these assertions were written against that
const wholeUnitsUntil = (date, unit) => Math.trunc(date.diff(DateTime.now(), unit).get(unit));

describe('repetitionToUnits', () => {
  test('maps REPEAT_DAILY to "days"', () => {
    expect(repetitionToUnits(REPEAT_DAILY)).toBe('days');
  });
  test('maps REPEAT_WEEKLY to "weeks"', () => {
    expect(repetitionToUnits(REPEAT_WEEKLY)).toBe('weeks');
  });
  test('maps REPEAT_ANNUALLY to "years"', () => {
    expect(repetitionToUnits(REPEAT_ANNUALLY)).toBe('years');
  });
  test('maps REPEAT_HOURLY to "hours"', () => {
    expect(repetitionToUnits(REPEAT_HOURLY)).toBe('hours');
  });
  test('returns undefined for unknown repetition', () => {
    expect(repetitionToUnits('repeat-monthly')).toBeUndefined();
  });
});

describe('nextRepeatDate', () => {
  // A fixed clock keeps these tests from depending on when they run (DST changes, month ends)
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-01T00:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('returns the start date unchanged when it is in the future', () => {
    const future = DateTime.now().plus({ days: 3 });
    const result = nextRepeatDate(future, 1, 'weeks');
    expect(result.equals(future)).toBe(true);
  });

  test('returns the next weekly occurrence for a past start date', () => {
    // Start 15 days ago, repeating weekly → next occurrence is in the future
    const start = DateTime.now().minus({ days: 15 });
    const result = nextRepeatDate(start, 1, 'weeks');
    expect(result > DateTime.now()).toBe(true);
  });

  test('next occurrence is at most one period away for period=1', () => {
    const start = DateTime.now().minus({ days: 20 });
    const result = nextRepeatDate(start, 1, 'weeks');
    // Should be within 1 week from now
    expect(wholeUnitsUntil(result, 'days')).toBeLessThanOrEqual(7);
  });

  test('handles period > 1 correctly (every 2 weeks)', () => {
    const start = DateTime.now().minus({ days: 10 });
    const result = nextRepeatDate(start, 2, 'weeks');
    expect(result > DateTime.now()).toBe(true);
    // Should be within 2 weeks from now
    expect(wholeUnitsUntil(result, 'days')).toBeLessThanOrEqual(14);
  });

  test('handles annual repetition', () => {
    const start = DateTime.now().minus({ years: 3 });
    const result = nextRepeatDate(start, 1, 'years');
    expect(result > DateTime.now()).toBe(true);
    // Next occurrence within 1 year
    expect(wholeUnitsUntil(result, 'days')).toBeLessThanOrEqual(366);
  });

  test('handles daily repetition', () => {
    const start = DateTime.now().minus({ days: 5 });
    const result = nextRepeatDate(start, 1, 'days');
    expect(result > DateTime.now()).toBe(true);
    expect(wholeUnitsUntil(result, 'hours')).toBeLessThanOrEqual(24);
  });

  test('handles hourly repetition', () => {
    const start = DateTime.now().minus({ hours: 5 });
    const result = nextRepeatDate(start, 1, 'hours');
    expect(result > DateTime.now()).toBe(true);
    expect(wholeUnitsUntil(result, 'minutes')).toBeLessThanOrEqual(60);
  });

  test('result is always after now for a past start date', () => {
    const start = DateTime.now().minus({ days: 100 });
    const result = nextRepeatDate(start, 7, 'days');
    expect(result > DateTime.now()).toBe(true);
  });

  describe('daylight saving and calendar edges', () => {
    test('weekly repeats keep the local wall-clock time across a DST start (Sydney, 4 Oct 2026)', () => {
      // Thursday 24 Sep 2026, 9:00 am AEST (UTC+10). The 1 Oct occurrence has already passed.
      const start = DateTime.fromISO('2026-09-24T09:00', { zone: 'Australia/Sydney' });
      const result = nextRepeatDate(start, 1, 'weeks');
      // 8 Oct is after DST starts, so the offset is +11 but the local time stays 9:00 am
      expect(result.toFormat('yyyy-MM-dd HH:mm ZZ')).toBe('2026-10-08 09:00 +11:00');
      expect(result.zoneName).toBe('Australia/Sydney');
    });

    test('daily repeats keep the local wall-clock time across a DST end (New York, 1 Nov 2026)', () => {
      jest.setSystemTime(new Date('2026-10-30T12:00:00Z'));
      const start = DateTime.fromISO('2026-10-01T09:00', { zone: 'America/New_York' });
      const result = nextRepeatDate(start, 1, 'days');
      expect(result.toFormat('yyyy-MM-dd HH:mm')).toBe('2026-10-30 09:00');
      jest.setSystemTime(new Date('2026-11-01T15:00:00Z'));
      const afterChange = nextRepeatDate(start, 1, 'days');
      expect(afterChange.toFormat('yyyy-MM-dd HH:mm ZZ')).toBe('2026-11-02 09:00 -05:00');
    });

    test('hourly repeats are spaced by exactly one real hour across a DST change', () => {
      jest.setSystemTime(new Date('2026-10-03T16:30:00Z'));
      const start = DateTime.fromISO('2026-10-03T00:00', { zone: 'Australia/Sydney' });
      const result = nextRepeatDate(start, 1, 'hours');
      expect(wholeUnitsUntil(result, 'minutes')).toBe(30);
      expect(result > DateTime.now()).toBe(true);
    });

    test('a repeat whose wall-clock time falls in a spring-forward gap moves to the hour after (New York, 8 Mar 2026)', () => {
      // 2:30 am does not exist on 8 Mar 2026. moment printed 1:30 am here, an hour before the event time.
      // Luxon moves it forward, in line with how a time in a gap is read when the date is first parsed.
      jest.setSystemTime(new Date('2026-03-05T12:00:00Z'));
      const start = DateTime.fromISO('2026-03-01T02:30', { zone: 'America/New_York' });
      const result = nextRepeatDate(start, 1, 'weeks');
      expect(result.toFormat('yyyy-MM-dd HH:mm ZZ')).toBe('2026-03-08 03:30 -04:00');
    });

    test('an annual event starting on 29 Feb moves to 28 Feb in a non-leap year', () => {
      const start = DateTime.fromISO('2024-02-29T12:00', { zone: 'UTC' });
      const result = nextRepeatDate(start, 1, 'years');
      expect(result.toFormat('yyyy-MM-dd HH:mm')).toBe('2027-02-28 12:00');
    });

    test('an occurrence that began a moment ago has passed, so the next one is returned', () => {
      const start = DateTime.fromISO('2026-09-30T23:59', { zone: 'UTC' });
      const result = nextRepeatDate(start, 1, 'days');
      expect(result.toFormat('yyyy-MM-dd HH:mm')).toBe('2026-10-01 23:59');
    });
  });
});
