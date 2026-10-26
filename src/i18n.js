/**
 * Small helpers around the Forge translation function.
 * Forge's `t(key, defaultValue)` does not interpolate, so the app uses `{name}` placeholders and fills them in here.
 * See https://developer.atlassian.com/platform/forge/ui-kit/hooks/use-translation/
 */

// Matches `default` in manifest.yml. en-AU is not a supported Forge locale, so en-GB serves Australian spelling.
export const DEFAULT_LOCALE = 'en-GB';

export function interpolate(text, params = {}) {
  return text.replace(/\{(\w+)\}/g, (placeholder, name) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : placeholder
  );
}

/**
 * Wraps a Forge `t(key, defaultValue)` function into `translate(key, params)`.
 */
export function makeTranslate(forgeT) {
  return (key, params) => interpolate(forgeT(key), params);
}
