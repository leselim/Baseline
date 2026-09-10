/* Baseline. Findings, and a place to compare any two measures. */
(function (global) {
  var BL = global.BL, S = BL.stats, D = BL.data, U = BL.ui, ch = BL.charts,
    P = BL.patterns, E = BL.explain;

  function selector(name, active, legend) {
    return '<label class="field-inline"><span class="sr-only">' + legend + '</span>' +
      '<select class="select" data-var="' + name + '">' +
      S.variables.map(function (v) {
        return '<option value="' + v.key + '"' + (v.key === active ? ' selected' : '') + '>' + U.esc(v.label) + '</option>';
      }).join('') + '</select></label>';
  }

  function explorer(state) {
    var rel = S.relationship(state.pair.x, state.pair.y);
    var weak = rel.grade === 'thin';
    var answer = weak
      ? 'These two do not seem to move together.'
      : 'Days with more ' + rel.x.short + ' usually have ' +
        (rel.r > 0 ? 'more ' : 'less ') + rel.y.short + '.';

    return U.panel(null, null,
      '<h3 class="t-section" style="max-width:30ch">' + U.esc(answer) + '</h3>' +
      U.compareChart({
        base: rel.y.zeroAt, caption: 'Averages across ' + rel.n + ' days',
        aria: rel.y.label + ' on your highest and lowest days for ' + rel.x.label,
        rows: [
          { label: 'Most ' + rel.x.short, value: rel.highMean, display: rel.y.format(rel.highMean), accent: true },
          { label: 'Least ' + rel.x.short, value: rel.lowMean, display: rel.y.format(rel.lowMean) }
        ]
      }, 560) +
      '<p class="finding__sub" style="margin-top:20px">' +
      (weak
        ? 'Across ' + rel.n + ' days there is no clear link. That is a useful answer too.'
        : 'The gap between your highest and lowest days is ' +
          U.esc(S.unsign(rel.y.format(Math.abs(rel.highMean - rel.lowMean)))) + '.') + '</p>' +
      '<p class="finding__often">Seen across ' + rel.n + ' days.</p>' +
      U.disclosure('Show the evidence', U.datarows([
        { html: U.term('correlation', 'How closely they move'), value: (rel.r > 0 ? '+' : S.minus) + Math.abs(rel.r).toFixed(2) },
        { html: U.term('sample', 'Days used'), value: String(rel.n) },
        { label: 'Highest quarter of days', value: rel.y.format(rel.highMean) },
        { label: 'Lowest quarter of days', value: rel.y.format(rel.lowMean) }
      ]) + '<p class="t-fine" style="margin-top:14px">These two ' + U.term('together') +
        '. Baseline cannot tell from this whether one leads to the other.</p>') +
      '<p class="finding__actions">' + U.evidenceTag(rel.grade) + '</p>');
  }

  function detail(state) {
    var rel = S.relationship(state.pair.x, state.pair.y);
    return U.panel('Every day plotted', rel.n + ' days',
      ch.chart({
        type: 'scatter', height: 320, fit: rel.fit,
        points: rel.points.map(function (p) {
          return {
            x: p.x, y: p.y, accent: p.day.dow === 5,
            tip: { value: rel.y.format(p.y), sub: rel.x.label + ' ' + rel.x.format(p.x) + ', ' + S.longDate(p.day.date) }
          };
        }),
        fmtX: rel.x.format, fmtY: rel.y.format,
        xLabel: rel.x.label, yLabel: rel.y.label,
        aria: rel.x.label + ' plotted against ' + rel.y.label
      }) +
      '<div class="chart-legend"><span><i style="background:#0A4174"></i>Fridays</span>' +
      '<span><i style="background:#6EA2B3"></i>Other days</span>' +
      '<span><i class="dash"></i>Average slope</span></div>' +
      U.reading('One dot is one day. A slope means the two tend to move together.'));
  }

  function render(state) {
    var found = P.all().filter(function (p) { return p.evidence.grade !== 'thin'; });
    var st = P.stats();

    return '' +
      '<header class="page-head">' +
      '<h1 class="t-page">Findings</h1>' +
      '<p class="page-head__lead">What tends to happen in your own record.</p>' +
      '</header>' +

      '<section class="section">' +
      U.sectionHead('Everything Baseline reports', found.length + ' findings', null,
        'Baseline looked at ' + st.considered + ' possible findings and kept ' + st.qualified +
        '. The rest were too small, too rare, or driven by one unusual day.') +
      '<div class="stack stack-5">' + found.slice(0, 8).map(function (p) {
        return U.findingCard(E.explain(p), { compact: true });
      }).join('') + '</div>' +
      '</section>' +

      '<section class="section">' +
      U.sectionHead('Compare any two things', null,
        selector('x', state.pair.x, 'First thing') + '<span class="t-small">and</span>' +
        selector('y', state.pair.y, 'Second thing'),
        'Pick any two. Baseline lines up every day it has both.') +
      '<div class="stack stack-5">' + explorer(state) + detail(state) + '</div>' +
      '</section>';
  }

  BL.views = BL.views || {};
  BL.views.patterns = { title: 'Findings', render: render };
})(typeof window !== 'undefined' ? window : globalThis);
