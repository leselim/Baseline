/* Baseline: Patterns (behaviour explorer) */
(function (global) {
  var BL = global.BL, S = BL.stats, D = BL.data, U = BL.ui, ch = BL.charts;

  function selector(name, active) {
    return '<select class="select" data-var="' + name + '" aria-label="' + (name === 'x' ? 'First' : 'Second') + ' measure">' +
      S.variables.map(function (v) {
        return '<option value="' + v.key + '"' + (v.key === active ? ' selected' : '') + '>' + U.esc(v.label) + '</option>';
      }).join('') + '</select>';
  }

  function reading(rel) {
    if (Math.abs(rel.r) < 0.18) {
      return 'Across ' + rel.n + ' days there is no meaningful relationship between these two measures. That is a useful result: this pair is unlikely to explain changes in either.';
    }
    return 'Days with higher ' + rel.x.label.toLowerCase() + ' are associated with ' +
      (rel.r > 0 ? 'higher ' : 'lower ') + rel.y.label.toLowerCase() + '. Comparing your highest quarter of days with your lowest, ' +
      rel.y.label.toLowerCase() + ' differs by ' + S.unsign(rel.y.fmt(Math.abs(rel.highMean - rel.lowMean))) + '.';
  }

  function relationTable(state) {
    var rows = S.pairSuggestions.map(function (p) {
      return S.relationship(p[0], p[1]);
    }).sort(function (a, b) { return Math.abs(b.r) - Math.abs(a.r); });
    return '<table class="table"><thead><tr>' +
      '<th>Relationship</th><th>Strength</th><th>Difference across your range</th><th>Days</th><th>Correlation</th>' +
      '</tr></thead><tbody>' +
      rows.map(function (r) {
        return '<tr data-pair="' + r.x.key + ',' + r.y.key + '">' +
          '<td><span style="font-weight:500">' + U.esc(r.x.label) + '</span> <span class="fine">and</span> <span style="font-weight:500">' + U.esc(r.y.label) + '</span></td>' +
          '<td class="muted">' + r.strength + '</td>' +
          '<td class="num muted">' + U.esc(S.unsign(r.y.fmt(Math.abs(r.highMean - r.lowMean)))) + '</td>' +
          '<td class="num muted">' + r.n + '</td>' +
          '<td class="num" style="font-weight:500">' + (r.r > 0 ? '+' : S.minus) + Math.abs(r.r).toFixed(2) + '</td>' +
          '</tr>';
      }).join('') + '</tbody></table>';
  }

  function sameMeasure(state) {
    var v = S.variable(state.pair.x);
    return '<header class="page-head"><h1 class="t-page">Patterns</h1>' +
      '<p class="page-head__lead">Choose any two measures. Every day where both were recorded is compared, and the result is reported as it stands, including when there is nothing there.</p></header>' +
      '<section class="section">' +
      U.sectionHead('Compare two measures', null,
        selector('x', state.pair.x) + '<span class="t-small">and</span>' + selector('y', state.pair.y)) +
      U.empty('Pick a second measure',
        v.label + ' is currently selected on both sides, so there is nothing to compare. Choose a different measure on either side.') +
      '</section>' +
      '<section class="section">' + U.sectionHead('Observed relationships', 'Ranked by correlation strength') +
      U.panel(null, null, relationTable(state)) + '</section>';
  }

  function render(state) {
    if (state.pair.x === state.pair.y) return sameMeasure(state);
    var rel = S.relationship(state.pair.x, state.pair.y);
    var pts = rel.points.map(function (p) {
      return {
        x: p.x, y: p.y, accent: p.day.dow === 1,
        tip: '<b>' + rel.y.fmt(p.y) + '</b><br><span>' + rel.x.label + ' ' + rel.x.fmt(p.x) + ' · ' + S.longDate(p.day.date) + '</span>'
      };
    });

    var chart = U.panel(rel.x.label + ' and ' + rel.y.label, rel.n + ' days with both measures recorded',
      ch.chart({
        type: 'scatter', height: 300, points: pts, fit: rel.fit,
        fmtX: rel.x.fmt, fmtY: rel.y.fmt,
        xLabel: rel.x.label + ' →', yLabel: rel.y.label,
        aria: rel.x.label + ' plotted against ' + rel.y.label
      }) +
      '<div class="chart-legend"><span><i style="background:#0A4174"></i>Mondays</span>' +
      '<span><i style="background:#6EA2B3"></i>All other days</span>' +
      '<span><i style="background:#0A4174;opacity:.6"></i>Line of best fit</span></div>');

    var side =
      U.panel('Reading', null,
        '<div class="row-between" style="align-items:baseline">' +
        '<span class="t-data-l">' + (rel.r > 0 ? '+' : S.minus) + Math.abs(rel.r).toFixed(2) + '</span>' +
        '<span class="t-label">Correlation</span></div>' +
        '<p class="t-small" style="margin-top:14px">' + U.esc(reading(rel)) + '</p>' +
        '<div style="margin-top:16px">' + U.datarows([
          { label: 'Highest quarter of days', value: rel.y.fmt(rel.highMean) },
          { label: 'Lowest quarter of days', value: rel.y.fmt(rel.lowMean) },
          { label: 'Days compared', value: String(rel.n) }
        ]) + '</div>' +
        '<div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--line-soft)">' + U.confidence(rel.confidence) + '</div>',
        '<p class="t-fine">This is an observed association in your own data. It does not establish that one measure causes the other.</p>');

    return '' +
      '<header class="page-head">' +
      '<h1 class="t-page">Patterns</h1>' +
      '<p class="page-head__lead">Choose any two measures. Every day where both were recorded is compared, and the result is reported as it stands, including when there is nothing there.</p>' +
      '</header>' +

      '<section class="section">' +
      U.sectionHead('Compare two measures', null,
        selector('x', state.pair.x) + '<span class="t-small">and</span>' + selector('y', state.pair.y)) +
      '<div class="grid-explorer">' + chart + side + '</div>' +
      '</section>' +

      '<section class="section">' +
      U.sectionHead('Observed relationships', 'Ranked by correlation strength') +
      U.panel(null, null, relationTable(state)) +
      '</section>' +

      '<section class="section">' +
      U.sectionHead('Named patterns', 'Recurring effects strong enough to track') +
      '<div class="stack stack-4">' + S.insights().map(function (i, n) { return U.insightBlock(i, n); }).join('') + '</div>' +
      '</section>';
  }

  BL.views = BL.views || {};
  BL.views.patterns = { title: 'Patterns', render: render };
})(typeof window !== 'undefined' ? window : globalThis);
