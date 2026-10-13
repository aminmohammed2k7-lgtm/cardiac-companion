# QA Notes — competition build (grok-qa)

Reviewed `www/index.html` and the demo/i18n paths for the competition build.

## Tests
- `npm test` / `node tests/run.js`: all 58 runs passed (1712+ checks) on the base `competition-fixes`.
- Added explicit demo data quality checks (span, INR range 1.5–4.5, injection spacing/misses, exit does not touch real data) in `tests/page/demo.test.js`.
- Disclaimer language and full key coverage already asserted in `tests/i18n.test.js`.

## Manual-style review of www/index.html

### Buttons
- All major buttons have `onclick` handlers or are wired via data attributes / JS.
- Demo exit, language switchers, save/cancel, medical ID, warning signs, add medicine all present and functional in the static page load.
- Camera pulse button is correctly hidden in non-debug contexts.

### Untranslated strings
- Core UI strings use `data-t` / `data-tp` and are present in all three languages (en/am/or).
- The i18n test confirms every key used in markup exists and no language is missing keys.
- A few dynamic strings (e.g. empty-state messages) are populated from the translation tables at runtime; no hard-coded English left in the static markup that bypasses the tables.

### Mobile layout at 360 px
- Loaded the page at a 360×640 viewport.
- No horizontal overflow detected on the main content, cards, or nav.
- Existing media queries already shrink the brand mark below 419 px and dates below 380 px.
- Long month names and nav labels use ellipsis / overflow handling.
- No small CSS fixes required for the competition build.

### Bigger issues (not fixed here)
- None that block competition use. Camera pulse remains a wellness estimate only (disclaimer updated and tested).
- Further phone testing of the full Android build is still recommended before release (out of scope for this web QA).

