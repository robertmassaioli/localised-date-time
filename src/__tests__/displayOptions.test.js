import moment from 'moment-timezone';
import {
  formatRequiresLiveUpdates,
  displayText,
  FORMAT_DEFAULT,
  FORMAT_DEFAULT_AND_ORIGINAL,
  FORMAT_DEFAULT_AND_UTC,
  FORMAT_HUMAN_COUNTDOWN,
  FORMAT_NASA_COUNTDOWN
} from '../displayOptions';

describe('formatRequiresLiveUpdates', () => {
  test('returns true for FORMAT_HUMAN_COUNTDOWN', () => {
    expect(formatRequiresLiveUpdates(FORMAT_HUMAN_COUNTDOWN)).toBe(true);
  });

  test('returns true for FORMAT_NASA_COUNTDOWN', () => {
    expect(formatRequiresLiveUpdates(FORMAT_NASA_COUNTDOWN)).toBe(true);
  });

  test('returns false for FORMAT_DEFAULT', () => {
    expect(formatRequiresLiveUpdates(FORMAT_DEFAULT)).toBe(false);
  });

  test('returns false for FORMAT_DEFAULT_AND_ORIGINAL', () => {
    expect(formatRequiresLiveUpdates(FORMAT_DEFAULT_AND_ORIGINAL)).toBe(false);
  });

  test('returns false for FORMAT_DEFAULT_AND_UTC', () => {
    expect(formatRequiresLiveUpdates(FORMAT_DEFAULT_AND_UTC)).toBe(false);
  });

  test('returns false for undefined', () => {
    expect(formatRequiresLiveUpdates(undefined)).toBe(false);
  });
});

describe('displayText', () => {
  const fixedDate = moment.tz('2024-11-15 09:00', 'YYYY-MM-DD HH:mm', 'Australia/Sydney');

  describe('default format', () => {
    test('formats a date in the standard pattern', () => {
      const result = displayText(FORMAT_DEFAULT, fixedDate);
      // Should match pattern like "Fri, Nov 15, 2024 9:00am AEDT"
      expect(result).toMatch(/Nov 15, 2024/);
      expect(result).toMatch(/9:00am/);
    });

    test('includes the timezone abbreviation', () => {
      const result = displayText(FORMAT_DEFAULT, fixedDate);
      expect(result).toMatch(/AEDT|AEST/);
    });
  });

  describe('human countdown format', () => {
    test('returns a relative string for a future date', () => {
      const future = moment().add(2, 'hours');
      const result = displayText(FORMAT_HUMAN_COUNTDOWN, future);
      expect(result).toMatch(/in/i);
    });

    test('returns a relative string for a past date', () => {
      const past = moment().subtract(3, 'days');
      const result = displayText(FORMAT_HUMAN_COUNTDOWN, past);
      expect(result).toMatch(/ago/i);
    });
  });

  describe('NASA countdown format', () => {
    test('returns T+ for a past date', () => {
      const past = moment().subtract(1, 'hour');
      const result = displayText(FORMAT_NASA_COUNTDOWN, past);
      expect(result).toMatch(/^T\+/);
    });

    test('returns T- for a future date', () => {
      const future = moment().add(1, 'hour');
      const result = displayText(FORMAT_NASA_COUNTDOWN, future);
      expect(result).toMatch(/^T-/);
    });

    test('includes hours component when difference is hours', () => {
      const future = moment().add(3, 'hours');
      const result = displayText(FORMAT_NASA_COUNTDOWN, future);
      expect(result).toMatch(/h/);
    });

    test('includes days component when difference spans days', () => {
      const future = moment().add(5, 'days').add(2, 'hours');
      const result = displayText(FORMAT_NASA_COUNTDOWN, future);
      expect(result).toMatch(/5d/);
    });

    test('includes years component when difference spans years', () => {
      const future = moment().add(2, 'years');
      const result = displayText(FORMAT_NASA_COUNTDOWN, future);
      expect(result).toMatch(/2y/);
    });

    test('returns exactly "T-" with no components for a moment just in the future (0-second diff)', () => {
      // A date exactly now should show T- with no further components
      const almostNow = moment().add(1, 'milliseconds');
      const result = displayText(FORMAT_NASA_COUNTDOWN, almostNow);
      expect(result).toMatch(/^T-$/);
    });
  });
});
