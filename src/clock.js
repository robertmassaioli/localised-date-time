/**
 * The clock a viewer sees, from the macro author's `clock` setting and the viewer's locale.
 * A locale's own convention beats the author's choice. Only English locales are flexible, because both
 * clocks are in everyday use there, so the author's 12-hour or 24-hour setting applies to them alone.
 * Every other locale keeps its Intl default (23 of the 26 Forge locales are 24-hour, and ko-KR, zh-TW
 * are 12-hour), so a macro set to 12-hour still shows 24 hours to a German viewer.
 * See ai-proposals/007-locale-aware-dates.md.
 */
export const CLOCK_AUTO = 'auto';
export const CLOCK_12_HOUR = '12h';
export const CLOCK_24_HOUR = '24h';

/**
 * `en-GB`, `en-US` and the regional English locales the context can carry, such as `en-AU`.
 */
export function isFlexibleClockLocale(locale) {
  return typeof locale === 'string' && /^en([-_]|$)/i.test(locale);
}

/**
 * The `hourCycle` to give Intl: 'h12', 'h23', or undefined to keep the locale's own clock.
 */
export function clockFor(locale, setting) {
  if (!isFlexibleClockLocale(locale)) return undefined;
  if (setting === CLOCK_12_HOUR) return 'h12';
  if (setting === CLOCK_24_HOUR) return 'h23';
  return undefined;
}
