import fs from 'fs';
import path from 'path';
import { createIntl } from 'react-intl';
import { createTranslator, DEFAULT_LOCALE, flattenMessages } from '../i18n';
import { displayOptionChoices, repetitionUnitChoices } from '../frontend/displayOptionChoices';
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
