/* Baseline: Habits (observed recurrence) */
(function (global) {
  var BL = global.BL, S = BL.stats, D = BL.data, U = BL.ui, ch = BL.charts;

  function strip(h) {
    return '<div class="habit__strip">' + h.days.slice(-28).map(function (d) {
      return '<i class="' + (d.hit ? 'on ' : '') + (d.day.weekend ? 'weekend' : '') + '" title="' +
        S.longDate(d.day.date) + (d.hit ? ' · recorded' : ' · not recorded') + '"></i>';
    }).join('') + '</div>';
  }

  function row(h) {
    var trend = h.trend > 0 ? '+' + h.trend + ' in the last four weeks'
      : h.trend < 0 ? h.trend + ' in the last four weeks'
        : 'Unchanged over four weeks';
    return '<div class="habit">' +
      '<div><div class="t-sub">' + U.esc(h.label) + '</div>' +
      '<p class="t-small" style="margin-top:4px">' + U.esc(h.note) + '</p>' +
      '<p class="t-fine" style="margin-top:10px">' + h.perWeek.toFixed(1) + ' days a week · ' + h.consistency + '% of days · ' + trend + '</p></div>' +
      '<div class="row" style="gap:22px">' + strip(h) +
      '<div style="min-width:74px;text-align:right"><div class="t-data-m">' + h.consistency + '%</div>' +
      '<div class="t-fine">consistency</div></div></div>' +
      '</div>';
  }

  function render() {
    var habits = S.habits();
    var strongest = habits.slice().sort(function (a, b) { return b.consistency - a.consistency; })[0];
    var weakest = habits.slice().sort(function (a, b) { return a.consistency - b.consistency; })[0];

    return '' +
      '<header class="page-head">' +
      '<h1 class="t-page">Habits</h1>' +
      '<p class="page-head__lead">Behaviours that repeat often enough to measure. Nothing here is a target, each one is counted from your own record over the last eight weeks.</p>' +
      '</header>' +

      '<section class="section">' +
      U.sectionHead('Recurring behaviours', 'Last 56 days · shaded squares are weekends') +
      U.panel(null, null, habits.map(row).join(''),
        '<p class="t-fine">' + U.esc(strongest.label) + ' is your most consistent behaviour at ' + strongest.consistency +
        '%. ' + U.esc(weakest.label) + ' appears on ' + weakest.consistency + '% of days.</p>') +
      '</section>' +

      '<section class="section">' +
      U.sectionHead('Exercise across the record', D.days.length + ' days') +
      U.panel(null, null,
        ch.chart({
          type: 'heatmap', height: 150, days: D.days,
          value: function (d) { return d.exercise ? d.steps : d.steps * 0.35; },
          tip: function (d) { return '<b>' + S.num(d.steps) + ' steps</b><br><span>' + S.longDate(d.date) + (d.exercise ? ' · exercise recorded' : '') + '</span>'; },
          aria: 'Daily step count across the record'
        }) +
        '<p class="chart-note">Each column is one week, read top to bottom from Monday. Darker days carry more movement.</p>') +
      '</section>';
  }

  BL.views = BL.views || {};
  BL.views.habits = { title: 'Habits', render: render };
})(typeof window !== 'undefined' ? window : globalThis);
