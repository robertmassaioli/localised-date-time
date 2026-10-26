import React from 'react';
import { useProductContext } from '@forge/react';
import { IntlProvider } from 'react-intl';
import { DEFAULT_LOCALE, onIntlError } from '../i18n';
import { MESSAGES, resolveLocale } from '../messages';

/**
 * Gives the macro views and config panels a react-intl context for the viewer's locale.
 * The provider renders no markup of its own. It renders nothing until the Forge context has loaded.
 * https://formatjs.github.io/docs/react-intl/api/#intlprovider
 */
export function MacroIntlProvider({ children }) {
  const context = useProductContext();
  if (!context) return null;

  const locale = resolveLocale(context.locale);
  return (
    <IntlProvider locale={locale} defaultLocale={DEFAULT_LOCALE} messages={MESSAGES[locale]} onError={onIntlError}>
      {children}
    </IntlProvider>
  );
}
