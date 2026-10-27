# Wording that needs clinical review

Safety charter rule 4: health wording is frozen in English, Amharic and
Afaan Oromo. A change is proposed here and waits for Amin, who agrees it
with a clinician before any real patient uses the app. Nothing in this file
changes the app by itself.

This file has two parts. Items 1 to 10 came with the camera pulse, the demo
and the merge. Sections P1 to P4 came from the cleanup and human polish
passes (their reports call them sections 1 to 4).

## Part one: camera pulse, demo and merge

Each item lists the text **now in the app**, the text it replaced, who
changed it and why, and what the reviewer is asked to check. Strings now
live in `www/js/strings.js`; the key names let anyone find them there.

| # | Item | Status |
|---|---|---|
| 1 | Main and About disclaimers mention the camera pulse | **In the app, waiting for clinical review** |
| 2 | "Not a medical device" line beside the camera button | **In the app, waiting for clinical review** (existing text, new place) |
| 3 | Amharic and Afaan Oromo camera texts | **Drafts, need a native-speaker check** |
| 4 | Guided tour: two stops restate safety rules in plain words | **In the app (sample record only), please check** |
| 5 | Sample record: Medical ID text and nurse's order in Amharic and Afaan Oromo | **Drafts, please check** (made-up patient, but medical terms) |
| 6 | First screen, sample banner, tour and sample notes in Amharic and Afaan Oromo | **Drafts, need a native-speaker check** (not health wording) |
| 7 | Camera coaching lines (how to place the finger) | **Drafts, need a native-speaker check** (not a diagnosis) |
| 8 | Camera pulse signal-quality check: confidence and retry lines, developer recording mode | **In main since 21 October 2026, wording still waiting for Amin** (Amharic and Afaan Oromo are drafts) |
| 9 | Camera texts found while merging: two dashes, and "browser" in the camera permission message | **Proposed, not changed** |
| 10 | Camera hints (one per poor reading) and the "Signal: good / poor" line | **In the app, waiting for Amin's review**; Amharic and Afaan Oromo are drafts, **not verified** |

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
starts with `cam` in `www/js/strings.js`, and the two disclaimers above.

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

| Key | English (Amharic and Afaan Oromo drafts are next to it in `www/js/strings.js`) |
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

## 7. Camera coaching lines

- **Added for the camera-pulse accuracy work.** English was rewritten so
  the live hints say, in plain words, cover the whole lens, press lightly,
  keep still, and rest the hand on a table. Amharic and Afaan Oromo of
  those lines, and of the new "no number is shown" lines, are drafts.
- **Not changed:** `camNotDevice`, `camUneven`, the HRV lines, the warning
  signs, and both disclaimers. Nothing here tells someone they have a
  rhythm problem or what to do about medicine.
- **Please check:** that the drafts below mean the same as the English, and
  that none of them sounds like a diagnosis.

Keys in `www/js/strings.js`: `camHow`, `camPlace`, `camHold`, `camLighter`,
`camWeak`, `camGood`, `camCover`, `camRest`, `camNoReading`,
`camFailLight`, `camFailStill`, `camFailCover`, `camFailWeak`,
`camFailDisagree`, `camLowQuality`.

The English of the new "we will not show a number" lines:

| Key | English |
|---|---|
| `camNoReading` | No number is shown — the reading was not clear enough. |
| `camFailLight` | The light was too bright, so no number is shown. Press lightly and try again. |
| `camFailStill` | Your hand moved, so no number is shown. Rest it on a table and try again. |
| `camFailCover` | The lens was not fully covered, so no number is shown. Cover the whole lens and try again. |
| `camFailWeak` | The signal was too weak, so no number is shown. Warm your hand, press lightly, and try again. |
| `camFailDisagree` | The pulse was not steady enough to trust, so no number is shown. Keep still and try again. |
| `camLowQuality` | This reading is not clear enough to show a number. Cover the whole lens, press lightly, rest your hand on a table, and try again. |
| `camCover` | Cover the whole lens. Part of it is still open. |
| `camRest` | Keep still, and rest your hand on a table. |

## 8. Camera pulse signal-quality check

- **Proposed in:** the pull request "Pulse signal-quality model (do not
  merge until Amin reviews)", October 2026. Merged into `main` on
  21 October 2026 (pull request #13). The questions below are still open.
- **What it does:** a second check (`www/pulse-quality.js`) rates each
  camera reading good or poor with a confidence from 0 to 100. A poor
  reading shows no number, live or at the end. It never changes a number.
- **Not changed:** `camNotDevice` (still beside the camera button and in
  the camera panel), `camUneven`, the HRV lines, the warning signs and both
  disclaimers.
- **Please check:**
  1. whether "Signal confidence 82/100" beside the pulse could be read as
     "the pulse is 82 % accurate" or as a statement about the heart. It is
     only how clean the camera signal looked. "Signal quality" may be safer
     wording;
  2. that the Amharic and Afaan Oromo drafts mean the same as the English;
  3. **uneven rhythms:** many people with rheumatic heart disease have
     atrial fibrillation. When the engine has already found clean pulses in
     an uneven rhythm, the check ignores beat spacing (otherwise most such
     readings would be refused as "noise" and the person told to keep
     still). The trained model is not used for those readings until it has
     been trained on some. Is that the right behaviour, or should an uneven
     reading show no number at all?

| Key | English | Amharic (draft) | Afaan Oromo (draft) |
|---|---|---|---|
| `camConfidence` | Signal confidence {n}/100 | የምልክት እርግጠኝነት {n}/100 | Amanamummaa mallattoo {n}/100 |
| `camQualityHold` | Keep your finger still and fully cover the camera. | ጣትዎን ሳያንቀሳቅሱ ካሜራውን ሙሉ በሙሉ ይሸፍኑ። | Quba kee osoo hin sochoosin kaameraa guutummaatti haguugi. |
| `camQualityRetry` | The signal was not clear enough, so no number is shown. Keep your finger still and fully cover the camera. | ምልክቱ በቂ ግልጽ አልነበረም፣ ስለዚህ ቁጥር አይታይም። ጣትዎን ሳያንቀሳቅሱ ካሜራውን ሙሉ በሙሉ ይሸፍኑ። | Mallattoon ifa gahaa hin turre, kanaaf lakkoofsi hin agarsiifamu. Quba kee osoo hin sochoosin kaameraa guutummaatti haguugi. |

The developer recording mode (hidden; seven taps on "About" in Settings)
adds `devTitle`, `devUnlocked`, `devRecLabel`, `devRecHint`, `devRecCount`,
`devRecExport`, `devRecClear`, `devRecClearConfirm`, `devRecRefLabel`,
`devRecSave`, `devRecSaved`, `devRecCheckRef`, `devRecFull`,
`devModelLine`, `devModelRules` and `devModelTrained`. They are for the
people running the oximeter study, not health wording, but the Amharic and
Afaan Oromo are drafts too.

## 9. Found while merging human polish with main (26 October 2026)

Not changed. Camera text is treated like health text, so these wait for
Amin.

| Key | Now | Proposed | Why |
|---|---|---|---|
| `camLighter` | Press lightly — not hard. | Press lightly, not hard. | Punctuation only. The polish pass took dashes out of English text that is not health wording, and left camera text alone. |
| `camNoReading` | No number is shown — the reading was not clear enough. | No number is shown. The reading was not clear enough. | Punctuation only, as above. |
| `camDenied` | Camera permission was refused. You can allow it in your browser settings, or type the pulse instead. | Camera permission was refused. You can allow it in the phone's Settings, under Apps, or type the pulse instead. | **More urgent now.** The camera pulse is on inside the Android app since 15 October, and there is no browser there. This is the same proposal as P4b below. The Amharic and Afaan Oromo say "browser" too. |

`devRecCheckRef` ("30–250") keeps its en dash: it marks a range, like the
INR ranges in P1.

## 10. Camera hints and the "Signal: good / poor" line (27 October 2026)

- **Proposed in:** the pull request from branch `claude/pulse-quality-finish`
  (October 2026). Not yet reviewed by Amin, and not merged.
- **What it does:** each poor camera reading gets one line of advice (what
  to do next, from the camera signal alone), and the camera screen shows
  "Signal: good" or "Signal: poor". No number changes. A poor reading still
  shows no number. The line for a reading whose fault no single measure
  names is the existing "keep your finger still" line (item 8).
- **Not changed:** `camNotDevice`, the warning signs, both disclaimers, and
  the HRV and uneven-rhythm lines.
- **Please check:**
  1. the English lines are plain, and none of them diagnoses or suggests a
     medical action;
  2. "Signal: poor" is not read as a verdict on the heart. It says only that
     the camera signal was not clean enough to show a number;
  3. "Warm your hand" (`camHintWeak`): is that a safe, plain tip for every
     person who uses the app? It is a tip for the camera signal, not for the
     heart;
  4. **the Amharic and Afaan Oromo are drafts.** They need a native speaker to
     check the meaning, not only the spelling. Nothing here is verified.

| Key | English | Amharic (draft) | Afaan Oromo (draft) |
|---|---|---|---|
| `camSignalChecking` | Signal: checking… | ምልክት፦ በመፈተሽ ላይ… | Mallattoo: ilaalamaa jira… |
| `camSignalGood` | Signal: good | ምልክት፦ ጥሩ | Mallattoo: gaarii |
| `camSignalPoor` | Signal: poor | ምልክት፦ ደካማ | Mallattoo: hin gaarii |
| `camHintDark` | Too dark. Turn the light on, or move near a bright window. | ጨለማ ነው። መብራቱን ያብሩ፣ ወይም ደማቅ መስኮት አጠገብ ይቁሙ። | Dukkana dha. Ifa banaa, ykn foddaa ifaa bira dhiyaadhu. |
| `camHintBright` | Too bright. Press lightly, and move away from strong light. | ብርሃኑ በጣም ጠንካራ ነው። ቀስ ይጫኑ፣ ከጠንካራ ብርሃን ይራቁ። | Ifni baay'ee cimaa dha. Suuta dhiibaa, ifa cimaa irraa fagaadhu. |
| `camHintPressure` | Keep the same pressure: not harder, not softer. | ተመሳሳይ ግፊት ይያዙ። ከዚህ በላይ አጥብቀው አይጫኑ ወይም አይልቀቁ። | Dhiibbaa wal fakkaatu itti fufi. Hin cimsin, hin laafin. |
| `camHintWeak` | Weak signal. Warm your hand, then press lightly. | ምልክቱ ደካማ ነው። እጅዎን ያሙቁ፣ ከዚያ ቀስ ይጫኑ። | Mallattoon laafaa dha. Harka keessan ho'isaa, suuta dhiibaa. |

The other lines the hints use already existed (`camCover`, `camRest`,
`camQualityHold`, `camWeak`, `camPlace`) and are in items 7 and 8.


## Part two: cleanup and human polish

Line numbers in P1 and P2 are for `www/index.html` on the
`cleanup-human-style` branch, before the strings moved to
`www/js/strings.js`. Look strings up by key.

## P1. English health strings with a dash (cleanup pass, October 2026)

The cleanup pass removed dashes used as punctuation from English text that
is not health wording. These strings are health wording, so they still have
their dash. Each suggestion only changes punctuation and capitals. The words
stay the same.

| Line | Key | Now | Suggested |
|---|---|---|---|
| 1881 | `t-injSetupHint` (v3 copy) | For rheumatic heart disease. Your clinic sets how often — usually every 21 or 28 days. | For rheumatic heart disease. Your clinic sets how often, usually every 21 or 28 days. |
| 2484 | `t-injSetupHint` (shown) | For rheumatic heart disease. Your clinic sets how often — every 2 to 4 weeks. | For rheumatic heart disease. Your clinic sets how often, every 2 to 4 weeks. |
| 1903, and the HTML at 1556 | `t-disclaimer` | Not a medical device. This app records what you and your doctor enter — it does not measure, diagnose or decide anything. Always follow your clinician's guidance. | Not a medical device. This app records what you and your doctor enter. It does not measure, diagnose or decide anything. Always follow your clinician's guidance. |
| 1921 | `warfarinMissedText` | Tell your doctor at your next visit — do not double the next dose. | Tell your doctor at your next visit. Do not double the next dose. |
| 1945 | `symptomSevereText` | {name} recorded — contact your clinician if it does not settle. | {name} recorded. Contact your clinician if it does not settle. |
| 1947 | `customSymptomSevereText` | {name} at {severity}/10 — contact your clinician if it does not settle. | {name} at {severity}/10. Contact your clinician if it does not settle. |
| 1985 | `vitalCheckRange` | Check that number — it should be between {min} and {max}. | Check that number. It should be between {min} and {max}. |
| 2313 | `remBody` (dose reminder) | {n} to take — open the app to mark them | {n} to take. Open the app to mark them |
| 2345 | `camWeak` (done: main rewrote it without a dash) | Weak signal — warm your hand and cover the light fully. | Weak signal. Warm your hand and cover the light fully. |
| 2345 | `camGood` (done: main rewrote it without a dash) | Good — keep still. | Good. Keep still. |
| 2359 | `tabsCantSplit` | This dose doesn't match your tablets — ask your pharmacist | This dose doesn't match your tablets. Ask your pharmacist |
| 2396 | `targetHint` | Often 2.0–3.0, or 2.5–3.5 with a mechanical valve — use exactly what your doctor wrote. | Often 2.0–3.0, or 2.5–3.5 with a mechanical valve. Use exactly what your doctor wrote. |
| 2397 | `targetCheck` | Check the range — the first number must be lower, and both between 1 and 5 | Check the range. The first number must be lower, and both between 1 and 5 |
| 2399 | `inrCheckRange` | Check that number — INR results are between 0.5 and 15 | Check that number. INR results are between 0.5 and 15 |
| 2401 | `inrSavedIn` | Saved — in your target range | Saved. In your target range |
| 2402 | `inrSavedOut` | Saved — outside your target range. Make sure your clinic sees this result. | Saved. Outside your target range. Make sure your clinic sees this result. |
| 2417 | `fastHint` | Fasting changes when you eat and how much green food you eat — both can move your INR. Turn this on while you fast so it shows on your summary. | Fasting changes when you eat and how much green food you eat. Both can move your INR. Turn this on while you fast so it shows on your summary. |
| 2420 | `fastAdv1` | Take your medicines at the times your clinic agreed for fasting — ask them if you're not sure. | Take your medicines at the times your clinic agreed for fasting. Ask them if you're not sure. |
| 2429 | `nmSavedW` | Saved — tell your warfarin clinic, and ask if you need an extra INR test | Saved. Tell your warfarin clinic, and ask if you need an extra INR test |
| 2440 | `helpNowText` | This needs a doctor today. Don't wait to see if it settles — call an ambulance or go to the nearest hospital. | This needs a doctor today. Don't wait to see if it settles. Call an ambulance or go to the nearest hospital. |
| 2463 | `insightNotRec` | {n} dose(s) not recorded — counted as not taken. | {n} dose(s) not recorded. They count as not taken. (This matches `weekNotRec`.) |
| 2475 | `idWarfarin` | Takes warfarin (blood thinner) — risk of bleeding. | Takes warfarin (blood thinner). Risk of bleeding. |

**Keep as they are:** `targetShort` ("target {lo}–{hi}"), `idTarget` ("INR
target {lo}–{hi}.") and the ranges inside `targetHint`. These en dashes mark
a range, the way a doctor writes one. They are not punctuation.

## P2. Amharic and Afaan Oromo strings with a dash

Not changed, health wording or not. Which Amharic mark should replace a dash
(`፤`, `።` or `፣`) or which Oromo punctuation fits is a language decision.
It needs a native speaker.

**Not health wording**, so these can change as soon as a native speaker
picks the punctuation. The English versions have already been changed.

| Key | Amharic line | Oromo line |
|---|---|---|
| `t-visitHint` (v3 copy) | 2033 | 2167 |
| `t-visitHint` (shown) | 2696 | 2907 |
| `t-settingsStorageValue` | 2043 | 2177 |
| `notifBlockedToast` | 2090 | 2224 |
| `offlineFontsWarning` | 2094 | 2228 |
| `shareCopied` | 2096 | 2230 |
| `shareFailed` | 2097 | 2231 |
| `pdfFailed` | 2099 | 2233 |
| `confirmDelPerson` | 2498 | 2709 |
| `icsNothing` | 2538 | 2749 |
| `icsReady` | 2539 | 2750 |
| `backupDone` | 2542 | 2753 |
| `saveFailed` | 2548 | 2759 |

**Health wording.** These need the same review as section P1: `t-disclaimer`,
`t-injSetupHint`, `warfarinMissedText`, `symptomSevereText`,
`customSymptomSevereText`, `vitalCheckRange`, `remBody`, `camWeak`, `camGood`,
`tabsCantSplit`, `targetHint`, `targetCheck`, `inrCheckRange`, `inrSavedIn`,
`inrSavedOut`, `fastHint`, `fastAdv1`, `nmSavedW`, `weekNotRec`, `helpNowText`,
`insightNotRec`, `idWarfarin`. (The Amharic `t-injSetupHint` v3 copy at
line 2015 has no dash. The Oromo one at 2149 does.)

## P3. Dashes the app writes itself

The code also puts an em dash between parts of a line it builds, so these
were not counted as wording:

- the visit summary and family copy, for example "12 Oct  INR 2.4 — in
  range" (`summaryBlocks()`)
- notification titles with the person's name, for example "Medicines at
  08:00 — Almaz" (`checkRemindersFor()`, `buildIcs()`)
- "—" shown in place of a value that has not been entered yet

Changing them would change how the doctor's summary looks. Leave them unless
Amin wants a different separator.

## P4. Human polish pass (October 2026)

Line numbers above are from before this pass. From here on, look strings up
by key. After the polish pass they live in `www/js/strings.js`.

### P4a. English UI text that changed. The translations still say the old thing

These are not health wording, so the English was changed. The Amharic and
Oromo copies were **not** touched. A native speaker should bring them in
line when convenient. Until then they still read fine, just not word for
word the same.

| Key | Old English | New English |
|---|---|---|
| `welcomeTitle` | Welcome | Getting started |
| `welcomeText` | Your medicine record is ready. | Add your medicines and the times you take them on the Medicines page. Everything stays on this phone, and the app works without internet. |
| `t-enableNotifBtn` | Enable | Turn on notifications |
| `t-addSymptom` | Add | Add your own |
| `t-weekTable` | Week at a glance | Day by day |
| `t-settingsStorageValue` | On this phone only. Nothing is sent anywhere | (adds a full stop) |
| `notifEmpty` | No notifications yet | No messages. Reminders and notes from the app show up here. |
| `notifUnsupported` | Notifications not supported here | This phone can't show notifications from the app |
| `notifBlockedToast` | Blocked. Turn on in browser settings | Notifications are blocked. Turn them on in the phone's Settings, under Apps |
| `csvExported` | CSV file downloaded | CSV file saved |
| `emptyNotes` | No notes yet. | No notes yet. Notes you save go on the doctor's summary. |
| `backupNudgeText` | If this phone is lost or its browser data is cleared, everything here is gone. A backup takes a few seconds. | If this phone is lost or the app is removed, everything here is gone. A backup takes a few seconds. |

### P4b. Proposed, not changed (health wording or close to it)

| Key | Now | Proposed | Why |
|---|---|---|---|
| `insightNoWeight` | No weights recorded yet this week. | No weights recorded in this period. | The weight chart shows this text in its 30 day view too, where "this week" is wrong. Alternative: a second string for the 30 day view. |
| `t-adherence` | Adherence | Doses taken | "Adherence" is a clinician's word. The sub-line already says "doses taken", so that would need to change too, for example to "this week". It stays the first number on the Summary, as Amin decided. |
| `t-temp` | Temp | Temperature | A short form on a reading tile. "Temperature" fits the tile at 360px. |
| `camDenied` | …allow it in your browser settings… | …allow it in the phone's Settings, under Apps… | Camera text is treated like health text. The camera pulse is now on inside the Android app too, where there is no browser (see item 9). |

**Not a problem after all:** the English strings written as "{n} day(s)"
never show "(s)". `L()` turns them into "1 day" or "3 days" from the number.
The Phase 1 audit listed this as a tell. It was wrong about that.

### P4c. Amharic and Afaan Oromo flags (not changed)

- **Oromo `camDenied`** contains the English word "browser": "Qindaaʼina
  browser keessanii keessatti…". It should name the phone's Settings in
  Oromo, like the English proposal above.
- **"Afaan Oromoo" or "Afaan Oromo".** The language button's spoken label
  says "Afaan Oromoo". The docs and PROJECT-RULES.md say "Afaan Oromo". A native
  speaker should pick one, and the app and docs should then use it
  everywhere.
- **Version 3 strings.** No native speaker review is recorded for `T2.am`
  and `T2.or` (the strings added in version 3). They should be checked as a
  whole, not one by one.
- **The header date in Oromo.** The longest month, "Onkololeessa", used to
  be cut off at 360px. The language control is now one button, and the date
  fits. Nothing to change. Noted only so a native speaker can check it on
  a real phone.
