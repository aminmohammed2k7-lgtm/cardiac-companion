# Handoff — where the 4.0 work stands (5 October 2026)

For the next Claude session. Read CLAUDE.md first, then this.

## Branch
All 4.0 work is on `claude/new-session-655rhs` (not merged into main, on
purpose: main still serves the 3.2.2 website on Vercel; merging would break
it because the app moved to www/). Keep working on this branch, or branch
from it as `phase-4-reminders`.

## Done
- Phase 0–1: tests and js/core (main, web 3.2.2).
- Phase 2: Capacitor 8 Android shell. Tested on Amin's Samsung M14 in
  airplane mode: everything works, no INTERNET permission.
- Phase 3: www/js/platform/storage.js, files with atomic saves, .bak,
  migration from localStorage. Tests pass; the APK built on GitHub (run
  37345932230). **Phone test still to do** (steps below).

## Amin's setup
- Windows 11, Samsung M14. Slow internet: Android Studio could not download
  its JDK/Gradle, so he installs the **debug APK from GitHub Actions**
  (Actions → run → Artifacts → cardiac-companion-debug), copies it to the
  phone over USB and installs it over the old one.
- Claude Code on his laptop cannot connect; work happens in Claude Code on
  the web, and he tests APKs.
- He is not technical: give short, numbered steps.

## Next
1. Phase 3 phone test: old data still there; mark a dose then swipe the app
   away at once → still marked; two people keep separate data; language and
   theme survive a restart. Ask Amin whether these two new strings read
   well: `recoveredTitle` / `recoveredText` in am and or (www/index.html).
2. Phase 4 (reminders when the app is closed): plan first, wait for Amin's
   approval; new dependencies (@capacitor/local-notifications) need his OK.

## How to verify
- `npm install && npm test` (54 runs, all must pass).
- GitHub Actions builds the APK on every push and prints the merged
  permission list.
