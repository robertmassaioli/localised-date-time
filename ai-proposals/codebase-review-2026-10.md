# Proposal: Codebase Review and Next Steps (October 2026)

## Overview

**Status as of 2026-10-26:** section 1 is done and in PR #10. Section 2 is done except 2.6 (the `npm audit` review, deferred on request) and is on the branch `codebase-review-batch-2`. Sections 3 and 4 are pending, except 3.1, which is won't do for now. Status values: ✅ done, ⬜ pending or open, ⛔ won't do.

A full read of the Localised Date Macro codebase after the Forge dependency upgrade (`@forge/react` 12, `@forge/bridge` 7, `@forge/api` 8, `@forge/resolver` 2) and the `useConfig` fix. This document lists what is broken, what is risky, and what we could add. It continues `improvements.md`, which still has four pending items (#5, #7, #8, #9). Where an item here overlaps one of those, the table says so.

Evidence for each item comes from reading the source, running `npm run lint`, running `npm test` and running `npm audit --omit=dev` on `main` at `ef1990f`.

---

## 1. Bugs and broken things

These are the first batch to fix. They are small, and the branch `codebase-review-fixes` carries the fixes.

| # | Problem | Fix | Effort | Status |
|---|---------|-----|--------|--------|
| 1.1 | `npm run lint` fails with 4 parse errors. `.eslintrc` sets `ecmaVersion: 2017`, so ESLint cannot parse `?.` or named regex groups. The script also prints "a Forge UI hook is being used incorrectly" for any failure. | Set `ecmaVersion` to 2021 (the maximum ESLint 7 supports). Quote the glob. Drop the misleading `hook-errors` fallback. | XS | ✅ Done (PR #10) |
| 1.2 | Config labels say "(Default)" but no `Select` has a `defaultValue`. A new repeating macro with the unit untouched shows "Repetition period not configured". | Add `defaultValue` to the display format and repetition unit selects. Also treat a missing repetition unit as weekly in the macro and the export, in case Forge does not save an untouched default. | XS | ✅ Done (PR #10) |
| 1.3 | The Time field description says "in your local time", but the time is read in the selected timezone. | Correct the description in both macros. A `TimePicker` is a follow-up (see 3.1). | XS | ✅ Done (PR #10) |
| 1.4 | `.forge/` (tunnel output) is untracked and not in `.gitignore`. | Add it to `.gitignore`. | XS | ✅ Done (PR #10) |
| 1.5 | `PRIVACY.md` has a typo: "Configuratino". | Fix the typo. | XS | ✅ Done (PR #10) |
| 1.6 | Dead code: `src/useEffectAsync.js` is unused since the `useConfig` change. `common.jsx` builds `key={`badge-${now}`}` from a fresh `moment()` on every render, which has no effect. | Delete the file. Remove the `now` key and the unused import. | XS | ✅ Done (PR #10) |

---

## 2. Quality and safety

| # | Problem | Fix | Effort | Status |
|---|---------|-----|--------|--------|
| 2.1 | `adfExport.js` has 23 `console` calls left from the timezone investigation. They log `accountId` and full configs. | Keep warnings and errors only. Stop logging account IDs and full configs. | S | ✅ Done (batch 2) |
| 2.2 | `getUserTimezone` does not check `response.ok`. A 403 or 500 silently falls back to the configured timezone, so an export can show the wrong zone with no signal. | Check the status and log a warning on failure. | XS | ✅ Done (batch 2) |
| 2.3 | `repetition.test.js` uses the real clock. It can fail around DST changes or month boundaries. | Use Jest fake timers. Add DST cases for the repeat maths. | S | ✅ Done (batch 2) |
| 2.4 | No tests cover `adfExport.js`, `renderDateLozenge` or `useDateMacroContext`. | Add tests, starting with `adfExport` (mock `@forge/api`). Done: `adfExport.test.js` (21 tests), `renderDateLozenge.test.js` and `useDateMacroContext.test.js`. The mocks stand in for `@forge/api` and `@forge/react`, which cannot load outside Forge. `@babel/preset-react` and `react-test-renderer` are new devDependencies. | M | ✅ Done (batch 2) |
| 2.5 | There is no CI. Item 1.1 would have been caught by one. | Add a GitHub Actions workflow that runs `npm ci`, `npm run lint` and `npm test`. `package-lock.json` records Artifactory download URLs that a public runner cannot reach, so the workflow rewrites the URL prefix to `registry.npmjs.org` before `npm ci`. I checked this on a clean copy with no Atlassian credentials. The first real run happens when the branch is pushed. | S | ✅ Done (batch 2) |
| 2.6 | `npm audit --omit=dev` reports 12 vulnerabilities (3 moderate, 9 high), including a ProseMirror paste-handling XSS. They look like transitive dependencies of `@forge/react`. | Check whether the macro is exposed to any of them. Re-run after Forge releases. Deferred on request. | S | ⬜ Open (deferred) |
| 2.7 | `package.json` has `"main": "index.js"`, which does not exist. The README still shows plain `forge deploy` and not `deploy:dev` and `deploy:prod`. | Remove `main`. Update the README commands. Done, and the README now mentions CI and `forge install --upgrade`. | XS | ✅ Done (batch 2) |
| 2.8 | The lockfile pins `@atlaskit/adf-utils` at 20.9.78 because 20.9.79 needs a package the registry does not have yet. A fresh install without the lockfile can fail. | Revisit once the registry catches up. Overlaps `improvements.md` #8. The registry now has `tmp-editor-statsig` 246.0.0, and `adf-utils` resolves at 20.9.79 with no pin. | XS | ✅ Done (batch 2) |

---

## 3. New functionality

| # | Idea | Notes | Effort | Status |
|---|------|-------|--------|--------|
| 3.1 | `TimePicker` for the time field, with 24-hour input | Removes the free-text format errors. Stored values stay in the existing "h:mm am/pm" form so saved macros keep working. Overlaps `improvements.md` #5. | S | ⛔ Won't do (for now) |
| 3.2 | Format dates in the viewer's locale and clock | `displayText` always uses `ddd, MMM DD, YYYY h:mma z`, so a 24-hour locale still sees am/pm. `context.locale` is available. `Intl.DateTimeFormat` with the viewer's locale and timezone fixes it. | M | ⬜ Pending |
| 3.3 | Translate the UI strings | The macro titles and descriptions are translated. The config labels, descriptions, errors and display-format names are not. Also settle "Localised" versus "Localized" in the UI. `en-AU` is not a supported Forge locale, so `en-GB` stays the default fallback. | M | ⬜ Pending |
| 3.4 | Monthly repetition | Overlaps `improvements.md` #9. | XS | ⬜ Pending |
| 3.5 | Richer tooltip | Show the original time, UTC, the relative time and the configured zone on hover, in addition to the chosen display format. | S | ⬜ Pending |
| 3.6 | Past, happening-now and upcoming states | Use the `Lozenge` appearance to show which state an event is in. | S | ⬜ Pending |
| 3.7 | More repeat options | "Until" end dates, specific weekdays, skipped occurrences. | M | ⬜ Pending |

---

## 4. Maintainability

| # | Problem | Fix | Effort | Status |
|---|---------|-----|--------|--------|
| 4.1 | Both macros duplicate their Config forms and the display option lists. Only the hook was shared. | Pull the shared fields (Time, Date, Timezone, Display format) into one component. | M | ⬜ Pending |
| 4.2 | `src/timezones.js` is a 600-line generated file that includes legacy aliases such as `Africa/Asmera` next to `Africa/Asmara`. | Use `Intl.supportedValuesOf('timeZone')` or `moment.tz.names()` and remove the file and `generate-options.js`. | S | ⬜ Pending |
| 4.3 | `moment` is in maintenance mode. | Move to `Intl` or Luxon. Best done together with 3.2. | M | ⬜ Pending |
| 4.4 | Label associations on the config form (`improvements.md` #7). | See that document. | S | ⬜ Pending |

---

## Suggested order

1. Batch one: section 1. One small PR, already on `codebase-review-fixes`.
2. Batch two: 2.1, 2.2, 2.5, 2.7 and `improvements.md` #8. Logging, export correctness, CI and hygiene.
3. Batch three: 2.3 and 2.4. Tests for the code most likely to break quietly.
4. Features: 3.2 and 3.3 first, then 3.1 and 3.4.
5. Refactors: 4.1 and 4.2 once the tests from batch three are in.

## Open questions

- Should 3.1 replace the free-text Time field outright, or sit beside it for a release? Saved configs use the "h:mm am/pm" string.
- Is the `en-GB` default acceptable for users in locales Forge does not support?
- Which of the 12 audit findings does Atlassian's own scanning already cover?
