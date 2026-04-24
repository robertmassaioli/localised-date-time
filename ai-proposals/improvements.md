# Proposal: 10 Improvements for the Localised Date Macro

## Overview

This document proposes 10 improvements across functional, security, code quality, developer experience, and documentation dimensions for the Confluence Forge app that renders localised and repeating date/time macros.

---

## 1. 🔒 Security: Replace `moment.tz.setDefault()` with Explicit Timezone Parsing

**Category:** Security / Correctness  
**Files affected:** `src/frontend/non-repeating.jsx`, `src/frontend/repeating.jsx`

### Problem

Both frontend components call `moment.tz.setDefault(config.timeZone)` before parsing the date. This mutates global `moment` state, which is a side effect that persists across renders and could affect unrelated code (including any third-party library using `moment`). In a concurrent rendering environment (React StrictMode is already enabled), this is a race condition waiting to happen.

There are even commented-out `console.log` lines nearby, suggesting this area was actively being debugged:

```js
moment.tz.setDefault(config.timeZone);
// const configuredTimezone = config.timeZone;
// console.log(`${configuredDate}, ${configuredTimezone}`);
const originalDate = moment(configuredDate, 'YYYY-MM-DD h:mma');
```

### Proposed Fix

Use the explicit timezone-aware parser instead:

```js
// Before
moment.tz.setDefault(config.timeZone);
const originalDate = moment(configuredDate, 'YYYY-MM-DD h:mma');

// After
const originalDate = moment.tz(configuredDate, 'YYYY-MM-DD h:mma', config.timeZone);
```

This is exactly how `adfExport.js` (the server-side path) already does it — so the fix also improves consistency between client and server rendering.

---

## 2. 🧹 Code Quality: Eliminate Dead Code and Commented-Out Blocks

**Category:** Code Quality / Maintainability  
**Files affected:** `src/frontend/non-repeating.jsx`, `src/frontend/repeating.jsx`, `src/adfExport.js`, `src/repetition.js`

### Problem

There are multiple instances of commented-out code, unused variables, and debug leftovers scattered across the codebase:

- **`non-repeating.jsx` and `repeating.jsx`:** `const [now, setNow] = useState(new Date())` — `now` is set but only used as a cache-buster key (`key={`badge-${now}`}`) in `common.jsx`, yet `now` itself is a local state variable in each App component that is never passed down. The lozenge `key` in `common.jsx` uses a freshly created `moment()` rather than this state.
- **`non-repeating.jsx` / `repeating.jsx`:** Commented-out `console.log` and variable declarations.
- **`adfExport.js`:** A commented-out `console.info` line for the raw API response (line 26).
- **`repetition.js`:** Commented-out `console.log` statements and example usage comments that belong in tests, not source.

### Proposed Fix

- Remove all commented-out `console.log` / `console.info` blocks.
- Audit the `now` state variable — either wire it correctly through to `common.jsx` (so the key properly forces re-renders during countdown mode) or remove it and let the `setInterval` trigger re-renders via a dedicated state update.
- Move usage examples from source comments into a dedicated test file.

---

## 3. 🧪 Testing: Add a Unit Test Suite

**Category:** Developer Experience / Reliability  
**Files affected:** New files under `src/__tests__/`

### Problem

The repository has zero automated tests. Logic-heavy modules — `repetition.js`, `configHelpers.js`, `displayOptions.js` — are entirely untested. This makes refactoring risky and regressions invisible.

Key functions that are immediately testable without any Forge mocking:

- `nextRepeatDate()` — complex date arithmetic with edge cases (event in the future, today, multi-period gaps).
- `repetitionToUnits()` — trivial but worth covering.
- `validateConfig()` — various missing-field permutations.
- `parseTime()` — regex validation; edge cases like `12:00am`, `1:00 PM`, invalid strings.
- `displayText()` — NASA countdown format, human countdown, default formatting.

### Proposed Fix

Add Jest (or Vitest) with a minimal config and write unit tests for the above. Example test shape:

```js
// src/__tests__/repetition.test.js
import { nextRepeatDate } from '../repetition';

test('returns start date when it is in the future', () => {
  const future = moment().add(1, 'week');
  expect(nextRepeatDate(future, 1, 'weeks').isSame(future)).toBe(true);
});
```

---

## 4. 📖 Documentation: Rewrite the README to Reflect the Actual App

**Category:** Documentation  
**Files affected:** `README.md`

### Problem

The README is verbatim boilerplate from the Forge "Hello World" template:

> _"This project contains a Forge app written in Javascript that displays `Hello World!` in a Confluence macro."_

This is factually wrong — the app does not display "Hello World". It is a sophisticated timezone-localisation macro with two variants, five display formats, and ADF export support. A new contributor or reviewer would get zero useful information from the current README.

### Proposed Fix

Rewrite the README to include:

- **What the app does** — a plain-English description of both macros and why they are useful.
- **Configuration reference** — document every config field (`date`, `time`, `timeZone`, `displayOption`, `repetitionUnit`, `repetitionPeriod`) with valid values and examples.
- **Display format guide** — explain the five display options, especially the countdown formats and their static-export fallback behaviour.
- **Architecture overview** — client-side rendering vs. ADF export path, and why both exist.
- **Development workflow** — keep the `forge deploy` / `forge tunnel` commands but add how to regenerate timezones (`npm run gen-options`).

---

## 5. ⚡ Functional: Add 24-Hour / ISO 8601 Time Input Support

**Category:** Functional  
**Files affected:** `src/configHelpers.js`, `src/frontend/non-repeating.jsx`, `src/frontend/repeating.jsx`

### Problem

The time input only accepts 12-hour AM/PM format (e.g. `9:00 am`). Users in countries where 24-hour time is standard — the majority of the world — must mentally convert their times before entering them. The regex in `parseTime()` explicitly rejects anything without `am`/`pm`:

```js
const timeMatch = /^(?<time>(1[012]|0?[1-9]):[0-5][0-9])\s?(?<meridiem>[aApP][mM])$/;
```

The error message even states: `Time "14:00" not in the "XX:XX (am|pm)" format!`

### Proposed Fix

Extend `parseTime()` to also accept 24-hour strings (`HH:MM`) and convert them internally to 12-hour + meridiem before passing to `moment`. Update the config field placeholder and description accordingly. The public API of `parseTime` (returning `{ time, meridiem }`) stays the same, preserving all call sites.

---

## 6. 🔒 Security: Validate `repetitionPeriod` Against `parseInt` Silent Failures

**Category:** Security / Robustness  
**Files affected:** `src/frontend/repeating.jsx`

### Problem

The current `repetitionPeriod` parsing uses a bare `try/catch` around `parseInt`, but `parseInt` in JavaScript **never throws** — it returns `NaN` for non-numeric strings. The `try` block is therefore dead code and provides a false sense of safety:

```js
let repetitionPeriod = undefined;
try {
  repetitionPeriod = parseInt(repetitionPeriodRaw);
} catch (e) {
  // This will never execute
}
if (!isPresent(repetitionPeriod) || repetitionPeriod < 1) { ... }
```

Additionally, `isPresent(NaN)` from `ts-is-present` returns `true` (NaN is not null/undefined), so a string like `"abc"` would produce `repetitionPeriod = NaN`, pass the `isPresent` guard, and then `NaN < 1` is `false`, meaning it would also pass the period check — potentially causing `moment` to receive `NaN` as an interval.

### Proven (April 2026)

This bug was verified with a proof script. Key output:

```
=== Proving parseInt() never throws ===

parseInt("abc") = NaN  (throws? NO)
parseInt("")    = NaN  (throws? NO)
parseInt(null)  = NaN  (throws? NO)

=== Proving the NaN validation gap ===

Input: "abc" | parseInt = NaN | isNaN? true  | Validation: ACCEPTED: repetitionPeriod = NaN
  ^^^ BUG: "abc" produces NaN but passes validation!
Input: ""    | parseInt = NaN | isNaN? true  | Validation: ACCEPTED: repetitionPeriod = NaN
  ^^^ BUG: "" produces NaN but passes validation!

=== Root cause: isPresent(NaN) is true ===

isPresent(NaN)       = true    ← NaN is not null/undefined, so passes
NaN < 1              = false   ← comparisons with NaN are always false
So !isPresent(NaN) || NaN < 1  =  false || false  =  false
Result: NaN slips through both guards and reaches moment() as an interval.
```

Both `"abc"` and `""` are accepted by the current validation and passed to `moment()` as `NaN` — confirmed by running the simulation of the exact current code.

### Proposed Fix

Replace with explicit `isNaN` validation:

```js
const repetitionPeriod = parseInt(repetitionPeriodRaw, 10);
if (isNaN(repetitionPeriod) || repetitionPeriod < 1) {
  return <Text>Repetition period must be a whole number of 1 or higher.</Text>;
}
```

Also apply the same fix to the server-side `handleRepeating` in `adfExport.js`.

---

## 7. ♿ Accessibility: Improve Config Form Label Associations

**Category:** Accessibility / UX  
**Files affected:** `src/frontend/non-repeating.jsx`, `src/frontend/repeating.jsx`

### Problem

The `<Label>` components use `labelFor` props that reference field names (e.g. `labelFor='time'`), but the corresponding `<Textfield>` and `<Select>` components only have a `name` prop, not an `id`. This means **all label associations are currently broken for assistive technology users**.

Additionally, there is no `isRequired` on the `time` and `date` fields even though they are mandatory for the macro to function, and there are no `<RequiredAsterisk />` indicators on any label.

### Forge Documentation Audit (April 2026)

The Forge UI Kit docs confirm the following:

**`labelFor` binds to `id`, not `name`.**  
The [Label component docs](https://developer.atlassian.com/platform/forge/ui-kit/components/form/) are explicit: `labelFor` is *"the unique identifier to match the label to the field component **id**"*. The canonical example is:

```jsx
<Label labelFor="field">Field label<RequiredAsterisk /></Label>
<Textfield id="field" placeholder="Placeholder" />
```

The current code passes the `name` value (e.g. `labelFor='time'`) but never sets `id` on any field — so all label associations are broken.

**Critical platform constraint: `id` is NOT available in macro config context for `Textfield`.**  
The Textfield prop table shows `id` as `Available in macro config: No`. This means the label ↔ field association for `Textfield` and `DatePicker` **cannot be fully fixed in the macro config context** — the platform does not expose `id` there. This is a Forge platform limitation, not something fixable purely in app code. It should be raised with the Forge platform team, or tracked until `id` becomes available in the macro config context.

**`isRequired` IS available in macro config for `Textfield`.**  
The prop table confirms `isRequired` is `Available in macro config: Yes`. This is currently missing from the `time` and `date` fields.

**`RequiredAsterisk` is the recommended pattern for required field labels.**  
The docs show that required fields should use `<Label labelFor="...">Field label<RequiredAsterisk /></Label>`.

### Revised Fix — Split into Two Parts

**Part A — Implementable now:**
- Add `isRequired` to the `time` `<Textfield>` and `date` `<DatePicker>` in both macros (confirmed available in macro config).
- Add `<RequiredAsterisk />` inside every `<Label>` for mandatory fields to provide a visual required indicator. Import `RequiredAsterisk` from `@forge/react`.

**Part B — Blocked by platform limitation:**
- The `labelFor` ↔ `id` association for `Textfield` and `DatePicker` cannot be fixed while `id` is unavailable in macro config context. The `Select` component may be fixable (needs separate verification of whether `id` is available on `Select` in macro config). Raise a platform bug/feature request with Atlassian Forge to expose `id` in macro config context for all field components.

---

## 8. 🛠️ Developer Experience: Pin Dependency Versions and Add a Lock-File Policy

**Category:** Developer Experience / Reproducibility  
**Files affected:** `package.json`, new `.npmrc`

### Problem

All dependencies in `package.json` use caret (`^`) ranges:

```json
"@forge/api": "^5.2.0",
"moment-timezone": "^0.5.46",
"react": "^18.3.1"
```

While `package-lock.json` exists and locks transitive versions, the wide ranges mean that `npm install` after deleting the lock file (e.g., on a fresh CI runner or after a merge conflict resolution) can silently pull in a breaking minor release. This is particularly risky for `moment-timezone`, where timezone data changes between patch releases.

The `eslint` dev dependency is locked to `^7.32.0`, which is very old (current is v9.x) and lacks support for modern JS features and flat config format.

### Proposed Fix

- Tighten critical dependencies (`@forge/*`, `moment-timezone`) to exact versions (`5.2.0` rather than `^5.2.0`) or tilde ranges (`~`).
- Add an `.npmrc` with `save-exact=true` to prevent future `^` additions.
- Update `eslint` to v9 and migrate to the flat config format, enabling more modern lint rules.
- Add a `engines` field to `package.json` to document the required Node.js version (already specified in `.nvmrc` and `manifest.yml` as `nodejs22.x`).

---

## 9. 🌐 Functional: Add a "Monthly" Repetition Option

**Category:** Functional  
**Files affected:** `src/repetition.js`, `src/frontend/repeating.jsx`

### Problem

The repeating macro supports hourly, daily, weekly, and annual repetition — but is missing **monthly**, which is one of the most common scheduling cadences (e.g. "Monthly team sync on the 1st"). Users needing monthly recurrence must awkwardly approximate with `4 weeks`, which drifts over time and does not respect calendar months.

```js
// Current options in repeating.jsx Config
{ label: 'Week (Default)', value: REPEAT_WEEKLY },
{ label: 'Day', value: REPEAT_DAILY },
{ label: 'Year', value: REPEAT_ANNUALLY },
{ label: 'Hour', value: REPEAT_HOURLY }
// Missing: Month
```

### Proposed Fix

Add `REPEAT_MONTHLY = 'repeat-monthly'` to `repetition.js` and map it to `"months"` in `repetitionToUnits()`. Add the option to the `<Select>` in `repeating.jsx`. No changes needed to `nextRepeatDate()` — `moment.add(n, 'months')` already handles month-boundary arithmetic correctly.

---

## 10. 🔧 Maintainability: Refactor Duplicated App Component Logic

**Category:** Maintainability / Code Quality  
**Files affected:** `src/frontend/non-repeating.jsx`, `src/frontend/repeating.jsx`

### Problem

The two `App` components in `non-repeating.jsx` and `repeating.jsx` share a large block of nearly identical code:

- The `useState`/`useEffectAsync` pattern for loading context.
- The `useEffect` interval for live-countdown mode.
- The `validateConfig` + `parseTime` + timezone-check sequence.
- The `Config` component structure (labels, selects, textfields) differs only by the addition of repetition fields.

This duplication means any bug fix or enhancement (e.g., Improvements #1, #5, #6, #7 above) must be applied in two places, and it is easy to forget one.

### Proposed Fix

Extract a shared `useDateMacroContext()` custom hook that encapsulates context loading and the countdown interval, returning `{ details, config, timeZone, now }`. Both App components then become thin wrappers:

```js
// Shared hook in src/frontend/useDateMacroContext.js
export function useDateMacroContext() {
  const [details, setDetails] = useState(undefined);
  const [now, setNow] = useState(Date.now());
  const config = details?.config;
  const timeZone = details?.timeZone;

  useEffectAsync(async () => {
    const context = await view.getContext();
    setDetails({ timeZone: context.timezone, config: context.extension.config });
  }, details);

  useEffect(() => {
    if (config && formatRequiresLiveUpdates(config.displayOption)) {
      const interval = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [details]);

  return { details, config, timeZone, now };
}
```

This also fixes the `now` state bug noted in Improvement #2 — the countdown key can be properly threaded through to `renderDateLozenge`.

---

## Summary Table

| # | Title | Category | Effort | Status |
|---|-------|----------|--------|--------|
| 1 | Replace `moment.tz.setDefault()` with explicit parsing | Security / Correctness | XS | ✅ Implemented |
| 2 | Eliminate dead code and commented-out blocks | Code Quality | XS | ✅ Implemented |
| 3 | Add a unit test suite | Developer Experience | M | ✅ Implemented |
| 4 | Rewrite the README | Documentation | S | ✅ Implemented |
| 5 | Add 24-hour time input support | Functional | S | ⬜ Pending |
| 6 | Fix `parseInt`/`isPresent` silent failure for repetition period | Security / Robustness | XS | ✅ Implemented |
| 7 | Improve config form label associations and required fields | Accessibility | S | ⬜ Pending |
| 8 | Pin dependency versions and update ESLint | Developer Experience | S | ⬜ Pending |
| 9 | Add monthly repetition option | Functional | XS | ⬜ Pending |
| 10 | Refactor duplicated App component logic into a shared hook | Maintainability | M | ⬜ Pending |

**Recommended implementation order:** 1 → 6 → 9 → 2 → 10 → 5 → 7 → 4 → 3 → 8
