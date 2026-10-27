# Proposal: Default the config Timezone to the editing user's timezone

## Overview

The Timezone select in both config panels starts empty. The editing user's timezone is already known, so the panel should select it by default. This proposal covers how, the edge cases, the tests, and the one risk that cannot be checked outside Confluence: whether an untouched default is saved.

**Status as of 2026-10-26:** everything is done on the branch `default-timezone`. Section 6 lists the runtime checks that still need a Confluence install. Status values: ✅ done, ⬜ pending.

The docs for the macro config panel say little about defaults. Where a claim rests on the installed source or on a doc quote, the table says which. Where nothing documents it, the table says "unverified".

---

## 1. Findings

| # | Question | Answer and evidence | Status |
|---|----------|---------------------|--------|
| 1.1 | Do hooks run in the `addConfig` component? | `ForgeReconciler.addConfig(element)` renders the element in a normal React reconciler container (`@forge/react` 12.3.1, `out/reconciler.js` line 245). [`useProductContext`](https://developer.atlassian.com/platform/forge/ui-kit/hooks/use-product-context/) is a `useState` and `useEffect` wrapper over `view.getContext()` (`out/hooks/useProductContext.js`), so it runs in any component. The docs never show a hook inside a config component, and the [macro config tutorial](https://developer.atlassian.com/platform/forge/add-configuration-to-a-macro-with-ui-kit/) is silent on it. Unverified at runtime. | ✅ Done |
| 1.2 | What is in the context there? | `FullContext.timezone: string` (`@forge/bridge` 7.2.0, `out/types.d.ts` line 70). The [macro module docs](https://developer.atlassian.com/platform/forge/manifest-reference/modules/macro/) add `macro.isConfiguring` for the config resource. The value is the same field the macro views already use as the viewer's zone. Whether it is the editing user's zone in the config surface is expected but unverified. | ✅ Done |
| 1.3 | The context is `undefined` on the first render | `useProductContext` starts as `undefined` and fills in after `view.getContext()` resolves. The first render of `Config` has no zone. | ✅ Done |
| 1.4 | `Select` `defaultValue` | The [Select docs](https://developer.atlassian.com/platform/forge/ui-kit/components/select/) say: "The default value of the select." Type `Option \| Option[] \| null`, marked as available in macro config. They do not say a saved value wins. The [tutorial](https://developer.atlassian.com/platform/forge/add-configuration-to-a-macro-with-ui-kit/) says each field "can take a `defaultValue`" and that the view falls back to defaults "when no saved config exists". Saved-wins is the normal meaning of a default and is unverified here. | ✅ Done |
| 1.5 | Is an untouched default saved? | The docs do not say. The tutorial says only "The config values are saved automatically". The [Connect migration guide](https://developer.atlassian.com/platform/adopting-forge-from-connect/migrate-macro/) says that a parameter a user has not changed "is not saved with the macro". Treat an untouched default as not saved until a test in Confluence shows otherwise. See section 3. | ✅ Done |
| 1.6 | Is there a documented way to write config from a classic panel? | No. [`view.submit`](https://developer.atlassian.com/platform/forge/add-custom-configuration-to-a-macro/) belongs to custom configuration, which is a separate `config.resource` in the manifest. The docs say `ForgeReconciler.addConfig()` is "not supported in custom configuration resources" and `useConfig()` does not work there. | ✅ Done |

---

## 2. How the default is set

One pure function, `defaultTimeZoneOption(contextTimeZone, timeZones)`, in `src/defaultTimeZone.js`. It returns `{ label, value }` when the name is exactly one of the options, and `undefined` otherwise. Both config panels pass its result to `defaultValue` on the existing Timezone `Select`. Nothing else changes in the JSX.

| # | Item | Detail | Status |
|---|------|--------|--------|
| 2.1 | Pure function and tests | Exact, case-sensitive match against `TimeZones`. The label and value are both the zone name, as in the option list. | ✅ Done |
| 2.2 | Wire into `non-repeating.jsx` | Call `useProductContext()` in `Config` and pass `defaultValue={defaultTimeZoneOption(context?.timezone, TimeZones)}`. | ✅ Done |
| 2.3 | Wire into `repeating.jsx` | The same change. | ✅ Done |
| 2.4 | README | Mention the default in the config table. | ✅ Done |
| 2.5 | Review doc row | Add row 3.8 to `003-codebase-review-2026-10.md`. | ✅ Done |

---

## 3. The persistence risk

If an untouched default is not saved, a user who leaves Timezone alone gets a macro with no `timeZone`. The macro then shows "Time Zone not configured". That is the same result as today, so the change cannot make an existing flow worse. It may only fail to improve it.

Options, in order of preference.

| # | Option | Verdict | Status |
|---|--------|---------|--------|
| 3.1 | A documented platform call that writes config from the classic panel | None exists (finding 1.6). | ✅ Checked |
| 3.2 | Move to custom configuration and call `view.submit({ config })` | Documented. It replaces the classic panel with a hand-built form and a Save button, changes the manifest, and changes the editing flow for every macro. That is a redesign of the editing flow. Left as a decision for the maintainer, only needed if the test in Confluence shows defaults are not saved. | ✅ Recorded |
| 3.3 | Make the macro treat a missing `timeZone` as the viewer's zone | Rejected. The configured zone is the zone the event time was written in. The viewer's zone is a different thing, and the wrong zone gives a wrong time with no warning. | ✅ Rejected |
| 3.4 | Keep "Time Zone not configured" as the safety net | Kept. A user who sees it can pick a zone, which is saved because it is a change. | ✅ Kept |

Plan: ship `defaultValue`, and give the maintainer a test (new macro, touch only Time and Date, save, check the view). If the view says "not configured", take option 3.2.

---

## 4. Edge cases

| # | Case | Behaviour | Status |
|---|------|-----------|--------|
| 4.1 | Existing macro with a saved zone | Saved value wins, assuming normal `defaultValue` semantics (unverified, in the manual test). | ✅ Done |
| 4.2 | Context not loaded yet | `defaultTimeZoneOption(undefined, ...)` returns `undefined`, so the first render has no default. Whether the Select picks up a `defaultValue` that arrives on a later render is unverified. If it does not, the Select stays empty, which is today's behaviour. | ✅ Done |
| 4.3 | Zone not in the list | No default. The Select is empty and valid, not broken. | ✅ Done |
| 4.4 | `undefined`, `null`, empty string, non-string | No default. | ✅ Done |
| 4.5 | Legacy aliases | `src/timezones.js` holds both `Asia/Kolkata` and `Asia/Calcutta`. The match is by exact name, so the context name picks its own entry and is never rewritten to the canonical one. | ✅ Done |
| 4.6 | Zone the context reports but the list lacks (for example a newer name) | Same as 4.3. | ✅ Done |
| 4.7 | Different case (`australia/sydney`) | No default. The list is IANA-cased and the context is expected to be too. | ✅ Done |
| 4.8 | The editing user's zone differs from the zone the event is written in | The user changes the Select. The default is a convenience only. | ✅ Done |

---

## 5. Tests

| # | Test | Status |
|---|------|--------|
| 5.1 | Unit tests for `defaultTimeZoneOption`: known zone, unknown zone, `undefined`, `null`, empty string, legacy alias present, label and value equal the name, does not mutate the list. | ✅ Done |
| 5.2 | Render test for `Config` only if a `@forge/react` mock makes it clean. The config modules call `ForgeReconciler.addConfig` at load, so the mock must supply it. | ✅ Done |
| 5.3 | Mutation check: break the matching and the label, and confirm tests fail. | ✅ Done |

---

## 6. Cannot be verified without Confluence

| # | Item | Status |
|---|------|--------|
| 6.1 | `useProductContext` returns a context inside the config panel. | ✅ In the PR test script |
| 6.2 | `context.timezone` there is the editing user's zone. | ✅ In the PR test script |
| 6.3 | A saved zone beats `defaultValue`. | ✅ In the PR test script |
| 6.4 | An untouched default is written to the saved config. | ✅ In the PR test script |
| 6.5 | A `defaultValue` that arrives after the first render is applied. | ✅ In the PR test script |
| 6.6 | Confluence does not mark the Select as touched or invalid when the default is applied. | ✅ In the PR test script |

These are in the manual test script in the PR.
