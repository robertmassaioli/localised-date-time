import { DateTime } from 'luxon';
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
  const fixedDate = DateTime.fromISO('2024-11-15T09:00', { zone: 'Australia/Sydney' });

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
      const future = DateTime.now().plus({ hours: 2 });
      const result = displayText(FORMAT_HUMAN_COUNTDOWN, future);
      expect(result).toMatch(/in/i);
    });

    test('returns a relative string for a past date', () => {
      const past = DateTime.now().minus({ days: 3 });
      const result = displayText(FORMAT_HUMAN_COUNTDOWN, past);
      expect(result).toMatch(/ago/i);
    });
  });

  describe('NASA countdown format', () => {
    test('returns T+ for a past date', () => {
      const past = DateTime.now().minus({ hour: 1 });
      const result = displayText(FORMAT_NASA_COUNTDOWN, past);
      expect(result).toMatch(/^T\+/);
    });

    test('returns T- for a future date', () => {
      const future = DateTime.now().plus({ hour: 1 });
      const result = displayText(FORMAT_NASA_COUNTDOWN, future);
      expect(result).toMatch(/^T-/);
    });

    test('includes hours component when difference is hours', () => {
      const future = DateTime.now().plus({ hours: 3 });
      const result = displayText(FORMAT_NASA_COUNTDOWN, future);
      expect(result).toMatch(/h/);
    });

    test('includes days component when difference spans days', () => {
      const future = DateTime.now().plus({ days: 5 }).plus({ hours: 2 });
      const result = displayText(FORMAT_NASA_COUNTDOWN, future);
      expect(result).toMatch(/5d/);
    });

    test('includes years component when difference spans years', () => {
      // Use a large enough gap that years will always appear regardless of DST/month-length variance
      const future = DateTime.now().plus({ years: 3 });
      const result = displayText(FORMAT_NASA_COUNTDOWN, future);
      expect(result).toMatch(/[23]y/);
    });

    test('returns exactly "T-" with no components for a moment just in the future (0-second diff)', () => {
      // A date exactly now should show T- with no further components
      const almostNow = DateTime.now().plus({ milliseconds: 1 });
      const result = displayText(FORMAT_NASA_COUNTDOWN, almostNow);
      expect(result).toMatch(/^T-$/);
    });
  });
});
