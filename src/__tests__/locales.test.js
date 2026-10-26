import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..', '..');
const LOCALES_DIR = path.join(ROOT, 'locales');
const SRC_DIR = path.join(ROOT, 'src');

// Every locale code on https://developer.atlassian.com/platform/forge/manifest-reference/forge-supported-locale-codes/
const EXPECTED_LOCALES = [
  'zh-CN', 'zh-TW', 'cs-CZ', 'da-DK', 'nl-NL', 'en-US', 'en-GB', 'et-EE', 'fi-FI', 'fr-FR', 'de-DE', 'hu-HU', 'is-IS',
  'it-IT', 'ja-JP', 'ko-KR', 'no-NO', 'pl-PL', 'pt-BR', 'pt-PT', 'ro-RO', 'ru-RU', 'sk-SK', 'tr-TR', 'es-ES', 'sv-SE'
];

// https://developer.atlassian.com/platform/forge/manifest-reference/translations/ : files referenced from the manifest share 100 KB
const MAX_COMBINED_BYTES = 100 * 1024;

const manifest = fs.readFileSync(path.join(ROOT, 'manifest.yml'), 'utf8');
const translationsBlock = manifest.slice(manifest.indexOf('\ntranslations:'), manifest.indexOf('\nresources:'));
const resources = [...translationsBlock.matchAll(/- key: (\S+)\n\s+path: (\S+)/g)].map(m => ({ key: m[1], path: m[2] }));
const defaultLocale = /default: (\S+)/.exec(translationsBlock)[1];

function readLocale(code) {
  return JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, `${code}.json`), 'utf8'));
}

// Flattens nested objects to dotted keys, e.g. { a: { b: 'x' } } becomes { 'a.b': 'x' }
function flatten(node, prefix = '') {
  return Object.entries(node).reduce((flat, [key, value]) => {
    const full = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'object' && value !== null ? { ...flat, ...flatten(value, full) } : { ...flat, [full]: value };
  }, {});
}

const placeholdersOf = text => [...text.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort();

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(full);
    return /\.jsx?$/.test(entry.name) ? [full] : [];
  });
}

const defaultFlat = flatten(readLocale(defaultLocale));

describe('manifest translations', () => {
  test('the manifest lists exactly the Forge supported locales', () => {
    expect(resources.map(r => r.key).sort()).toEqual([...EXPECTED_LOCALES].sort());
  });

  test('the default fallback is a registered locale', () => {
    expect(defaultLocale).toBe('en-GB');
    expect(resources.map(r => r.key)).toContain(defaultLocale);
  });

  test.each(EXPECTED_LOCALES)('%s is registered with its own file name', code => {
    expect(resources.find(r => r.key === code)).toEqual({ key: code, path: `locales/${code}.json` });
  });

  test('every registered file exists and there are no orphan files', () => {
    resources.forEach(r => expect(fs.existsSync(path.join(ROOT, r.path))).toBe(true));
    const registered = resources.map(r => path.basename(r.path)).sort();
    expect(fs.readdirSync(LOCALES_DIR).sort()).toEqual(registered);
  });

  test('every i18n key used in the manifest exists in the default locale', () => {
    const keys = [...manifest.matchAll(/i18n: (\S+)/g)].map(m => m[1]);
    expect(keys.length).toBeGreaterThan(0);
    keys.forEach(key => expect(defaultFlat).toHaveProperty([key]));
  });

  test('every key used in src exists in the default locale', () => {
    const used = new Set();
    sourceFiles(SRC_DIR).forEach(file => {
      const code = fs.readFileSync(file, 'utf8');
      for (const m of code.matchAll(/\bt\(\s*['"`]([\w.]+)['"`]/g)) used.add(m[1]);
      for (const m of code.matchAll(/'((?:macro|config|error|tooltip|export)\.[\w.]+)'/g)) used.add(m[1]);
    });
    expect(used.size).toBeGreaterThan(30);
    used.forEach(key => expect(defaultFlat).toHaveProperty([key]));
  });

  test('every default locale key is used in src or the manifest', () => {
    const sources = sourceFiles(SRC_DIR).map(file => fs.readFileSync(file, 'utf8')).join('\n') + manifest;
    Object.keys(defaultFlat).forEach(key => expect([key, sources.includes(key)]).toEqual([key, true]));
  });

  test('the locale files fit in the 100 KB limit for manifest-referenced translations', () => {
    const total = resources.reduce((sum, r) => sum + fs.statSync(path.join(ROOT, r.path)).size, 0);
    expect(total).toBeLessThan(MAX_COMBINED_BYTES);
  });
});

describe.each(EXPECTED_LOCALES)('locale %s', code => {
  test('is valid JSON with only string values', () => {
    const flat = flatten(readLocale(code));
    Object.values(flat).forEach(value => expect(typeof value).toBe('string'));
  });

  test('has exactly the keys of the default locale', () => {
    const keys = Object.keys(flatten(readLocale(code))).sort();
    expect(keys).toEqual(Object.keys(defaultFlat).sort());
  });

  test('has no empty values', () => {
    Object.entries(flatten(readLocale(code))).forEach(([key, value]) => {
      expect([key, value.trim().length > 0]).toEqual([key, true]);
    });
  });

  test('keeps the placeholders of the default locale', () => {
    const flat = flatten(readLocale(code));
    Object.keys(defaultFlat).forEach(key => {
      expect([key, placeholdersOf(flat[key])]).toEqual([key, placeholdersOf(defaultFlat[key])]);
    });
  });

  test('keeps the am/pm time placeholder the time parser needs', () => {
    expect(readLocale(code).config.time.placeholder).toBe('12:00am');
  });
});

describe('spelling', () => {
  test('en-US says Localized and en-GB says Localised', () => {
    expect(readLocale('en-US').macro.nonrepeating.title).toBe('Localized date macro');
    expect(readLocale('en-GB').macro.nonrepeating.title).toBe('Localised date macro');
    expect(readLocale('en-US').config.displayOption.default).toContain('Localized');
    expect(readLocale('en-GB').config.displayOption.default).toContain('Localised');
  });
});
