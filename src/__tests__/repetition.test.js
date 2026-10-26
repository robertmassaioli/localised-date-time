import moment from 'moment-timezone';
import { nextRepeatDate, repetitionToUnits, REPEAT_DAILY, REPEAT_WEEKLY, REPEAT_ANNUALLY, REPEAT_HOURLY } from '../repetition';

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
    const future = moment().add(3, 'days');
    const result = nextRepeatDate(future, 1, 'weeks');
    expect(result.isSame(future)).toBe(true);
  });

  test('returns the next weekly occurrence for a past start date', () => {
    // Start 15 days ago, repeating weekly → next occurrence is in the future
    const start = moment().subtract(15, 'days');
    const result = nextRepeatDate(start, 1, 'weeks');
    expect(result.isAfter(moment())).toBe(true);
  });

  test('next occurrence is at most one period away for period=1', () => {
    const start = moment().subtract(20, 'days');
    const result = nextRepeatDate(start, 1, 'weeks');
    // Should be within 1 week from now
    expect(result.diff(moment(), 'days')).toBeLessThanOrEqual(7);
  });

  test('handles period > 1 correctly (every 2 weeks)', () => {
    const start = moment().subtract(10, 'days');
    const result = nextRepeatDate(start, 2, 'weeks');
    expect(result.isAfter(moment())).toBe(true);
    // Should be within 2 weeks from now
    expect(result.diff(moment(), 'days')).toBeLessThanOrEqual(14);
  });

  test('handles annual repetition', () => {
    const start = moment().subtract(3, 'years');
    const result = nextRepeatDate(start, 1, 'years');
    expect(result.isAfter(moment())).toBe(true);
    // Next occurrence within 1 year
    expect(result.diff(moment(), 'days')).toBeLessThanOrEqual(366);
  });

  test('handles daily repetition', () => {
    const start = moment().subtract(5, 'days');
    const result = nextRepeatDate(start, 1, 'days');
    expect(result.isAfter(moment())).toBe(true);
    expect(result.diff(moment(), 'hours')).toBeLessThanOrEqual(24);
  });

  test('handles hourly repetition', () => {
    const start = moment().subtract(5, 'hours');
    const result = nextRepeatDate(start, 1, 'hours');
    expect(result.isAfter(moment())).toBe(true);
    expect(result.diff(moment(), 'minutes')).toBeLessThanOrEqual(60);
  });

  test('result is always after now for a past start date', () => {
    const start = moment().subtract(100, 'days');
    const result = nextRepeatDate(start, 7, 'days');
    expect(result.isAfter(moment())).toBe(true);
  });

  describe('daylight saving and calendar edges', () => {
    test('weekly repeats keep the local wall-clock time across a DST start (Sydney, 4 Oct 2026)', () => {
      // Thursday 24 Sep 2026, 9:00 am AEST (UTC+10). The 1 Oct occurrence has already passed.
      const start = moment.tz('2026-09-24 09:00', 'YYYY-MM-DD HH:mm', 'Australia/Sydney');
      const result = nextRepeatDate(start, 1, 'weeks');
      // 8 Oct is after DST starts, so the offset is +11 but the local time stays 9:00 am
      expect(result.format('YYYY-MM-DD HH:mm Z')).toBe('2026-10-08 09:00 +11:00');
      expect(result.tz()).toBe('Australia/Sydney');
    });

    test('daily repeats keep the local wall-clock time across a DST end (New York, 1 Nov 2026)', () => {
      jest.setSystemTime(new Date('2026-10-30T12:00:00Z'));
      const start = moment.tz('2026-10-01 09:00', 'YYYY-MM-DD HH:mm', 'America/New_York');
      const result = nextRepeatDate(start, 1, 'days');
      expect(result.format('YYYY-MM-DD HH:mm')).toBe('2026-10-30 09:00');
      jest.setSystemTime(new Date('2026-11-01T15:00:00Z'));
      const afterChange = nextRepeatDate(start, 1, 'days');
      expect(afterChange.format('YYYY-MM-DD HH:mm Z')).toBe('2026-11-02 09:00 -05:00');
    });

    test('hourly repeats are spaced by exactly one real hour across a DST change', () => {
      jest.setSystemTime(new Date('2026-10-03T16:30:00Z'));
      const start = moment.tz('2026-10-03 00:00', 'YYYY-MM-DD HH:mm', 'Australia/Sydney');
      const result = nextRepeatDate(start, 1, 'hours');
      expect(result.diff(moment(), 'minutes')).toBe(30);
      expect(result.isAfter(moment())).toBe(true);
    });

    test('an annual event starting on 29 Feb moves to 28 Feb in a non-leap year', () => {
      const start = moment.tz('2024-02-29 12:00', 'YYYY-MM-DD HH:mm', 'UTC');
      const result = nextRepeatDate(start, 1, 'years');
      expect(result.format('YYYY-MM-DD HH:mm')).toBe('2027-02-28 12:00');
    });

    test('an occurrence that began a moment ago has passed, so the next one is returned', () => {
      const start = moment.tz('2026-09-30 23:59', 'YYYY-MM-DD HH:mm', 'UTC');
      const result = nextRepeatDate(start, 1, 'days');
      expect(result.format('YYYY-MM-DD HH:mm')).toBe('2026-10-01 23:59');
    });
  });
});
