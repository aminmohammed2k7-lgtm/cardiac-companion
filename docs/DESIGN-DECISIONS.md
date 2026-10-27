# Design decisions

Why the app looks the way it does. The values live as CSS variables in
`:root` in the stylesheet. `tests/look.test.js` fails if a rule goes
outside them.

Who we design for: adults and teenagers with rheumatic heart disease, and the
parents who keep a child's record. Many are older or unwell. Phones are often
low-end Android, the screen is often read outside in strong sun, and the app
runs with no internet at all.

## Colour

| Token | Light | Use |
|---|---|---|
| `--accent` | #1D5C54 teal green | Buttons, the chosen tab, "in range" |
| `--danger` | #B3261E red | Warning signs and overdue things only |
| `--warn` / `--warn-ink` | #A87307 / #6E4B00 amber | "Soon" and "running low" |
| `--ink-1`, `--ink-2`, `--ink-3` | #14201C, #36423C, #4F5C56 | Text, then quieter text, then hints |
| `--canvas`, `--surface` | #EEF1EE, #FFFFFF | The page and the cards on it |
| `--line-input` | #7F8B85 | Edges of fields, switches and tick boxes |

Reasons:

- **Green, not blue or purple.** Green reads as calm and "go" without
  looking like a stock template. It is dark enough to carry white text at
  7.8:1.
- **Red means one thing.** If red appears, something needs attention today.
  It is never used for decoration, so warning signs keep their weight.
- **Sunlight.** All text is at least 6:1 on the page and on cards (the
  lowest is the hint colour at 6.2:1). The edges of fields and switches are
  3.5:1, so an empty field is still visible outside. Card edges stay soft,
  because a card is not something you tap.
- **Dark theme** uses the same roles with lighter tints. It is optional.
- **The visit summary preview** stays black on white in both themes,
  because it shows what will print. It uses its own `--paper-*` colours.

## Type

One font, Onest, with Noto Sans Ethiopic for Amharic. Both ship inside the
app. Onest was chosen for its numbers: 1 and 7, 3 and 8, 5 and 6 are easy to
tell apart, and the number on screen is often a dose.

| Token | Size | Use |
|---|---|---|
| `--fs-xs` | 13px | Small print: dates in lists, nav labels |
| `--fs-sm` | 14px | Hints and secondary lines |
| `--fs-md` | 16px | Body text, buttons, fields |
| `--fs-lg` | 18px | Section titles |
| `--fs-xl` | 24px | Page and panel titles |
| `--fs-2xl` | 28px | Counts: days to the injection, summary numbers |
| `--fs-hero` | 56px | Today's warfarin dose |

Body text is 16px, not 15px, because many readers are older. Fields are 16px
so Android does not zoom when one is tapped. The dose is the largest thing in
the app on purpose. Weights are 400, 500, 600 and 700. Nothing is set in
capitals.

## Spacing

Steps of 4: 4, 8, 12, 16, 24, 32 and 48px (`--sp-xs` to `--sp-3xl`). 2px
(`--sp-xxs`) is used only inside small controls, such as the gap between
segments of the language switch. Cards have 16px inside and 12px between
them. Related items are 8px apart, separate groups 16px or more.

## Shape

- **One radius: 8px** (`--r`) for cards, buttons, fields, chips and tags.
- Marks smaller than a fingertip are square: progress bars, the tick box,
  the scrollbar.
- No shadows. A 1px border separates a card from the page.
- No gradients, glass, pills or glow.
- Nothing moves under the finger. Colours change in 120ms and panels appear
  in place, which also suits slow phones.

## Touch

- Main buttons and fields: 48px tall.
- Small buttons, chips and icon buttons: at least 44px.
- With a mouse on a wide screen these drop to 40px and 36px. That only
  happens in a desktop browser during development.

## Icons

- Line drawings on a 24px grid, 2px stroke, round ends, in the text colour.
- Always next to a word, except the header's bell and settings and the small
  edit and remove buttons, which have spoken labels for screen readers.
- No emoji and no text characters (✓, ×, ↑) used as icons.
- Icons in the static page are inline SVG or CSS mask classes (`.i-*`).
  Icons drawn by the script come from the `ICON_*` strings. All follow the
  same grid and stroke.

## What we left out, and why

- **No illustrations or photos.** They add weight on slow phones and do not
  help anyone take a medicine.
- **No animation.** It costs battery and can confuse people who are unwell.
- **No colour-only meaning.** "In range", "above range" and "below range"
  always have a word and a drawn arrow or tick next to the colour.
