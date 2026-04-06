# Proposal: ADF Export for Localised Date Macros

## Goal

Implement `adfExport` for both macros so that PDF/Word exports and mobile rendering produce meaningful, timezone-translated content instead of blank or placeholder output.

## Background

Currently the macros render entirely client-side via `@forge/react`. Exports (PDF, Word) and mobile views use a different path: they call a server-side `adfExport` function that must return an ADF document. Without this, exports show nothing useful.

### What the adfExport function receives

The function is called with a `payload` object:

```js
{
  config: { date, time, timeZone, displayOption, ... },  // macro config values
  context: {
    accountId: "...",     // current user's Atlassian account ID (if authenticated)
    cloudId: "...",
    contentId: "...",
    localId: "...",
    siteUrl: "...",
    spaceKey: "..."
  },
  exportType: "pdf" | "word" | "other"
}
```

### The timezone problem

The frontend macros get the viewer's timezone from the browser via `view.getContext()` which reads `context.timezone`. The `adfExport` function runs server-side and **does not receive the user's timezone** in its payload.

Options for resolving the user's timezone server-side:

1. **Use `context.accountId`** to call the Confluence v2 REST API to retrieve the user's timezone preference.
2. **Fall back to the configured timezone** from `config.timeZone` if no user is present (anonymous export) or if the API call fails.

## Proposed Approach

### Step 0: Experiment with the adfExport payload

Before writing any real logic, deploy a minimal adfExport function that logs and returns the full `payload` object as text in the ADF. This lets us verify:

- Whether `context.accountId` is present during exports and mobile rendering
- Whether `config` is populated (known bug: config may be empty for Word exports — FRGE-1583)
- What other fields are available

```js
// src/adfExport.js (temporary, for investigation)
export async function adfExportFunction(payload) {
  return {
    version: 1,
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: JSON.stringify(payload, null, 2) }
        ]
      }
    ]
  };
}
```

### Step 1: Manifest changes

Add `adfExport` to both macro definitions and register the function(s):

```yaml
modules:
  macro:
    - key: localised-date-macro-for-confluence
      resource: main-nonrepeating
      render: native
      resolver:
        function: resolver
      adfExport:
        function: adf-export-nonrepeating
      # ... rest unchanged

    - key: repeating-localised-date-macro-for-confluence
      resource: main-repeating
      render: native
      resolver:
        function: resolver
      adfExport:
        function: adf-export-repeating
      # ... rest unchanged

  function:
    - key: resolver
      handler: index.handler
    - key: adf-export-nonrepeating
      handler: src/adfExport.handleNonRepeating
    - key: adf-export-repeating
      handler: src/adfExport.handleRepeating
```

### Step 2: Resolve user timezone

Create a helper that attempts to get the viewer's timezone:

```
getUserTimezone(accountId, siteUrl, configuredTimezone):
  1. If accountId is present:
     - Call Confluence REST API to get user's timezone preference
     - If successful, return that timezone
  2. Fall back to configuredTimezone from macro config
```

The REST API call would use `@forge/api`'s `requestConfluence` to call the modern v2 bulk users endpoint:

```js
import { requestConfluence } from '@forge/api';

async function getUserTimezone(accountId, configuredTimezone) {
  if (!accountId) return configuredTimezone;
  try {
    const response = await requestConfluence(`/wiki/api/v2/users-bulk`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ accountIds: [accountId] })
    });
    const data = await response.json();
    const user = data?.results?.[0];
    return user?.timeZone ?? configuredTimezone;
  } catch {
    return configuredTimezone;
  }
}
```

Note: It's not yet confirmed that `/wiki/api/v2/users-bulk` returns a `timeZone` field — this needs to be verified against the actual API response. **This is the part we need to validate experimentally** in Step 0 — whether `accountId` is available and whether the users-bulk endpoint includes timezone data.

### Step 3: Implement the export functions

Both functions follow the same pattern, differing only in repetition handling:

#### Non-repeating

```
handleNonRepeating(payload):
  config = payload.config
  if config is missing required fields -> return error ADF
  
  viewerTimezone = await getUserTimezone(payload.context.accountId, ...)
  
  originalDate = moment.tz(config.date + " " + config.time, config.timeZone)
  displayDate = originalDate.clone().tz(viewerTimezone)
  
  return ADF document with formatted date text
```

#### Repeating

```
handleRepeating(payload):
  config = payload.config
  if config is missing required fields -> return error ADF
  
  viewerTimezone = await getUserTimezone(payload.context.accountId, ...)
  
  startDate = moment.tz(config.date + " " + config.time, config.timeZone)
  originalDate = nextRepeatDate(startDate, config.repetitionPeriod, repetitionToUnits(config.repetitionUnit))
  displayDate = originalDate.clone().tz(viewerTimezone)
  
  return ADF document with formatted date text
```

### Step 4: ADF output format

The returned ADF should mirror what the Lozenge shows in the frontend. Since ADF doesn't support Lozenge nodes, we render as a styled text paragraph. For the `default` display option:

```json
{
  "version": 1,
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "content": [
        {
          "type": "text",
          "text": "Wed, Jan 15, 2025 3:00pm AEDT",
          "marks": [{ "type": "strong" }]
        }
      ]
    }
  ]
}
```

For dual-display formats (e.g., `FORMAT_DEFAULT_AND_ORIGINAL`), show both times:

```json
{
  "type": "paragraph",
  "content": [
    { "type": "text", "text": "Wed, Jan 15, 2025 3:00pm AEDT", "marks": [{ "type": "strong" }] },
    { "type": "text", "text": " (" },
    { "type": "text", "text": "Tue, Jan 14, 2025 9:00pm PST" },
    { "type": "text", "text": ")" }
  ]
}
```

For countdown formats (`FORMAT_HUMAN_COUNTDOWN`, `FORMAT_NASA_COUNTDOWN`): since exports are static snapshots, show the absolute date/time instead of a countdown, possibly with a note like "(countdown not available in export)".

### Code reuse

The existing modules can be reused server-side with no changes:
- `src/displayOptions.js` — `displayText()` for formatting
- `src/repetition.js` — `nextRepeatDate()`, `repetitionToUnits()`
- `src/frontend/common.jsx` — `parseTime()` and `validateConfig()` (these are pure functions, though they'd need to be extracted from the JSX file or the common functions moved to a non-JSX module)

Consider extracting `parseTime` and `validateConfig` from `src/frontend/common.jsx` into a shared `src/common.js` (non-JSX) so they can be imported by both frontend and adfExport code without pulling in React dependencies.

## Permissions

The app may need `read:confluence-user` OAuth scope to fetch user timezone. Check whether this is already granted or needs to be added to `manifest.yml`.

## Open Questions

1. **Is `accountId` present in the adfExport payload?** Step 0 will answer this. If not, we always fall back to the configured timezone.
2. **Does `/wiki/api/v2/users-bulk` return timezone data?** The modern v2 endpoint is the correct one to use, but we need to confirm its response schema includes a `timeZone` field. If not, we may need the Atlassian account profile API instead.
3. **Should countdown formats show the countdown value at export time, or fall back to absolute date?** Countdowns in a static PDF are of limited value since they're immediately stale.
4. **Word export bug (FRGE-1583):** Config may be empty for Word exports. If so, we can only render a "configuration unavailable" message for Word.

## Implementation Order

1. Step 0 — Deploy diagnostic adfExport, inspect payload in PDF/mobile
2. Step 2 — Research and implement timezone resolution based on findings
3. Step 1+3 — Wire up manifest and implement both export functions
4. Step 4 — Polish ADF output formatting
5. Extract shared pure functions from `common.jsx` if needed
