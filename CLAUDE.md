# Cardiac Companion — rules for Claude Code

## What this is
Offline Android app (Capacitor 8, Android only, Google Play only) for heart patients in
Ethiopia: warfarin and INR, monthly benzathine penicillin, medicines, weight, symptoms,
warning signs and a visit summary. English, Amharic, Afaan Oromo. Ethiopian and Gregorian
calendars and clocks. Owner: Amin. Work order: docs/claude-code-order.pdf (phases 0-9).
Reference: docs/app-guide.pdf (the v3.2 guide, with a file-by-file line index).

## Safety charter (never break)
1. Never compute, suggest, round or change any dose. Show only what the user entered.
2. No interpretation beyond v3.2: INR vs the doctor's range, the fixed warning-sign
   texts, and the documented weight, symptom and mood rules.
3. Health data never leaves the phone, except files the user chooses to share.
   No servers, accounts, analytics, ads, crash reporters, remote code or remote fonts.
4. Health wording is frozen in all three languages. Propose changes only in
   docs/NEEDS-CLINICAL-REVIEW.md and wait for Amin.
5. Never lose user data. Storage changes need a tested, lossless migration and keep
   the previous copy.
6. Dates use the phone's local calendar day, never UTC.
7. Camera pulse is off in release builds; the release has no CAMERA permission.
8. Suspected bug in medical logic: don't fix it silently. Log it in
   docs/android/FOUND-BUGS.md and ask Amin.

## How to work
- One phase per branch: phase-N-short-name. Plan first; wait for approval.
- Run `npm test` before every commit. Never skip or weaken a test to make it pass.
- Write tests before moving medical logic. Behaviour must not change unless the
  phase says so.
- Ask Amin before: a new dependency, changing the application ID or storage format,
  removing a feature, changing a design rule, anything about signing.
- Never read, print or commit keystores, passwords or keystore.properties.
- Keep en / am / or complete (tests/i18n.test.js) and the flat design rules
  (tests/look.test.js).
- From Phase 2: UI code calls www/js/platform/*, never Capacitor plugins directly.
- Explain in plain English and comment the why, not just the what.
- End each phase with: what changed, phone test steps, risks, decisions needed.

## Commands
- npm test                                 all Node tests
- npx cap sync android                     copy www/ into the Android project
- npx cap open android                     open in Android Studio
- cd android && ./gradlew assembleDebug    debug APK (gradlew.bat on Windows)
- cd android && ./gradlew bundleRelease    release bundle (signing set up by Amin)
