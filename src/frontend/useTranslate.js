import { useTranslation } from '@forge/react';
import { makeTranslate } from '../i18n';

/**
 * Returns { ready, t } where t(key, params) translates for the viewer's locale and fills in `{name}` placeholders.
 * Needs an I18nProvider above it. `ready` is false until the translation files have loaded.
 * https://developer.atlassian.com/platform/forge/ui-kit/hooks/use-translation/
 */
export function useTranslate() {
  const { ready, t } = useTranslation();
  return { ready, t: makeTranslate(t) };
}
