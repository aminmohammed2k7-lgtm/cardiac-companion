# ACE CSCA Question Factory

A generator for CSCA Mathematics questions and papers. It writes full mocks, the diagnostic, weekly mocks, daily sets, 41–48 drills, practice tests and a question bank, and it checks every answer before a question leaves the factory.

It is built from four documents: the Exam Structure Atlas (what the real papers ask, slot by slot), the Mock Rewrite Specifications (wording, numbers, wrong options), the Course Plan, 6th edition (what each set, weekly mock and drill contains) and the Website Spec (the import format and its rules).

## What is in this folder

| Path | What it is |
|---|---|
| `dist/app/csca-question-factory.html` | The app. Open it in a browser; it works offline. Build papers, browse the bank, save JSON / Markdown / printable pages. |
| `dist/bank/` | The question bank: `bank.json`, `bank.csv`, `by-domain/`, `by-sub-domain/`, `manifest.json`, `SUMMARY.md`. |
| `dist/course/` | Every set, weekly mock and drill of the 56-day course in the website's import format (`week1.json` … `week7.json`), drill version B, replica papers in `mocks/`, and printable copies in `print/`. |
| `dist/question-factory.js` | The engine as one script for the website (speed drill and easy-trick generators). |
| `cli.js` | The command line. |
| `src/` | The engine: 408 question forms, the checker, the assemblers. |
| `test/` | The test suite. |

## Quick start

Open `dist/app/csca-question-factory.html`. Nothing to install.

The command line needs Node.js 18 or newer and has no dependencies:

```
node cli.js help
node cli.js mock --source jun --seed 3 --out out/mock-jun      # June pattern, new numbers → .json and .md
node cli.js mock --blueprint B --seed 8 --md                   # a new paper on blueprint B, printed as text
node cli.js weekly --week 4
node cli.js set --day 17 --set b
node cli.js drill --week 5 --version b
node cli.js practice --n 25 --domains TR,SQ --level mixed
node cli.js course --out dist/course
node cli.js bank --total 2000 --out dist/bank
node cli.js validate my-questions.json
```

The same seed always gives the same paper. Change the seed for new numbers.

## What it builds, and the rules each paper follows

| Paper | Rules |
|---|---|
| **Full mock, real pattern** (`--source dec\|jan\|mar\|apr\|jun\|und`) | Every slot keeps the sub-domain, tier (E/M/H), question type (V/S/N) and repeated template (R01–R14) of that paper. Numbers, options and wording are new. Tier totals match the Atlas (December 36/10/2, January 32/13/3, March 33/13/2, April 34/12/2, June 32/12/4). Answer letters 12/12/12/12, no run longer than three. Every item is level `=`. |
| **Full mock, blueprint A or B** | Slot order and domain quotas of the blueprint, the conic split (A: 2 parabolas + 1 ellipse; B: 1 parabola + 2 ellipses), the anchors (sets Q1–2, vectors Q44, complex Q46, hardest sequence Q47, probability Q48), about eight repeated-template items and two to four H items in Q44–48. Other slots take any real exam form of their sub-domain. |
| **Diagnostic, mock-1 … mock-4** | The December, January, March, April and June replicas with the ids the site expects. |
| **Weekly mock W1–W7** | 24 questions: Q1–16 the week's topics in lesson order (about half `=`, half `+1`), Q17–20 spaced review at `=`, Q21–24 the plan's hard four (2.5 points, `+1`). |
| **Set A / Set B** | 8 questions from the plan's recipe for that day: Q1–4 `=`, Q5–7 `+1` (Set B of a one-video day: spaced review of three earlier lessons), Q8 worth 2.5. Every set has a "which is true" item. |
| **Set C** | 4 hard questions on the 20 one-video days; the fourth is the hardest form of the lesson about a week back. |
| **41–48 drill** | Slots 41–48 as listed in the plan for each week; versions A and B. |
| **Practice test** | Any number of questions from the domains, sub-domains, lessons or tiers you choose. By default each sub-domain gets the share it has on the real papers. |
| **Speed drill, easy trick** | The website's `ACE_GEN.L01 … L12` (8 item types each) and `ACE_GEN.T01 … T12`. |

`node cli.js course` builds all 33 × 2 daily sets, 20 Set C, 7 weekly mocks and 14 drills in one run: 888 questions, none used twice.

## The question bank

2,000 questions. Each sub-domain's share is its share of the five real sittings (240 questions):

> questions for a sub-domain = 2,000 × (its questions in the five sittings ÷ 240), rounded so the total is exact

| Domain | Real papers | Bank |
|---|---:|---:|
| Sets & inequalities | 10.4% | 213 |
| Functions | 17.5% | 357 |
| Trigonometry | 21.3% | 420 |
| Sequences | 14.2% | 282 |
| Coordinates & lines | 17.9% | 355 |
| Conics | 12.5% | 249 |
| Vectors | 2.1% | 41 |
| Complex numbers | 2.1% | 42 |
| Probability | 2.1% | 41 |

`dist/bank/SUMMARY.md` has the same table for all 48 sub-domains.

Three choices to know about:

- **SET-num and FN-val get 8 questions each.** They never appeared in the five sittings (only in the undated paper and the CSC sample), so strict proportion would give them none. Change with `--floor`.
- **One question in five is level `+1`** (one notch harder, as the Course Plan defines it). The rest are exam level. Change with `--plus 0` to `--plus 1`.
- **Inside a sub-domain, forms that came up more often get more questions.** The half-angle template R01 was 5 of the 10 TR-half questions on real papers, so it takes about half of the TR-half share.

Each question has: id (`QB-<sub-domain>-<number>`), domain, sub-domain, lesson, tier, level, format, points, repeated template, trick, stem, four options, answer, a named mistake for each wrong option, a worked solution, the video id, and the form and seed that rebuild it.

No stem appears twice, and no correct statement is used more than twice. The bank can be rebuilt at any size up to about 8,000 before some sub-domains run out of distinct questions.

## How accuracy is checked

1. Each form computes its answer exactly, with fractions and surds, and builds the wrong options from named mistakes.
2. A separate checker reads the four finished options as LaTeX, the way a student sees them, and tests each against an independent calculation: substituting into the inequality, iterating the recursion, adding the terms one by one, listing every outcome of the probability experiment, sampling the curve from its definition.
3. A question is kept only if exactly one option is right and no two options are equal in value. Otherwise it is thrown away and drawn again.
4. The numbers of the real exam questions are blocked.

The test suite generates 24,480 questions from all 408 forms, builds every paper type several times, builds the bank, and renders every formula with KaTeX. A longer run of 1,224,000 draws in strict mode found no question that failed its check.

```
npm test                       # about one minute
node test/sweep.js --n 1500    # the long run, about nine minutes
```

What the checks do not cover: whether a stem reads naturally to a student, and whether a form matches the plan's intent in every detail. Those need a teacher's read. `dist/course/print/` has every course paper as text for that purpose.

## Putting the content on the website

- Import `dist/course/week1.json` … `week7.json` (and `drills-version-b.json`) on the admin import page. They pass the import rules of Website Spec §4; `node cli.js validate <file>` runs the same rules on any file, including hand-written ones.
- `dist/course/mocks/` holds replicas for `diagnostic` and `mock-1 … mock-4`. Use them only if you want papers with new numbers in place of Rewrite Mocks 1–5.
- For the speed drill and the easy-trick drill, load `dist/question-factory.js` (or `.min.js`) and call `QF.adapters.install()`. That fills `window.ACE_GEN.L01 … L12` (eight functions each) and `ACE_GEN.T01 … T12`, each `rng => ({ stem, options, answer, explain })`.

## Decisions made while building, which you may want to change

- **The "which is true" item in sets whose recipe has none.** The import rule wants one format-S item per set, but the recipes for some lessons list only compute-type forms (for example 4.2, 4.4, 5.1, 6.1, 7.6). For those lessons there is a four-statement form of the lesson (level `+1`), and it takes one of the Q5–7 slots or Q8. The recipes are in `src/data/course.js`.
- **Lesson 3.5 (trap clinic)** has no forms of its own: its items are real trigonometry forms that plant one named trap, filed under lesson 3.5.
- **Levels follow the slot** in daily sets (Q1–4 `=`, Q5–7 `+1`), as the import rule requires, even when the form in the slot is a real exam form.
- **Weekly mock W1** has no earlier week to review, so Q17–20 continue the week's own list at level `=`.

## Adding a form

A form is one `QF.def({...}, function (R) {...})` call in `src/templates/`. It returns the stem, the key, a list of wrong options with their mistake names, a check, and the solution. `node test/run.js <form id> --show 3` prints samples and runs the checks. `node tools/build-app.js` rebuilds the app and the browser bundle after a change.
