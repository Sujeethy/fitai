# Theme

Semantic color tokens, so a restyle is an edit in one place instead of a
find-and-replace across every screen. See docs/NEXT.md §2 for the direction
this is heading (neutral dark base, one saturated accent, real elevation).

**`colors.ts`** — the token values, for JS contexts: icon `color` props,
`placeholderTextColor`, Reanimated-driven styles. `tailwind.config.js` mirrors
the same values as utility classes for `className` (`bg-surface`,
`text-textMuted`, `border-border`, …) — the two must be kept in sync by hand,
since NativeWind reads the Tailwind config at build time and can't import
this file directly.

## Tokens

| Token | Role |
|---|---|
| `surface` | App background |
| `surfaceRaised` | Card / screen-section background |
| `surfaceOverlay` | Inputs, secondary button fill, pressed states |
| `border` / `borderMuted` / `borderStrong` | Hairlines, from subtle to visible |
| `accent` / `accentMuted` | The one saturated color — primary actions, active state |
| `success` | Completed sets, positive states. Same value as `accent` today — kept as a separate token because NEXT.md §2 reserves green for *completed* and the accent for *actionable*, which will diverge once the palette gets a real pass |
| `warning` / `warningMuted` | Caution states — e.g. "you're behind on today's plan" |
| `danger` / `dangerStrong` | Destructive actions, errors |
| `textPrimary` / `textSecondary` / `textMuted` / `textFaint` | Type hierarchy, high to low emphasis |
| `textInverse` | Text on an accent-colored background |

## What's converted so far

`Screen`, `EmptyState`, `Button`, `Stepper`, `AccountButton` — the components
every screen composes from. The rest of the app still hardcodes
`bg-neutral-900` etc.; converting those is the restyle pass in NEXT.md §2,
deliberately left for after this token layer exists, so it happens once.
