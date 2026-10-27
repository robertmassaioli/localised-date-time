import React, { useEffect, useState } from 'react';
import { Spinner, useProductContext } from '@forge/react';
import { i18n } from '@forge/bridge';
import { IntlProvider } from 'react-intl';
import { DEFAULT_LOCALE, flattenMessages, onIntlError } from '../i18n';

/**
 * Gives the macro views and config panels a react-intl context for the viewer's locale.
 * `i18n.getTranslations` fetches only that locale's file (plus its fallbacks), so no other locale is downloaded.
 * https://developer.atlassian.com/platform/forge/apis-reference/ui-api-bridge/i18n/
 * The provider renders no markup of its own once loaded. While the translations load it renders a Spinner,
 * because rendering nothing left the macro stuck on Forge's own loading spinner in a deployed app.
 * https://formatjs.github.io/docs/react-intl/api/#intlprovider
 */
export function MacroIntlProvider({ children }) {
  const context = useProductContext();
  const hasContext = Boolean(context);
  const requestedLocale = context?.locale;
  const [loaded, setLoaded] = useState(undefined);

  useEffect(() => {
    if (!hasContext) return undefined;
    let cancelled = false;
    i18n.getTranslations(requestedLocale ?? null)
      .then(result => {
        if (!cancelled) setLoaded({ locale: result.locale, messages: flattenMessages(result.translations) });
      })
      .catch(error => {
        console.warn(`[i18n] could not load translations for ${requestedLocale}:`, error);
        // Show the message keys rather than a blank panel
        if (!cancelled) setLoaded({ locale: DEFAULT_LOCALE, messages: {} });
      });
    return () => {
      cancelled = true;
    };
  }, [hasContext, requestedLocale]);

  if (!loaded) return <Spinner />;

  return (
    <IntlProvider locale={loaded.locale} defaultLocale={DEFAULT_LOCALE} messages={loaded.messages} onError={onIntlError}>
      {children}
    </IntlProvider>
  );
}
