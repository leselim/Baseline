/* Baseline. Behaviours. What recurs, counted rather than remembered. */
(function (global) {
  var BL = global.BL, S = BL.stats, D = BL.data, U = BL.ui, ch = BL.charts, A = BL.analysis;

  function strip(h) {
    var recent = h.days.slice(-28);
    var hits = recent.filter(function (d) { return d.hit; }).length;
    return '<div class="habit__strip" role="img" aria-label="' + U.esc(h.label) +
      ' on ' + hits + ' of the last 28 days">' +
      recent.map(function (d) {
        return '<i class="' + (d.hit ? 'on ' : '') + (d.day.weekend ? 'weekend' : '') + '" title="' +
          U.esc(S.longDate(d.day.date) + (d.hit ? ', yes' : ', no')) + '"></i>';
      }).join('') + '</div>';
  }

  function row(h) {
    var when = S.behaviourWhen(h);
    var trend = h.trend > 0 ? h.trend + ' more days than the four weeks before'
      : h.trend < 0 ? Math.abs(h.trend) + ' fewer days than the four weeks before'
        : 'Same as the four weeks before';
    return '<article class="habit">' +
      '<div class="habit__id"><h3 class="t-sub">' + U.esc(h.label) + '</h3>' +
      '<p class="habit__when">' + U.esc(when || '') + '</p></div>' +
      '<div class="habit__right">' +
      '<div class="habit__score"><span class="t-data-m">' + h.consistency + '%</span>' +
      '<span class="t-fine">of days</span></div>' +
      '<div class="habit__track">' + strip(h) +
      '<p class="t-fine">Last 28 days. ' + U.esc(trend) + '.</p></div>' +
      '</div></article>';
  }

  function render() {
    var list = S.behaviours();
    var exDays = D.days.filter(function (d) { return d.exercise; }).length;
    var best = Math.max.apply(null, D.days.map(function (d) { return d.steps; }));
    var usual = A.mean(A.values('steps'));

    return '' +
      '<header class="page-head">' +
      '<h1 class="t-page">Behaviours</h1>' +
      '<p class="page-head__lead">What you tend to do. Nothing here is a target and nothing is scored.</p>' +
      '</header>' +

      '<section class="section">' +
      U.sectionHead('What recurs', 'Last 56 days', null,
        'Each small mark is one day, oldest on the left. Filled means it happened.') +
      '<div class="stack stack-5">' + list.map(row).join('') + '</div>' +
      '</section>' +

      '<section class="section">' +
      U.sectionHead('Movement, day by day', D.days.length + ' days', null,
        'Columns are weeks. Rows run Monday at the top to Sunday at the bottom.') +
      U.panel(null, null,
        ch.chart({
          type: 'heatmap', height: 176, days: D.days, className: 'chart--fit',
          value: function (d) { return d.steps; },
          monthLabel: function (d) { return d.toLocaleDateString('en-ZA', { month: 'short' }); },
          legendLow: 'Fewer steps', legendHigh: 'More',
          tip: function (d) {
            return { value: S.num(d.steps) + ' steps', sub: S.longDate(d.date) + (d.exercise ? ', exercise recorded' : '') };
          },
          aria: 'Steps on each day of your record'
        }) +
        '<div class="stat-inline" style="margin-top:26px">' +
        '<div class="stat-inline__item"><span class="t-label">A usual day</span>' +
        '<span class="t-data-m">' + S.num(usual) + '</span><span class="t-fine">steps</span></div>' +
        '<div class="stat-inline__item"><span class="t-label">Your busiest day</span>' +
        '<span class="t-data-m">' + S.num(best) + '</span><span class="t-fine">steps</span></div>' +
        '<div class="stat-inline__item"><span class="t-label">Days with a session</span>' +
        '<span class="t-data-m">' + exDays + '</span><span class="t-fine">of ' + D.days.length + '</span></div>' +
        '</div>' +
        U.reading('Read down a column to see one week. Read across a row to follow one weekday over months.')) +
      '</section>';
  }

  BL.views = BL.views || {};
  BL.views.habits = { title: 'Behaviours', render: render };
})(typeof window !== 'undefined' ? window : globalThis);
