import { DateTime } from 'luxon';
import { nasaCountdown, relativeFromNow } from '../relativeTime';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// The expected text below comes from moment's fromNow() and duration code, which this module replaces
describe('relativeFromNow', () => {
  const now = DateTime.fromISO('2026-10-26T03:17:05.123Z', { zone: 'UTC' });
  const text = offsetMs => relativeFromNow(now.plus({ milliseconds: offsetMs }), now);

  test.each([
    [44 * SECOND, 'a few seconds'],
    [45 * SECOND, 'a minute'],
    [89 * SECOND, 'a minute'],
    [90 * SECOND, '2 minutes'],
    [44 * MINUTE, '44 minutes'],
    [45 * MINUTE, 'an hour'],
    [89 * MINUTE, 'an hour'],
    [90 * MINUTE, '2 hours'],
    [21 * HOUR, '21 hours'],
    [22 * HOUR, 'a day'],
    [35 * HOUR, 'a day'],
    [36 * HOUR, '2 days'],
    [25 * DAY, '25 days'],
    [26 * DAY, 'a month'],
    [45 * DAY, 'a month'],
    [319 * DAY, '10 months'],
    [320 * DAY, 'a year'],
    [547 * DAY, 'a year'],
    [548 * DAY, '2 years'],
    [5 * 365 * DAY, '5 years']
  ])('%i ms away is "%s"', (offsetMs, expected) => {
    expect(text(offsetMs)).toBe(`in ${expected}`);
    expect(text(-offsetMs)).toBe(`${expected} ago`);
  });

  test('past dates end in "ago"', () => {
    expect(text(-3 * DAY)).toBe('3 days ago');
    expect(text(-90 * MINUTE)).toBe('2 hours ago');
  });

  test('the present moment counts as a few seconds ago, like moment', () => {
    expect(text(0)).toBe('a few seconds ago');
  });

  test('prints "Invalid date" for an invalid date', () => {
    expect(relativeFromNow(DateTime.invalid('test'), now)).toBe('Invalid date');
  });

  test('uses the current time when none is given', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-11-14T00:00:00Z'));
    try {
      expect(relativeFromNow(DateTime.fromISO('2024-11-15T04:00:00Z'))).toBe('in a day');
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('nasaCountdown', () => {
  test.each([
    [-1000, 'T-1s'],
    [-61 * SECOND, 'T-1m1s'],
    [-(3 * HOUR + 5 * MINUTE + 7 * SECOND), 'T-3h5m7s'],
    [-28 * HOUR, 'T-1d4h'],
    [-31 * DAY, 'T-1m'],
    [-59 * DAY, 'T-1m28d'],
    [-400 * DAY, 'T-1y1m4d'],
    [-800 * DAY, 'T-2y2m8d'],
    [-(3 * 365 * DAY + 100 * DAY + 5 * HOUR), 'T-3y3m7d5h'],
    [-365 * DAY, 'T-11m30d'],
    [-366 * DAY, 'T-1y']
  ])('%i ms to go is %s', (diff, expected) => {
    expect(nasaCountdown(diff)).toBe(expected);
  });

  test('counts up with T+ after the date', () => {
    expect(nasaCountdown(90 * MINUTE)).toBe('T+1h30m');
    expect(nasaCountdown(400 * DAY)).toBe('T+1y1m4d');
  });

  test('has no components for less than a second', () => {
    expect(nasaCountdown(-1)).toBe('T-');
    expect(nasaCountdown(999)).toBe('T+');
  });

  test('treats exactly now as T+', () => {
    expect(nasaCountdown(0)).toBe('T+');
  });
});
