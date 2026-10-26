# Proposal: Translate the UI Into Every Forge Locale

## Overview

**Status as of 2026-10-26:** done in PR `i18n-all-locales`. Open risks that need the maintainer are marked ⬜ in section 7. Status values: ✅ done, ⬜ pending or open.

This implements item 3.3 of `codebase-review-2026-10.md`. Every user-visible string moves into `locales/<code>.json` and gets a translation for each of the 26 locales on the [Forge supported locale codes](https://developer.atlassian.com/platform/forge/manifest-reference/forge-supported-locale-codes/) page. This change touches strings only. It adds no components and changes no styling. Date formatting stays as it is, because item 3.2 owns it.

References:

- [Translations manifest reference](https://developer.atlassian.com/platform/forge/manifest-reference/translations/)
- [Internationalization guide](https://developer.atlassian.com/platform/forge/internationalization)
- [`useTranslation` hook for UI Kit](https://developer.atlassian.com/platform/forge/ui-kit/hooks/use-translation/)
- [Server-side i18n in `@forge/api`](https://developer.atlassian.com/platform/forge/runtime-reference/i18n/)

## What the library does (read from `node_modules`)

- `useTranslation()` from `@forge/react` 12.3.1 returns `{ ready, t, locale? }`. `t(key, defaultValue?)` returns the string, the default, or the key. It needs an `I18nProvider` above it, otherwise `ready` stays `false` and `t` returns the key. The provider reads `locale` from `view.getContext()`.
- `i18n.createTranslationFunction(locale)` from `@forge/api` 8.3.0 returns a promise of the same `t`.
- `t` does not interpolate. There is no placeholder syntax in Forge. The app adds its own `{name}` syntax with a small helper in `src/i18n.js`.
- Keys resolve one by one through the lookup order (the locale, its fallback rules, then the default). Keys can be nested and addressed with dots.
- `ensureLocale` in `@forge/i18n` maps `en_US` to `en-US`, `nb-NO` to `no-NO` and a bare `pt` to `pt-PT`. An unsupported locale such as `en-AU` falls to the default, which is `en-GB`.
- Files referenced from the manifest have a combined 100 KB limit. The default locale must contain every key or deployment fails.

## 1. String inventory

| # | Area and files | Strings | How it is translated | Status |
|---|----------------|---------|----------------------|--------|
| 1.1 | Manifest `title` and `description`, both macros (`manifest.yml`) | 4 | Already `i18n:` keys. Extend to all locales. | ✅ Done |
| 1.2 | Config panel labels and field descriptions, both macros (`non-repeating.jsx`, `repeating.jsx`) | 3 shared plus 5 per macro (labels, descriptions, placeholder) | `t('config....')` in the `Config` component, wrapped in `I18nProvider`. | ✅ Done |
| 1.3 | Display-format names (5) and repetition unit labels (4), including the `defaultValue` labels | 9 | Shared helper `src/frontend/displayOptionChoices.js` builds the option lists from `t`. Both macros use it. | ✅ Done |
| 1.4 | `validateConfig` messages in `src/configHelpers.js` | 6 | A message per field (`date`, `time`, `timeZone`, `repetitionPeriod`) plus a generic one with `{field}`. A per-field message avoids grammar problems that a joined "{field} not configured" sentence would cause in languages with gender or case. | ✅ Done |
| 1.5 | `parseTime` error | 1, with `{time}` | `t('error.invalidTime', { time })`. | ✅ Done |
| 1.6 | `Time Zone not configured` and the two `Repetition period` messages in the `App` components | 3 | The "not configured" messages reuse the `validateConfig` keys. The "must be a whole number" message has two keys, one with the "please configure" hint (macro) and one without (export). | ✅ Done |
| 1.7 | Co-located tooltip in `renderDateLozenge` (`src/frontend/common.jsx`) | 1 | `renderDateLozenge` is a plain function, so it receives `t` in its argument object. | ✅ Done |
| 1.8 | Export error documents and the countdown note (`src/adfExport.js`) | 1 plus the shared messages | Server-side `t` from `i18n.createTranslationFunction`. | ✅ Done |

Not translated: IANA timezone ids in the timezone select, log messages (`console.warn`), the `ddd, MMM DD, YYYY h:mma z` date format (item 3.2), and the `am` and `pm` tokens the time parser accepts. The time placeholder `12:00am` is a key so a locale can change it, but every locale keeps the `am/pm` form because the parser only accepts it.

Total: 39 keys per locale.

## 2. Design for strings shared by the frontend and the export

`src/configHelpers.js` runs in both places. The functions stay pure. `validateConfig(details, config, requiredFields, t)` and `parseTime(rawTime, t)` take a translate function `t(key, params)` and return a finished string. The edges build `t`:

- Frontend: `useTranslate()` in `src/frontend/useTranslate.js` wraps `useTranslation()` and the `{name}` helper.
- Export: `adfExport.js` builds the same kind of function from `i18n.createTranslationFunction(locale)`.

Tests supply a translator that reads `locales/en-GB.json`, so the English assertions keep their meaning. The English text stays identical to today's, except that the export now says "Repetition period not configured" where it said "RepetitionPeriod not configured".

## 3. Where the export gets the viewer's locale

The `adfExport` payload carries `context.accountId` but no locale (see `adf-export.md`, confirmed by the existing test payload shape). The Confluence v2 `users-bulk` response has no locale field either (`timeZone` only, checked against the published OpenAPI document). `GET /wiki/rest/api/user/current` returns a locale for the calling user, but the export runs as the app and there is no documented way to call it as the viewer.

Plan: read `payload.context.locale` if Forge supplies it, and use the default locale `en-GB` otherwise. The result is that exports are translated only when Forge sends a locale, and English otherwise. This is a known gap, and it goes to the maintainer as a decision (see Risks). A failure to create a translator falls back to `en-GB`, so an export never breaks because of i18n.

## 4. Locales

All 26 codes from the Forge page. Each gets `locales/<code>.json` and a `translations.resources` entry.

| Language | Code | Language | Code |
|----------|------|----------|------|
| Chinese (Simplified) | `zh-CN` | Korean | `ko-KR` |
| Chinese (Traditional) | `zh-TW` | Norwegian (Bokmål) | `no-NO` |
| Czech | `cs-CZ` | Polish | `pl-PL` |
| Danish | `da-DK` | Portuguese (Brazil) | `pt-BR` |
| Dutch | `nl-NL` | Portuguese (Portugal) | `pt-PT` |
| English (US) | `en-US` | Romanian | `ro-RO` |
| English (UK) | `en-GB` | Russian | `ru-RU` |
| Estonian | `et-EE` | Slovak | `sk-SK` |
| Finnish | `fi-FI` | Spanish | `es-ES` |
| French | `fr-FR` | Swedish | `sv-SE` |
| German | `de-DE` | Turkish | `tr-TR` |
| Hungarian | `hu-HU` | | |
| Icelandic | `is-IS` | | |
| Italian | `it-IT` | | |
| Japanese | `ja-JP` | | |

`pt-PT` is included at the maintainer's request although the Forge page says Confluence does not support it. Confluence users with that locale fall back to `pt-BR` on the product side. The file is still used by any Forge surface that does send `pt-PT`.

Spelling: `en-US` uses "Localized", `en-GB` uses "Localised". Other languages follow their own language.

Fallback: keep `default: en-GB`, which serves Australian spelling because `en-AU` is not a supported locale. No per-locale fallback rules. Every locale has a full file, so a rule such as `pt-PT: [pt-BR]` would never run, and `nb-NO` is already mapped to `no-NO` by `@forge/i18n`.

## 5. Translation approach

The text is written by the model, not by a professional translator. Rules: formal-neutral UI register, one term per concept across keys (timezone, repeat, countdown, macro configuration), Confluence's own term for "Macro Configuration" where the author knows it, and `{field}` and `{time}` kept verbatim. The PR states that review by native speakers is needed.

## 6. Test strategy

New `src/__tests__/locales.test.js`, run with the existing Jest setup:

- Each file is valid JSON and every `translations.resources` entry has a file, with no orphan files in `locales/`.
- Key sets equal the default locale's, with no missing keys and no extras.
- `{placeholder}` sets match the default locale for each key.
- No empty values.
- Every `i18n:` key in `manifest.yml` exists in the default locale.
- The manifest locales equal the 26 expected codes (the list is in the test with a link to the Forge page).
- The combined size of `locales/` is under 100 KB.
- Every `t('...')` key used in `src/` exists in the default locale (catches typos).

Updated tests: `configHelpers`, `adfExport` and `renderDateLozenge` pass a translator. New tests cover the `{name}` helper, the export locale choice and its fallback, and the config option helper.

I will break two of the new tests on purpose (drop a key, change a placeholder) to see them fail, then restore them.

## 7. Risks

| Risk | Mitigation | Status |
|------|------------|--------|
| 26 files may approach the 100 KB combined limit (CJK text is 3 bytes per character in UTF-8). | Test enforces it. Strings are kept short. | ✅ Done. 82 KB measured |
| Machine-written translations contain errors or odd terms. | PR says so and lists languages for reviewers. | ⬜ Open |
| Config panel components may not be able to call `useTranslation` at runtime. Library source says they can. It cannot be run here. | State it in the PR. The maintainer checks with `forge tunnel`. | ⬜ Open |
| The export has no viewer locale, so PDF and Word output stays English. | Use `context.locale` if present. Maintainer decides if more is needed. | ⬜ Open |
| Another branch migrates `moment` to Luxon and edits `adfExport.js`, `common.jsx` and their tests. | Edits here stay small and local to strings. The second PR to merge needs a small conflict fix. | ⬜ Open |
| `I18nProvider` makes the macro render nothing until the translation files load. | `ready` guard returns `null` briefly. Falls back to key text if a load fails, which tests cannot see. | ✅ Done |

## 8. Work plan

| # | Step | Status |
|---|------|--------|
| 8.1 | `src/i18n.js`, `useTranslate.js`, option helper | ✅ Done |
| 8.2 | Wire the frontend, `configHelpers` and `adfExport` | ✅ Done |
| 8.3 | `locales/en-GB.json` and `en-US.json` complete, then 24 more | ✅ Done |
| 8.4 | Manifest resources | ✅ Done |
| 8.5 | Tests, mutation checks, lint, `forge lint` | ✅ Done |
| 8.6 | Mark 3.3 done, open PR, check CI | ✅ Done |
