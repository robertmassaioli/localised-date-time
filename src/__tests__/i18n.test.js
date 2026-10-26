import { DEFAULT_LOCALE, interpolate, makeTranslate } from '../i18n';
import { displayOptionChoices, repetitionUnitChoices } from '../frontend/displayOptionChoices';
import { FORMAT_DEFAULT, FORMAT_NASA_COUNTDOWN } from '../displayOptions';
import { REPEAT_HOURLY, REPEAT_WEEKLY } from '../repetition';
import { translateFor } from './translate';

describe('interpolate', () => {
  test('fills in named placeholders', () => {
    expect(interpolate('Time "{time}" is invalid', { time: '25:99' })).toBe('Time "25:99" is invalid');
  });

  test('fills in the same placeholder twice', () => {
    expect(interpolate('{a} and {a}', { a: 'x' })).toBe('x and x');
  });

  test('leaves unknown placeholders in place', () => {
    expect(interpolate('Hello {name}', {})).toBe('Hello {name}');
  });

  test('leaves text without placeholders alone', () => {
    expect(interpolate('Plain (am|pm)')).toBe('Plain (am|pm)');
  });

  test('does not treat inherited object properties as params', () => {
    expect(interpolate('{constructor}', {})).toBe('{constructor}');
  });

  test('converts numbers to text', () => {
    expect(interpolate('{n}', { n: 0 })).toBe('0');
  });
});

describe('makeTranslate', () => {
  test('translates the key and applies params', () => {
    const t = makeTranslate(key => ({ greeting: 'Hi {name}' }[key] ?? key));
    expect(t('greeting', { name: 'Ana' })).toBe('Hi Ana');
  });

  test('returns the key when it is missing, like Forge does', () => {
    const t = makeTranslate(key => key);
    expect(t('missing.key')).toBe('missing.key');
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
