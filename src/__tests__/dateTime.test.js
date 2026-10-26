import { DateTime } from 'luxon';
import { formatDefault, inZone, parseConfiguredDate, zoneAbbreviation } from '../dateTime';

const at = (iso, zone) => DateTime.fromISO(iso, { zone });

describe('parseConfiguredDate', () => {
  test('reads the date and time in the configured timezone', () => {
    const result = parseConfiguredDate('2024-11-15', '3:00', 'pm', 'Australia/Sydney');
    expect(result.toUTC().toISO()).toBe('2024-11-15T04:00:00.000Z');
    expect(result.zoneName).toBe('Australia/Sydney');
  });

  test.each([
    ['12:00', 'am', 0],
    ['12:30', 'pm', 12],
    ['1:05', 'AM', 1],
    ['11:59', 'PM', 23]
  ])('reads %s %s as hour %i', (time, meridiem, hour) => {
    expect(parseConfiguredDate('2024-01-10', time, meridiem, 'UTC').hour).toBe(hour);
  });

  test('accepts a date without leading zeros', () => {
    expect(parseConfiguredDate('2024-1-5', '3:00', 'pm', 'UTC').toISODate()).toBe('2024-01-05');
  });

  test.each([
    ['2024-02-30', 'a day that does not exist'],
    ['2024-13-01', 'a month that does not exist'],
    ['garbage', 'text']
  ])('gives an invalid date for %s (%s)', date => {
    expect(parseConfiguredDate(date, '3:00', 'pm', 'UTC').isValid).toBe(false);
  });

  test('moves a time inside a spring-forward gap to the hour after (New York, 8 Mar 2026)', () => {
    const result = parseConfiguredDate('2026-03-08', '2:30', 'am', 'America/New_York');
    expect(result.toFormat('HH:mm ZZ')).toBe('03:30 -04:00');
  });

  test('takes the first occurrence of a time that happens twice (New York, 1 Nov 2026)', () => {
    const result = parseConfiguredDate('2026-11-01', '1:30', 'am', 'America/New_York');
    expect(result.toFormat('HH:mm ZZ')).toBe('01:30 -04:00');
  });

  test('reads the date as UTC for an unknown timezone, as moment-timezone did', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const result = parseConfiguredDate('2024-11-15', '3:00', 'pm', 'Not/AZone');
    expect(result.toUTC().toISO()).toBe('2024-11-15T15:00:00.000Z');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('inZone', () => {
  test('keeps the instant and changes the zone', () => {
    const sydney = at('2024-11-15T15:00', 'Australia/Sydney');
    const newYork = inZone(sydney, 'America/New_York');
    expect(newYork.toMillis()).toBe(sydney.toMillis());
    expect(newYork.zoneName).toBe('America/New_York');
  });

  test('leaves the date alone for an unknown timezone', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const sydney = at('2024-11-15T15:00', 'Australia/Sydney');
    expect(inZone(sydney, 'Not/AZone').zoneName).toBe('Australia/Sydney');
    spy.mockRestore();
  });

  test('keeps the name GMT, which Luxon would turn into UTC', () => {
    expect(inZone(at('2024-11-15T15:00', 'UTC'), 'GMT').zoneName).toBe('GMT');
  });
});

describe('zoneAbbreviation', () => {
  // Intl names these "GMT+11", "GMT+1" and so on in most locales. The macro shows tz-database abbreviations.
  test.each([
    ['2024-01-15T12:00', 'Australia/Sydney', 'AEDT'],
    ['2024-07-15T12:00', 'Australia/Sydney', 'AEST'],
    ['2024-01-15T12:00', 'America/New_York', 'EST'],
    ['2024-07-15T12:00', 'America/New_York', 'EDT'],
    ['2024-07-15T12:00', 'America/Los_Angeles', 'PDT'],
    ['2024-01-15T12:00', 'Europe/London', 'GMT'],
    ['2024-07-15T12:00', 'Europe/London', 'BST'],
    ['2024-07-15T12:00', 'Europe/Dublin', 'IST'],
    ['2024-07-15T12:00', 'Europe/Paris', 'CEST'],
    ['2024-01-15T12:00', 'Pacific/Auckland', 'NZDT'],
    ['2024-01-15T12:00', 'Asia/Kolkata', 'IST'],
    ['2024-01-15T12:00', 'Asia/Tokyo', 'JST'],
    ['2024-01-15T12:00', 'Africa/Lagos', 'WAT'],
    ['2024-01-15T12:00', 'UTC', 'UTC']
  ])('%s in %s is %s', (iso, zone, abbreviation) => {
    expect(zoneAbbreviation(at(iso, zone))).toBe(abbreviation);
  });

  test.each([
    ['Asia/Dubai', '+04'],
    ['America/Sao_Paulo', '-03'],
    ['Asia/Kathmandu', '+0545']
  ])('%s has no letter abbreviation, so it shows the offset %s', (zone, abbreviation) => {
    expect(zoneAbbreviation(at('2024-01-15T12:00', zone))).toBe(abbreviation);
  });

  test('uses the abbreviation that applied at the time when an offset has changed names', () => {
    // Chihuahua was on Mountain time with DST until October 2022, then moved to Central standard time (both UTC-6 in summer)
    expect(zoneAbbreviation(at('2008-07-15T12:00', 'America/Chihuahua'))).toBe('MDT');
    expect(zoneAbbreviation(at('2024-07-15T12:00', 'America/Chihuahua'))).toBe('CST');
    expect(zoneAbbreviation(at('2012-07-15T12:00', 'Europe/Moscow'))).toBe('MSK');
  });
});

describe('formatDefault', () => {
  test('formats like "ddd, MMM DD, YYYY h:mma z"', () => {
    expect(formatDefault(at('2024-11-15T15:00', 'Australia/Sydney'))).toBe('Fri, Nov 15, 2024 3:00pm AEDT');
  });

  test('pads the day, not the hour, and uses lower case am and pm', () => {
    expect(formatDefault(at('2024-03-05T00:07', 'America/New_York'))).toBe('Tue, Mar 05, 2024 12:07am EST');
    expect(formatDefault(at('2024-03-05T09:07', 'America/New_York'))).toBe('Tue, Mar 05, 2024 9:07am EST');
    expect(formatDefault(at('2024-03-05T12:00', 'America/New_York'))).toBe('Tue, Mar 05, 2024 12:00pm EST');
  });

  test.each([
    ['2024-01-10', 'Jan'], ['2024-02-10', 'Feb'], ['2024-03-10', 'Mar'], ['2024-04-10', 'Apr'],
    ['2024-05-10', 'May'], ['2024-06-10', 'Jun'], ['2024-07-10', 'Jul'], ['2024-08-10', 'Aug'],
    ['2024-09-10', 'Sep'], ['2024-10-10', 'Oct'], ['2024-11-10', 'Nov'], ['2024-12-10', 'Dec']
  ])('abbreviates %s as %s', (iso, month) => {
    expect(formatDefault(at(`${iso}T12:00`, 'UTC'))).toContain(`, ${month} 10,`);
  });

  test('stays in English whatever the default locale is', () => {
    const french = DateTime.fromISO('2024-11-15T15:00', { zone: 'Australia/Sydney', locale: 'fr' });
    expect(formatDefault(french)).toBe('Fri, Nov 15, 2024 3:00pm AEDT');
  });

  test('prints "Invalid date" for an invalid date, as moment did', () => {
    expect(formatDefault(parseConfiguredDate('garbage', '3:00', 'pm', 'UTC'))).toBe('Invalid date');
  });
});
