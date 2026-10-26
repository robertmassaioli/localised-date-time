import { createIntl } from 'react-intl';
import { createTranslator, DEFAULT_LOCALE } from '../i18n';
import { MESSAGES, resolveLocale, SUPPORTED_LOCALES } from '../messages';
import { displayOptionChoices, repetitionUnitChoices } from '../frontend/displayOptionChoices';
import { FORMAT_DEFAULT, FORMAT_NASA_COUNTDOWN } from '../displayOptions';
import { REPEAT_HOURLY, REPEAT_WEEKLY } from '../repetition';
import { translateFor } from './translate';

describe('createTranslator', () => {
  test('translates a key for the locale', () => {
    expect(createTranslator('fr-FR')('error.notConfigured.date')).toBe(
      'La date n’est pas configurée. Configurez cet élément dans la configuration de la macro.'
    );
  });

  test('fills in ICU placeholders', () => {
    expect(createTranslator('en-GB')('error.invalidTime', { time: '25:99' })).toMatch(/25:99/);
  });

  test('returns the key for a missing message, like Forge did, without logging an error', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(createTranslator('en-GB')('missing.key')).toBe('missing.key');
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  test('uses the default locale for an unknown locale', () => {
    expect(createTranslator('xx-XX')('error.notConfigured.date')).toBe(createTranslator('en-GB')('error.notConfigured.date'));
  });

  test('leaves unknown placeholders in a message as react-intl does and reports them', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const text = createTranslator('en-GB')('error.invalidTime', {});
    expect(text).not.toBe('');
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  // What react-intl adds over the old {name} replacement: ICU plurals and selects work in any message.
  test('formats ICU plurals when a message needs them', () => {
    const intl = createIntl({ locale: 'en-GB', messages: {} });
    const message = { id: 'demo', defaultMessage: '{count, plural, one {# occurrence} other {# occurrences}}' };
    expect(intl.formatMessage(message, { count: 1 })).toBe('1 occurrence');
    expect(intl.formatMessage(message, { count: 3 })).toBe('3 occurrences');
  });
});

describe('resolveLocale', () => {
  test.each([
    ['fr-FR', 'fr-FR'],
    ['FR-fr', 'fr-FR'],
    ['fr_FR', 'fr-FR'],
    ['en-AU', 'en-GB'],
    ['en', 'en-GB'],
    ['pt', 'pt-BR'],
    ['zh-HK', 'zh-CN'],
    ['de-AT', 'de-DE'],
    ['xx-XX', 'en-GB'],
    ['', 'en-GB'],
    [undefined, 'en-GB'],
    [42, 'en-GB']
  ])('%p resolves to %p', (input, expected) => {
    expect(resolveLocale(input)).toBe(expected);
  });
});

describe('every locale formats with react-intl', () => {
  test.each(SUPPORTED_LOCALES)('%s: every message parses, formats and keeps its text', locale => {
    const errors = [];
    const intl = createIntl({ locale, messages: MESSAGES[locale], onError: e => errors.push(e.message) });
    for (const id of Object.keys(MESSAGES[locale])) {
      const text = intl.formatMessage({ id }, { field: 'FIELD', time: 'TIME' });
      expect(text).not.toBe(id);
      expect(text).not.toMatch(/[{}]/);
    }
    expect(errors).toEqual([]);
  });
});

describe('default locale', () => {
  test('is en-GB, which serves Australian spelling', () => {
    expect(DEFAULT_LOCALE).toBe('en-GB');
  });
});

describe('select option helpers', () => {
  test('display options keep their values and use translated labels', () => {
    const options = displayOptionChoices(translateFor('de-DE'));
    expect(options).toHaveLength(5);
    expect(options[0]).toEqual({ label: 'Lokalisierte Datums- und Zeitangabe (Standard)', value: FORMAT_DEFAULT });
    expect(options[4].value).toBe(FORMAT_NASA_COUNTDOWN);
  });

  test('English labels match the old hard-coded text', () => {
    expect(displayOptionChoices(translateFor('en-GB')).map(o => o.label)).toEqual([
      'Localised Date/Time (Default)',
      'Localised Date/Time (With configured timezone)',
      'UTC (With Localised Date/Time)',
      'Countdown / Time since',
      'Countdown T-(plus/minus)'
    ]);
    expect(displayOptionChoices(translateFor('en-US'))[0].label).toBe('Localized Date/Time (Default)');
  });

  test('repetition units keep their values and use translated labels', () => {
    const options = repetitionUnitChoices(translateFor('fr-FR'));
    expect(options.map(o => o.label)).toEqual(['Semaine (par défaut)', 'Jour', 'Année', 'Heure']);
    expect(options[0].value).toBe(REPEAT_WEEKLY);
    expect(options[3].value).toBe(REPEAT_HOURLY);
  });
});
