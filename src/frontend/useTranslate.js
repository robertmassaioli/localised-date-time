import { useIntl } from 'react-intl';
import { makeTranslate } from '../i18n';

/**
 * Returns { ready, t } where t(key, params) translates for the viewer's locale.
 * Needs a MacroIntlProvider above it, which only mounts once the locale is known, so `ready` is always true.
 */
export function useTranslate() {
  const intl = useIntl();
  return { ready: true, t: makeTranslate(intl) };
}
