# Baseline

A personal behaviour intelligence system.

Baseline brings the records a person already produces into one timeline, learns what is
normal for them, and reports what repeats. It answers three questions in order: what have
we noticed, why might it be happening, and what happened when you changed something.

## Running it

No build step and no dependencies. Open `index.html` in a browser.

If your browser restricts local file access, serve the folder instead:

```
python3 -m http.server 8000
```

`baseline-preview.html` is the same application inlined into one file. Open it directly.

## Architecture

Analysis is separated from presentation at every level. No view computes a finding, and
no explanation invents a number.

```
data.js         seeded generator, emits normalised EVENTS then rolls them into days
analysis.js     statistical primitives and the metric registry
patterns.js     detection, qualification, deduplication, ranking
explain.js      structured explanation layers, prints only what patterns produced
experiments.js  experiments tied to the pattern that suggested them
stats.js        formatting, summaries, the day record
charts.js       SVG chart library
ui.js           components
views/          one file per screen
app.js          shell, router, state, walkthrough
```

### Events

Every source is normalised into one shape, so a bank transaction, a calendar entry and a
phone session can be compared on the same axis:

```js
{ id, source, kind, date, iso, minute, value, unit, category, meta }
```

The demonstration record holds 182 days (26 whole weeks, so every weekday has 26) and
2,400 events, of which about 1,000 are individual transactions with a time, an amount and
a category. That transaction detail is what makes "most of this happens between 18:00 and
21:00" a measured result rather than a sentence.

### The pipeline

```
events -> features -> candidate detection -> qualification -> enrichment
       -> deduplication -> ranking -> explanation -> experiment -> result
```

Six detectors run: day of week (including grouped days such as Thursday and Friday),
relationships between measures, recent change, stability, exceptional days, and
day to day sequences.

**Most of what is found is thrown away, and that is the point.** On the current record
the engine considers 219 candidates and reports 18. A candidate must clear every gate:

| Gate | What it stops |
|---|---|
| Sample | Findings resting on too few days |
| Effect size | Differences too small to matter, however reliable |
| Significance | Noise that looks like signal |
| Weekly consistency | Averages that only hold in half the weeks |
| Robustness | Findings that vanish when the extremes are trimmed |
| Recency | Patterns that have faded, which are reported as change instead |
| Deduplication | The same weekly shape reported from several angles |

A finding driven by one unusual day is not hidden. It is demoted, and the explanation
says so.

### Ranking

Seven dimensions combined internally and never shown: evidence, effect size, consistency,
recency, actionability, novelty and personal relevance. The reader sees only three words:
strong evidence, some evidence, or not enough data.

## What the demonstration record actually contains

Structure is written into the generator on purpose so the analysis has something true to
find. Nothing is asserted downstream.

- Thursday and Friday evenings carry more food and social spending
- Work finishes about 45 minutes later on Thursday and Friday
- Late phone use pushes sleep onset later the same night
- Free mornings leave room for exercise
- Screen time has drifted upward over the last three weeks
- Three Fridays in August carry a real intervention, so the finished experiment measures
  an effect that is genuinely in the record

The engine finds these without being told. The strongest current finding:

> **You spend more in the evening on Thursdays and Fridays.**
> On those days it is R216. On other days it is R130.
> Seen in 24 of your last 26 weeks.
> Most of the difference is social and food.
> Most of it happens between 18:00 and 21:00.
> You also finish work later by 45m on those days.
> Baseline cannot tell from this data whether one leads to the other.

The finished experiment, measured from the days it ran: R249 usual, R121 during the test,
R128 lower across 3 Fridays against the other 23.

## Language

Observation, association, hypothesis, experiment and result are kept apart, and the
interface says which is which. Causation is never claimed. Possible explanations are
written as possibilities and visually separated from anything measured.

Prose runs to a median of six words a sentence. No emoji. No dash character is used as a
separator or decoration anywhere, including page titles and code comments.

## Charts

Seven types: comparison bars, line, bars, scatter, heatmap, sparkline and day strip. Every
finding opens with comparison bars, because two labelled bars answer "more or less than
what" before a word is read.

**Nothing overlaps, and this is tested rather than assumed.** The QA harness models the
real CSS cascade to compute each chart's container width at each viewport, renders every
chart there, computes a bounding box for every label using the same width function the
renderer uses, and fails on any intersection, any label outside the viewBox, and any text
under 10px. 910 renders across 320, 375, 390, 430, 768, 820, 1024, 1280, 1440 and 1920
pixels currently pass.

Labels are placed by measurement. The line chart drops date labels until the widest one
fits with clearance. The bar chart falls back to single letters when a column is too
narrow, keeping the full name in the tooltip. The scatter chooses between two and four
axis values by width. Comparison bars move their labels above the bar when they cannot fit
beside it, and captions wrap rather than overflow. Axes never pad below zero.

## Design

Palette, wordmark and layout language are unchanged. Roboto at 400, 500 and 700.

```
#001D39  navigation, primary text, strongest data
#0A4174  active states, primary series
#49769F  secondary text, axis labels
#4E8EA2  supporting series
#6EA2B3  tertiary marks
#7BBDE8  chart accent
#BDD8E9  fills, rest states
```

Cards carry no shadow. Not every section is a card. Every text colour meets WCAG AA at
the size it is used.

## Connectors

Five sources are connected in the demonstration record. Three more (location, computer
activity, browser) are shown in their real state, not connected or planned. Nothing
pretends an integration exists. Each source shows what Baseline reads from it, what it is
used for, how much history exists and when it last updated.
