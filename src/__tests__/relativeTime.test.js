import { DateTime, Settings } from 'luxon';
import { nasaCountdown, relativeFromNow } from '../relativeTime';
import { SUPPORTED_LOCALES } from '../i18n';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// The expected text below comes from moment's fromNow() and duration code, which this module replaces
describe('relativeFromNow', () => {
  // relativeFromNow counts calendar months in the system timezone, like moment, through Luxon's toLocal(), which
  // follows Settings.defaultZone. A few table rows sit exactly on a rounding boundary (548 days is 1.5 years), where
  // a daylight saving hour in the machine's zone tips the result, so the tests pin the zone and not the machine.
  const systemZone = Settings.defaultZone;
  beforeAll(() => {
    Settings.defaultZone = 'UTC';
  });
  afterAll(() => {
    Settings.defaultZone = systemZone;
  });

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

  // Away from a rounding boundary the text does not depend on the system zone, whatever its daylight saving rules.
  describe.each([
    'UTC', 'Europe/London', 'Europe/Dublin', 'America/New_York', 'America/Los_Angeles', 'America/St_Johns',
    'America/Santiago', 'Africa/Casablanca', 'Asia/Kolkata', 'Asia/Tokyo', 'Australia/Sydney', 'Australia/Lord_Howe',
    'Pacific/Auckland', 'Pacific/Chatham'
  ])('system zone %s', zone => {
    beforeEach(() => {
      Settings.defaultZone = zone;
    });
    afterEach(() => {
      Settings.defaultZone = 'UTC';
    });

    test.each([
      [90 * MINUTE, '2 hours'],
      [3 * DAY, '3 days'],
      [100 * DAY, '3 months'],
      [400 * DAY, 'a year'],
      [700 * DAY, '2 years'],
      [5 * 365 * DAY, '5 years']
    ])('%i ms away is "%s"', (offsetMs, expected) => {
      expect(text(offsetMs)).toBe(`in ${expected}`);
      expect(text(-offsetMs)).toBe(`${expected} ago`);
    });
  });
});

describe('relativeFromNow with a locale', () => {
  const now = DateTime.fromISO('2026-10-26T03:17:05.123Z', { zone: 'UTC' });
  const text = (offsetMs, locale) => relativeFromNow(now.plus({ milliseconds: offsetMs }), now, locale);

  // The thresholds and rounding are the ones tested above. Here the same unit and number are worded by Intl.
  test.each([
    ['en-US', 'in 1 minute', 'tomorrow', '3 hours ago', 'in 5 months'],
    ['en-GB', 'in 1 minute', 'tomorrow', '3 hours ago', 'in 5 months'],
    ['de-DE', 'in 1 Minute', 'morgen', 'vor 3 Stunden', 'in 5 Monaten'],
    ['ja-JP', '1 分後', '明日', '3 時間前', '5 か月後'],
    ['pl-PL', 'za 1 minutę', 'jutro', '3 godziny temu', 'za 5 miesięcy'],
    ['ru-RU', 'через 1 минуту', 'завтра', '3 часа назад', 'через 5 месяцев'],
    ['is-IS', 'eftir 1 mínútu', 'á morgun', 'fyrir 3 klukkustundum', 'eftir 5 mánuði']
  ])('%s', (locale, minute, day, hoursAgo, months) => {
    expect(text(60 * SECOND, locale)).toBe(minute);
    expect(text(DAY, locale)).toBe(day);
    expect(text(-3 * HOUR, locale)).toBe(hoursAgo);
    expect(relativeFromNow(now.plus({ months: 5 }), now, locale)).toBe(months);
  });

  test('under 45 seconds is "now", because Intl has no "a few seconds"', () => {
    expect(text(10 * SECOND, 'en-GB')).toBe('now');
    expect(text(-10 * SECOND, 'en-GB')).toBe('now');
    expect(text(44 * SECOND, 'de-DE')).toBe('jetzt');
  });

  test('uses the same unit and number as the English text at every threshold', () => {
    const formatter = new Intl.RelativeTimeFormat('de-DE', { numeric: 'auto' });
    for (const [offset, value, unit] of [
      [45 * SECOND, 1, 'minute'],
      [90 * SECOND, 2, 'minute'],
      [45 * MINUTE, 1, 'hour'],
      [22 * HOUR, 1, 'day'],
      [26 * DAY, 1, 'month']
    ]) {
      expect(text(offset, 'de-DE')).toBe(formatter.format(value, unit));
      expect(text(-offset, 'de-DE')).toBe(formatter.format(-value, unit));
    }
  });

  test('past and future read differently in every supported locale', () => {
    for (const locale of SUPPORTED_LOCALES) {
      const future = text(3 * HOUR, locale);
      const past = text(-3 * HOUR, locale);
      expect(future).toMatch(/\S/);
      expect(past).toMatch(/\S/);
      expect(future).not.toBe(past);
    }
  });

  test('without a locale it keeps the legacy English text', () => {
    expect(text(DAY, undefined)).toBe('in a day');
    expect(text(-3 * HOUR, undefined)).toBe('3 hours ago');
    expect(text(10 * SECOND, undefined)).toBe('in a few seconds');
  });

  test('an invalid date still reads Invalid date', () => {
    expect(relativeFromNow(DateTime.invalid('test'), now, 'de-DE')).toBe('Invalid date');
  });

  test('a malformed locale tag falls back to the legacy English text and warns', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(text(DAY, 'not a locale!!')).toBe('in a day');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('not a locale!!'), expect.anything());
    warnSpy.mockRestore();
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
