/* Baseline. Experiments. Question, change, measure, compare, result. */
(function (global) {
  var BL = global.BL, S = BL.stats, D = BL.data, U = BL.ui, X = BL.experiments, P = BL.patterns, E = BL.explain;

  function fact(label, value) {
    return '<div class="stat-inline__item"><span class="t-label">' + U.esc(label) + '</span>' +
      '<span class="t-body">' + U.esc(value) + '</span></div>';
  }

  function head(e, badge) {
    return '<h3 class="t-section" style="max-width:28ch">' + U.esc(e.action) + '</h3>' +
      '<p class="finding__sub" style="margin-top:12px">' + U.esc(e.question) + '</p>' +
      (badge ? '<p style="margin-top:14px">' + badge + '</p>' : '');
  }

  function running(e) {
    var pct = Math.round((e.elapsed / e.weeks) * 100);
    return '<article class="exp">' + '<div class="exp__body">' +
      head(e, U.badge('Week ' + e.elapsed + ' of ' + e.weeks, 'live')) +
      '<div class="progress" style="margin-top:20px;max-width:460px" role="img" aria-label="Week ' +
      e.elapsed + ' of ' + e.weeks + '"><span style="width:' + pct + '%"></span></div>' +
      '<div class="stat-inline" style="margin-top:26px">' +
      fact('Because', e.why) + fact('Measuring', e.measureLabel) + fact('On', e.scope) +
      '</div>' +
      (e.interim.tooEarly
        ? '<p class="finding__often" style="margin-top:22px">Too early to say. The days so far do not separate from your usual.</p>'
        : '<div style="margin-top:22px;max-width:520px">' + U.compareChart({
          base: e.measure.zeroAt, caption: 'So far, against the weeks before',
          aria: 'Part way result',
          rows: [
            { label: 'Before', value: e.interim.before, display: e.measure.format(e.interim.before) },
            { label: 'So far', value: e.interim.after, display: e.measure.format(e.interim.after), accent: true }
          ]
        }) + '</div>') +
      '<p class="t-fine" style="margin-top:20px">A part way figure can still swing. It counts when all ' +
      e.weeks + ' weeks are in.</p>' +
      '<p style="margin-top:18px"><a class="btn--quiet" href="#/pattern/' + e.patternId + '">See the finding behind this</a></p>' +
      '</div></article>';
  }

  function completed(e) {
    var r = e.result;
    return '<article class="exp">' + '<div class="exp__body">' +
      head(e, U.badge('Finished ' + e.ranTo, 'done')) +
      '<div style="margin-top:24px;max-width:540px">' + U.compareChart({
        base: e.measure.zeroAt, caption: e.measureLabel + ' on ' + e.scope,
        aria: 'Before and after the experiment',
        rows: [
          { label: 'Your usual', value: r.before, display: e.measure.format(r.before) },
          { label: 'During the test', value: r.after, display: e.measure.format(r.after), accent: true }
        ]
      }) + '</div>' +
      '<p class="finding__sub" style="margin-top:22px">Your ' + U.esc(e.measureLabel.toLowerCase()) +
      ' was ' + U.esc(e.measure.format(Math.abs(r.diff))) + ' ' + r.direction + ' during the test.</p>' +
      '<p class="finding__often">Measured over ' + r.nTrial + ' ' + U.esc(e.scope.toLowerCase()) +
      ', against your other ' + r.nControl + '.</p>' +
      U.disclosure('Show the evidence', U.datarows([
        { label: 'Your usual', value: e.measure.format(r.before) },
        { label: 'During the test', value: e.measure.format(r.after) },
        { label: 'Difference', value: S.unsign(e.measure.delta(r.diff)) + ' (' + S.pct(r.relative * 100) + ')' },
        { html: U.term('sample', 'Days used'), value: r.nTrial + ' tested, ' + r.nControl + ' compared' },
        { label: 'Ran', value: e.ranFrom + ' to ' + e.ranTo }
      ]) +
        '<p class="t-fine" style="margin-top:14px">' + U.esc(e.limitations.join(' ')) + '</p>') +
      '<p style="margin-top:20px"><a class="btn--quiet" href="#/pattern/' + e.patternId + '">See the finding behind this</a></p>' +
      '</div></article>';
  }

  function suggested(e, started) {
    return '<article class="exp">' + '<div class="exp__body">' +
      head(e) +
      '<div class="stat-inline" style="margin-top:24px">' +
      fact('Because', e.why) + fact('Measuring', e.measureLabel) + fact('For', e.weeks + ' weeks') +
      '</div>' +
      '<p style="margin-top:26px">' +
      (started ? U.badge('Started today', 'live')
        : '<button class="btn" type="button" data-start="' + e.patternId + '">Try this</button>') +
      ' <a class="btn--quiet" style="margin-left:14px" href="#/pattern/' + e.patternId + '">See the finding</a></p>' +
      '</div></article>';
  }

  function render(state) {
    var live = X.byStatus('running');
    var done = X.byStatus('complete');
    var ideas = X.byStatus('suggested');
    var startedIds = Object.keys(state.started);

    return '' +
      '<header class="page-head">' +
      '<h1 class="t-page">Experiments</h1>' +
      '<p class="page-head__lead">Change one thing for a few weeks. Then see what moved.</p>' +
      '</header>' +

      '<section class="section">' +
      U.sectionHead('Finished', null, null, 'What happened when you tried it.') +
      (done.length ? '<div class="stack stack-5">' + done.map(completed).join('') + '</div>'
        : U.empty('Nothing finished yet', 'Results appear here once a test has run its full length.')) +
      '</section>' +

      '<section class="section">' +
      U.sectionHead('Running now', null, null, 'Leave these until the end date.') +
      (live.length + startedIds.length
        ? '<div class="stack stack-5">' + live.map(running).join('') +
          startedIds.map(function (id) {
            var p = P.byId(id);
            var e = p && X.proposalFor(p);
            return e ? suggested(e, true) : '';
          }).join('') + '</div>'
        : U.empty('Nothing running', 'Start one from a finding and it will appear here.')) +
      '</section>' +

      '<section class="section">' +
      U.sectionHead('Things you could try', null, null, 'Drawn from the findings with the most days behind them.') +
      (ideas.length
        ? '<div class="stack stack-5">' + ideas.map(function (e) { return suggested(e, !!state.started[e.patternId]); }).join('') + '</div>'
        : U.empty('Nothing waiting', 'Every finding worth testing is already being tested.')) +
      '</section>';
  }

  BL.views = BL.views || {};
  BL.views.experiments = { title: 'Experiments', render: render };
})(typeof window !== 'undefined' ? window : globalThis);
