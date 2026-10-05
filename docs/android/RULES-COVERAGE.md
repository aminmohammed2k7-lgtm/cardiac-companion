# Which test covers which rule

Every rule in the "Features and logic" section of `docs/app-guide.pdf` (pages 15–20,
with the "Health checks" table), and the test that pins it down. The work order asks
Phase 1 to cover every rule there before anything moves.

- **✓** a test in `tests/core/` checks the rule directly (`npm test`, three time zones)
- **◐** partly: the rule's parts are tested, but the screen code that joins them is
  covered only by Phase 1's old-versus-new comparison and browser check
- **✗** not covered yet. "1b" means planned for the Phase 1 follow-up; a later phase
  number means it belongs with that phase's own tests

Updated 5 October 2026, after the guide arrived.

## Doses and adherence

| Rule (guide wording, shortened) | Covered by | |
|---|---|---|
| Each day gets a frozen list: one entry per medicine per time, plus warfarin when that day's dose is above 0 | `doses.test.js` §2, §3 | ✓ |
| Days when the app was not opened still get their plan | `doses.test.js` §3 (and FOUND-BUGS #2, after 400 days) | ✓ |
| Due every day; every other day from its start date; chosen weekdays; never "only when needed"; not before it was added, not from the day it was removed | `doses.test.js` §1, §6 | ✓ |
| Adherence = taken ÷ (taken + missed + not recorded); today's unmarked doses are "due" or "upcoming" and never count against the person | `doses.test.js` §4, §5 | ✓ |
| Undo returns a dose to pending and gives back its tablets | `supply.test.js` §5 (`restoreSupply`); `markDose` itself ◐ | ◐ |
| Moving a time carries a dose already marked today over to the new time | none: `saveMedForm` in index.html | ✗ 1b |
| Day rollover: freeze yesterday, plan today, end a fasting period that ran out | `calendar.test.js` §5, `doses.test.js` §3, `seasons.test.js` §3; `tick()` itself ◐ | ◐ |

## Tablet supply

| Rule | Covered by | |
|---|---|---|
| Counted in tablets, quarters and halves; taking a dose subtracts its tablets, never below zero | `supply.test.js` §5 | ✓ |
| Warfarin subtracts the tablets that make that day's mg dose | `takeSupply` in index.html ◐; see FOUND-BUGS #3 | ◐ |
| Tablets per day: × times a day; half for every other day; × days ÷ 7 for some days; 0 for when needed; warfarin = week's mg ÷ strength ÷ 7 | `supply.test.js` §1 | ✓ |
| Days left = tablets ÷ tablets per day, rounded down | `supply.test.js` §2 | ✓ |
| Warnings fire once at the window and once at 0; refilling resets them | `supply.test.js` §3, §4 | ✓ |
| … changing the window (7 / 14 / 21) also resets them | none: the Settings handler in index.html | ✗ 1b |

## Warfarin and INR

| Rule | Covered by | |
|---|---|---|
| Tablets for a dose only when it lands on a quarter tablet, otherwise "doesn't match your tablets" | `warfarin.test.js` §1 | ✓ |
| Every change to the 7-day schedule is stored with the date it started | `warfarin.test.js` §5 | ✓ |
| Each INR result keeps the doses and weekly total in force on its test date | `dosesOn` in `warfarin.test.js` §5; `addInr` ◐ | ◐ |
| Below the lowest = below range, above the highest = above, otherwise in; no status without a target | `warfarin.test.js` §4 | ✓ |
| Time in range (Rosendaal): straight line, gaps over 120 days skipped, at least 7 days of line | `warfarin.test.js` §6 | ✓ |
| … shown over the last 6 months; 65% or more shown as good | none: index.html | ✗ 1b |
| Typo checks: a dose over 20 mg asks; INR 0.5–15, 8 or more asks; target 1–5 with lowest below highest; no future test dates | none: index.html | ✗ 1b |
| The app never suggests a dose | by design; safety charter rule 1 | — |

## Penicillin injection

| Rule | Covered by | |
|---|---|---|
| Next due = last injection + interval | `injection.test.js` §1 | ✓ |
| Interval 14, 21, 28 or a custom 7–60 days | none: index.html | ✗ 1b |
| Lateness = days between the due date and the day it was given; late ones ask for a reason | none: `recordInjection` in index.html | ✗ 1b |
| 12-month completion with 3 days' grace (the 80% standard) | `injection.test.js` §2 | ✓ |
| … 80% or more shown as good, below 80% flagged on the summary | none: index.html | ✗ 1b |

## Health checks

| Rule | Covered by | |
|---|---|---|
| Weight gain: 2 kg or more above any weight from the 1–3 days before | `health.test.js` §1 | ✓ |
| Weekly weight: first versus last of the last 7 days, steady under 1 kg | none: index.html (three places) | ✗ 1b |
| Severe symptom: chest pain or shortness of breath at 7 or more | `health.test.js` §3 | ✓ |
| Mood (PHQ-2): 3 or more of 6 is positive; asked again after 14 days | `health.test.js` §2 | ✓ |
| Warning signs: ten fixed signs in two levels, logged with the time, open Get help | none: index.html | ✗ 1b |

## Calendars, clocks and fasting seasons

| Rule | Covered by | |
|---|---|---|
| Ethiopian New Year on 11 September (12 before a Gregorian leap year); 30-day months then Pagume; year −7 / −8 | `calendar.test.js` §1–3 (and FOUND-BUGS #1, from 2099) | ✓ |
| Ethiopian clock: hours from 6 am; morning, day, evening, night | `calendar.test.js` §4 | ✓ |
| Dates people act on in both calendars; lists in the reader's calendar; Oromo writes Gregorian dates as numbers | none: `fmtDual`, `fmtListDate`, `fmtGreg` in index.html | ✗ 1b |
| Days keyed by the phone's local date, never UTC | `calendar.test.js` §5, and every core test runs in three time zones | ✓ |
| Abiy Tsom: the 55 days before Orthodox Easter (Julian rule, +13 days) | `seasons.test.js` §1 | ✓ |
| Ramadan: month 9 of the Umm al-Qura calendar | `seasons.test.js` §2 | ✓ |
| Today asks once per season (only with medicines); "Yes" means fasting until the season's last day | none: the alerts code in index.html | ✗ 1b |
| Fasting ends by itself the day after its "until" date | `seasons.test.js` §3 | ✓ |

## People on one phone

| Rule | Covered by | |
|---|---|---|
| A separate record per person; switching saves one and loads the other | none (storage) | ✗ Phase 3 |
| Reminders run for every person, with the name in the title when there is more than one | `reminders.test.js` §5 (records kept apart); the naming in `checkReminders` ✗ | ✗ 1b |

## Reminders

| Rule | Covered by | |
|---|---|---|
| Once at its time if at most 3 hours late, once more an hour later if at most 4 hours late | `reminders.test.js` §1, §2 (and FOUND-BUGS #5) | ✓ |
| Doses at the same time share one notification | `reminders.test.js` §3 | ✓ |
| … medicine names only if "Show medicine names" is ticked | none: `checkRemindersFor` in index.html | ✗ 1b |
| Once a day after 07:00: injection (tomorrow, today, late), INR (tomorrow, today, up to 7 days overdue), clinic visit (today, tomorrow) | `reminders.test.js` §4 | ✓ |
| Never about something the person just did | `reminders.test.js` §3 | ✓ |
| Calendar file: one repeating event per dose time, warfarin on days above 0, one-off injection / INR / visit events with alarms, no doses in titles, names only if chosen | none: `buildIcs` in index.html | ✗ 1b |

## Visit summary, exports, backup

| Rule | Covered by | |
|---|---|---|
| Period: since last visit, 30 or 90 days; 30 when there is no last visit | none: `sumRangeDates` in index.html | ✗ 1b |
| What the doctor's summary and the family update contain | none: `summaryBlocks` (identical old and new in Phase 1's comparison) | ✗ Phase 5 |
| Backup, restore (checks the file, asks first), CSV, PDFs, file names | none | ✗ Phases 3 and 5 |
| Backup reminder: 3 days after the record starts if never backed up, then after 30 days; Later snoozes 7 days | none: `backupNudgeDue` in index.html | ✗ 1b |
| Today's alerts and the one information card at a time | none: `renderActiveAlerts` in index.html | ✗ 1b |
| The last 40 notifications are kept | none: `addNotification` in index.html | ✗ 1b |
| Version-2 upgrade; every record checked and repaired on load | none: `migrateV2`, `normalizeState` | ✗ Phase 3 |

## Screen behaviour

| Rule | Covered by | |
|---|---|---|
| Never redrawn while typing; large text zooms by 14%; dark mode follows the phone at first | the browser check and the phone checklist (`BASELINE.md`) | Phase 7 |
| A change in one tab shows in another | removed in Phase 2 (one WebView) | — |
