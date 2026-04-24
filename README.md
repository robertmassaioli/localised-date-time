# Localised Date Macro for Confluence

A [Forge](https://developer.atlassian.com/platform/forge/) app for Confluence that provides two inline macros for displaying dates and times in the viewer's local timezone. Instead of everyone reading a hard-coded time and doing timezone math in their head, each viewer automatically sees the date/time converted to their own timezone.

## Macros

### Localised Date Macro

Displays a single, fixed date and time. You configure the date, time, and the timezone you wrote it in — viewers see it converted to their own timezone.

**Example use case:** "The release is at 3:00 pm AEST on Friday" — viewers in New York see "Thu, Nov 14, 2024 11:00pm EST" automatically.

### Repeating Localised Date Macro

Displays the **next upcoming occurrence** of a recurring event, always converting to the viewer's timezone. Supports hourly, daily, weekly, and annual recurrence with a configurable period.

**Example use case:** "Weekly team sync every Monday at 9:00 am AEST" — the macro always shows the next upcoming Monday, converted to each viewer's local time.

---

## Configuration Reference

Both macros share the following configuration fields:

| Field | Description | Example |
|-------|-------------|---------|
| **Time** | The time in 12-hour AM/PM format | `9:00 am`, `12:45 pm` |
| **Date** / **Start Date** | The date (or start date for repeating events) | `2024-11-15` |
| **Timezone** | The timezone the date/time above is written in | `Australia/Sydney` |
| **Display format** | How the date is shown to viewers (see below) | `Localised Date/Time (Default)` |

The **Repeating** macro adds:

| Field | Description | Example |
|-------|-------------|---------|
| **Repetition Unit** | The unit of time for recurrence | `Week`, `Day`, `Year`, `Hour` |
| **Period** | Number of units between occurrences (must be ≥ 1) | `2` (every 2 weeks) |

---

## Display Formats

| Format | Description |
|--------|-------------|
| **Localised Date/Time (Default)** | Shows the date/time converted to the viewer's timezone. |
| **Localised Date/Time (With configured timezone)** | Shows the viewer's local time, plus the original configured time in parentheses. If the viewer is already in the configured timezone, a "co-located" tooltip is shown instead. |
| **UTC (With Localised Date/Time)** | Shows the UTC time first, with the viewer's local time in parentheses. |
| **Countdown / Time since** | Live countdown (e.g. "in 3 hours" or "2 days ago"). Updates every second. |
| **Countdown T-(plus/minus)** | NASA-style countdown (e.g. `T-2d4h30m`). Updates every second. |

> **Note:** The two countdown formats display as a static absolute date in PDF/Word exports, since exports are snapshots and cannot update live.

---

## Architecture

The app has two rendering paths:

1. **Client-side (UI Kit):** `src/frontend/non-repeating.jsx` and `src/frontend/repeating.jsx` render the macro inline in Confluence using React and `moment-timezone`. The viewer's timezone is read from `view.getContext()`.

2. **Server-side ADF export:** `src/adfExport.js` handles PDF, Word, and mobile exports. It calls the Confluence Users API to resolve the viewer's timezone and returns a static [ADF](https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/) document. This ensures exports show meaningful, timezone-correct content rather than being blank.

**Shared modules:**
- `src/configHelpers.js` — config validation and time parsing (used by both paths).
- `src/displayOptions.js` — display format logic and text formatting.
- `src/repetition.js` — next-occurrence calculation for repeating events.
- `src/timezones.js` — list of all IANA timezone identifiers (auto-generated).

---

## Requirements

- [Forge CLI](https://developer.atlassian.com/platform/forge/set-up-forge/) installed and authenticated.
- Node.js 22 (see `.nvmrc`). Use `nvm use` to switch automatically.

---

## Quick Start

**Deploy the app:**
```
forge deploy
```

**Install on a Confluence site:**
```
forge install
```

**Develop locally with live proxying:**
```
forge tunnel
```

> Once installed, subsequent `forge deploy` runs are picked up automatically — no need to reinstall.

---

## Regenerating the Timezone List

The file `src/timezones.js` is auto-generated from the latest `moment-timezone` data. To regenerate it:

```
npm run gen-options
```

This fetches the current timezone list from the `moment-timezone` GitHub repository and overwrites `src/timezones.js`.

---

## Linting

```
npm run lint
```

---

## Running Tests

```
npm test
```

---

## Support

See [Get help](https://developer.atlassian.com/platform/forge/get-help/) for how to get help and provide feedback.

## Logo Attribution

[Time zone icons created by Freepik - Flaticon](https://www.flaticon.com/free-icons/time-zone)