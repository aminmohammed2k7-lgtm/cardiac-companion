# Cleanup report: plain human style (October 2026)

Branch `cleanup-human-style`. Local only, nothing pushed. App behaviour,
medical logic, storage, signing and the application ID are unchanged.
`npm test` passed before every commit (53 runs, 1446 checks).

## Commits

1. `Save work in progress before cleanup`: the uncommitted camera-pulse
   work that was already in the tree, saved as it was.
2. `Plain style in CHANGES.md and the docs`
3. `Plain punctuation in English non-health UI text`
4. `Plain punctuation in code comments`
5. `Plain punctuation in test names and comments`
6. This report.

`android/.idea/` (Android Studio settings) and `cleanup_prompt.txt` were left
uncommitted on purpose.

## What changed

- **CHANGES.md and docs/android/**: no em or en dashes, and no semicolon
  chains. Long sentences were split. Ranges read "20 to 300 kg". Code line
  ranges use a plain hyphen (`:5788-5790`). An empty table cell says "None".
  Quotes of app text were kept exactly as the app shows them.
- **English UI text (not health wording)**: 13 strings in `www/index.html`,
  for example "Summary copied. Paste it into a message" and "Backup saved.
  Keep the file somewhere safe…". The others are `notifBlockedToast`,
  `offlineFontsWarning`, `shareFailed`, `pdfFailed`, `confirmDelPerson`,
  `icsNothing`, `icsReady`, `saveFailed`, both `t-visitHint` copies and the
  Settings line "On this phone only. Nothing is sent anywhere" (in the
  dictionary and in the HTML).
- **Code comments** in `index.html`, `ppg-engine.js`, `js/core/*.js` and
  `scripts/vendor.js`: dashes became colons, commas, full stops or brackets,
  whichever fits the sentence. Only comment lines changed. This was checked
  against the diff.
- **Tests**: file headers say "Run with:", and test names use "20 to 250".
  Two log lines read "ppg-engine 1.x: synthetic validation". No expected
  value changed.
- **tools/pulse-lab.html**: the title is now "Cardiac Companion pulse lab".
- **New: docs/NEEDS-CLINICAL-REVIEW.md**: the wording that was not changed,
  with a suggested fix for each string.

## Dash counts

Counted over `www`, `docs`, `tests`, `tools`, `scripts` and the root `.md`
files, tracked files only. node_modules, `android/` and the PDFs are left
out.

| | Em dash (U+2014) | En dash (U+2013) | Total |
|---|---|---|---|
| Before | 389 | 95 | 484 |
| After | 192 | 19 | 211 |

`docs/NEEDS-CLINICAL-REVIEW.md` and this report are new and not in these
numbers. They quote the old strings, so they contain dashes on purpose.

**Where the 211 left are, and why they stay:**

- **106 in health wording and translations**: 105 in the string
  dictionaries in `index.html` (the English health wording, the Amharic and
  the Afaan Oromo) and 1 in the HTML copy of the disclaimer. These are
  frozen, and all of them are listed in NEEDS-CLINICAL-REVIEW.md.
- **79 shown as "—" for "no value yet"**, or used as a separator the code
  builds (55 in `index.html`, 24 on the pulse lab). Examples are summary rows like "12 Oct  INR 2.4 — in range",
  notification titles like "Medicines at 08:00 — Abebe", and the empty
  value in tiles and on the pulse lab. They are display format, not prose.
- **20 in tests**: expected values that must match what the app shows.
- **3 camera hints on the pulse lab**: camera instructions are treated like
  the app's own camera text.
- **1 in a proper name**: "Cramér–Rao" in a `ppg-engine.js` comment.
- **2 in docs** that quote the app ("This dose doesn't match your tablets —
  ask your pharmacist").

## Code (rushed code signs)

There was little to remove. There are no leftover debug logs (the one
`console.log` in `scripts/vendor.js` is the build script's real output), no
commented-out code, no TODOs and no comments that only restate the next line.
"Robust" appears only as a statistics term in the camera engine
(`rmssdRobust`), and that was not touched.

Not done, on purpose:

- **Splitting long functions.** `renderAll` (about 150 lines) and
  `summaryBlocks` (about 142 lines, the visit summary) were left whole. The
  risk to the medical display is larger than the gain.
- **Semicolons inside code comments.** Most are single, technical and clear,
  so they were left. The docs and CHANGES.md have none left in prose.
- **Old commit messages.** These are already on GitHub, so they were not
  rewritten.

## Strings left for clinical review

See `docs/NEEDS-CLINICAL-REVIEW.md`:

- 22 English health strings, each with a punctuation-only suggestion.
- 13 Amharic and Oromo strings that are not health wording. They can change
  once a native speaker picks the punctuation.
- The Amharic and Oromo health strings.
- The separators the app builds itself.

## Risks

- **Low.** The UI text edits are toasts and hints. No logic, keys or
  storage changed, and no test checks those strings.
- The English and translated copies of the 13 strings now differ in
  punctuation until the Amharic and Oromo ones are reviewed.
- Several files now have LF line endings in the working tree. The repo
  stores LF, so commits are not affected.

## Phone test steps

1. `npx cap sync android`, then build and install the debug APK.
2. In English, check Settings › Your data ("On this phone only. Nothing is
   sent anywhere") and the visit hint on the Summary page.
3. Settings › People on this phone › delete a person: the question reads
   "…This cannot be undone. Back up first if you're unsure." Cancel it.
4. Switch to Amharic and Afaan Oromo and check that nothing changed there.
5. Check that a warning sign, an INR result and a missed warfarin dose still
   show their old wording, with the dash.
6. Saving and sharing files don't work in the app until Phase 5. So check the
   backup toast ("Backup saved. Keep the file…") and the Send to family toast
   in a browser, by opening `www/index.html`.
