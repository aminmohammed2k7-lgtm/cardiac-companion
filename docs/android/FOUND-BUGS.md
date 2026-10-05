# Suspected bugs in the medical logic

Safety charter rule 8: a suspected bug in the medical logic is **not fixed
silently**. It is written here and Amin decides. Each entry says what the app
does today, why it may be wrong, how much it matters, and the test that pins
today's behaviour. If Amin approves a fix, that test changes in the same commit
as the fix.

## Decisions (5 October 2026)

Amin asked Claude to choose ("just choose whatever you think is better for
me"). Each choice favours patient safety and changes as little as possible;
a clinician can revisit any of them.

| # | Finding | Decision |
|---|---|---|
| 1 | Ethiopian date a day ahead from 11 Sep 2099 | **No change.** No effect for 70 years; pinned by a test |
| 2 | After 400+ days away, the newest days got no dose list | **Fixed:** the most recent 400 days are planned |
| 3 | Weekly tablet total rounded to a quarter (charter rule 1) | **Fixed:** tablets a week only when every day is an exact quarter tablet, otherwise mg only. The supply part is **kept on purpose** |
| 4 | Unused palpitations entry | **Closed:** the guide confirms today's rule |
| 5 | A dose first seen 3 h 1 min late is announced 30 s later | **Left for Phase 4,** which replaces this engine and follows the guide's wording |
| 6 | Moving a time could put a "taken" mark on the wrong dose | **Fixed:** a kept time keeps its mark; only moved times carry one |
| 7 | Changing the window resets "running low" but not "run out" | **No change:** the code is sensible; the guide's wording is broader than it needs to be |

---

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
- **The guide:** "Calendars, clocks and fasting seasons" documents exactly this
  rule ("Ethiopian New Year falls on 11 September (12 September when the next
  Gregorian year is a leap year)"), so the app does what the guide says. It is
  the documented rule itself that stops holding in 2099.
- **How much it matters:** not at all for anyone using the app before
  September 2099.
- **Options:** leave it as it is, or switch to the day-number method, which
  has no end date.
- **Decision:** no change. Nobody using the app before September 2099 is
  affected, and changing the calendar code carries more risk than it removes.
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
- **The guide** promises the opposite: "Days when the app was not opened still
  get their plan" and "A past dose nobody marked counts as not recorded, never
  quietly dropped" ("Doses and adherence"). So past 400 days, the app breaks
  its own documented rule.
- **How much it matters:** low. It needs more than 13 months without opening
  the app. Even then, the week view shows "no data" instead of "not recorded".
- **Options:** fill the most recent 400 days instead of the oldest, or leave it.
- **Decision: fixed.** After a long time away, `ensurePlans()` now plans the
  most recent 400 missed days, the ones the screens show.
- **Test:** `tests/core/doses.test.js`, "after 640 days away: the most recent
  400 days are filled in".

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
- **The guide** lists "Weekly total in mg and tablets a week" without saying
  the tablets are rounded. For warfarin supply it says marking a dose "subtracts
  the tablets that make that day's mg dose", which doesn't hold on these days.
- **How much it matters:** medium. It only happens when the doctor's dose
  can't be made from whole, half or quarter tablets. A patient could still read
  "6½" as an instruction.
- **Options, for Amin and a clinician:** show the weekly tablet total only when
  every day is an exact quarter tablet (the same rule as the daily figure), and
  otherwise show mg only. Decide how supply should count such days.
- **Decision: fixed for the weekly total.** `weeklyTabs()` in
  `js/core/warfarin.js` gives a tablet count only when every day's dose is an
  exact whole, half or quarter tablet; otherwise the card shows "Weekly total
  33 mg" alone, with no rounded figure. **The supply part is kept on purpose:**
  the app never guesses how a dose its tablets can't make was taken, so it
  takes nothing off, and that day already says "This dose doesn't match your
  tablets — ask your pharmacist". Counting those days in "days left" makes the
  "running low" warning come a little early, which is the safe direction.
- **Tests:** `tests/core/warfarin.test.js` §2b and `tests/page/rules.test.js`
  ("one day of 3 mg…: the mg total only").

## 4. Question: should palpitations at 7/10 or more also warn? (the guide answers: no)

- **Where:** `index.html`, the string tables, and `isSevereSymptom()` in `js/core/health.js`.
- **What happens:** the severe-symptom warning ("Severe chest pain or
  breathlessness is a warning sign.") appears for chest pain or shortness of
  breath rated 7 or more. Each language's string table also has
  `severeIdx: [0, 1, 4]`, which adds palpitations (symptom 4), and the texts
  `symptomSevereText` and `customSymptomSevereText`. Nothing in the code uses
  any of them. They look like leftovers from version 2.
- **The guide** answers it: "Chest pain or shortness of breath at 7 or more
  shows 'Severe chest pain or breathlessness is a warning sign.'" (Symptoms tab
  and the "Health checks" table). It also says "A few version-2 strings … remain
  in the file but are no longer shown". So today's rule is the intended v3.2
  rule, and `severeIdx` is a version-2 leftover.
- **Suggestion:** close this entry with no change to the medical logic. Whether
  to delete the unused strings is a tidy-up for Phase 9. Amin decides.
- **Decision: closed,** no change. The unused strings can go in Phase 9.
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
- **The guide** words the rule as "once at its time (only if no more than 3
  hours late) and once more **an hour later** if still unmarked (only if no
  more than 4 hours late). Never hours after the fact." In this case there is
  no first reminder and no hour between, so the code departs from the guide's
  wording while keeping within its two limits.
- **Decision:** no change to the web version, which Phase 4 replaces. Phase 4's
  native reminders follow the guide's wording: a second reminder only an hour
  after a first one that was actually sent. `docs/android/REMINDERS.md` will say so.
- **How much it matters:** low. Phase 4 replaces this timing with native
  scheduled notifications, and `docs/android/REMINDERS.md` should state the intended rule.
- **Test:** `tests/core/reminders.test.js`, "first look at 11:01…".

---

Found in Phase 1b (October 2026), while testing the rules that were still
inside index.html, against the app guide.

## 6. Moving a medicine's time can move a "taken" mark onto the wrong dose

- **Where:** `js/core/doses.js`, `carryMarkedDoses()`, called from
  `saveMedForm()` in index.html.
- **What happens:** when the person edits a medicine's times, a dose already
  marked today is meant to follow its time (the guide: "Moving a time carries
  a dose already marked today over to the new time"). The code pairs the old
  and new times by their **place in the sorted list**, not by which time
  changed. Take a medicine at 08:00 and 20:00, with this morning's 08:00 dose
  marked taken. If the person moves the evening dose from 20:00 to 07:00, the
  new list is 07:00, 08:00. The 08:00 mark moves to 07:00, and the 08:00 dose,
  which they did take, now shows as not marked.
- **What follows:** Today shows the 08:00 dose as due, so the person may be
  prompted to take a dose they have already taken. Adherence counts stay the
  same, because one mark moved and none was lost.
- **How much it matters:** medium. It needs a time edit on a day doses are
  already marked, with the order of the times changing. A double dose is the
  risk; for warfarin, though, times are set separately and this does not apply.
- **Options:** carry a mark only when exactly one time changed, from that old
  time to its new time; otherwise keep marks on the times that didn't change.
  For Amin to decide.
- **Decision: fixed.** `carryMarkedDoses()` now leaves a mark on a time that
  was kept, and pairs only the times taken out with the times put in,
  earliest with earliest. Nothing moves when times were only added or only
  taken out. In the example above, the 08:00 "taken" stays on 08:00.
- **Tests:** `tests/core/doses.test.js` §8 ("20:00 → 07:00: this morning's
  08:00 mark stays on 08:00" and four more cases) and `tests/page/rules.test.js`,
  the same through the medicine form.

## 7. Changing the warning window resets "running low" but not "run out"

- **Where:** `js/core/supply.js`, `resetLowWarnings()`, called from
  `setLowDays()` in index.html.
- **What happens:** the guide says the supply warnings "fire once when days
  left reach the chosen window … and once when the count reaches 0;
  refilling or changing the window resets them." Changing the window (7 / 14
  / 21 days) clears only the "running low" flag. The "run out" flag stays, so
  a medicine that has run out is not announced again.
- **How much it matters:** low. "Run out" was already announced once, and a
  refill resets it. This is a mismatch with the guide's wording more than a
  danger.
- **Options:** reset both flags, or change the guide's wording. For Amin to decide.
- **Decision:** no change to the code. "Run out" was already announced once,
  the warning window is about "running low", and a refill resets both. The
  guide's sentence should read "refilling resets them; changing the window
  lets 'running low' come again" in its next edition.
- **Tests:** `tests/core/supply.test.js` and `tests/page/rules.test.js`,
  "known: 'run out' is not reset".
