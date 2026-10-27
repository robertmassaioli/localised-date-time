# Proposal: Locale-Aware Dates and Clocks (item 3.2)

**Status as of 2026-10-27:** proposal for review. Nothing in this document is implemented. Item 3.2 of `codebase-review-2026-10.md` links here.

## Summary

The macro always prints dates in one English pattern, `ddd, MMM DD, YYYY h:mma z` (for example `Fri, Nov 15, 2024 3:00pm AEDT`). A viewer in Berlin sees English month names and an am/pm clock. This proposal formats dates in the viewer's locale and clock, using `Intl` through Luxon, and keeps the macro's existing look wherever no locale is known.

## Decisions I need from you

Each has a recommendation. The numbers match the "Open questions" section.

| # | Decision | Recommendation |
|---|----------|----------------|
| 1 | Keep today's exact English text for `en-US` viewers, or switch them to the `Intl` pattern? | Switch. Accept `Fri, Nov 15, 2024, 3:00 PM AEDT`, and keep the old pattern only where no locale is known (exports). |
| 2 | Add a per-macro "Clock" setting (Auto, 12-hour, 24-hour)? | Yes, as a separate last PR. `en-GB` is the fallback for Australians, and `en-GB` is a 24-hour locale. |
| 3 | Keep the English tz-database abbreviations (`AEDT`, `EST`) in every locale? | Yes. `Intl` gives `GMT+11` for Sydney in all 26 locales. |
| 4 | Translate relative text ("in a day") with `Intl.RelativeTimeFormat`, accepting small wording changes in English? | Yes. |
| 5 | Leave the NASA countdown (`T-1d4h`) alone? | Yes. |
| 6 | What do exports show, given that Forge sends no viewer locale to `adfExport`? | The legacy English pattern, until a locale source is found. |

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

- Default: the locale's own cycle, which `Intl` applies when `hourCycle` is left out.
- Optional override (see decision 2): `clock` in the macro config, `auto` (default), `12h` or `24h`, mapped to `hourCycle` `undefined`, `'h12'` or `'h23'`.

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
- Only if decision 2 is yes: the config forms, `locales/*.json` (3 keys in each of 26 files), `README.md`.

## Test plan

- **All 26 locales:** formatting never throws, contains the year, and contains the abbreviation in place of any `GMT` text. Normalise `U+202F` and `U+00A0` to a space before comparing.
- **Pinned expectations** for a handful of locales (`en-US`, `en-GB`, `de-DE`, `ja-JP`, `ko-KR`, `zh-TW`, `is-IS`) at a fixed instant, so a layout surprise shows up.
- **Clock:** `hourCycle` overrides give 12 and 24-hour output for the same locale, and the default follows the locale (23 h23 and 3 h12 over the 26).
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
- **Australian viewers.** `en-AU` is not a Forge locale, and `en-GB` is a 24-hour locale. An Australian account set to "English (UK)" gets a 24-hour clock unless the account reports `en-AU` or decision 2 ships.
- **The relative-time split touches ported moment logic** that took the Luxon migration a lot of checking. The thresholds do not change, and the existing differential tests stay.
- **The 2 s `getTranslations` time on a deployed host.** This change adds no network call, so it is not affected. It is noted here because the formatter is gated on the same provider.

## Work breakdown

| # | Piece | Effort | Status |
|---|-------|--------|--------|
| 1 | `formatDateTime` with `toLocaleParts` and the abbreviation swap, plus tests for 26 locales | M | ⬜ Pending (awaiting review) |
| 2 | Pass `locale` through `displayText`, `renderDateLozenge` and the macro views | S | ⬜ Pending |
| 3 | Split `relativeFromNow` and format with `Intl.RelativeTimeFormat` | M | ⬜ Pending |
| 4 | Confirm what locale an Australian "English (UK)" account reports | XS | ⬜ Pending |
| 5 | Export keeps the legacy pattern, with a test that says so | XS | ⬜ Pending |
| 6 | Optional: macro `clock` setting, 3 keys in 26 locales, README | M | ⬜ Pending (decision 2) |

Suggested PRs: 1, 2 and 5 together, then 3, then 6 if approved.

## Open questions

1. **English text.** Is it acceptable that `en-US` viewers see `Fri, Nov 15, 2024, 3:00 PM AEDT`? The alternative is a special case that keeps the old English pattern for `en-US`, which gives `en-US` a different format from every other locale.
2. **Clock override.** Should authors be able to force 12 or 24 hours per macro? It adds a config field and 78 new strings (3 keys, 26 locales, machine-translated and needing the same review as before).
3. **Abbreviations.** Is `AEDT` acceptable in a German or Japanese sentence? The alternative is `GMT+11`, which is unambiguous but longer and less familiar for the zones people read most.
4. **Relative wording.** "tomorrow" and "now" are better language and a small change. Do you want the exact old English kept?
5. **NASA letters.** `T-1d4h` stays in every language. Say if you want it localised.
6. **Exports.** Is the legacy English pattern right for exports? A real fix needs a locale source, and I have not found one in the Confluence user APIs. I would add a spike item to look.
