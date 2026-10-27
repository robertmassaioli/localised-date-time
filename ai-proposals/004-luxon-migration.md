# Proposal: Replace moment and moment-timezone with Luxon

## Overview

`moment` is in [maintenance mode](https://momentjs.com/docs/#/-project-status/), and `moment-timezone` ships its own copy of the timezone database. This proposal moves every use in `src/` to [Luxon](https://moment.github.io/luxon/#/) ([API docs](https://moment.github.io/luxon/api-docs/index.html)) and removes both packages. It closes item 4.3 of `003-codebase-review-2026-10.md`.

The rule for this work is that the macro shows the same text as before. The 93 existing tests are the spec. Where Luxon cannot give identical output, this document says so and lists the choice as a decision for the maintainer.

**Status as of 2026-10-26:** everything is implemented on the branch `luxon-migration`, and the PR is the last item in section 8. Status values: ✅ done, ⬜ pending.

---

## 1. Every moment call site in `src/`

A search for `moment` in `src/` finds these production uses.

| # | File | Moment code | Luxon equivalent |
|---|------|-------------|------------------|
| 1.1 | `src/frontend/non-repeating.jsx` | `moment.tz(\`${date} ${time} ${meridiem}\`, 'YYYY-MM-DD h:mma', zone)` | `parseConfiguredDate(date, time, meridiem, zone)`, a helper over [`DateTime.fromFormat`](https://moment.github.io/luxon/#/parsing?id=table-of-tokens) with `{ zone }` |
| 1.2 | `src/frontend/repeating.jsx` | Same parse, then `nextRepeatDate(...)` | Same helper, then the ported `nextRepeatDate` |
| 1.3 | `src/adfExport.js` (2 places) | `moment.tz(..., 'YYYY-MM-DD h:mm a', zone)` | Same helper |
| 1.4 | `src/adfExport.js` | `originalDate.clone().tz(viewerTimezone)`, `.tz('UTC')`, and `a.tz() === b.tz()` | [`setZone`](https://moment.github.io/luxon/api-docs/index.html#datetimesetzone) and `zoneName`. A `DateTime` is immutable, so `clone()` goes away |
| 1.5 | `src/frontend/common.jsx` | `originalDate.clone().tz(timeZone)` and `.tz('UTC')` | `setZone` as above |
| 1.6 | `src/displayOptions.js` | `date.format('ddd, MMM DD, YYYY h:mma z')` | `formatDefault(date)`: [`toFormat`](https://moment.github.io/luxon/api-docs/index.html#datetimetoformat) for the date and time, plus a lookup for the abbreviation (section 2) |
| 1.7 | `src/displayOptions.js` | `date.fromNow()` | `relativeFromNow(date)`, a port of moment's thresholds (section 3) |
| 1.8 | `src/displayOptions.js` | `moment().diff(date)` and `moment.duration(...)` with `years()`, `months()`, `days()`, `subtract(...)` | `DateTime.now().diff(date).toMillis()` and `nasaCountdown(ms)` (section 3) |
| 1.9 | `src/repetition.js` | `moment(startDate)`, `moment()`, `isAfter`, `diff(..., unit, true)`, `clone().add(n, unit)`, `isSame(now, unit)` | `DateTime.now()`, `>`, `elapsedUnits`, [`plus`](https://moment.github.io/luxon/api-docs/index.html#datetimeplus), `isInSameUnit` (section 4) |

Tests that build moment objects:

| # | File | Use |
|---|------|-----|
| 1.10 | `src/__tests__/renderDateLozenge.test.js` | `moment.tz('2024-11-15 3:00 pm', 'YYYY-MM-DD h:mma', 'Australia/Sydney')` |
| 1.11 | `src/__tests__/displayOptions.test.js` | `moment.tz(...)`, `moment().add(...)`, `moment().subtract(...)` |
| 1.12 | `src/__tests__/repetition.test.js` | `moment()`, `.add`, `.subtract`, `.isAfter`, `.diff`, `.format`, `.tz()` |

`adfExport.test.js` and `useDateMacroContext.test.js` do not import moment. They exercise the code through its public functions, so they check the port without edits.

Also in scope: `package.json` and `package-lock.json` (add `luxon`, remove both moment packages). Out of scope: `src/timezones.js` and `generate-options.js`. The generator downloads a JSON file from GitHub and does not import moment. The README and the 4.3 row of `003-codebase-review-2026-10.md` get a small update. `AGENTS.md` is not on this branch (it is on `add-agents-md`). Its commands table says `gen-options` regenerates the list "from `moment-timezone` data", which stays true, and it could gain a line about `scripts/generate-tz-abbreviations.js`.

---

## 2. Timezone abbreviations (the hard part)

`displayText` prints a tz-database abbreviation, for example `Fri, Nov 15, 2024 3:00pm AEDT`. moment-timezone supplies that from its bundled data. Luxon takes zone names from [`Intl`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/DateTimeFormat), through the `ZZZZ` token, and the result depends on the locale and the ICU version.

What `ZZZZ` gives on Node 22 (ICU 77), compared with moment's `z`:

| Zone and month | moment `z` | Luxon `en-US` | Luxon `en-GB` | Luxon `en-AU` |
|----------------|-----------|---------------|---------------|---------------|
| Australia/Sydney, January | AEDT | GMT+11 | GMT+11 | AEDT |
| America/New_York, January | EST | EST | GMT-5 | GMT-5 |
| Europe/London, July | BST | GMT+1 | BST | GMT+1 |
| Europe/Paris, July | CEST | GMT+2 | CEST | GMT+2 |
| Asia/Kolkata | IST | GMT+5:30 | GMT+5:30 | GMT+5:30 |
| Asia/Tokyo | JST | GMT+9 | GMT+9 | GMT+9 |
| Asia/Dubai | +04 | GMT+4 | GST | GMT+4 |
| America/Sao_Paulo | -03 | GMT-3 | GMT-3 | GMT-3 |

No single locale reproduces moment. Each locale knows the abbreviations of its own region and falls back to `GMT+n` elsewhere. The output can also change when a browser or the Forge runtime updates ICU. So a locale choice cannot keep the output identical.

**Decision: ship a lookup table and leave `Intl` out of the abbreviation.**

- `scripts/generate-tz-abbreviations.js` reads the zone data in `moment-timezone` once and writes `src/timezoneAbbreviations.js` (about 24 KB). The script needs `npm install --no-save moment-timezone` and is not part of the app build. Regenerating is only needed when the timezone database adds a new abbreviation.
- The table maps each zone and UTC offset to an abbreviation. It covers 1970 onwards. Where one offset carried several abbreviations over time (for example `MDT` and later `CST` at UTC-6 in `America/Chihuahua`), it holds a short list of periods.
- Zones that the database only names with a number (`+04`, `-03`, `+0530`) are not in the table. `zoneAbbreviation` builds that form from the offset, which is what moment printed.
- The rest of the format is built from Luxon tokens with the locale fixed to `en`, because moment always formatted in English: `ccc, LLL dd, yyyy h:mm`, then `am` or `pm` in lower case, then the abbreviation.
- Zone names are passed to Luxon as [`IANAZone`](https://moment.github.io/luxon/api-docs/index.html#ianazone) objects. Luxon turns the string `GMT` into UTC, and the table needs the name `GMT` to print `GMT`.

Known limits, to confirm with the maintainer:

- Dates before 1970 can show a numeric abbreviation where moment showed a letter one.
- The table is a snapshot. If the timezone database changes an abbreviation, the table needs regenerating. Luxon's own offsets come from the runtime, so offsets stay current without it.
- Two zones differ for reasons unrelated to the table. `America/Asuncion` and `Asia/Manila` have different offsets in moment-timezone's data and in Node 22's ICU, because Paraguay and the Philippines changed their rules after the moment-timezone release. The runtime is the more current source, so the Luxon result is the correct one for those two.

---

## 3. Relative and countdown text

### 3.1 `fromNow()`

Luxon's [`toRelative`](https://moment.github.io/luxon/api-docs/index.html#datetimetorelative) uses `Intl.RelativeTimeFormat`. With `numeric: 'always'` it prints "in 1 day" where moment prints "in a day". With `numeric: 'auto'` it prints "tomorrow". It also truncates where moment rounds and has no 45-second or 22-hour thresholds. None of that matches the current text, and the renderDateLozenge test asserts `in a day`.

**Decision:** port moment's [relative time algorithm](https://momentjs.com/docs/#/displaying/fromnow/) into `relativeFromNow(date)` in `src/relativeTime.js`. It keeps moment's thresholds (44 seconds, 45 minutes, 22 hours, 26 days, 11 months), its rounding, its English strings, and its calendar month count taken in the system timezone. The function is about 40 lines.

### 3.2 NASA countdown

`moment.duration(ms)` splits milliseconds into years and months with a fixed month length (146097 days per 4800 months, about 30.44 days). Luxon's [`Duration.shiftTo`](https://moment.github.io/luxon/api-docs/index.html#durationshiftto) splits differently. 31 days is "1m0d" in moment. Luxon gives 1 month and 1 day with its default 30-day month, and 1 month and 13.5 hours with `conversionAccuracy: 'longterm'`. Repeated `subtract` calls in moment also move days between months in a way that a direct calculation does not.

**Decision:** port moment's bubble and subtract steps into `nasaCountdown(diffMs)` so the text is identical.

---

## 4. `add()` across daylight saving time

`nextRepeatDate` relies on two behaviours. Calendar units (days, weeks, years) keep the local wall-clock time across a DST change. Hours are exact elapsed time. Luxon's [`plus`](https://moment.github.io/luxon/#/math?id=calendar-math-vs-time-math) has the same split: `{ days: 1 }` is calendar math and `{ hours: 24 }` is time math. The DST and leap-day tests check both.

Three moment details need care:

- `now.diff(start, unit, true)` in moment gives fractional units. Days and weeks ignore a DST change in the system timezone, and months and years use a linear month fraction. Luxon's `diff` is calendar based and gives slightly different fractions. `elapsedUnits` ports moment's rules.
- `next.isSame(now, unit)` in moment compares in the timezone of `next`, with weeks starting on Sunday. Luxon's [`hasSame`](https://moment.github.io/luxon/api-docs/index.html#datetimehassame) compares calendar fields and ignores the zone. `isInSameUnit` uses `startOf` and `endOf` instead.
- A repeat date that falls inside a spring-forward gap (for example 2:30 am on the day clocks jump from 2:00 to 3:00). moment moves it back an hour (01:30), which is before the intended time. Luxon moves it forward (03:30), which matches how both libraries parse a time in a gap. **This is the one place where the output differs.** It affects only a repeating event whose wall-clock time lands in the gap on one repeat date. Recommended: accept the Luxon result. It is added as an explicit test.

An unknown repetition unit returned `undefined` from `repetitionToUnits` and made moment add raw milliseconds. The port returns the start date. The UI only offers four units, so this is not reachable from the config form.

---

## 5. Parsing

moment: `'YYYY-MM-DD h:mma'` (frontend) and `'YYYY-MM-DD h:mm a'` (export). Both parse the same string, `2024-11-15 3:00 pm`, because moment ignores the space.

Luxon: `'yyyy-M-d h:mm a'` with `{ zone, locale: 'en' }`. `M` and `d` accept one or two digits, as moment's lenient parse did. Checked against moment over 20,000 random inputs (zones, dates including invalid days and months, `am`, `pm`, `AM`, `PM`, `Am`):

- Valid input gives the same instant, including times inside a DST gap (moved forward) and in a DST overlap (first occurrence).
- Invalid input (`2024-02-30`, month 13, garbage) gives an invalid `DateTime`. `formatDefault` and `relativeFromNow` print `Invalid date`, which is what moment printed.
- An unknown timezone name. moment-timezone logged an error and read the date as UTC. `parseConfiguredDate` keeps that behaviour and logs an error, so a corrupt config renders as before. Likewise `inZone` keeps the date unchanged for an unknown zone.
- `parseTime` in `configHelpers.js` already restricts the time to `h:mm` plus `am` or `pm`, so the parse sees clean input.

---

## 6. Passing objects across modules and fake timers

`renderDateLozenge`, `displayText`, `nextRepeatDate` and `adfExport` pass the date object between them. The object changes from `moment` to Luxon's immutable [`DateTime`](https://moment.github.io/luxon/api-docs/index.html#datetime), so `clone()` is no longer needed and nothing can mutate a date held elsewhere. In the old code `nextRepeatDate` called `next.add(...)`, which mutated `next`, and `start.clone()` guarded the input. The port uses `plus`, which returns a new value.

Jest fake timers: `DateTime.now()` reads `Settings.now`, which defaults to `Date.now()`. Jest's modern fake timers replace `Date.now`, so `jest.setSystemTime` works with no extra setup. This is confirmed by the existing countdown and repetition tests passing under fake timers. `Settings.now` is not used.

The system timezone matters in a few places, because moment used local time for `moment()`. The port uses `toLocal()` in the same places (`relativeFromNow` month counts and `elapsedUnits`).

---

## 7. Risks, test strategy and rollout

### Risks

| # | Risk | Mitigation |
|---|------|------------|
| 7.1 | Abbreviation text changes | Lookup table, checked against moment for every zone in `moment.tz.names()` (see tests) |
| 7.2 | Relative or countdown text changes at a threshold | Ported algorithms, checked against moment at 60,000 random offsets plus every threshold edge |
| 7.3 | Repeat date changes near DST or month ends | Differential check of 40,000 random cases, plus the existing DST and leap-day tests |
| 7.4 | Behaviour depends on the system timezone | The check runs under five system timezones (UTC, Sydney, New York, Auckland, Kolkata) |
| 7.5 | Bundle size | Luxon is about 24 KB minified and gzipped and the table adds about 5 KB. The prebuilt `moment` and `moment-timezone` with data are about 58 KB, so the bundle should shrink |
| 7.6 | A pinned dependency drifts | `luxon` is pinned with a caret range like the other dependencies. `002-improvements.md` #8 tracks version ranges |
| 7.7 | The differing gap behaviour (section 4) | Called out for the maintainer and covered by a test |

### Test strategy

1. Port the tests that build moment objects (`renderDateLozenge`, `displayOptions`, `repetition`) to Luxon. Assertions on user-visible text stay unchanged. Assertions on the date object API change (`isAfter`, `diff`, `format`, `tz()`) because the object has changed. Each one is listed in the PR.
2. Add tests for the new modules: `dateTime` (abbreviations for several zones and seasons, the numeric fallback, `GMT`, invalid input, unknown zones), `relativeTime` (every threshold, singular and plural, past and future, the NASA countdown across years and months).
3. Run a one-off differential check against the real `moment` and `moment-timezone` before removing them. It is not committed, because it needs both libraries. The result is in the PR description.
4. Mutation check: break the abbreviation lookup, a threshold and the DST handling, and confirm tests fail.
5. Run `npm run lint`, `npm test` and `forge lint`.

### Rollout

1. This proposal, committed alone.
2. One PR against `codebase-review-batch-2`. It touches no UI Kit components and no manifest, so the macro and the config forms render the same.
3. The maintainer deploys to development first and checks a macro with `AEDT` and `EST` abbreviations, a countdown, and an export to PDF. Nothing is deployed from this work.

---

## 8. Status

| # | Item | Status |
|---|------|--------|
| 8.1 | Add `luxon` and the date helpers (`dateTime.js`, `relativeTime.js`, `timezoneAbbreviations.js`, generator script) | ✅ Done |
| 8.2 | Port `displayOptions.js` (format, `fromNow`, NASA countdown) | ✅ Done |
| 8.3 | Port `repetition.js` | ✅ Done |
| 8.4 | Port `adfExport.js`, `common.jsx`, `non-repeating.jsx`, `repeating.jsx` | ✅ Done |
| 8.5 | Port the existing tests that build moment objects | ✅ Done |
| 8.6 | Add tests for the new modules and the DST gap case | ✅ Done |
| 8.7 | Differential check against moment under five system timezones | ✅ Done |
| 8.8 | Remove `moment` and `moment-timezone` from `package.json` and the lockfile | ✅ Done |
| 8.9 | Mutation check, lint, tests, `forge lint` | ✅ Done |
| 8.10 | Update the README (Luxon, the abbreviation generator) and `003-codebase-review-2026-10.md` item 4.3 | ✅ Done |
| 8.11 | Open the PR (#13), check CI | ✅ Done |

## Open questions for the maintainer

- Is the gap behaviour in section 4 acceptable (Luxon moves a repeat inside a spring-forward gap forward, moment moved it back)?
- Is a generated abbreviation table acceptable, given that the alternative (`Intl` names) would show `GMT+11` for Sydney to most viewers?
- Dates before 1970 may show a numeric abbreviation. Does that matter for this macro?
