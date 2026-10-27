/**
 * Translation helpers built on react-intl (FormatJS), https://formatjs.github.io/docs/react-intl/
 * Forge loads the viewer's locale file on demand, https://developer.atlassian.com/platform/forge/internationalization ,
 * and this module formats its messages. The rest of the app keeps calling `t(key, params)`.
 * Messages use ICU MessageFormat, so `{name}` placeholders work as before and plurals and selects are available.
 */
import { createIntl, createIntlCache } from 'react-intl';

// Matches `default` in manifest.yml. en-AU is not a supported Forge locale, so en-GB serves Australian spelling.
export const DEFAULT_LOCALE = 'en-GB';

// The 26 locales Forge can load translation files for, https://developer.atlassian.com/platform/forge/manifest-reference/forge-supported-locale-codes/
export const SUPPORTED_LOCALES = [
  'zh-CN', 'zh-TW', 'cs-CZ', 'da-DK', 'nl-NL', 'en-US', 'en-GB', 'et-EE', 'fi-FI', 'fr-FR', 'de-DE', 'hu-HU', 'is-IS',
  'it-IT', 'ja-JP', 'ko-KR', 'no-NO', 'pl-PL', 'pt-BR', 'pt-PT', 'ro-RO', 'ru-RU', 'sk-SK', 'tr-TR', 'es-ES', 'sv-SE'
];

// Locales that need a mapping the language rule cannot give, keyed by lower-case tag.
const LOCALE_OVERRIDES = { 'en-uk': 'en-GB', 'zh-hk': 'zh-TW', 'zh-mo': 'zh-TW', nb: 'no-NO', nn: 'no-NO' };

// Where a bare language has more than one supported locale, this is the one it maps to.
const PREFERRED_FOR_LANGUAGE = { en: 'en-GB', pt: 'pt-BR', zh: 'zh-CN' };

/**
 * Maps the locale the platform reports to one that has translation files.
 * `view.getContext()` only maps a handful of locales (Forge's `ensureLocale`) and passes the rest through unchanged,
 * so the app can receive `en-AU`, `de-AT` or `fr-CA`. Without this step those would fall to the manifest's default
 * locale, English. The order is: an exact match (ignoring case and `_` versus `-`), a known override, the same language
 * (`en-AU` gives `en-GB`, `de-AT` gives `de-DE`), then the default.
 */
export function resolveLocale(locale) {
  if (typeof locale !== 'string' || !locale) return DEFAULT_LOCALE;
  const wanted = locale.replace(/_/g, '-').toLowerCase();
  const exact = SUPPORTED_LOCALES.find(code => code.toLowerCase() === wanted);
  if (exact) return exact;
  if (LOCALE_OVERRIDES[wanted]) return LOCALE_OVERRIDES[wanted];
  if (wanted.startsWith('zh-hant')) return 'zh-TW';
  const language = wanted.split('-')[0];
  return LOCALE_OVERRIDES[language]
    ?? PREFERRED_FOR_LANGUAGE[language]
    ?? SUPPORTED_LOCALES.find(code => code.toLowerCase().split('-')[0] === language)
    ?? DEFAULT_LOCALE;
}

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
