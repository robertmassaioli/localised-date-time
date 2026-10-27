/**
 * Translation helpers built on react-intl (FormatJS), https://formatjs.github.io/docs/react-intl/
 * Forge loads the viewer's locale file on demand, https://developer.atlassian.com/platform/forge/internationalization ,
 * and this module formats its messages. The rest of the app keeps calling `t(key, params)`.
 * Messages use ICU MessageFormat, so `{name}` placeholders work as before and plurals and selects are available.
 */
import { createIntl, createIntlCache } from 'react-intl';

// Matches `default` in manifest.yml. en-AU is not a supported Forge locale, so en-GB serves Australian spelling.
export const DEFAULT_LOCALE = 'en-GB';

const cache = createIntlCache();

/**
 * The locale files are nested for Forge ("macro.nonrepeating.title"), react-intl wants flat message ids.
 */
export function flattenMessages(node, prefix = '') {
  return Object.entries(node ?? {}).reduce((flat, [key, value]) => (
    typeof value === 'object' && value !== null
      ? { ...flat, ...flattenMessages(value, `${prefix}${key}.`) }
      : { ...flat, [`${prefix}${key}`]: value }
  ), {});
}

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
 * `locale` and `translations` are what Forge's `getTranslations` returns: the locale it settled on and its nested messages.
 */
export function createTranslator(locale, translations) {
  const intl = createIntl(
    { locale: locale || DEFAULT_LOCALE, defaultLocale: DEFAULT_LOCALE, messages: flattenMessages(translations), onError: onIntlError },
    cache
  );
  return makeTranslate(intl);
}
