/**
 * Translation helpers built on react-intl (FormatJS), https://formatjs.github.io/docs/react-intl/
 * The rest of the app keeps calling `t(key, params)`. Messages use ICU MessageFormat, so `{name}`
 * placeholders work as before and plurals and selects are available when a message needs them.
 */
import { createIntl, createIntlCache } from 'react-intl';
import { DEFAULT_LOCALE, MESSAGES, resolveLocale } from './messages';

export { DEFAULT_LOCALE };

const cache = createIntlCache();

/**
 * A missing translation returns the key (as Forge's `t` did), so it is not worth a console error.
 * Anything else, such as a message that does not parse, is a real problem.
 */
export function onIntlError(error) {
  if (error.code === 'MISSING_TRANSLATION') return;
  console.warn('[i18n]', error.message);
}

/**
 * Wraps a react-intl `intl` object into `translate(key, params)`.
 */
export function makeTranslate(intl) {
  return (key, params) => intl.formatMessage({ id: key }, params);
}

/**
 * Builds a translate function outside React, for the export function and for tests.
 */
export function createTranslator(locale) {
  const resolved = resolveLocale(locale);
  const intl = createIntl(
    { locale: resolved, defaultLocale: DEFAULT_LOCALE, messages: MESSAGES[resolved], onError: onIntlError },
    cache
  );
  return makeTranslate(intl);
}
