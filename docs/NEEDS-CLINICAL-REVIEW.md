# Health wording that needs clinical review

Safety charter rule 4: health wording is frozen in English, Amharic and
Afaan Oromo. A change is proposed here and waits for Amin, who agrees it
with a clinician before any real patient uses the app. Nothing in this file
changes the app by itself.

Each item lists the text **now in the app**, the text it replaced, who
changed it and why, and what the reviewer is asked to check. Strings are
copied from `www/index.html`; the key names let anyone find them there.

| # | Item | Status |
|---|---|---|
| 1 | Main and About disclaimers mention the camera pulse | **In the app, waiting for clinical review** |
| 2 | "Not a medical device" line beside the camera button | **In the app, waiting for clinical review** (existing text, new place) |
| 3 | Amharic and Afaan Oromo camera texts | **Drafts, need a native-speaker check** |
| 4 | Guided tour: two stops restate safety rules in plain words | **In the app (sample record only), please check** |
| 5 | Sample record: Medical ID text and nurse's order in Amharic and Afaan Oromo | **Drafts, please check** (made-up patient, but medical terms) |
| 6 | First screen, sample banner, tour and sample notes in Amharic and Afaan Oromo | **Drafts, need a native-speaker check** (not health wording) |

## 1. Disclaimers mention the camera pulse

- **Changed in:** commit `15a87ae` (13 October 2026, merged in
  aminmohammed2k7-lgtm/cardiac-companion#8), accepted by Amin with his
  decision of 15 October 2026 that the camera pulse stays on everywhere
  (`docs/android/DECISIONS.md`).
- **Why:** the old text said the app "does not measure" anything, but the
  app can estimate pulse from the camera. The disclaimer and the feature
  disagreed.
- **Locked by:** `tests/i18n.test.js`.
- **Please check:** that "wellness reading only" is clear and not
  misleading to patients; that the Amharic and Afaan Oromo say the same as
  the English; and whether "It does not diagnose anything or tell you
  whether to seek care" should stay, given the warning-sign screen.

### Footer of every page (`t-disclaimer`)

**English**

- Now: Not a medical device. This app records what you and your doctor enter. It can estimate your pulse with the phone camera as a wellness reading only. It does not diagnose or decide anything. Always follow your clinician's guidance.
- Before: Not a medical device. This app records what you and your doctor enter — it does not measure, diagnose or decide anything. Always follow your clinician's guidance.

**Amharic (አማርኛ)**

- Now: የሕክምና መሣሪያ አይደለም። ይህ መተግበሪያ እርስዎና ሐኪምዎ ያስገቡትን ይመዘግባል። በስልክ ካሜራ የልብ ምትዎን እንደ የጤንነት ንባብ ብቻ ሊገምት ይችላል። በሽታ አይለይም፣ ምንም አይወስንም። ሁልጊዜ የሐኪምዎን መመሪያ ይከተሉ።
- Before: የሕክምና መሣሪያ አይደለም። ይህ መተግበሪያ እርስዎና ሐኪምዎ ያስገቡትን ብቻ ይመዘግባል — አይለካም፣ በሽታ አይለይም። ሁልጊዜ የሐኪምዎን መመሪያ ይከተሉ።

**Afaan Oromo**

- Now: Meeshaa yaalaa miti. Appiin kun waanuma ati fi doktorri kee galchitan galmeessa. Kaameraa bilbilaan rukuttaa onnee kee akka safartuu fayyummaa qofaatti tilmaamuu danda'a. Dhukkuba hin adda baasu, murtoo hin kennu. Yeroo hunda qajeelfama doktora keetii hordofi.
- Before: Meeshaa yaalaa miti. Appiin kun waanuma ati fi doktorri kee galchitan galmeessa — hin safaru, dhukkuba hin adda baasu. Yeroo hunda qajeelfama doktora keetii hordofi.

### Settings → About (`t-settingsAboutDisclaimer`)

**English**

- Now: Cardiac Companion is a personal record, not a medical device. It can estimate your pulse with the phone camera as a wellness reading only. It does not diagnose anything or tell you whether to seek care. Always follow your clinician's guidance.
- Before: Cardiac Companion is a personal record, not a medical device. It does not measure your heart, diagnose anything, or tell you whether to seek care. Always follow your clinician's guidance.

**Amharic (አማርኛ)**

- Now: የልብ ጤና አጋር የግል መዝገብ እንጂ የሕክምና መሣሪያ አይደለም። በስልክ ካሜራ የልብ ምትዎን እንደ የጤንነት ንባብ ብቻ ሊገምት ይችላል። በሽታ አይለይም፣ ሕክምና ይፈልጉ እንደሆነ አይወስንም። ሁልጊዜ የሐኪምዎን መመሪያ ይከተሉ።
- Before: የልብ ጤና አጋር የግል መዝገብ እንጂ የሕክምና መሣሪያ አይደለም። ልብዎን አይለካም፣ በሽታ አይለይም፣ ሕክምና ይፈልጉ እንደሆነ አይወስንም። ሁልጊዜ የሐኪምዎን መመሪያ ይከተሉ።

**Afaan Oromo**

- Now: Michuu Onnee galmee dhuunfaati malee meeshaa yaalaa miti. Kaameraa bilbilaan rukuttaa onnee kee akka safartuu fayyummaa qofaatti tilmaamuu danda'a. Dhukkuba hin adda baasu, yaala barbaaduu qabda jedhees hin murteessu. Yeroo hunda qajeelfama doktora keetii hordofi.
- Before: Michuu Onnee galmee dhuunfaati malee meeshaa yaalaa miti. Onnee kee hin safaru, dhukkuba hin adda baasu, yaala barbaaduu qabda jedhees hin murteessu. Yeroo hunda qajeelfama doktora keetii hordofi.

## 2. "Not a medical device" line beside the camera button

- **Changed in:** this change (15 October 2026). No wording changed: the
  line already shown on the camera screen (`camNotDevice`) is now also shown
  directly under the "Measure with camera" button. The button and the line
  show and hide together, on the web demo and on Android.
- **Why:** Amin asked for the disclaimer to be shown clearly next to the
  camera pulse everywhere it is offered.
- **Please check:** that the text is right in this place as well.

**English:** This is an estimate from your phone's camera, not a medical device. If you feel unwell, use the warning signs on the Today page.

**Amharic (አማርኛ):** ይህ ከስልክዎ ካሜራ የተገኘ ግምት ነው እንጂ የሕክምና መሣሪያ አይደለም። ከታመሙ በዛሬ ገጽ ላይ ያሉትን የአደጋ ምልክቶች ይጠቀሙ።

**Afaan Oromo:** Kun tilmaama kaameraa bilbila keessanii irraa argame malee meeshaa yaalaa miti. Yoo dhukkubsattan, mallattoolee balaa fuula Harʼaa irra jiran fayyadamaa.

## 3. Amharic and Afaan Oromo camera texts

`CHANGES.md` (camera pulse, version 3.1) already notes that the Amharic and
Afaan Oromo camera texts are drafts. They need a native speaker, ideally one
with health training, before patients use them. This covers every key that
starts with `cam` in `www/index.html`, and the two disclaimers above.

## Still open from the camera pulse release

The open questions listed in `CHANGES.md` under the camera pulse release
also still apply now that the camera is on everywhere: clinical sign-off of
the camera screen and the "uneven beats" note, real-world validation against
a pulse oximeter or a manual count on the phones patients use, atrial
fibrillation, and phones without a controllable light.

## 4. Guided tour: two stops restate safety rules

- **Added in:** the demo quick-wins change (15 October 2026), approved by
  Amin as part of the competition bundle. Only shown on the sample record.
- **No existing health or warning wording changed.** The warning-sign
  lists, their headings and every medical text are exactly as before. The
  tour's titles reuse the existing card titles.
- Two tour texts describe what a screen does in words that touch the safety
  rules, so they are listed here to be safe:

| Key | English (Amharic and Afaan Oromo drafts are next to it in `www/index.html`) |
|---|---|
| `tourWarfarinText` | Shows the dose the doctor wrote for today. The app never works out, suggests or changes a dose. |
| `tourWarnText` | Two fixed lists: when to get help now, and when to call the clinic today. The app does not decide anything for you. |

- **Please check:** that these say no more than the app does (charter rules
  1 and 2), and that "Two fixed lists" matches how a clinician would want
  the warning signs described.

## 5. Sample record: Medical ID text and nurse's order

The sample patient is made up, but two of her texts use medical terms. They
are now in Amharic and Afaan Oromo too (`www/js/demo.js`, `TEXT`), so the
sample reads in the app's language. The medical terms (mitral stenosis,
left atrium) are kept in English in brackets.

- The **doctor's order** keeps the exact English line in every language:
  `Benzathine penicillin G 1.2 million units into the muscle every 28 days`.
  Only the sentence around it ("Sample order, not a real patient. As the
  doctor wrote:") is translated. `tests/page/demo.test.js` fails if a
  language loses that line, so a dose is never re-worded.
- **Please check:** the Amharic and Afaan Oromo `clinicalInfo` and `order`
  in `www/js/demo.js`.

## 6. New text in Amharic and Afaan Oromo (not health wording)

All drafts, written without a native speaker. They should be checked before
the demo is shown in Amharic or Afaan Oromo (for example in the competition
video):

- First screen: `welcomeWho`, `welcomeOffline`, `welcomeLangs`, `langGroupLabel`.
- Sample banner: `demoBannerText` (rewritten to introduce Hana), `demoTourBtn`.
- Tour: `tourLabel`, `tourStepOf`, `tourNext`, `tourBack`, `tourSkip`,
  `tourDone`, `tourInjText`, `tourWarfarinText`, `tourWarnText`,
  `tourLangText`, `tourVisitText`.
- Sample record words in `www/js/demo.js` (`TEXT.am`, `TEXT.or`): the four
  daily notes and the medicine's purpose.
- In Amharic the banner writes the name as ሃና; the profile name stays
  "Hana Bekele" in Latin letters, as before.
