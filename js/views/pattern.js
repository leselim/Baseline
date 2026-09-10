/* Baseline. One pattern, in layers.
 * finding, evidence, how often, what accounts for it, what else moves,
 * possible explanations, what we cannot say, what you could test, technical.
 */
(function (global) {
  var BL = global.BL, S = BL.stats, D = BL.data, U = BL.ui, ch = BL.charts,
    P = BL.patterns, E = BL.explain, X = BL.experiments, A = BL.analysis;

  function scatterFor(p) {
    if (p.type !== 'relationship' || !p.points) return '';
    return U.panel('Every day plotted', p.sample.n + ' days',
      ch.chart({
        type: 'scatter', height: 320, fit: p.fit,
        points: p.points.map(function (q) {
          return {
            x: q.x, y: q.y, accent: q.day.dow === 5,
            tip: { value: p.metric.format(q.y), sub: p.other.label + ' ' + p.other.format(q.x) + ', ' + S.longDate(q.day.date) }
          };
        }),
        fmtX: p.other.format, fmtY: p.metric.format,
        xLabel: p.other.label, yLabel: p.metric.label,
        aria: p.other.label + ' plotted against ' + p.metric.label
      }) +
      '<div class="chart-legend"><span><i style="background:#0A4174"></i>Fridays</span>' +
      '<span><i style="background:#6EA2B3"></i>Other days</span>' +
      '<span><i class="dash"></i>Average slope</span></div>' +
      U.reading('One dot is one day. A slope means the two tend to move together.'));
  }

  function weeklyFor(p) {
    if (p.type !== 'time') return '';
    var m = p.metric;
    var rows = S.byDow(p.metricKey);
    var base = A.mean(A.values(p.metricKey));
    return U.panel('Which days are highest?', m.label,
      ch.chart({
        type: 'bars', height: 240, baseline: base, baselineLabel: 'your usual', fmtAxis: m.axis,
        aria: m.label + ' by day of the week',
        items: rows.map(function (r) {
          return {
            label: r.label, value: r.value,
            highlight: p.subject.dows.indexOf(r.dow) >= 0, muted: r.value < base,
            tip: { value: m.format(r.value), sub: r.full + ', averaged over ' + r.n + ' days' }
          };
        })
      }) +
      U.reading('The dark bars are the days this finding is about.'));
  }

  function render(state) {
    var p = P.byId(state.patternId);
    if (!p) {
      return U.empty('That finding is no longer listed',
        'It may have dropped below the evidence Baseline needs to report it.',
        '<a class="btn btn--ghost" href="#/patterns">Back to findings</a>');
    }
    var x = E.explain(p);
    var exp = X.forPattern(p.id) || X.proposalFor(p);

    var why = '';
    if (x.related || x.timing || x.alsoHappens) {
      why = '<section class="section">' +
        U.sectionHead('Why might this be happening', null, null,
          'Baseline looked at what else moves on the same days.') +
        '<div class="stack stack-5">' +
        (x.related ? U.panel('What accounts for the difference', null,
          '<p class="finding__sub">' + U.esc(x.related.lead) + '</p>' +
          U.compareChart({ rows: x.related.rows, caption: 'Difference per day, by category', aria: 'Categories that account for the difference' }, 560)
        ) : '') +
        (x.timing ? U.panel('When does it happen?', null,
          '<p class="finding__sub">' + U.esc(x.timing.lead) + '</p>' +
          U.compareChart({ rows: x.timing.rows, caption: 'Total spent in each part of the day', aria: 'Spending by time of day' }, 560)
        ) : '') +
        (x.alsoHappens ? U.panel('What else moves with it', null,
          '<p class="finding__sub">' + U.esc(x.alsoHappens.lead) + '</p>' +
          '<ul class="plainlist">' + x.alsoHappens.items.map(function (i) {
            return '<li>' + U.esc(i.sentence) + '</li>';
          }).join('') + '</ul>' +
          (x.possible.length
            ? '<div class="maybe"><span class="t-label">One possible explanation</span>' +
              '<p class="t-body" style="margin-top:8px">' + U.esc(x.possible[0]) + '</p></div>'
            : '')
        ) : '') +
        '</div></section>';
    }

    var test = '';
    if (exp) {
      test = '<section class="section">' +
        U.sectionHead('What you could test', null, null, 'Change one thing. Leave everything else alone.') +
        U.panel(null, null,
          '<h3 class="t-section" style="max-width:28ch">' + U.esc(exp.action) + '</h3>' +
          '<p class="finding__sub" style="margin-top:12px">' + U.esc(exp.question) + '</p>' +
          '<div class="stat-inline" style="margin-top:26px">' +
          '<div class="stat-inline__item"><span class="t-label">Measuring</span>' +
          '<span class="t-body">' + U.esc(exp.measureLabel) + '</span></div>' +
          '<div class="stat-inline__item"><span class="t-label">For</span>' +
          '<span class="t-body">' + exp.weeks + ' weeks</span></div>' +
          '<div class="stat-inline__item"><span class="t-label">Compared with</span>' +
          '<span class="t-body">' + U.esc(exp.scope || 'your usual days') + '</span></div>' +
          '</div>' +
          '<p style="margin-top:26px">' +
          (state.started[p.id]
            ? U.badge('Started today', 'live')
            : '<button class="btn" type="button" data-start="' + p.id + '">Try this</button>') +
          '</p>') +
        '</section>';
    }

    return '' +
      '<a class="btn--quiet backlink" href="#/patterns">Back to findings</a>' +
      '<header class="page-head">' +
      '<h1 class="t-page">' + U.esc(x.finding) + '</h1>' +
      '<p class="page-head__lead">' + U.esc(x.subtitle) + '</p>' +
      '<div class="page-head__visual">' + U.compareChart(x.compare) + '</div>' +
      '<div class="stat-inline">' +
      '<div class="stat-inline__item"><span class="t-label">How often</span>' +
      '<span class="t-body">' + U.esc(x.howOften) + '</span></div>' +
      '<div class="stat-inline__item"><span class="t-label">Difference</span>' +
      '<span class="t-body">' + U.esc(S.unsign(p.metric.delta(p.effect.diff))) + '</span></div>' +
      '<div class="stat-inline__item"><span class="t-label">Evidence</span>' +
      '<span class="t-body">' + U.evidenceTag(p.evidence.grade) + '</span></div>' +
      '</div>' +
      '</header>' +

      '<section class="section">' +
      U.sectionHead('The record behind it', null, null, 'The days this was worked out from.') +
      (weeklyFor(p) || scatterFor(p) || U.panel(null, null, U.compareChart(x.compare, 560))) +
      '</section>' +

      why +

      '<section class="section">' +
      U.sectionHead('What Baseline cannot tell you', null, null, 'Where the record runs out.') +
      U.panel(null, null,
        '<p class="t-body measure">' + U.esc(x.unknown) + '</p>' +
        (p.robustness.outlierDriven
          ? '<p class="t-small" style="margin-top:14px">Baseline has lowered its confidence in this finding for that reason.</p>'
          : '') +
        U.disclosure('Show the technical evidence',
          U.datarows(x.technical) +
          '<p class="t-fine" style="margin-top:14px">Baseline looked at ' + P.stats().considered +
          ' possible findings in your record and reported ' + P.stats().qualified + '.</p>')) +
      '</section>' +

      test;
  }

  BL.views = BL.views || {};
  BL.views.pattern = { title: 'Pattern', render: render };
})(typeof window !== 'undefined' ? window : globalThis);
