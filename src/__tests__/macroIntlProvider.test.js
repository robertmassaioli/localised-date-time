import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { useIntl } from 'react-intl';
import { MacroIntlProvider } from '../frontend/MacroIntlProvider';
import { loadLocale } from './translate';

let mockContext;
const mockGetTranslations = jest.fn();

// The real @forge/react and @forge/bridge need the Forge runtime, which only exists in the browser.
jest.mock('@forge/react', () => ({ Spinner: 'Spinner', useProductContext: () => mockContext }));
jest.mock('@forge/bridge', () => ({ i18n: { getTranslations: (...args) => mockGetTranslations(...args) } }));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function Probe() {
  const intl = useIntl();
  return intl.formatMessage({ id: 'error.notConfigured.date' });
}

async function mount() {
  let renderer;
  await act(async () => {
    renderer = TestRenderer.create(<MacroIntlProvider><Probe /></MacroIntlProvider>);
  });
  return renderer;
}

describe('MacroIntlProvider', () => {
  let warnSpy;

  beforeEach(() => {
    mockGetTranslations.mockReset();
    mockGetTranslations.mockImplementation(async locale => ({ locale, translations: loadLocale(locale) }));
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  // Rendering nothing here left the deployed macro on Forge's own loading spinner, so show a Spinner instead.
  test('shows a spinner and loads nothing until the context has loaded', async () => {
    mockContext = undefined;
    const renderer = await mount();
    expect(renderer.toJSON()).toMatchObject({ type: 'Spinner' });
    expect(mockGetTranslations).not.toHaveBeenCalled();
  });

  test('shows a spinner while the translations load, then the children', async () => {
    mockContext = { locale: 'de-DE' };
    let resolve;
    mockGetTranslations.mockImplementation(() => new Promise(r => { resolve = r; }));
    let renderer;
    await act(async () => {
      renderer = TestRenderer.create(<MacroIntlProvider><Probe /></MacroIntlProvider>);
    });
    expect(renderer.toJSON()).toMatchObject({ type: 'Spinner' });
    await act(async () => {
      resolve({ locale: 'de-DE', translations: loadLocale('de-DE') });
    });
    expect(typeof renderer.toJSON()).toBe('string');
  });

  test('asks Forge for only the viewer locale, once', async () => {
    mockContext = { locale: 'de-DE' };
    const renderer = await mount();
    expect(mockGetTranslations).toHaveBeenCalledTimes(1);
    expect(mockGetTranslations).toHaveBeenCalledWith('de-DE');
    expect(renderer.toJSON()).toMatch(/^Datum nicht konfiguriert|Das Datum/);
  });

  // view.getContext() passes locales it cannot map through unchanged, so en-AU can arrive here.
  test.each([
    ['en-AU', 'en-GB'],
    ['de-AT', 'de-DE'],
    ['fr-CA', 'fr-FR'],
    ['pt', 'pt-BR']
  ])('asks Forge for %s as %s', async (raw, expected) => {
    mockContext = { locale: raw };
    await mount();
    expect(mockGetTranslations).toHaveBeenCalledTimes(1);
    expect(mockGetTranslations).toHaveBeenCalledWith(expected);
  });

  test('shows translations in the language of a regional variant', async () => {
    mockContext = { locale: 'de-AT' };
    const renderer = await mount();
    expect(renderer.toJSON()).toMatch(/^Das Datum|^Datum/);
  });

  test('lets Forge use the view locale when the context has none', async () => {
    mockContext = {};
    await mount();
    expect(mockGetTranslations).toHaveBeenCalledWith(null);
  });

  test('shows the message keys when the translations cannot be loaded', async () => {
    mockContext = { locale: 'fr-FR' };
    mockGetTranslations.mockRejectedValue(new Error('no bundle'));
    const renderer = await mount();
    expect(renderer.toJSON()).toBe('error.notConfigured.date');
    expect(warnSpy).toHaveBeenCalled();
  });
});
