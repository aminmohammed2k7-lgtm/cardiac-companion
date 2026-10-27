# Camera pulse signal-quality model

The camera pulse (`www/ppg-engine.js`) already refuses readings it cannot
trust. `www/pulse-quality.js` adds a second, separate check: it rates the
last 8 seconds of the raw camera signal **good** or **poor**, with a
confidence from 0 to 100. A poor reading shows no number, during the
reading or at the end. Beside the reading the person sees a signal line,
"Signal: good" or "Signal: poor" (with a thin bar for the confidence when it
is good), and one hint saying what to do next (see "The hints"). It never
changes a number; the pulse rate always comes from the engine.

**Where this stands.** The rules are fixed thresholds, set by hand on
synthetic signals only (`tests/pulse-signals.js`). They have **not** been
trained or validated on real recordings from any phone or any person, so
nothing here says how often a "good" reading is right. The model in
`www/pulse-quality-weights.js` is still empty. This is a wellness estimate
only: not a measurement of the heart, and not a medical device. Everything
stays on the phone.

Once a model has been trained from recordings next to a pulse oximeter, it
uses that instead. That needs 40 or more oximeter-paired recordings, at least
10 good and 10 poor (see `docs/pulse-accuracy-check.md`). There are none yet.

## Files

| File | What it is |
|---|---|
| `www/pulse-quality.js` | Features, the fixed rules, the hints, the model, the recording CSV |
| `www/pulse-quality-weights.js` | The trained weights. `null` until trained |
| `tools/train-pulse-quality.js` | Trains the model from recording CSVs (`npm run train:pulse`) |
| `tests/pulse-quality.test.js` | Features, rules, model and training on synthetic signals |
| `tests/page/pulse-quality.test.js` | The camera panel and the recording mode on the page |
| `tests/pulse-signals.js` | The synthetic signals both tests use |

## The features

From the raw red, green and blue levels (30 a second):

| Feature | Meaning | Bad when |
|---|---|---|
| `snrDb` | Pulse band (0.7–3.5 Hz) against the hiss above 5 Hz | Low |
| `concentration` | Share of the pulse band at the pulse frequency and its harmonic | Low |
| `intervalCv` | Spread of the gaps between beats | High (unless the rhythm is uneven) |
| `bpmDiff` | Peak-count rate against FFT rate | High |
| `redMean` | How bright the red is (0–255) | Under 25: dark camera |
| `redShare` | Red against red + green + blue | Under 0.55: lens not covered |
| `saturation` | Share of clipped red pixels | Over 0.85: light too bright |
| `perfusion` | Pulse height, % of the light | Very low |
| `drift` | Slow wander of the light, % | High: pressure changing |
| `motion` | Tallest 2-second swing over the quieter ones | High: movement |

A dark or open lens is always refused, whatever the model says.

## The hints

Each poor reading gets one hint, from the same features. The first test that
fits is the one shown, in this order:

| Hint | When | What the person reads |
|---|---|---|
| `too-dark` | `redMean` under 25 | Too dark. Turn the light on, or move near a bright window. |
| `cover-lens` | `redShare` under 0.55 | Cover the whole lens. Part of it is still open. |
| `too-bright` | `saturation` over 0.85 | Too bright. Press lightly, and move away from strong light. |
| `moving` | `motion` 3 or more | Keep still, and rest your hand on a table. |
| `pressure` | `drift` 10 or more | Keep the same pressure: not harder, not softer. |
| `weak` | `snrDb` under 0, or `perfusion` under 0.03 | Weak signal. Warm your hand, then press lightly. |
| `unsteady` | none of the above: the beats or the two rates disagree | Keep your finger still and fully cover the camera. |

The light comes first, because a dark or uncovered lens leaves nothing else
to judge. Most cut-offs are ones the contact check, the reasons and the
engine already use. The 0 dB for the pulse band is new: the rules count
that bad at −3 dB and worse. All of them were chosen by hand from synthetic
signals and have not been checked against real readings. A good reading
gets no hint.

On the page, while measuring: the engine's "place your finger" message comes
first, because only the engine knows whether there is contact at all. Then
this hint. Then the engine's own coaching (press lighter, keep still) when
the signal check has no reason to refuse. A refused reading at the end shows
its one hint, and the number is a dash.

The words are in `www/js/strings.js` (`camHint…`, `camCover`, `camRest`,
`camQualityHold`, `camWeak`). The Amharic and Afaan Oromo are drafts that
need a native-speaker check (`docs/NEEDS-CLINICAL-REVIEW.md`, item 10).

## The signal line

While measuring it reads "Signal: checking" until a 4-second window can be
rated. Then it reads "Signal: good", with a thin bar for the 0–100 confidence
and the number beside it, or "Signal: poor", with no bar and no number. It
is rated about once a second, from the last 8 seconds.

## Collecting data

You need a phone with the app, a pulse oximeter you trust, and people who
agree to take part. Follow `docs/pulse-accuracy-check.md` for how to seat
and measure each person; this adds the raw signal to each pair.

1. **Turn on developer options.** Settings → tap the **About** heading
   seven times. A "Developer" section appears at the bottom.
2. **Switch on "Pulse recording mode".** The section also says how many
   recordings are saved and whether the app is using the fixed rules or a
   trained model.
3. **Take a camera reading** as usual (Today → Pulse → Measure with
   camera). When it ends — with a number or without one — a box asks for
   the **pulse oximeter beats/min**. Read the oximeter at that moment, type
   the number and tap **Save recording**. Readings the app refused count
   too: they teach the model what "poor" looks like. Do not skip them.
4. **Vary the conditions on purpose**, a few readings each: still and
   moving, light and firm pressure, lens half covered, cold hands, lamp
   instead of torch, different phones, lighter and darker skin. The model
   can only learn situations it has seen.
5. **Export.** Settings → Developer → **Export recordings (CSV)**. The file
   is `pulse-recordings-YYYY-MM-DD.csv`, one row per reading, with the raw
   signal, both numbers, and a label: **good** when the app's number was
   within ±5 beats/min of the oximeter, otherwise **poor** (also when the
   app had no number).
6. **Delete** the recordings on the phone once the file is safe
   (Settings → Developer → Delete recordings). They are kept apart from
   anyone's record; "Clear all data" removes them too. The phone holds at
   most 300.

The recordings contain no names. They are still health data: keep the
files on devices you control and share them only with the people training
the model.

How much: at least **40** usable readings with at least **10 good and 10
poor** before the script will train at all; aim for **200 or more** from
several phones before trusting it.

## Training

On a computer with Node (no installs needed):

```
npm run train:pulse -- pulse-recordings-2026-11-02.csv more.csv --dry-run
```

`--dry-run` prints the report and writes nothing. The report shows:

- how many readings were used, and how many were left out (no oximeter
  number, a dark lens, an uneven rhythm);
- 5-fold cross-validation — scores on readings the model did not see:
  accuracy, **good kept** (sensitivity), **poor refused** (specificity) and
  AUC;
- the fixed rules on the same readings, for comparison.

The decision threshold is the lowest from 0.5 that refuses at least 90 % of
poor readings in cross-validation: asking for a retry is better than
showing a wrong number.

If the model beats the rules, train for real:

```
npm run train:pulse -- pulse-recordings-2026-11-02.csv more.csv
npm test
```

This rewrites `www/pulse-quality-weights.js`. Check it on a phone (the
Developer section now says "trained model"), then commit it on a branch for
Amin to review. To go back to the rules, set `WEIGHTS` in that file back to
`null`.

## Limits

- The rules were tuned on synthetic signals and have not been validated on
  real recordings. Real fingers, cameras and patients will differ; that is
  what the recordings are for. The hints and the signal line inherit that
  limit: they say what the features show, not what the heart is doing.
- Uneven rhythms (atrial fibrillation): when the engine has found clean
  pulses in an uneven rhythm, the check ignores beat spacing and rate
  agreement, and the model is not used. See item 8 in
  `docs/NEEDS-CLINICAL-REVIEW.md`.
- The label measures the 60-second number against one oximeter reading;
  the features come from the last 8 seconds. A reading that went wrong
  earlier and recovered may be labelled poor with clean features.
- Not a medical device. A "good" rating says the camera signal looked
  clean, nothing about the heart.
