// Test helper, not a test file. Builds translate functions from the real locale files,
// the same way Forge resolves keys: a nested JSON path split on dots, falling back to the key itself.
import fs from 'fs';
import path from 'path';
import { makeTranslate } from '../i18n';

const LOCALES_DIR = path.join(__dirname, '..', '..', 'locales');

export function loadLocale(code) {
  return JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, `${code}.json`), 'utf8'));
}

function lookup(translations, key) {
  const value = key.split('.').reduce((node, token) => (node && typeof node === 'object' ? node[token] : undefined), translations);
  return typeof value === 'string' ? value : null;
}

/**
 * Stand-in for Forge's `t(key, defaultValue)`.
 */
export function forgeTFor(code) {
  const translations = loadLocale(code);
  return (key, defaultValue) => lookup(translations, key) ?? defaultValue ?? key;
}

/**
 * Stand-in for the app's `t(key, params)`, as built by makeTranslate.
 */
export function translateFor(code = 'en-GB') {
  return makeTranslate(forgeTFor(code));
}
