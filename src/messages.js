// Every locale file, bundled into the frontend and the export function so react-intl can format with them.
// The same files are what Forge reads for the manifest `i18n:` keys, so there is one set of strings.
import cs_CZ from '../locales/cs-CZ.json';
import da_DK from '../locales/da-DK.json';
import de_DE from '../locales/de-DE.json';
import en_GB from '../locales/en-GB.json';
import en_US from '../locales/en-US.json';
import es_ES from '../locales/es-ES.json';
import et_EE from '../locales/et-EE.json';
import fi_FI from '../locales/fi-FI.json';
import fr_FR from '../locales/fr-FR.json';
import hu_HU from '../locales/hu-HU.json';
import is_IS from '../locales/is-IS.json';
import it_IT from '../locales/it-IT.json';
import ja_JP from '../locales/ja-JP.json';
import ko_KR from '../locales/ko-KR.json';
import nl_NL from '../locales/nl-NL.json';
import no_NO from '../locales/no-NO.json';
import pl_PL from '../locales/pl-PL.json';
import pt_BR from '../locales/pt-BR.json';
import pt_PT from '../locales/pt-PT.json';
import ro_RO from '../locales/ro-RO.json';
import ru_RU from '../locales/ru-RU.json';
import sk_SK from '../locales/sk-SK.json';
import sv_SE from '../locales/sv-SE.json';
import tr_TR from '../locales/tr-TR.json';
import zh_CN from '../locales/zh-CN.json';
import zh_TW from '../locales/zh-TW.json';

// Matches `default` in manifest.yml. en-AU is not a supported Forge locale, so en-GB serves Australian spelling.
export const DEFAULT_LOCALE = 'en-GB';

// The locale files are nested for Forge ("macro.nonrepeating.title"), react-intl wants flat message ids.
function flatten(node, prefix = '') {
  return Object.entries(node).reduce((flat, [key, value]) => (
    typeof value === 'object' && value !== null
      ? { ...flat, ...flatten(value, `${prefix}${key}.`) }
      : { ...flat, [`${prefix}${key}`]: value }
  ), {});
}

export const MESSAGES = {
  'cs-CZ': flatten(cs_CZ),
  'da-DK': flatten(da_DK),
  'de-DE': flatten(de_DE),
  'en-GB': flatten(en_GB),
  'en-US': flatten(en_US),
  'es-ES': flatten(es_ES),
  'et-EE': flatten(et_EE),
  'fi-FI': flatten(fi_FI),
  'fr-FR': flatten(fr_FR),
  'hu-HU': flatten(hu_HU),
  'is-IS': flatten(is_IS),
  'it-IT': flatten(it_IT),
  'ja-JP': flatten(ja_JP),
  'ko-KR': flatten(ko_KR),
  'nl-NL': flatten(nl_NL),
  'no-NO': flatten(no_NO),
  'pl-PL': flatten(pl_PL),
  'pt-BR': flatten(pt_BR),
  'pt-PT': flatten(pt_PT),
  'ro-RO': flatten(ro_RO),
  'ru-RU': flatten(ru_RU),
  'sk-SK': flatten(sk_SK),
  'sv-SE': flatten(sv_SE),
  'tr-TR': flatten(tr_TR),
  'zh-CN': flatten(zh_CN),
  'zh-TW': flatten(zh_TW)
};

export const SUPPORTED_LOCALES = Object.keys(MESSAGES);

// Where a bare language has more than one supported locale, this is the one it maps to.
const PREFERRED_FOR_LANGUAGE = { en: 'en-GB', pt: 'pt-BR', zh: 'zh-CN' };

/**
 * Maps whatever locale the platform reports to one we have messages for: an exact match
 * (ignoring case and `_` versus `-`), then the same language (en-AU gives en-GB), then the default.
 */
export function resolveLocale(locale) {
  if (typeof locale !== 'string' || !locale) return DEFAULT_LOCALE;
  const wanted = locale.replace('_', '-').toLowerCase();
  const exact = SUPPORTED_LOCALES.find(code => code.toLowerCase() === wanted);
  if (exact) return exact;
  const language = wanted.split('-')[0];
  return PREFERRED_FOR_LANGUAGE[language]
    ?? SUPPORTED_LOCALES.find(code => code.toLowerCase().split('-')[0] === language)
    ?? DEFAULT_LOCALE;
}
