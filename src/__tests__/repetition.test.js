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
});
