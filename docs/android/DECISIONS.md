# Decisions for Cardiac Companion 4.0

Part A4 of the work order lists the decisions only Amin can make. On 5 October
2026 Amin asked for a choice to be made ("just choose whatever you think is better for
me"). These are the work order's own recommended defaults unless a reason
below says otherwise. Every later phase should follow this file, and ask Amin
before changing any line in it.

| Decision | Chosen | Why | Can it change later? |
|---|---|---|---|
| Application ID | `org.cardiaccompanion.app` (working ID) | Phase 2 needs one. The final ID should use a domain the publishing organization controls | **Yes, until the first upload to Google Play** (Phase 8). After that, never. Settle it with the publishing partner before Phase 8 |
| Who publishes on Google Play | A partner organization's developer account | Google requires an organization account, with a D-U-N-S number, for health apps | Only Amin can arrange this (Appendix D). Not needed before Phase 8 |
| Camera pulse in the public app | **On, everywhere** (web demo and Android, debug and release). Changed from Off by Amin on 15 October 2026 | Amin's decision. It is labelled a wellness estimate, never a diagnosis, and the "not a medical device" line is shown next to the "Measure with camera" button and on the camera screen. The Android app asks for CAMERA only when the person taps that button | Yes. Still open: real-world validation and clinical sign-off of the wording (`docs/NEEDS-CLINICAL-REVIEW.md`) |
| Android's automatic cloud backup | **Off** | Keeps "nothing leaves the phone" literally true. People use the app's own backup file | Yes |
| Oldest Android version | **Android 7.0 (API 24)**, Capacitor 8's default | Many budget phones in Ethiopia run older Android | Raising it later is easy. Lowering it is not possible with Capacitor 8 |
| Internet permission | **Removed** from the release build, if the app works without it | A privacy promise anyone can check | Yes. If it must stay, Phase 2 explains why in `PERMISSIONS.md` |
| Touch-target size | **48 px** for every touch target | Android accessibility guidance. Google Play's pre-launch checks flag smaller ones | Done in Phase 7, with `tests/look.test.js` updated |
| Licence | **Apache-2.0** | Lets clinics and partners reuse the code, with an explicit patent grant. Works with Capacitor (MIT) and the fonts (OFL) | Added with the README in Phase 9, before the code is shown publicly |

## The suspected bugs

What was decided about each finding, and why, is in `FOUND-BUGS.md` ("Decisions",
5 October 2026). Three were fixed (#2, #3, #6). Four were left with a reason.

## Still Amin's own jobs (work order A5)

No one else can do these, and they must never be shared:

- Create the upload signing key and keep two offline copies (Phase 8 gives the exact command).
- Google Play Console: the account, identity checks, payments and every declaration.
- Agree the health wording with clinicians before any real patient uses the app.
- Any agreement with a partner organization.
