import { isPresent } from 'ts-is-present';

// One message per known field, so each language can phrase it naturally.
const NOT_CONFIGURED_KEYS = {
  date: 'error.notConfigured.date',
  time: 'error.notConfigured.time',
  timeZone: 'error.notConfigured.timeZone',
  repetitionPeriod: 'error.notConfigured.repetitionPeriod'
};

/**
 * Validates the config object and returns an error message if required fields are missing.
 * Shared between frontend (common.jsx) and server-side (adfExport.js).
 * t(key, params) translates a message, see src/i18n.js.
 */
export function validateConfig(details, config, t, requiredFields = ['date', 'time', 'timeZone']) {
  if (!isPresent(details)) return t('error.notConfigured.macro');
  if (!isPresent(config)) return t('error.notConfigured.macro');
  for (const field of requiredFields) {
    if (!isPresent(config[field])) {
      const key = NOT_CONFIGURED_KEYS[field];
      return key ? t(key) : t('error.notConfigured.field', { field: field.charAt(0).toUpperCase() + field.slice(1) });
    }
  }
  return null;
}

/**
 * Parses and validates a time string. Returns { time, meridiem } or { error }.
 * Shared between frontend (common.jsx) and server-side (adfExport.js).
 * t(key, params) translates the error message, see src/i18n.js.
 */
export function parseTime(rawTime, t) {
  const timeMatch = /^(?<time>(1[012]|0?[1-9]):[0-5][0-9])\s?(?<meridiem>[aApP][mM])$/;
  const matchResult = timeMatch.exec(rawTime);
  if (!matchResult) {
    return { error: t('error.invalidTime', { time: rawTime }) };
  }
  return matchResult.groups;
}
