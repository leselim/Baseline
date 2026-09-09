# Baseline

A personal behaviour intelligence platform. It reads sleep, spending, screen time, movement
and calendar data together, and reports what it can observe about the relationships between
them, measured against your own record rather than a general recommendation.

## Running it

No build step, no dependencies. Open `index.html` in a browser.

If your browser restricts local file access, serve the folder instead:

```
python3 -m http.server 8000
# then open http://localhost:8000
```

`login.html` is the sign-in screen, included to show the wordmark in a second context.

## What is here

```
index.html          application shell
login.html          sign-in screen
css/
  tokens.css        palette, type, spacing, radii, motion
  base.css          reset, type scale, wordmark, layout primitives
  components.css    navigation, panels, metrics, insights, tables, timeline
  responsive.css    charts, tablet and mobile layouts
js/
  data.js           seeded generator, 133 days of internally consistent records
  stats.js          statistics, derived metrics, named patterns, formatting
  charts.js         SVG chart library (line, bar, scatter, heatmap, sparkline, day strip)
  ui.js             component builders and the navigation icon set
  views/            one file per section
  app.js            shell, hash router, state
assets/favicon.svg  monogram
```

### Everything is computed

No figure in the interface is typed by hand. `data.js` generates a fixed, seeded record of
133 days with real structure in it, Sunday evening phone use pushes Monday sleep late,
Friday carries the week's discretionary spending, days that start after 09:00 leave room to
exercise. `stats.js` measures that record and the views render whatever it finds, so the
headline figure, the chart, the contributor breakdown and the timeline always agree.

Current figures from the seeded record:

| Pattern | Result |
|---|---|
| Friday vs Wednesday spending | +41% |
| Monday sleep vs weekly average | -48m |
| Sleep onset after late phone activity | +49m, r = 0.67 |
| Exercise when the day starts after 09:00 | +30 percentage points |

Change the constants at the top of `data.js` and the entire product recalculates.

## Design system

**Palette.** A deep navy foundation with progressively lighter blues. Navy carries navigation,
primary text and the strongest data points; lighter blues are reserved for charts, fills and
selected states. Off-white does the work of breathing room.

```
#001D39  navigation, primary text, strongest data
#0A4174  active states, primary series, links
#49769F  secondary text, axis labels
#4E8EA2  supporting series
#6EA2B3  tertiary marks
#7BBDE8  chart accent, selection
#BDD8E9  fills, rest states
#F4F6F8  workspace   #FFFFFF  panels
```

Two signal colours exist (`--signal-good`, `--signal-warn`) and appear only on the direction
of a change, never as decoration.

**Type.** Geist, falling back to Inter and then the system sans. Weights 400/500/600, with 700
held back entirely. Hierarchy is carried by size and spacing rather than by weight or colour.

**The wordmark.** *Baseline*, set in the product typeface with a hairline rule beneath it. The
rule is the idea: every chart in the product draws the same dashed line at your personal
average, so the logo and the data visualisation share one mark. The monogram is `B` with the
same rule, used at narrow widths and in the favicon.

**Depth.** Borders and tonal contrast first, shadows barely. Two shadow values exist and both
are nearly invisible; radii stop at 10px and nothing is pill-shaped.

**Motion.** 150 to 250ms. The view animates on navigation only, changing a metric or a date
range redraws without animation, so the interface stays still while you read it.

## Interactions

- Date range across 7 / 30 / 90 days, recalculating every figure and chart
- Switching the active metric drives both the trend chart and the day-of-week comparison
- Opening a pattern for its evidence, method and suggested experiment
- Starting an experiment, which moves it into the running list
- Choosing any two of ten measures in the explorer, including pairs with no relationship
- Filtering the timeline by category and moving between the last fourteen days
- Toggling analysis and contact settings

## Language

Patterns are described as associations, never as causes. Sample size and confidence are shown
next to every claim, and confidence is derived from how many days support a pattern and how
often it repeats. Where the data shows nothing, the interface says so.
