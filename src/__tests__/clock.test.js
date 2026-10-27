import { clockFor, isFlexibleClockLocale, CLOCK_12_HOUR, CLOCK_24_HOUR, CLOCK_AUTO } from '../clock';
import { SUPPORTED_LOCALES } from '../i18n';

describe('isFlexibleClockLocale', () => {
  test.each(['en-GB', 'en-US', 'en-AU', 'en-NZ', 'en_AU', 'en', 'EN-gb'])('%s is flexible', locale => {
    expect(isFlexibleClockLocale(locale)).toBe(true);
  });

  test.each(['de-DE', 'ko-KR', 'zh-TW', 'fr-CA', 'eng-US', 'xx', '', undefined, null, 42])('%p is not flexible', locale => {
    expect(isFlexibleClockLocale(locale)).toBe(false);
  });
});

describe('clockFor', () => {
  const flexible = SUPPORTED_LOCALES.filter(isFlexibleClockLocale);
  const fixed = SUPPORTED_LOCALES.filter(locale => !isFlexibleClockLocale(locale));

  test('only en-GB and en-US of the 26 locales are flexible', () => {
    expect(flexible.sort()).toEqual(['en-GB', 'en-US']);
    expect(fixed).toHaveLength(24);
  });

  test.each(['en-GB', 'en-US', 'en-AU'])('%s follows the author setting', locale => {
    expect(clockFor(locale, CLOCK_12_HOUR)).toBe('h12');
    expect(clockFor(locale, CLOCK_24_HOUR)).toBe('h23');
    expect(clockFor(locale, CLOCK_AUTO)).toBeUndefined();
  });

  test('an author setting never changes a locale with its own convention', () => {
    for (const locale of fixed) {
      expect(clockFor(locale, CLOCK_12_HOUR)).toBeUndefined();
      expect(clockFor(locale, CLOCK_24_HOUR)).toBeUndefined();
      expect(clockFor(locale, CLOCK_AUTO)).toBeUndefined();
    }
  });

  test('a missing or unknown setting means automatic', () => {
    expect(clockFor('en-GB', undefined)).toBeUndefined();
    expect(clockFor('en-GB', null)).toBeUndefined();
    expect(clockFor('en-GB', '36h')).toBeUndefined();
  });

  test('a missing locale means automatic', () => {
    expect(clockFor(undefined, CLOCK_12_HOUR)).toBeUndefined();
  });
});
