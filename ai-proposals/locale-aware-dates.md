# Proposal: Locale-Aware Dates and Clocks (item 3.2)

**Status as of 2026-10-27:** proposal under review. Nothing in this document is implemented. Item 3.2 of `codebase-review-2026-10.md` links here. Decisions 1, 2, 4, 5 and 6 are made and recorded below. Decision 3 (timezone names) is the only one still open.

## Summary

The macro always prints dates in one English pattern, `ddd, MMM DD, YYYY h:mma z` (for example `Fri, Nov 15, 2024 3:00pm AEDT`). A viewer in Berlin sees English month names and an am/pm clock. This proposal formats dates in the viewer's locale and clock, using `Intl` through Luxon, and keeps the macro's existing look wherever no locale is known.

## Decisions

| # | Decision | Status |
|---|----------|--------|
| 1 | `en-US` viewers: keep today's text, or switch to the `Intl` pattern? | **Decided: switch to the `Intl` pattern.** `Fri, Nov 15, 2024, 3:00 PM AEDT`. The old pattern stays only where no locale is known (exports). |
| 2 | Clock setting for macro authors (Auto, 12-hour, 24-hour) | **Decided: yes, as a separate last PR. A locale's own convention beats the author's setting, except in the flexible locales `en-GB` and `en-US`.** An author who picks 12-hour still gets 24-hour for viewers in a locale that does not use a 12-hour clock. See "The clock". |
| 3 | Timezone names: `AEDT`, `GMT+11`, `UTC+11` or something else | **Open.** Six options with real examples are in "Timezone names in detail". |
| 4 | Relative text ("in a day") | **Decided: use `Intl.RelativeTimeFormat` wording in every language.** English becomes "tomorrow", "1 hour ago", "now". |
| 5 | NASA countdown (`T-1d4h`) | **Decided: leave it alone.** It reads the same in every language. |
| 6 | Exports, given that Forge sends no viewer locale to `adfExport` | **Decided: keep the legacy English pattern.** A spike item looks for a locale source in the Confluence user APIs. |

## Problem

- `formatDefault` in `src/dateTime.js` pins the locale to `en` and builds the string by hand: `toFormat('ccc, LLL dd, yyyy h:mm')`, then `am` or `pm`, then the abbreviation from `src/timezoneAbbreviations.js`.
- `relativeFromNow` in `src/relativeTime.js` returns English text: "a few seconds", "in a day", "3 months ago".
- `nasaCountdown` returns `T-1d4h`.
- Of the 26 Forge locales, 23 use a 24-hour clock by default. Only `en-US`, `zh-TW` and `ko-KR` use 12-hour. Every viewer sees `3:00pm`.
- The date order, separators and weekday and month names are English for everyone.

The macro exists to show a time in the viewer's own terms. It shows the right instant in the viewer's timezone, and the rest of the text ignores the viewer.

## What the platform gives us

- The frontend knows the viewer's locale. `useProductContext().locale` has it (the maintainer's `en-US` shows up in the debug logs from the react-intl work). `MacroIntlProvider` already reads it, and `useIntl().locale` gives the locale Forge settled on. See the [supported locale codes](https://developer.atlassian.com/platform/forge/manifest-reference/forge-supported-locale-codes/).
- `adfExport` does not get a locale. `payload.context` has `accountId` and no locale, and the Confluence `users-bulk` response has `timeZone` and no locale. Exports have used `en-GB` as a stand-in for the translations since the i18n work.
- Luxon formats with `Intl` underneath: [`toLocaleParts`](https://moment.github.io/luxon/api-docs/index.html#datetimetolocaleparts) and [`toLocaleString`](https://moment.github.io/luxon/api-docs/index.html#datetimetolocalestring), see also the [Luxon formatting guide](https://moment.github.io/luxon/#/formatting).

## Findings

I probed Node 22 (tz data 2025b) with all 26 locales. Browsers may differ slightly. See "Risks".

**Clock.** `Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hourCycle` gives `h12` for `en-US`, `zh-TW` and `ko-KR` and `h23` for the other 23.

**Layout.** One call with `weekday, month, day, year, hour, minute` options gives each locale its own order and separators:

| Locale | Result for 11 pm on 14 Nov 2024 in New York |
|---|---|
| `en-US` | `Thu, Nov 14, 2024, 11:00 PM EST` |
| `en-GB` | `Thu, 14 Nov 2024, 23:00 GMT-5` |
| `de-DE` | `Do., 14. Nov. 2024, 23:00 GMT-5` |
| `ja-JP` | `2024年11月14日(木) 23:00 GMT-5` |
| `ko-KR` | `2024년 11월 14일 (목) 오후 11:00 GMT-5` |
| `is-IS` | `fim., 14. nóv. 2024, GMT-5 – 23:00` |
| `zh-TW` | `2024年11月14日 週四 下午11:00 [EST]` |

**Timezone names.** `Intl` does not give tz-database abbreviations. Sydney is `GMT+11` in all 26 locales (`UTC+11` in `fi-FI` and `fr-FR`). New York is `EST` in only `en-US`, `cs-CZ`, `nl-NL`, `no-NO` and `zh-TW`, and `GMT-5` elsewhere. The abbreviation table from the Luxon migration exists for this reason.

**The abbreviation can be swapped in.** `DateTime.setLocale(locale).toLocaleParts(options)` returns the parts, including a `timeZoneName` part. Replacing that one part's value with `zoneAbbreviation(date)` keeps each locale's layout: `[AEDT]` in brackets for `zh-TW`, the zone first for `is-IS`. I checked this with a throwaway script. It gives, for 3 pm in Sydney:

```
en-US   Fri, Nov 15, 2024, 3:00 PM AEDT
en-GB   Fri, 15 Nov 2024, 15:00 AEDT
de-DE   Fr., 15. Nov. 2024, 15:00 AEDT
ko-KR   2024년 11월 15일 (금) 오후 3:00 AEDT
```

**The clock can be overridden.** Passing `hourCycle: 'h12'` or `'h23'` keeps the layout and changes only the clock, for example `en-GB/h12` gives `Fri, 15 Nov 2024, 3:00 pm AEDT`.

**Special characters.** `en-US` puts `U+202F` (narrow no-break space) before `PM`. Tests must not compare against a literal space.

**Relative time.** `Intl.RelativeTimeFormat(locale, { numeric: 'auto' })` exists for all 26 locales and handles plural rules ("3 godziny temu", "через 5 месяцев"). It has no "a few seconds". Its `numeric: 'auto'` gives "tomorrow" where we say "in a day".

**Compact units.** `Intl.NumberFormat` narrow units give `1y 1m 1d` in English and `1 J 1 M 1 T` in German, and `m` means both month and minute. The NASA style depends on short fixed letters.

## Design

### 1. One formatter in `src/dateTime.js`

```js
formatDateTime(date, { locale, hourCycle })
```

- Uses `date.setLocale(locale).toLocaleParts({ weekday: 'short', month: 'short', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short', hourCycle })` and joins the parts.
- Replaces the `timeZoneName` part with `zoneAbbreviation(date)`, so decision 3 holds for every locale.
- Without a locale, it returns the legacy pattern (`Fri, Nov 15, 2024 3:00pm AEDT`), so callers that do not know a locale behave as they do today. The legacy formatter keeps its current name and tests.
- An invalid date still gives `Invalid date`.

### 2. The clock

The clock for a viewer comes from two inputs: the author's `clock` setting in the macro config (`auto`, `12h` or `24h`, default `auto`) and the viewer's locale. **The locale's convention wins.** Locales fall into three classes:

| Locale class | Author `auto` | Author `12h` | Author `24h` |
|---|---|---|---|
| Always 24-hour (Intl default `h23`, no everyday 12-hour use) | 24-hour | 24-hour | 24-hour |
| Always 12-hour (Intl default `h12`, no everyday 24-hour use) | 12-hour | 12-hour | 12-hour |
| Flexible (`en-GB` and `en-US`) | the locale default (24-hour for en-GB, 12-hour for en-US) | 12-hour | 24-hour |

So the author's setting only changes the display for flexible locales. This is the rule you described: a macro set to 12-hour still shows 24 hours to a viewer whose locale does not use a 12-hour clock.

- Implementation: a pure `clockFor(locale, authorSetting)` returns the `hourCycle` to pass to the formatter (`undefined`, `'h12'` or `'h23'`), driven by one `FLEXIBLE_CLOCK_LOCALES` set. Everything not in the set follows the locale's `Intl` default.
- Decided set: `en-GB` and `en-US`. `en-GB` is where `en-AU` viewers land, because `en-AU` is not a Forge locale, and an author can pin it to either clock. An author can also set 24-hour for `en-US` viewers, who default to 12-hour. `ko-KR` and `zh-TW` also default to 12-hour but are not flexible, so they stay 12-hour whatever the author picks. The other 22 locales default to 24-hour and stay there.
- Without the setting (the first PR), every viewer simply gets the locale default.

### 3. Where the locale comes from

- Frontend: `renderDateLozenge` already takes `t`. It gains `locale`, read in the macro views from the same context that `MacroIntlProvider` loads. The provider already holds `context.locale` and Forge's resolved locale. I will log what an Australian "English (UK)" account reports before choosing between the raw `context.locale` and the resolved one. The raw value could be `en-AU`, which `Intl` knows and gives a 12-hour clock, while the resolved value is `en-GB`.
- Locales `Intl` does not know fall back to the default locale (`en-GB`) through `Intl.DateTimeFormat.supportedLocalesOf`.
- Exports: no locale. They keep the legacy English pattern (decision 6). If a locale source appears, the same `locale` option applies.

### 4. Relative time

- Keep `relativeFromNow`'s thresholds and rounding, which are a port of moment's. Split it into a pure function that returns the chosen `{ value, unit }` and a thin English-or-`Intl` formatter.
- Format with `Intl.RelativeTimeFormat(locale, { numeric: 'auto' })`.
- Wording changes in English (decision 4): "in a day" becomes "tomorrow", "an hour ago" becomes "1 hour ago". The under-45-second bucket becomes "now" (formatted from `0 seconds`). Without a locale the current English text stays.

### 5. NASA countdown

Unchanged (decision 5). `T-1d4h` is a convention that does not translate, and `Intl` narrow units do not suit it.

## Timezone names in detail

Decision 3 decides what the last part of a date reads, for example the `AEDT` in `Fri, Nov 15, 2024, 3:00 PM AEDT`. The six options below show real output for the same instant (3 pm in Sydney on 15 Nov 2024) in seven zones, from Node 22 (tz data 2025b).

| Zone | A: our abbreviation | B: ours in English, `Intl` short elsewhere | C: `Intl` short | D: UTC offset | E: abbreviation and offset | F: `Intl` long name (en-US / de-DE) |
|---|---|---|---|---|---|---|
| Sydney | `AEDT` | en `AEDT`, de `GMT+11`, ja `GMT+11` | `GMT+11` in all four | `UTC+11` | `AEDT (UTC+11)` | Australian Eastern Daylight Time / Ostaustralische Sommerzeit |
| New York | `EST` | en `EST`, de `GMT-5`, ja `GMT-5` | en-US `EST`, en-GB `GMT-5`, de `GMT-5`, ja `GMT-5` | `UTC-5` | `EST (UTC-5)` | Eastern Standard Time / Nordamerikanische Ostküsten-Normalzeit |
| Chicago | `CST` | en `CST`, de `GMT-6`, ja `GMT-6` | en-US `CST`, en-GB `GMT-6`, de `GMT-6`, ja `GMT-6` | `UTC-6` | `CST (UTC-6)` | Central Standard Time / Nordamerikanische Zentral-Normalzeit |
| Kolkata | `IST` | en `IST`, de `GMT+5:30`, ja `GMT+5:30` | `GMT+5:30` in all four | `UTC+5:30` | `IST (UTC+5:30)` | India Standard Time / Indische Normalzeit |
| London | `GMT` | `GMT` | `GMT` in all four | `UTC+0` | `GMT (UTC+0)` | Greenwich Mean Time / Mittlere Greenwich-Zeit |
| Tokyo | `JST` | en `JST`, de `GMT+9`, ja `JST` | en `GMT+9`, de `GMT+9`, ja `JST` | `UTC+9` | `JST (UTC+9)` | Japan Standard Time / Japanische Normalzeit |
| Dubai | `+04` | en `+04`, de `GMT+4`, ja `GMT+4` | en-US `GMT+4`, en-GB `GST`, de `GMT+4`, ja `GMT+4` | `UTC+4` | `+04 (UTC+4)` | Gulf Standard Time / Golf-Zeit |

### The options

**A: our tz-database abbreviation in every locale (today, and my recommendation).** The abbreviation table from the Luxon migration is swapped into the timezone slot of each locale's layout.
- For: short; the same text as today; the same in every locale, so a German and an English viewer reading one page see the same zone label; independent of the browser's ICU version.
- Against: some abbreviations are ambiguous (`CST` is Central US, China and Cuba, `IST` is India, Ireland and Israel, `BST` is British and Bangladesh); they are English conventions inside a non-English sentence; zones the database only names with a number show `+04`; the table is a snapshot that needs regenerating.

**B: our abbreviation in English locales, `Intl` short names elsewhere.**
- For: matches local habit in English, and non-English viewers get their platform's wording.
- Against: the same page reads differently by viewer language. `Intl` short names are mostly `GMT+11` style anyway, so non-English viewers lose the abbreviation that A keeps. Output depends on the browser's ICU data.

**C: `Intl` short names everywhere.**
- For: least code; the abbreviation table could be deleted from the display path.
- Against: English viewers lose `AEDT` for `GMT+11`, and the result is inconsistent across locales. New York is `EST` in `en-US` but `GMT-5` in `en-GB`, and Dubai is `GST` in `en-GB` but `GMT+4` in `en-US`. It also changes with the browser.

**D: a UTC offset in every locale** (`UTC+11`, `UTC-5`, `UTC+5:30`), built by us from the date's offset.
- For: unambiguous (no `CST` or `IST` clash); the same in every language and browser; short; needs no table; a viewer can compare two macros at a glance.
- Against: unfamiliar to people who think in `EST` or `AEDT`; it names an offset and not a zone, so `UTC+10` does not say whether it is Brisbane or Sydney in winter; a visible change for every viewer, including English.

**E: abbreviation and offset** (`AEDT (UTC+11)`).
- For: familiar and unambiguous together.
- Against: long, and the date line already carries a weekday, a date and a time. In the `Localised Date/Time (With configured timezone)` and `UTC (With Localised Date/Time)` formats two of these appear on one line.

**F: `Intl` long names** (`Australian Eastern Daylight Time`, `Ostaustralische Sommerzeit`).
- For: fully translated and unambiguous.
- Against: far too long for a lozenge, which holds one line; the wording changes with the browser's ICU version.

### Recommendation

A, for the least change and the most predictable text. If the ambiguity of `CST` and `IST` matters to your viewers, D is the cleanest fix, and E is the compromise if you want both. Switching later is cheap, because the choice sits in one place, the function that picks the `timeZoneName` part's text, and the tests list the expected zone text per option.

## Alternatives considered

| Option | Why not |
|---|---|
| Keep the hand-built pattern and only vary the clock | Fixes 24-hour viewers but leaves English month names and date order for everyone else. |
| Use `Intl` timezone names (`GMT+11`) | Loses `AEDT` and `EST` for the English-speaking majority, and the Luxon migration added the abbreviation table to avoid exactly this. |
| Use the `react-intl` formatters (`formatDate`, `formatRelativeTime`) | They call the same `Intl` APIs. The date code runs outside React in places (`adfExport`, tests), and Luxon already holds the zone handling. |
| Add a per-viewer clock preference | Atlassian does not expose one. The locale default plus an author override (decision 2) is the closest available. |

## Behaviour changes for existing viewers

| Where | Today | After |
|---|---|---|
| `en-US` macro | `Fri, Nov 15, 2024 3:00pm AEDT` | `Fri, Nov 15, 2024, 3:00 PM AEDT` |
| `en-GB` macro | `Fri, Nov 15, 2024 3:00pm AEDT` | `Fri, 15 Nov 2024, 15:00 AEDT` |
| Any other locale | English pattern | Its own pattern and clock |
| Human countdown, English | `in a day` | `tomorrow` |
| Exports | legacy English | unchanged |
| NASA countdown | `T-1d4h` | unchanged |

No config migration is needed. Saved macros keep their settings.

## Files affected

- `src/dateTime.js`: new `formatDateTime`, legacy `formatDefault` kept.
- `src/displayOptions.js`: `displayText(displayOption, date, options)` carries `{ locale, hourCycle }`.
- `src/relativeTime.js`: split into the pure threshold function and a formatter.
- `src/frontend/common.jsx`, `src/frontend/non-repeating.jsx`, `src/frontend/repeating.jsx`: pass the locale.
- `src/adfExport.js`: no behaviour change. It passes no locale.
- Tests: `dateTime.test.js`, `displayOptions.test.js`, `relativeTime.test.js`, `renderDateLozenge.test.js`, plus new cases below.
- In the last PR (decision 2): `clockFor` and the flexible-locale set, the config forms, `locales/*.json` (3 keys in each of 26 files), `README.md`.

## Test plan

- **All 26 locales:** formatting never throws, contains the year, and contains the abbreviation in place of any `GMT` text. Normalise `U+202F` and `U+00A0` to a space before comparing.
- **Pinned expectations** for a handful of locales (`en-US`, `en-GB`, `de-DE`, `ja-JP`, `ko-KR`, `zh-TW`, `is-IS`) at a fixed instant, so a layout surprise shows up.
- **Clock:** `hourCycle` overrides give 12 and 24-hour output for the same locale, and the default follows the locale (23 h23 and 3 h12 over the 26).
- **Clock rule (last PR):** `clockFor(locale, setting)` over all 26 locales and the three settings: a 24-hour locale ignores `12h`, a 12-hour locale ignores `24h`, and a flexible locale follows the setting.
- **Legacy path:** no locale gives today's exact string. The existing assertions in `dateTime.test.js` and `displayOptions.test.js` stay.
- **Zones:** `zoneAbbreviation` still replaces the zone in every layout, including ones with the zone first or in brackets, across DST changes.
- **Relative time:** for each of 6 locales, the unit and value chosen at each threshold edge match today's output, and the text comes from `Intl.RelativeTimeFormat`.
- **Timezone independence:** the date tests run under 7 `TZ` values, as the countdown tests already do.
- **Mutation checks:** swapping the abbreviation, dropping the `hourCycle` pass-through and dropping the legacy fallback each fail a test.
- **Components:** `renderDateLozenge` receives a locale and shows the formatted text, with a mocked `@forge/react`.
- Lint, `forge lint` and CI as usual. I cannot run the macro in Confluence from CI, so the manual check below is part of done.

## Manual check on a development install

1. Switch the Atlassian account language to German, then to Japanese, then to `en-GB` and `en-US`. The macro date should follow each locale's order, names and clock.
2. Compare `en-US` against `main`. The text changes as in the table above.
3. Check that the abbreviation (`AEDT`, `EST`) still appears.
4. Export a page to PDF. It should look as it does today.
5. Check the human countdown in two languages.

## Risks

- **Browser ICU differences.** Chrome, Safari and Firefox ship different ICU versions, so strings can differ in small ways from Node 22 (punctuation, spaces). Tests pin Node's output only for the handful of locales listed, with spaces normalised.
- **English users see a visible change** (decision 1). A release note should say so.
- **Australian viewers.** `en-AU` is not a Forge locale, so Australians land on `en-GB`, a 24-hour locale. Until the clock setting ships (last PR), an Australian account set to "English (UK)" gets a 24-hour clock unless the account reports `en-AU`. Item 4 in the work breakdown checks what it reports.
- **The relative-time split touches ported moment logic** that took the Luxon migration a lot of checking. The thresholds do not change, and the existing differential tests stay.
- **The 2 s `getTranslations` time on a deployed host.** This change adds no network call, so it is not affected. It is noted here because the formatter is gated on the same provider.

## Work breakdown

| # | Piece | Effort | Status |
|---|-------|--------|--------|
| 1 | `formatDateTime` with `toLocaleParts` and the abbreviation swap, plus tests for 26 locales | M | ⬜ Pending (awaiting review) |
| 2 | Pass `locale` through `displayText`, `renderDateLozenge` and the macro views | S | ⬜ Pending |
| 3 | Split `relativeFromNow` and format with `Intl.RelativeTimeFormat` | M | ⬜ Pending |
| 4 | Confirm what locale an Australian "English (UK)" account reports | XS | ⬜ Pending |
| 5 | Export keeps the legacy pattern, with a test that says so | XS | ⬜ Pending (decided) |
| 6 | Macro `clock` setting (Auto, 12-hour, 24-hour), the `clockFor` locale rule with `en-GB` and `en-US` flexible, 3 keys in 26 locales, README | M | ⬜ Pending (decided, last PR) |

Suggested PRs: 1, 2 and 5 together, then 3, then 6.

## Open questions

1. **Timezone names (decision 3).** Pick one of A to F in "Timezone names in detail". My recommendation is A.

Everything else is decided.
