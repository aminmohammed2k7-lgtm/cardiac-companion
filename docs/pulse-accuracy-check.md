# Checking the camera pulse against a pulse oximeter

The camera pulse in Cardiac Companion is an estimate, not a medical device.
These steps are how to measure that estimate against a pulse oximeter on
real people, so the error can be reported with numbers. They do not
diagnose anyone, and they do not change anyone's medicine.

Do this before you claim an accuracy number to the YTH judges. The
synthetic tests only prove the maths on made-up signals.

## What you need

- The app on the phone you want to judge (the website or the Android build).
- A pulse oximeter you already trust, with fresh batteries.
- A table and a chair.
- 20 people, if you can. Fewer still produces a number, but 20 is what to
  aim for. Include different ages and a mix of lighter and darker skin,
  because the torch clips more easily on some fingers.
- The lab page, if you want the spreadsheet filled in for you:
  open `tools/pulse-lab.html` on the phone (or a laptop, if you are only
  practising). It stays on the phone. It does not upload anything.

You can also write the two numbers in a notebook. The sums below are the
same either way.

## How one person is measured

1. They sit for one minute. The oximeter goes on one hand. The phone is on
   the table.
2. They cover the **whole** back camera and its light with a fingertip of
   the other hand. Light pressure. The hand stays on the table. They keep
   still.
3. Start a 60 second reading. Wait until the app is showing a number and
   the quality is fair or better. If it never shows a number, write "no
   reading" and why the screen said so (lens open, too bright, moved, weak).
   A missing number is a result. Do not guess one.
4. When the app shows a steady number, read the oximeter at the same moment.
   Type the oximeter number into the lab and tap **Save pair**, or write:

   | time | app | oximeter | quality | phone |
   |---|---|---|---|---|

5. One pair per person is enough. A second pair, after they lift the finger
   and start again, is useful if you have time. Keep those separate so one
   restless person does not count as several people.

Do not coach them toward a number you hope for. Do not throw away a pair
because it looks wrong. Do throw away a pair only if the oximeter was
loose, the person talked and waved, or you wrote the digits down wrong —
and write why.

## The spreadsheet

In the lab, **Download comparison (CSV)** writes
`pulse-oximeter.csv`. The columns are:

`at, app_bpm, oximeter_bpm, abs_error_bpm, pct_error, quality, quality_level, channel, device, torch, fps, engine`

`abs_error_bpm` is the absolute difference. `pct_error` is that difference
divided by the oximeter rate, times 100.

## The four numbers to report

Use only the pairs you kept. Call the app rate A and the oximeter rate O.
N is how many pairs.

**Mean absolute error (bpm)** — the typical miss, in beats per minute:

```
MAE = ( |A1−O1| + |A2−O2| + … + |AN−ON| ) / N
```

**Mean absolute percent error** — the same miss as a percent of the
oximeter rate:

```
MAPE = ( |A1−O1|/O1 + |A2−O2|/O2 + … + |AN−ON|/ON ) / N × 100
```

**Bias** — whether the app sits high or low. A negative bias means the app
reads slower than the oximeter:

```
bias = ( (A1−O1) + (A2−O2) + … + (AN−ON) ) / N
```

**Share within 5 bpm** — how often the app was close:

```
within 5 = (number of pairs with |A−O| ≤ 5) / N × 100
```

The lab shows these four numbers as you go. Check them by hand on the CSV
once, so a bug in the page cannot be the number you publish.

### Worked example

Three pairs: app 72, 80, 65 against oximeter 74, 78, 70.

- Absolute errors: 2, 2, 5. MAE = (2+2+5)/3 = **3.0 bpm**.
- Percent errors: 2/74, 2/78, 5/70 = 2.7%, 2.6%, 7.1%. MAPE = **4.1%**.
- Signed errors: −2, +2, −5. Bias = **−1.7 bpm** (app a little low).
- All three are within 5 bpm, so **100%**.

Round MAE to one decimal place. Say how many people, how many "no reading"s,
and which phones.

## What to say, and what not to say

Say: "On N pairs against a pulse oximeter, the mean absolute error was
X bpm (Y%). Z% were within 5 bpm. P readings were refused because the
signal was not good enough."

Do not say the app measures oxygen, diagnoses atrial fibrillation, or is
accurate enough to guide warfarin or penicillin. The uneven-beats line is
still only a description of that one reading.

If the error is large on darker fingers or when the torch clips the red
channel, say so. That is a useful result, not a failure to hide.

## A short session log

| | |
|---|---|
| Date | |
| Phone models | |
| Oximeter model | |
| People (N) | |
| No reading | |
| MAE (bpm) | |
| MAPE (%) | |
| Bias (bpm) | |
| Within 5 bpm (%) | |
