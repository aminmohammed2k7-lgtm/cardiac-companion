# Suspected bugs in the medical logic

Safety charter rule 8: a suspected bug in the medical logic is **not fixed
silently**. It is written here and Amin decides. Each entry says what the app
does today, why it may be wrong, how much it matters, and the test that pins
today's behaviour. If Amin approves a fix, that test changes in the same commit
as the fix.

Found in Phase 1 (October 2026), while writing tests for v3.2's logic.

---

## 1. The Ethiopian date is one day ahead from 11 September 2099

- **Where:** `js/core/calendar.js`, `ethiopianNewYearGregorian()` and `gregorianToEthiopian()`.
- **What happens:** the app puts Ethiopian New Year on 12 September when the
  next Gregorian year is a leap year, otherwise on 11 September. The Ethiopian
  calendar follows the Julian leap years, and in 2100 the two disagree: 2100
  skips its Gregorian leap day. So from 11 September 2099, the app says
  Meskerem 1, 2092, on the day that is really Pagume 6, 2091. Every date after
  that is one day ahead.
- **Checked by:** an independent Julian-Day-Number conversion of every day from
  1901 to 2099. The two methods agree on every day up to 10 September 2099, and
  differ on all 112 days from 11 September to 31 December 2099. (Appendix C of the
  work order says they agree through 2099; that holds only up to 10 September.)
- **How much it matters:** not at all for anyone using the app before
  September 2099.
- **Options:** leave it as it is, or switch to the day-number method, which
  has no end date.
- **Test:** `tests/core/calendar.test.js`, "known difference: from 11 Sep 2099…".

## 2. After more than 400 days away, the most recent missed days get no dose list

- **Where:** `js/core/doses.js`, `ensurePlans()`, the `guard++<400` limit.
- **What happens:** when the app opens after days away, it fills in each
  missed day's dose list, so unmarked doses count as "not recorded". The code's
  own comment says they are never "quietly left out of the adherence figure".
  After more than 400 days away, it fills only the first 400 days after the
  last visit. The days after that get no list, and those are the most recent
  ones, which "This week" and the visit summary show. They then count nothing
  at all: no doses due, nothing "not recorded".
- **Example:** last opened 1 January 2025, opened again 3 October 2026. Lists
  are filled for 2 January 2025 to 5 February 2026, and 6 February to 2 October 2026 get none.
- **How much it matters:** low. It needs more than 13 months without opening
  the app. Even then, the week view shows "no data" instead of "not recorded".
- **Options:** fill the most recent 400 days instead of the oldest, or leave it.
- **Test:** `tests/core/doses.test.js`, "known limit: after 640 days away…".

## 3. The weekly tablet total is rounded to the nearest quarter (safety charter rule 1)

- **Where:** `index.html`, the warfarin card in Medicines:
  `fmtTabs(round2(warfarinDailyTabs(S)*7))` in "{n} tablets a week".
- **What happens:** each day's dose is shown as tablets only when it is an
  exact whole, half or quarter tablet (`tabletsFor()`). But the weekly total is
  the sum of every day's mg ÷ strength, written to the nearest quarter. With
  5 mg tablets and one 3 mg day (0.6 of a tablet), the week is 6.6 tablets and
  the card says **"6½ tablets a week"**. That is a rounded figure derived from
  the doses, which charter rule 1 forbids.
- **Related:** on a day whose dose is not an exact quarter tablet,
  `takeSupply()` takes **nothing** off the warfarin count when the dose is marked
  taken (`tabletsFor()` gives null, so the amount is 0). But
  `warfarinDailyTabs()` still counts that day for "days left". The tablet count
  and the days-left figure then slowly drift apart.
- **How much it matters:** medium. It only happens when the doctor's dose
  can't be made from whole, half or quarter tablets. A patient could still read
  "6½" as an instruction.
- **Options, for Amin and a clinician:** show the weekly tablet total only when
  every day is an exact quarter tablet (the same rule as the daily figure), and
  otherwise show mg only. Decide how supply should count such days.
- **Test:** `tests/core/warfarin.test.js`, "known: counts are written to the nearest quarter…".

## 4. Question: should palpitations at 7/10 or more also warn?

- **Where:** `index.html`, the string tables, and `isSevereSymptom()` in `js/core/health.js`.
- **What happens:** the severe-symptom warning ("Severe chest pain or
  breathlessness is a warning sign.") appears for chest pain or shortness of
  breath rated 7 or more. Each language's string table also has
  `severeIdx: [0, 1, 4]`, which adds palpitations (symptom 4), and the texts
  `symptomSevereText` and `customSymptomSevereText`. Nothing in the code uses
  any of them. They look like leftovers from version 2.
- **How much it matters:** unclear. Today's rule matches today's warning text,
  so this may be intended. Please check it against the app guide and a clinician.
- **Test:** `tests/core/health.test.js`, "other symptoms at 10 (dizziness, palpitations…)".

## 5. Note: a dose first seen 3 hours 1 minute late is announced 30 seconds later

- **Where:** `js/core/reminders.js`, `dueReminders()`.
- **What happens:** the first reminder for a dose is sent only if it is at
  most 3 hours late. If the app first notices the dose 3 hours 1 minute late,
  it skips the first reminder but marks it as used. The next check, 30 seconds
  later, then sends the second reminder, which is allowed up to 4 hours late.
  This follows the documented windows (first at most 3 hours late, second at
  most 4 hours late). The code comment, though, says doses are "never
  [announced] hours after the fact".
- **How much it matters:** low. Phase 4 replaces this timing with native
  scheduled notifications, and `docs/android/REMINDERS.md` should state the intended rule.
- **Test:** `tests/core/reminders.test.js`, "first look at 11:01…".
