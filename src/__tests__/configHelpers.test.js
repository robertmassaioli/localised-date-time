import { validateConfig, parseTime } from '../configHelpers';

describe('validateConfig', () => {
  const validConfig = { date: '2024-11-15', time: '9:00 am', timeZone: 'Australia/Sydney' };

  test('returns error when details is null', () => {
    expect(validateConfig(null, validConfig)).toMatch(/not configured/i);
  });

  test('returns error when details is undefined', () => {
    expect(validateConfig(undefined, validConfig)).toMatch(/not configured/i);
  });

  test('returns error when config is null', () => {
    expect(validateConfig({}, null)).toMatch(/not configured/i);
  });

  test('returns error when config is undefined', () => {
    expect(validateConfig({}, undefined)).toMatch(/not configured/i);
  });

  test('returns error when date is missing', () => {
    const config = { time: '9:00 am', timeZone: 'Australia/Sydney' };
    expect(validateConfig({}, config)).toMatch(/date/i);
  });

  test('returns error when time is missing', () => {
    const config = { date: '2024-11-15', timeZone: 'Australia/Sydney' };
    expect(validateConfig({}, config)).toMatch(/time/i);
  });

  test('returns error when timeZone is missing', () => {
    const config = { date: '2024-11-15', time: '9:00 am' };
    expect(validateConfig({}, config)).toMatch(/timezone/i);
  });

  test('returns null when all required fields are present', () => {
    expect(validateConfig({}, validConfig)).toBeNull();
  });

  test('returns error for custom required field that is missing', () => {
    const error = validateConfig({}, validConfig, ['date', 'time', 'timeZone', 'repetitionUnit']);
    expect(error).toMatch(/repetitionunit/i);
  });

  test('returns null when all custom required fields are present', () => {
    const config = { ...validConfig, repetitionUnit: 'repeat-weekly', repetitionPeriod: '1' };
    expect(validateConfig({}, config, ['date', 'time', 'timeZone', 'repetitionUnit', 'repetitionPeriod'])).toBeNull();
  });
});

describe('parseTime', () => {
  test('parses "9:00 am" correctly', () => {
    const result = parseTime('9:00 am');
    expect(result.time).toBe('9:00');
    expect(result.meridiem).toBe('am');
    expect(result.error).toBeUndefined();
  });

  test('parses "12:45 pm" correctly', () => {
    const result = parseTime('12:45 pm');
    expect(result.time).toBe('12:45');
    expect(result.meridiem).toBe('pm');
  });

  test('parses "12:00am" (no space) correctly', () => {
    const result = parseTime('12:00am');
    expect(result.time).toBe('12:00');
    expect(result.meridiem).toBe('am');
  });

  test('parses uppercase "AM"', () => {
    const result = parseTime('9:00 AM');
    expect(result.time).toBe('9:00');
    expect(result.meridiem).toBe('AM');
  });

  test('parses uppercase "PM"', () => {
    const result = parseTime('1:30 PM');
    expect(result.time).toBe('1:30');
    expect(result.meridiem).toBe('PM');
  });

  test('returns error for 24-hour format', () => {
    const result = parseTime('14:00');
    expect(result.error).toBeDefined();
    expect(result.error).toMatch(/format/i);
  });

  test('returns error for completely invalid string', () => {
    const result = parseTime('not-a-time');
    expect(result.error).toBeDefined();
  });

  test('returns error for empty string', () => {
    const result = parseTime('');
    expect(result.error).toBeDefined();
  });

  test('returns error for out-of-range minutes', () => {
    const result = parseTime('9:60 am');
    expect(result.error).toBeDefined();
  });

  test('returns error for invalid hour 0', () => {
    // 0:00 am is not valid 12-hour format
    const result = parseTime('0:00 am');
    expect(result.error).toBeDefined();
  });

  test('returns error for invalid hour 13 in 12h format', () => {
    const result = parseTime('13:00 am');
    expect(result.error).toBeDefined();
  });
});
