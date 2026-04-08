import { isPresent } from 'ts-is-present';

/**
 * Validates the config object and returns an error message if required fields are missing.
 * Shared between frontend (common.jsx) and server-side (adfExport.js).
 */
export function validateConfig(details, config, requiredFields = ['date', 'time', 'timeZone']) {
  if (!isPresent(details)) return "Macro not configured. Please configure it in the Macro Configuration.";
  if (!isPresent(config)) return "Macro not configured. Please configure it in the Macro Configuration.";
  for (const field of requiredFields) {
    if (!isPresent(config[field])) return `${field.charAt(0).toUpperCase() + field.slice(1)} not configured. Please configure it in the Macro Configuration.`;
  }
  return null;
}

/**
 * Parses and validates a time string. Returns { time, meridiem } or { error }.
 * Shared between frontend (common.jsx) and server-side (adfExport.js).
 */
export function parseTime(rawTime) {
  const timeMatch = /^(?<time>(1[012]|0?[1-9]):[0-5][0-9])\s?(?<meridiem>[aApP][mM])$/;
  const matchResult = timeMatch.exec(rawTime);
  if (!matchResult) {
    return { error: `Time "${rawTime}" not in the "XX:XX (am|pm)" format! Example, valid values are: "9:00 am" or "12:45 pm".` };
  }
  return matchResult.groups;
}
