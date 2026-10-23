// Temporary diagnostics for the "Macro not configured" investigation.
// Set to false (or delete this file and its callers) once the problem is understood.
export const DEBUG = true;

const PREFIX = '[localised-date-macro]';

export function debugLog(...args) {
  if (DEBUG) {
    console.log(PREFIX, ...args);
  }
}

export function debugError(...args) {
  if (DEBUG) {
    console.error(PREFIX, ...args);
  }
}
