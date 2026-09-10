/* Baseline. Overview. What we noticed, what changed, what you could test. */
(function (global) {
  var BL = global.BL, S = BL.stats, D = BL.data, U = BL.ui, ch = BL.charts,
    P = BL.patterns, E = BL.explain, X = BL.experiments;

  function greeting() {
    var h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  }

  function summary() {
    var found = P.top(3).length;
    var changed = P.changes(2).length;
    if (!found) return 'Baseline is still learning what is normal for you.';
    var one = 'Baseline found ' + found + ' ' + S.plural(found, 'thing') + ' worth a look.';
    return changed ? one + ' ' + changed + ' ' + S.plural(changed, 'thing') + ' also changed recently.' : one;
  }

  function noticed() {
    var top = P.top(3);
    if (!top.length) {
      return U.empty('Nothing to report yet',
        'Baseline needs more days before it can find a pattern it trusts. Your record keeps building in the background.');
    }
    return '<div class="stack stack-5">' + top.map(function (p) {
      return U.findingCard(E.explain(p));
    }).join('') + '</div>';
  }

  function changes() {
    var list = P.changes(2);
    if (!list.length) return '';
    return '<section class="section">' +
      U.sectionHead('What changed', null, null, 'Recent movement against the rest of your record.') +
      '<div class="stack stack-5">' + list.map(function (p) {
        return U.findingCard(E.explain(p), { compact: true });
      }).join('') + '</div>' +
      '</section>';
  }

  function couldTest() {
    var e = X.byStatus('suggested')[0];
    if (!e) return '';
    return '<section class="section">' +
      U.sectionHead('What you could test', null, null, 'One change. One thing measured. A few weeks.') +
      U.panel(null, null,
        '<h3 class="t-section" style="max-width:28ch">' + U.esc(e.action) + '</h3>' +
        '<p class="finding__sub" style="margin-top:12px">' + U.esc(e.question) + '</p>' +
        '<div class="stat-inline" style="margin-top:26px">' +
        '<div class="stat-inline__item"><span class="t-label">Because</span>' +
        '<span class="t-body">' + U.esc(e.why) + '</span></div>' +
        '<div class="stat-inline__item"><span class="t-label">Measuring</span>' +
        '<span class="t-body">' + U.esc(e.measureLabel) + '</span></div>' +
        '<div class="stat-inline__item"><span class="t-label">For</span>' +
        '<span class="t-body">' + e.weeks + ' weeks</span></div>' +
        '</div>' +
        '<p style="margin-top:26px"><a class="btn" href="#/experiments">See experiments</a></p>') +
      '</section>';
  }

  function rangeLabel(win) {
    var days = D.last(win);
    return S.dateLabel(days[0].date) + ' to ' + S.dateLabel(days[days.length - 1].date, { day: 'numeric', month: 'short' });
  }

  function explore(state) {
    var m = S.metrics[state.metric];
    var days = D.last(state.range);
    var values = days.map(m.get).filter(function (v) { return v != null; });
    var base = S.mean(BL.analysis.values(state.metric));
    var rows = S.byDow(state.metric);
    var peak = rows.reduce(function (a, b) { return b.value > a.value ? b : a; });
    var low = rows.reduce(function (a, b) { return b.value < a.value ? b : a; });

    return '<section class="section" data-tour-step="metrics">' +
      U.sectionHead('Explore your data', rangeLabel(state.range),
        U.segment('range', [{ value: 7, label: '7 days' }, { value: 30, label: '30 days' },
          { value: 90, label: '3 months' }, { value: 182, label: '6 months' }], state.range, 'Choose a period'),
        'The record the findings above were drawn from.') +
      U.metricRow(state.metric, state.range) +
      '<div class="grid-2" style="margin-top:24px" data-tour-step="charts">' +
      U.panel('How has my ' + m.short + ' changed?', rangeLabel(state.range),
        ch.chart({
          type: 'line', height: 240, values: values,
          labels: days.map(function (d) { return S.dateLabel(d.date); }),
          baseline: base, baselineLabel: 'your usual, ' + m.format(base), fmtAxis: m.axis,
          aria: m.label + ' over the last ' + state.range + ' days',
          tip: function (i) { return { value: m.format(values[i]), sub: S.longDate(days[i].date) }; }
        }) +
        U.reading('The dashed line is ' + U.term('baseline') + ', ' + m.format(base) + '.')) +
      U.panel('Which days are highest?', m.label,
        ch.chart({
          type: 'bars', height: 240, baseline: base, baselineLabel: 'your usual', fmtAxis: m.axis,
          aria: m.label + ' by day of the week',
          items: rows.map(function (r) {
            return {
              label: r.label, value: r.value,
              highlight: r.label === peak.label, muted: r.value < base,
              tip: { value: m.format(r.value), sub: r.full + ', averaged over ' + r.n + ' days' }
            };
          })
        }) +
        U.reading('Highest on ' + peak.full + '. Lowest on ' + low.full + '.')) +
      '</div></section>';
  }

  function render(state) {
    return '' +
      '<header class="page-head">' +
      '<h1 class="t-page">' + greeting() + ', ' + D.user.name + '</h1>' +
      '<p class="page-head__lead">' + U.esc(summary()) + '</p>' +
      '</header>' +

      '<section class="section" data-tour-step="patterns">' +
      U.sectionHead('What we noticed', null,
        '<a class="btn--quiet" href="#/patterns">See all</a>',
        'Things that keep happening in your own record.') +
      noticed() +
      '</section>' +

      changes() +
      couldTest() +
      explore(state);
  }

  BL.views = BL.views || {};
  BL.views.overview = { title: 'Overview', render: render };
})(typeof window !== 'undefined' ? window : globalThis);
