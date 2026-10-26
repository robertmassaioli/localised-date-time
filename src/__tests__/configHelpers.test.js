import { validateConfig, parseTime } from '../configHelpers';
import { translateFor } from './translate';

const t = translateFor('en-GB');

describe('validateConfig', () => {
  const validConfig = { date: '2024-11-15', time: '9:00 am', timeZone: 'Australia/Sydney' };

  test('returns error when details is null', () => {
    expect(validateConfig(null, validConfig, t)).toMatch(/not configured/i);
  });

  test('returns error when details is undefined', () => {
    expect(validateConfig(undefined, validConfig, t)).toMatch(/not configured/i);
  });

  test('returns error when config is null', () => {
    expect(validateConfig({}, null, t)).toMatch(/not configured/i);
  });

  test('returns error when config is undefined', () => {
    expect(validateConfig({}, undefined, t)).toMatch(/not configured/i);
  });

  test('returns error when date is missing', () => {
    const config = { time: '9:00 am', timeZone: 'Australia/Sydney' };
    expect(validateConfig({}, config, t)).toMatch(/date/i);
  });

  test('returns error when time is missing', () => {
    const config = { date: '2024-11-15', timeZone: 'Australia/Sydney' };
    expect(validateConfig({}, config, t)).toMatch(/time/i);
  });

  test('returns error when timeZone is missing', () => {
    const config = { date: '2024-11-15', time: '9:00 am' };
    expect(validateConfig({}, config, t)).toMatch(/time zone not configured/i);
  });

  test('uses the generic message with the field name for an unknown field', () => {
    expect(validateConfig({}, validConfig, t, ['date', 'repetitionUnit'])).toBe('RepetitionUnit not configured. Please configure it in the Macro Configuration.');
  });

  test('returns the message in the requested language', () => {
    expect(validateConfig({}, { time: '9:00 am', timeZone: 'UTC' }, translateFor('es-ES'))).toBe('La fecha no está configurada. Configúralo en la configuración de la macro.');
    expect(parseTime('x', translateFor('de-DE')).error).toBe('Die Uhrzeit „x“ hat nicht das Format „XX:XX (am|pm)“! Gültige Beispiele: „9:00 am“ oder „12:45 pm“.');
  });

  test('returns null when all required fields are present', () => {
    expect(validateConfig({}, validConfig, t)).toBeNull();
  });

  test('returns error for custom required field that is missing', () => {
    const error = validateConfig({}, validConfig, t, ['date', 'time', 'timeZone', 'repetitionUnit']);
    expect(error).toMatch(/repetitionunit/i);
  });

  test('returns null when all custom required fields are present', () => {
    const config = { ...validConfig, repetitionUnit: 'repeat-weekly', repetitionPeriod: '1' };
    expect(validateConfig({}, config, t, ['date', 'time', 'timeZone', 'repetitionUnit', 'repetitionPeriod'])).toBeNull();
  });
});

describe('parseTime', () => {
  test('parses "9:00 am" correctly', () => {
    const result = parseTime('9:00 am', t);
    expect(result.time).toBe('9:00');
    expect(result.meridiem).toBe('am');
    expect(result.error).toBeUndefined();
  });

  test('parses "12:45 pm" correctly', () => {
    const result = parseTime('12:45 pm', t);
    expect(result.time).toBe('12:45');
    expect(result.meridiem).toBe('pm');
  });

  test('parses "12:00am" (no space) correctly', () => {
    const result = parseTime('12:00am', t);
    expect(result.time).toBe('12:00');
    expect(result.meridiem).toBe('am');
  });

  test('parses uppercase "AM"', () => {
    const result = parseTime('9:00 AM', t);
    expect(result.time).toBe('9:00');
    expect(result.meridiem).toBe('AM');
  });

  test('parses uppercase "PM"', () => {
    const result = parseTime('1:30 PM', t);
    expect(result.time).toBe('1:30');
    expect(result.meridiem).toBe('PM');
  });

  test('returns error for 24-hour format', () => {
    const result = parseTime('14:00', t);
    expect(result.error).toBeDefined();
    expect(result.error).toMatch(/format/i);
  });

  test('returns error for completely invalid string', () => {
    const result = parseTime('not-a-time', t);
    expect(result.error).toBeDefined();
  });

  test('returns error for empty string', () => {
    const result = parseTime('', t);
    expect(result.error).toBeDefined();
  });

  test('returns error for out-of-range minutes', () => {
    const result = parseTime('9:60 am', t);
    expect(result.error).toBeDefined();
  });

  test('returns error for invalid hour 0', () => {
    // 0:00 am is not valid 12-hour format
    const result = parseTime('0:00 am', t);
    expect(result.error).toBeDefined();
  });

  test('returns error for invalid hour 13 in 12h format', () => {
    const result = parseTime('13:00 am', t);
    expect(result.error).toBeDefined();
  });
});
