import { DateTime, IANAZone } from 'luxon';
import { TimeZoneAbbreviations } from './timezoneAbbreviations';

// moment always formatted in English, so every date the macro builds is pinned to 'en'
const LOCALE = 'en';

/**
 * Parses the configured date and time in the configured timezone. The time must already
 * have passed `parseTime`, so it is "h:mm" with a separate "am" or "pm".
 * An unparseable date gives an invalid DateTime (`isValid` is false), like moment did.
 * An unknown timezone is read as UTC, which is what moment-timezone did after logging an error.
 */
export function parseConfiguredDate(date, time, meridiem, zone) {
  let parseZone = zone;
  if (!IANAZone.isValidZone(zone)) {
    console.error(`[dateTime] Unknown timezone "${zone}", reading the date as UTC`);
    parseZone = 'UTC';
  }
  // An IANAZone object keeps names such as "GMT" intact, where Luxon turns the string "GMT" into UTC
  return DateTime.fromFormat(`${date} ${time} ${meridiem}`, 'yyyy-M-d h:mm a', { zone: IANAZone.create(parseZone), locale: LOCALE });
}

/**
 * Returns the same instant in another timezone. An unknown timezone leaves the date as it
 * is, which is what moment-timezone did after logging an error.
 */
export function inZone(date, zone) {
  if (!IANAZone.isValidZone(zone)) {
    console.error(`[dateTime] Unknown timezone "${zone}", keeping the date in ${date.zoneName}`);
    return date;
  }
  return date.setZone(IANAZone.create(zone));
}

function pad(number) {
  return String(number).padStart(2, '0');
}

/**
 * The tz-database abbreviation for the zone and offset of the date, such as "AEDT" or "EST".
 * Zones that the database only names with a number (such as "+04") get that number, built
 * from the offset.
 */
export function zoneAbbreviation(date) {
  const known = TimeZoneAbbreviations[date.zoneName]?.[date.offset];
  if (typeof known === 'string') {
    return known;
  }
  if (Array.isArray(known)) {
    // One offset that carried several abbreviations over time, as [abbreviation, until] pairs
    const instant = date.toMillis();
    const period = known.find(entry => typeof entry === 'string' || instant < entry[1]);
    return typeof period === 'string' ? period : period[0];
  }
  return numericAbbreviation(date.offset);
}

/**
 * The tz-database form of a numeric abbreviation: "+04", "-03" or "+0530".
 */
export function numericAbbreviation(offset) {
  const sign = offset < 0 ? '-' : '+';
  const hours = Math.floor(Math.abs(offset) / 60);
  const minutes = Math.abs(offset) % 60;
  return `${sign}${pad(hours)}${minutes > 0 ? pad(minutes) : ''}`;
}

/**
 * Formats like moment's 'ddd, MMM DD, YYYY h:mma z', for example "Fri, Nov 15, 2024 3:00pm AEDT".
 */
export function formatDefault(date) {
  if (!date.isValid) {
    return 'Invalid date';
  }
  const english = date.setLocale(LOCALE);
  const meridiem = english.hour < 12 ? 'am' : 'pm';
  return `${english.toFormat('ccc, LLL dd, yyyy h:mm')}${meridiem} ${zoneAbbreviation(english)}`;
}

// The Intl parts that make up a date line. `timeZoneName` is replaced by our own abbreviation, see formatDateTime.
const DATE_LINE_OPTIONS = {
  weekday: 'short',
  month: 'short',
  day: '2-digit',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short'
};

/**
 * Formats a date in the viewer's locale, for example "Fri, 15 Nov 2024, 15:00 AEDT" in en-GB or
 * "Fr., 15. Nov. 2024, 15:00 AEDT" in de-DE. The layout, names and clock come from Intl.
 *
 * `Intl` gives zone names such as "GMT+11" in most locales, so the zone part is swapped for the
 * tz-database abbreviation (AEDT, EST), which keeps each locale's layout, including zones in brackets
 * or placed first. https://moment.github.io/luxon/api-docs/index.html#datetimetolocaleparts
 *
 * `hourCycle` ('h12' or 'h23') overrides the locale's own clock, see clock.js.
 * Without a locale this is the legacy English pattern, which exports keep because Forge sends no viewer locale to them.
 */
export function formatDateTime(date, { locale, hourCycle } = {}) {
  if (!date.isValid) {
    return 'Invalid date';
  }
  if (!locale) {
    return formatDefault(date);
  }
  try {
    const abbreviation = zoneAbbreviation(date);
    return date
      .setLocale(locale)
      .toLocaleParts({ ...DATE_LINE_OPTIONS, ...(hourCycle ? { hourCycle } : {}) })
      .map(part => (part.type === 'timeZoneName' ? abbreviation : part.value))
      .join('');
  } catch (error) {
    // A malformed locale tag makes Intl throw, so show the legacy pattern and not an error
    console.warn(`[dateTime] could not format for locale "${locale}":`, error);
    return formatDefault(date);
  }
}
