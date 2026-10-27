# AGENTS.md

Guidance for AI coding agents working in this repository. Read it before you change anything.

## What this is

A Forge app for Confluence that provides two inline macros, "Localised date macro" and "Repeating localised date macro". Viewers see a configured date and time converted to their own timezone. The macros render with UI Kit (`render: native`). A server-side `adfExport` function renders them for PDF, Word and mobile exports. `README.md` has the user-facing description.

## UI components: only use what comes from `@forge/react`

**All frontend UI must come from the `@forge/react` package. Nothing else may render on screen.**

This is a hard rule. It applies to every file that renders anything: the macro views, the config panels and any future module.

- Import every component from `@forge/react`. The [UI Kit components page](https://developer.atlassian.com/platform/forge/ui-kit/components/) documents what the package offers. Read it before you build something new.
- Do not use HTML elements (`div`, `span`, `table` and so on).
- Do not import from `@atlaskit/*`. Those packages are in `node_modules` as dependencies of Forge, and importing them directly is not allowed.
- Do not add other React component libraries, custom CSS or hand-written markup.
- Do not hand-build a component that `@forge/react` already provides.
- Style through what `@forge/react` provides, such as `Box`, `Inline`, `Stack` and `XCSS`.
- Components that the docs mark Preview or EAP can change. Say so in the PR description when you use one.
- Hooks from `@forge/react` (`useConfig`, `useProductContext`) are not components. They are fine to use.

## Commands

| Command | What it does |
|---------|--------------|
| `npm test` | Runs the Jest suite. |
| `npm run lint` | Runs ESLint over `src`. |
| `npm run gen-options` | Regenerates `src/timezones.js` from `moment-timezone` data. |
| `npm run deploy:dev` | `forge deploy -e development` |
| `npm run deploy:prod` | `forge deploy -e production` |
| `forge lint` | Lints the Forge app and manifest. Needs the maintainer's Forge login. |
| `forge tunnel` | Develops against the development environment with live reload. |

Use Node 22 (`.nvmrc`). Run lint and tests before you commit, and run `forge lint` before any deploy.

## Deploys

- Deploy to development only when asked.
- Never deploy to production unless the maintainer tells you to in that conversation.
- When a deploy reports new scopes or egress URLs, tell the maintainer. `forge install --upgrade` is a separate step that you run only when asked.

## Code conventions

- **Macro config:** read it with `useConfig` from `@forge/react`, through `src/frontend/useDateMacroContext.js`. `view.getContext()` is a one-shot read and goes stale when config is autosaved in the editor.
- **Config validation and time parsing** live in `src/configHelpers.js` and are shared by the macros and `adfExport`. Change them in one place.
- **Display formats** live in `src/displayOptions.js`. Keep `renderDateLozenge` (`src/frontend/common.jsx`) and `src/adfExport.js` in step, because the export mirrors what the macro shows.
- **User-visible text** lives in `locales/<code>.json`, one file per Forge locale (26), all registered in `manifest.yml`. Do not hard-code English in the frontend, `configHelpers.js` or `adfExport.js`. Frontend code gets `t(key, params)` from `useTranslate()` (`src/frontend/useTranslate.js`), which wraps react-intl's `useIntl` under `MacroIntlProvider`. `adfExport.js` builds it with `createTranslator` (`src/i18n.js`). Messages use ICU MessageFormat, so `{name}` placeholders work and plurals and selects are available. Forge loads only the viewer's locale file (`i18n.getTranslations`), and `flattenMessages` in `src/i18n.js` turns that nested file into react-intl message ids. `view.getContext()` passes locales it cannot map (`en-AU`, `de-AT`, `fr-CA`) through unchanged, so always call `resolveLocale` from `src/i18n.js` before `getTranslations`, or those viewers get the default English. A new key goes into every locale file, and `src/__tests__/locales.test.js` fails if one is missing. The macro `title` and `description` use `i18n:` keys. Do not put plain strings back in `manifest.yml`. `en-AU` is not a supported Forge locale, so `en-GB` is the default fallback and serves Australian spelling. See the [Forge translations reference](https://developer.atlassian.com/platform/forge/manifest-reference/translations/) and the [supported locale codes](https://developer.atlassian.com/platform/forge/manifest-reference/forge-supported-locale-codes/).
- **Logging in `adfExport.js`:** warnings and errors only. Never log account IDs or full configs.
- **Dead code:** delete it. Do not leave commented-out blocks or debug logging behind.

## Tests

- `@forge/react`, `@forge/bridge` and `@forge/api` cannot load under Jest because they need the Forge runtime or a browser. Mock them, as the existing tests do.
- Pin the clock with Jest fake timers in any test that depends on the current time. Repeat-date logic needs DST and leap-day cases.
- Check that a new test fails when you break the code it covers.

## Dependencies and CI

- `package-lock.json` records download URLs on Atlassian's internal Artifactory. Leave them as npm writes them. The GitHub Actions workflow (`.github/workflows/ci.yml`, added in PR #11) rewrites them to the public registry at install time. Never commit a lockfile with the rewritten URLs.
- Never read `~/.npmrc` or print its contents. It holds registry credentials.
- ESLint is on version 7, so `ecmaVersion` tops out at 2021.

## Planning documents

Proposals live in `ai-proposals/`. Read the relevant one before you start, write a new one for any sizeable change, and keep its status column current as items finish. Start with `ai-proposals/codebase-review-2026-10.md`, which ranks what is left to do.

## Style for text you write

Docs, proposals, commit messages and PR descriptions use short, direct sentences and lead with the point. No em dashes. Link the documentation next to any tool or API you mention.

## Git

- Work on a branch. Never push to `main`.
- Commit messages end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. PR descriptions end with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- Do not commit `.forge/` (it is ignored), PDFs or other stray files.
