import { DateTime } from 'luxon';
import { formatDateTime } from '../dateTime';
import { SUPPORTED_LOCALES } from '../i18n';

// Intl puts U+202F (narrow no-break space) before AM and PM in some locales, and U+00A0 elsewhere.
const plain = text => text.replace(/[  ]/g, ' ');
const format = (date, options) => plain(formatDateTime(date, options));

// 3 pm in Sydney, which is 11 pm the day before in New York
const sydney = DateTime.fromISO('2024-11-15T15:00', { zone: 'Australia/Sydney' });
const newYork = sydney.setZone('America/New_York');

describe('formatDateTime', () => {
  test('without a locale it is the legacy English pattern, which exports keep', () => {
    expect(formatDateTime(sydney)).toBe('Fri, Nov 15, 2024 3:00pm AEDT');
    expect(formatDateTime(sydney, {})).toBe('Fri, Nov 15, 2024 3:00pm AEDT');
    expect(formatDateTime(sydney, { hourCycle: 'h23' })).toBe('Fri, Nov 15, 2024 3:00pm AEDT');
  });

  // These strings come from the ICU data that Node 22 ships. A newer ICU can change small details, so only
  // a handful of locales with different layouts are pinned. Everything else is checked by the invariants below.
  test.each([
    ['en-US', 'Fri, Nov 15, 2024, 3:00 PM AEDT'],
    ['en-GB', 'Fri, 15 Nov 2024, 15:00 AEDT'],
    ['de-DE', 'Fr., 15. Nov. 2024, 15:00 AEDT'],
    ['ja-JP', '2024年11月15日(金) 15:00 AEDT'],
    ['ko-KR', '2024년 11월 15일 (금) 오후 3:00 AEDT'],
    ['zh-TW', '2024年11月15日 週五 下午3:00 [AEDT]'],
    ['is-IS', 'fös., 15. nóv. 2024, AEDT – 15:00']
  ])('%s: %s', (locale, expected) => {
    expect(format(sydney, { locale })).toBe(expected);
  });

  test('keeps the zone where each locale puts it', () => {
    expect(format(sydney, { locale: 'zh-TW' })).toMatch(/\[AEDT\]$/);
    expect(format(sydney, { locale: 'is-IS' })).toMatch(/AEDT – 15:00$/);
  });

  describe.each(SUPPORTED_LOCALES)('%s', locale => {
    test('formats the year and our abbreviation, and never an Intl GMT name', () => {
      const text = format(sydney, { locale });
      expect(text).toContain('2024');
      expect(text).toContain('AEDT');
      expect(text).not.toMatch(/GMT|UTC/);
    });
  });

  test('the locale decides the clock: only en-US, ko-KR and zh-TW are 12-hour', () => {
    const twelveHour = SUPPORTED_LOCALES.filter(locale => /AM|PM|am|pm|오후|下午/.test(format(sydney, { locale })));
    expect(twelveHour.sort()).toEqual(['en-US', 'ko-KR', 'zh-TW']);
  });

  describe('hourCycle', () => {
    test('h12 gives a 12-hour clock in a 24-hour locale and keeps the layout', () => {
      expect(format(sydney, { locale: 'en-GB', hourCycle: 'h12' })).toBe('Fri, 15 Nov 2024, 3:00 pm AEDT');
    });

    test('h23 gives a 24-hour clock in a 12-hour locale', () => {
      expect(format(sydney, { locale: 'en-US', hourCycle: 'h23' })).toBe('Fri, Nov 15, 2024, 15:00 AEDT');
      expect(format(sydney, { locale: 'ko-KR', hourCycle: 'h23' })).toBe('2024년 11월 15일 (금) 15:00 AEDT');
    });
  });

  describe('zone abbreviations', () => {
    test.each([
      ['America/New_York', 'EST'],
      ['Asia/Kolkata', 'IST'],
      ['Europe/London', 'GMT'],
      ['Asia/Tokyo', 'JST'],
      ['Asia/Dubai', '+04']
    ])('%s shows %s in every layout', (zone, abbreviation) => {
      const date = sydney.setZone(zone);
      for (const locale of ['en-GB', 'de-DE', 'ja-JP', 'zh-TW', 'is-IS']) {
        expect(format(date, { locale })).toContain(abbreviation);
      }
    });

    test('follows daylight saving in the date', () => {
      const summer = DateTime.fromISO('2024-01-15T15:00', { zone: 'Australia/Sydney' });
      const winter = DateTime.fromISO('2024-07-15T15:00', { zone: 'Australia/Sydney' });
      expect(format(summer, { locale: 'de-DE' })).toContain('AEDT');
      expect(format(winter, { locale: 'de-DE' })).toContain('AEST');
    });

    test('shows the date as seen in the viewer zone', () => {
      expect(format(newYork, { locale: 'en-US' })).toBe('Thu, Nov 14, 2024, 11:00 PM EST');
    });
  });

  describe('bad input', () => {
    test('an invalid date reads Invalid date, as before', () => {
      const invalid = DateTime.fromFormat('nope', 'yyyy-MM-dd', { zone: 'Australia/Sydney' });
      expect(formatDateTime(invalid, { locale: 'de-DE' })).toBe('Invalid date');
      expect(formatDateTime(invalid)).toBe('Invalid date');
    });

    test('a well-formed locale Intl has no data for still formats', () => {
      expect(format(sydney, { locale: 'xx-XX' })).toContain('AEDT');
    });

    test('a malformed locale tag falls back to the legacy pattern and warns', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      expect(formatDateTime(sydney, { locale: 'not a locale!!' })).toBe('Fri, Nov 15, 2024 3:00pm AEDT');
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('not a locale!!'), expect.anything());
      warnSpy.mockRestore();
    });
  });
});
