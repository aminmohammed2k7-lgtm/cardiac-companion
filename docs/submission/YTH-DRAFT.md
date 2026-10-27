# YTH Live: application draft

Deadline: 1 Nov 2026, 11:59 PM Pacific = **Mon 2 Nov 2026, 10:59 AM EAT**.
Ages 18 to 29, solo or 1 to 5, English. A finished product is not required.
The form questions are not published, so these are blocks to paste.
Fill every TODO with true facts only.

Judging: Relevance, Youth leadership, Usefulness, Innovation, Feasibility,
Access, Safety, Clarity.

## Tagline
An offline medicine record in three languages for young people in
Ethiopia living with rheumatic heart disease, and the families who help them.

## 50 words
Cardiac Companion helps young people in Ethiopia with rheumatic heart
disease keep track of warfarin, INR tests and penicillin injections. It
works offline in English, Amharic and Afaan Oromo, keeps everything on the
phone, and makes a visit summary for the doctor. It never changes a dose.

## 150 words
Rheumatic heart disease mostly affects children and young people. In
Ethiopia many of them take warfarin, which needs regular INR blood tests,
and a penicillin injection every few weeks. Missing either can be serious,
and most keep track on a paper card, often with a parent or a young
caregiver helping.

Cardiac Companion is an Android app for them. It shows today's warfarin
dose as the doctor wrote it, keeps INR results against the doctor's range,
counts down to the next injection, lists medicines and warning signs, and
makes a summary for clinic visits. It works without internet, in English,
Amharic and Afaan Oromo, with Ethiopian dates. Nothing leaves the phone.

It can also estimate pulse with the phone camera. That is an estimate,
not a medical device, and it has not yet been tested against a pulse
oximeter.

## 300 words
TODO: expand the 150 words with: who Amin is (TODO), why he started
(TODO, true story only), and the current state: a working prototype with
75 automated test runs, a web demo with a made-up sample patient, and an
Android build in progress.

## How young people informed the idea
TODO: Amin must write this. The repo does not record any user research.
Do not claim interviews, testers or numbers that did not happen.

## What makes it different
- Works fully offline, with no account.
- Three local languages and the Ethiopian calendar and clock.
- Built around the two treatments that matter most in rheumatic heart
  disease: warfarin with INR, and penicillin injections.
- Privacy by design: no servers, analytics or ads.

## How we would use the funding
TODO: Amin decides. Ideas that match the open work: test the camera pulse
against a pulse oximeter on about 20 people (`docs/pulse-accuracy-check.md`),
pay a native speaker and a clinician to review the wording, phones for
testing, and a small pilot with a clinic.

## Privacy and safety
- Health data never leaves the phone, except files the user chooses to share.
- No servers, accounts, analytics, ads or crash reporting.
- Encrypted backups and an optional PIN lock.
- The app never computes, suggests or changes a dose. It only shows what
  the doctor prescribed and the user entered.
- It interprets nothing beyond comparing an INR result with the doctor's
  range and showing fixed warning-sign text.
- The camera pulse is a wellness estimate, not a medical device, and says
  so beside the button.

## Limitations (say them plainly)
- Camera pulse accuracy is not yet tested against a reference device.
- Amharic and Afaan Oromo text still needs a native speaker check.
- The Android app is still in progress: reminders only ring while the app
  is open or recently used.
- TODO: no real-user testing yet, unless Amin has done some.

## Team
TODO: names, ages, roles. Video intro is voice-over only.
