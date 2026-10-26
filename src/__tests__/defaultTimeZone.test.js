import { defaultTimeZoneOption } from '../defaultTimeZone';
import { TimeZones } from '../timezones';

describe('defaultTimeZoneOption', () => {
  it('returns the matching option for a known zone', () => {
    expect(defaultTimeZoneOption('Australia/Sydney', TimeZones)).toEqual({
      label: 'Australia/Sydney',
      value: 'Australia/Sydney'
    });
  });

  it('uses the zone name as both label and value, as the option list does', () => {
    const option = defaultTimeZoneOption('America/New_York', ['America/New_York']);
    expect(option.label).toBe('America/New_York');
    expect(option.value).toBe('America/New_York');
  });

  it('returns undefined for a zone that is not in the list', () => {
    expect(defaultTimeZoneOption('Mars/Olympus_Mons', TimeZones)).toBeUndefined();
  });

  it('returns undefined for undefined, null and an empty string', () => {
    expect(defaultTimeZoneOption(undefined, TimeZones)).toBeUndefined();
    expect(defaultTimeZoneOption(null, TimeZones)).toBeUndefined();
    expect(defaultTimeZoneOption('', TimeZones)).toBeUndefined();
  });

  it('returns undefined for a value that is not a string', () => {
    expect(defaultTimeZoneOption(['Australia/Sydney'], TimeZones)).toBeUndefined();
    expect(defaultTimeZoneOption(10, TimeZones)).toBeUndefined();
  });

  it('matches by exact name, so a legacy alias keeps its own entry', () => {
    expect(TimeZones).toEqual(expect.arrayContaining(['Asia/Kolkata', 'Asia/Calcutta']));
    expect(defaultTimeZoneOption('Asia/Calcutta', TimeZones).value).toBe('Asia/Calcutta');
    expect(defaultTimeZoneOption('Asia/Kolkata', TimeZones).value).toBe('Asia/Kolkata');
  });

  it('does not match when the case differs', () => {
    expect(defaultTimeZoneOption('australia/sydney', TimeZones)).toBeUndefined();
  });

  it('returns an option for every zone in the list', () => {
    TimeZones.forEach(zone => {
      expect(defaultTimeZoneOption(zone, TimeZones)).toEqual({ label: zone, value: zone });
    });
  });
});
