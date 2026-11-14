# meltdown
Meltdown — 3-minute rehearsal for parents before difficult moments with children.

[Live demo](https://meltdown-flame.vercel.app)

## Model evaluation

Production run on Vercel with Claude Opus 5.5 and low effort.

- Technique tags passed 20 of 20 cases, child replies passed 20 of 20, and scenario checks passed 3 of 3.
- All cases used Claude. The backup coach returned zero responses.
- Turn latency was 2.1 s at the median and 2.5 s at the 90th percentile.

Source: the team's production run of `npm run eval` on November 14, 2026.
