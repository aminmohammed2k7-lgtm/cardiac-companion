# Cardiac Companion

**An offline medicine record for young people with rheumatic heart disease in Ethiopia**

Team: TODO (name, school). Repo: https://github.com/aminmohammed2k7-lgtm/cardiac-companion
Demo: https://cardiac-companion.vercel.app (tap "Try the sample record")

## The problem
Young people with rheumatic heart disease often take warfarin, which needs
regular INR blood tests, and a penicillin injection every few weeks.
Missing either can be serious. Most track this on a paper card.

## What it does
- Shows today's warfarin dose as the doctor wrote it. It never changes a dose.
- Keeps INR results against the doctor's target range.
- Counts down to the next penicillin injection.
- Lists medicines by time and warns before tablets run out.
- Lists warning signs with one-tap calls to the clinic and family.
- Makes a visit summary PDF for the doctor.
- Estimates pulse with the phone camera (an estimate, not a medical device).

## How people use it
Open the app, pick a language (English, Amharic or Afaan Oromo), enter the
doctor's instructions, then check Today each day. A sample record and a
short guided tour show everything without typing.

## How it is built
Android app with Capacitor, plain HTML and JavaScript. Works offline. No
servers or accounts: data stays on the phone, with encrypted backup and an
optional PIN. 75 automated test runs check the medical rules in three time
zones, all three languages and the design rules.

## Limits and next steps
Camera pulse accuracy is not yet tested against a pulse oximeter. Local
language text needs a native speaker check. Next: phone testing, the
accuracy check, and a clinician review of the wording.

---
Notes for Amin (not part of the PDF):
- Deadline 14 Nov 11:45 PM PST = 15 Nov 10:45 AM EAT. One update said it
  may move to December with no date; plan for 14 Nov.
- **Risk:** the app was started before the hackathon (first PRs in late
  September 2026). The rule on existing projects is unclear. Ask the
  organisers or describe honestly what was built during the event.
- Needs: working project, 2 to 3 min demo video, this page as PDF, repo link.
- `DSH-HACKS-ONE-PAGER.pdf` is made from the part above the line.
