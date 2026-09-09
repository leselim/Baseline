/* Baseline: single pattern */
(function (global) {
  var BL = global.BL, S = BL.stats, D = BL.data, U = BL.ui, ch = BL.charts;

  function evidenceChart(ins) {
    if (ins.id === 'friday-spending') {
      var rows = S.byDow('spend');
      return U.panel('Average spending by day', 'All ' + D.days.length + ' recorded days',
        ch.chart({
          type: 'bars', height: 260,
          items: rows.map(function (r) {
            return {
              label: r.label, value: r.value, highlight: r.dow === 5, muted: r.dow === 3,
              tip: '<b>' + S.money(r.value) + '</b><br><span>' + r.label + ' average · ' + r.n + ' days</span>'
            };
          }),
          baseline: S.mean(D.days.map(function (d) { return d.spendTotal; })),
          fmtAxis: function (v) { return 'R' + Math.round(v); }, aria: 'Average spending by day of week'
        }));
    }
    if (ins.id === 'monday-sleep') {
      var r2 = S.byDow('sleep');
      return U.panel('Average sleep by day', 'All ' + D.days.length + ' recorded days',
        ch.chart({
          type: 'bars', height: 260,
          items: r2.map(function (r) {
            return {
              label: r.label, value: r.value, highlight: r.dow === 1, muted: r.value < S.mean(D.days.map(function (d) { return d.sleepMin; })),
              tip: '<b>' + S.dur(r.value) + '</b><br><span>' + r.label + ' average · ' + r.n + ' nights</span>'
            };
          }),
          baseline: S.mean(D.days.map(function (d) { return d.sleepMin; })),
          fmtAxis: function (v) { return (v / 60).toFixed(1) + 'h'; }, aria: 'Average sleep by day of week'
        }));
    }
    if (ins.id === 'phone-sleep') {
      var rel = S.relationship('phoneLate', 'onset');
      return U.panel('Late phone activity and sleep onset', rel.n + ' nights',
        ch.chart({
          type: 'scatter', height: 280,
          points: rel.points.map(function (p) {
            return {
              x: p.x, y: p.y, accent: p.day.lateNight,
              tip: '<b>Sleep at ' + S.clock(p.y) + '</b><br><span>' + Math.round(p.x) + ' min after 23:30 · ' + S.longDate(p.day.date) + '</span>'
            };
          }),
          fit: rel.fit, fmtX: function (v) { return Math.round(v) + 'm'; }, fmtY: S.clock,
          xLabel: 'Minutes of phone activity after 23:30 →', yLabel: 'Sleep onset',
          aria: 'Phone activity plotted against sleep onset'
        }) +
        '<div class="chart-legend"><span><i style="background:#0A4174"></i>Nights with activity past 23:30</span><span><i style="background:#6EA2B3"></i>Other nights</span></div>');
    }
    // first commitment
    var wk = D.days.filter(function (d) { return !d.weekend && d.firstCommitMin; });
    var buckets = [
      { label: 'Before 08:30', test: function (d) { return d.firstCommitMin < 510; } },
      { label: '08:30 to 09:00', test: function (d) { return d.firstCommitMin >= 510 && d.firstCommitMin < 540; } },
      { label: '09:00 to 09:30', test: function (d) { return d.firstCommitMin >= 540 && d.firstCommitMin < 570; } },
      { label: 'After 09:30', test: function (d) { return d.firstCommitMin >= 570; } }
    ].map(function (b) {
      var set = wk.filter(b.test);
      var v = set.length ? (set.filter(function (d) { return d.exercise; }).length / set.length) * 100 : 0;
      return { label: b.label, value: v, highlight: b.label === 'After 09:30', tip: '<b>' + Math.round(v) + '% of days</b><br><span>' + set.length + ' weekdays</span>' };
    });
    return U.panel('Exercise rate by first commitment', wk.length + ' weekdays',
      ch.chart({
        type: 'bars', height: 260, items: buckets,
        baseline: (wk.filter(function (d) { return d.exercise; }).length / wk.length) * 100,
        baselineLabel: 'weekday average', fmtAxis: function (v) { return Math.round(v) + '%'; },
        aria: 'Exercise rate by time of first commitment'
      }));
  }

  function render(state) {
    var ins = S.insight(state.insightId);
    if (!ins) return U.empty('That pattern is no longer tracked', 'It may have fallen below the sample size needed to report it.', '<a class="btn btn--ghost" href="#/patterns">Back to patterns</a>');

    var started = state.started[ins.id];
    var occurrences = ins.contributors ? ins.occurrence : ins.occurrence;

    return '' +
      '<a class="btn--quiet" href="#/patterns" style="display:inline-block;margin-bottom:22px">Back to patterns</a>' +
      '<header class="page-head">' +
      '<div class="insight__kicker" style="margin-bottom:12px">' + U.esc(ins.kicker) + '</div>' +
      '<div class="row" style="align-items:baseline;gap:20px;margin-bottom:12px">' +
      '<span class="t-page num">' + U.esc(ins.headline) + '</span>' +
      U.confidence(ins.confidence) + '</div>' +
      '<p class="page-head__lead">' + U.esc(ins.statement) + ' ' + U.esc(ins.detail) + '</p>' +
      '</header>' +

      '<section class="section">' +
      '<div class="grid-side">' +
      evidenceChart(ins) +
      '<div class="stack stack-4">' +
      U.panel('Measured', null,
        ins.contributors
          ? U.contributors(ins.contributors, function (v) { return (v >= 0 ? '+' : S.minus) + S.money(Math.abs(v)); })
          : U.datarows(ins.rows)) +
      U.panel('How this was established', null,
        U.datarows([
          { label: 'Days observed', value: ins.sample },
          { label: 'Consistency', value: occurrences },
          { label: 'Confidence', value: ins.confidence.label }
        ]),
        '<p class="t-fine">Confidence reflects how many days support the pattern and how often it repeats. It is not a claim about cause.</p>') +
      '</div></div></section>' +

      '<section class="section">' +
      U.sectionHead('Suggested experiment', 'One variable, measured against your own baseline') +
      U.panel(null, null,
        '<div class="row-between wrap" style="gap:28px;align-items:flex-start">' +
        '<div class="grow"><h3 class="t-sub">' + U.esc(ins.experiment.title) + '</h3>' +
        '<div style="margin-top:14px;max-width:420px">' + U.datarows([
          { label: 'Duration', value: ins.experiment.duration },
          { label: 'Measure', value: ins.experiment.measure },
          { label: 'Expected outcome', value: ins.experiment.expected }
        ]) + '</div></div>' +
        (started
          ? '<span class="badge badge--live">Running since today</span>'
          : '<button class="btn" data-start="' + ins.id + '">Start experiment</button>') +
        '</div>',
        '<p class="t-fine">Nothing changes in your data until the experiment ends. Results are compared with the ' + D.days.length + ' days already recorded.</p>') +
      '</section>';
  }

  BL.views = BL.views || {};
  BL.views.insight = { title: 'Pattern', render: render };
})(typeof window !== 'undefined' ? window : globalThis);
