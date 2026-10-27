import fs from 'fs';
import path from 'path';
import { createIntl } from 'react-intl';
import { createTranslator, DEFAULT_LOCALE, flattenMessages, formattingLocale, resolveLocale, SUPPORTED_LOCALES } from '../i18n';
import { clockChoices, displayOptionChoices, repetitionUnitChoices } from '../frontend/displayOptionChoices';
import { FORMAT_DEFAULT, FORMAT_NASA_COUNTDOWN } from '../displayOptions';
import { REPEAT_HOURLY, REPEAT_WEEKLY } from '../repetition';
import { loadLocale, translateFor } from './translate';

describe('flattenMessages', () => {
  test('turns nested Forge locale files into flat react-intl ids', () => {
    expect(flattenMessages({ macro: { nonrepeating: { title: 'T' } }, plain: 'P' })).toEqual({
      'macro.nonrepeating.title': 'T',
      plain: 'P'
    });
  });

  test('copes with missing translations', () => {
    expect(flattenMessages(null)).toEqual({});
    expect(flattenMessages(undefined)).toEqual({});
  });
});

describe('createTranslator', () => {
  test('translates a key for the locale', () => {
    expect(translateFor('fr-FR')('error.notConfigured.date')).toBe(
      'La date n’est pas configurée. Configurez cet élément dans la configuration de la macro.'
    );
  });

  test('fills in ICU placeholders', () => {
    expect(translateFor('en-GB')('error.invalidTime', { time: '25:99' })).toMatch(/25:99/);
  });

  test('returns the key for a missing message, like Forge did, without logging an error', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(translateFor('en-GB')('missing.key')).toBe('missing.key');
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  test('returns keys when there are no translations at all', () => {
    expect(createTranslator('en-GB', null)('error.notConfigured.date')).toBe('error.notConfigured.date');
  });

  test('uses the default locale when none is given', () => {
    expect(createTranslator(undefined, loadLocale('en-GB'))('error.notConfigured.date')).toMatch(/^Date not configured/);
  });

  // What react-intl adds over the old {name} replacement: ICU plurals and selects work in any message.
  test('formats ICU plurals when a message needs them', () => {
    const intl = createIntl({ locale: 'en-GB', messages: {} });
    const message = { id: 'demo', defaultMessage: '{count, plural, one {# occurrence} other {# occurrences}}' };
    expect(intl.formatMessage(message, { count: 1 })).toBe('1 occurrence');
    expect(intl.formatMessage(message, { count: 3 })).toBe('3 occurrences');
  });
});

const LOCALE_CODES = fs.readdirSync(path.join(__dirname, '..', '..', 'locales')).map(name => name.replace(/\.json$/, '')).sort();

describe('resolveLocale', () => {
  test.each([
    ['fr-FR', 'fr-FR'],
    ['FR-fr', 'fr-FR'],
    ['fr_FR', 'fr-FR'],
    ['en-UK', 'en-GB'],
    ['en-AU', 'en-GB'],
    ['en-NZ', 'en-GB'],
    ['en', 'en-GB'],
    ['pt', 'pt-BR'],
    ['pt-AO', 'pt-BR'],
    ['zh', 'zh-CN'],
    ['zh-HK', 'zh-TW'],
    ['zh-Hant-HK', 'zh-TW'],
    ['de-AT', 'de-DE'],
    ['de-CH', 'de-DE'],
    ['fr-CA', 'fr-FR'],
    ['es-MX', 'es-ES'],
    ['nb-NO', 'no-NO'],
    ['nb', 'no-NO'],
    ['nn', 'no-NO'],
    ['xx-XX', 'en-GB'],
    ['', 'en-GB'],
    [undefined, 'en-GB'],
    [null, 'en-GB'],
    [42, 'en-GB']
  ])('%p resolves to %p', (input, expected) => {
    expect(resolveLocale(input)).toBe(expected);
  });

  test('every supported locale resolves to itself', () => {
    for (const code of SUPPORTED_LOCALES) {
      expect(resolveLocale(code)).toBe(code);
    }
  });

  test('every resolved locale has a translation file', () => {
    for (const input of ['en-AU', 'de-AT', 'fr-CA', 'zh-HK', 'pt', 'nb', 'xx-XX']) {
      expect(LOCALE_CODES).toContain(resolveLocale(input));
    }
  });
});

describe('formattingLocale', () => {
  // The platform can report locales that have no translation file. Intl still has data for them.
  test.each([
    ['en-US', 'en-US'],
    ['en-AU', 'en-AU'],
    ['en_AU', 'en-AU'],
    ['de-AT', 'de-AT'],
    ['fr-CA', 'fr-CA'],
    ['zh-HK', 'zh-HK'],
    ['xx-XX', 'en-GB'],
    ['not a locale!!', 'en-GB'],
    ['', undefined],
    [undefined, undefined],
    [null, undefined],
    [42, undefined]
  ])('%p formats as %p', (input, expected) => {
    expect(formattingLocale(input)).toBe(expected);
  });

  test('every supported translation locale formats as itself', () => {
    for (const code of SUPPORTED_LOCALES) {
      expect(formattingLocale(code)).toBe(code);
    }
  });
});

describe('every locale formats with react-intl', () => {
  test('there is a file for each of the 26 Forge locales', () => {
    expect(LOCALE_CODES).toHaveLength(26);
  });

  test.each(LOCALE_CODES)('%s: every message parses, formats and keeps its text', locale => {
    const messages = flattenMessages(loadLocale(locale));
    const errors = [];
    const intl = createIntl({ locale, messages, onError: e => errors.push(e.message) });
    for (const id of Object.keys(messages)) {
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
  test('clock options keep their values and use translated labels', () => {
    expect(clockChoices(translateFor('en-GB'))).toEqual([
      { label: 'Automatic (Default)', value: 'auto' },
      { label: '12-hour', value: '12h' },
      { label: '24-hour', value: '24h' }
    ]);
    expect(clockChoices(translateFor('de-DE')).map(o => o.label)).toEqual(['Automatisch (Standard)', '12-Stunden', '24-Stunden']);
    expect(clockChoices(translateFor('ja-JP')).map(o => o.value)).toEqual(['auto', '12h', '24h']);
  });

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
