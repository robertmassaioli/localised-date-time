// Test helper, not a test file. Reads the real locale files, like the app does.
import fs from 'fs';
import path from 'path';
import { createTranslator } from '../i18n';

const LOCALES_DIR = path.join(__dirname, '..', '..', 'locales');

export function loadLocale(code) {
  return JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, `${code}.json`), 'utf8'));
}

/**
 * The app's `t(key, params)` for a locale, built with react-intl from the real locale files.
 */
export function translateFor(code = 'en-GB') {
  return createTranslator(code, loadLocale(code));
}
