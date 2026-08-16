# Body weight

Recording and reviewing body weight.

**Screens:** `app/(tabs)/weight.tsx`
**Tables:** `body_weights`, `change_journal`

## Two taps

The date defaults to today and the value defaults to your last reading, so a
normal entry is: open, adjust by a couple of steps, save.

## One reading per date

Re-logging the same date updates that row rather than adding a second — except
that **a synced reading never overwrites one you typed**. Fitelo's Health Connect
accuracy is unverified (PLAN.md §11), so your own number is treated as the more
trustworthy one, and `source` records where each reading came from.

## Trend, not the daily number

Daily body weight is noisy — food, water, and time of day move it more than fat
does. `WeightTrend` shows the 7-day average as a headline number, and
`BodyWeightChart` plots it as a line over the raw readings (dots) — the trend
is the signal, the dots are the noise it smooths (docs/NEXT.md §3). Needs at
least two entries to draw; fewer than that and the chart doesn't render.
