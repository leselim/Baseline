/* Baseline: Experiments */
(function (global) {
  var BL = global.BL, S = BL.stats, D = BL.data, U = BL.ui, ch = BL.charts;

  function running(e) {
    var pct = Math.round((e.elapsed / e.duration) * 100);
    return '<article class="exp">' +
      '<header class="exp__head"><div class="row-between wrap">' +
      '<div><div class="t-sub">' + U.esc(e.title) + '</div>' +
      '<p class="t-small" style="margin-top:6px;max-width:56ch">' + U.esc(e.premise) + '</p></div>' +
      U.badge('Week ' + e.elapsed + ' of ' + e.duration, 'live') +
      '</div></header>' +
      '<div class="exp__body">' +
      '<div class="progress" style="margin-bottom:20px"><span style="width:' + pct + '%"></span></div>' +
      '<div class="grid-3">' +
      '<div><div class="t-label">Measuring</div><div class="t-body" style="margin-top:6px">' + U.esc(e.measure) + '</div></div>' +
      '<div><div class="t-label">Change so far</div><div class="t-data-m" style="margin-top:6px">' + S.durShort(e.interim) + '</div></div>' +
      '<div><div class="t-label">Expected</div><div class="t-body" style="margin-top:6px">' + U.esc(e.expected) + '</div></div>' +
      '</div></div>' +
      '<footer class="exp__foot"><span class="t-fine">Interim results are provisional until the full ' + e.duration + ' weeks are recorded.</span>' +
      '<a class="btn--quiet" href="#/insight/' + e.insight + '">View the pattern behind this</a></footer>' +
      '</article>';
  }

  function completed(e) {
    var ins = S.insight(e.insight);
    return '<article class="exp">' +
      '<header class="exp__head"><div class="row-between wrap">' +
      '<div><div class="t-sub">' + U.esc(e.title) + '</div>' +
      '<p class="t-small" style="margin-top:6px;max-width:56ch">' + U.esc(e.premise) + '</p></div>' +
      U.badge('Completed ' + e.finished, 'done') +
      '</div></header>' +
      '<div class="exp__body"><div class="grid-3">' +
      '<div><div class="t-label">' + U.esc(e.resultLabel) + '</div><div class="t-data-xl" style="margin-top:8px">' + S.durShort(e.result) + '</div></div>' +
      '<div><div class="t-label">Measured against</div><div class="t-body" style="margin-top:6px">Your ' + D.days.length + '-day baseline</div></div>' +
      '<div><div class="t-label">Ran for</div><div class="t-body" style="margin-top:6px">' + e.duration + ' weeks</div></div>' +
      '</div></div>' +
      '<footer class="exp__foot"><span class="t-fine">The change held for the final two weeks of the test.</span>' +
      (ins ? '<a class="btn--quiet" href="#/insight/' + e.insight + '">View the pattern behind this</a>' : '') + '</footer>' +
      '</article>';
  }

  function proposed(ins, started) {
    return '<article class="exp">' +
      '<header class="exp__head">' +
      '<div class="insight__kicker">' + U.esc(ins.kicker) + '</div>' +
      '<div class="t-sub" style="margin-top:10px">' + U.esc(ins.experiment.title) + '</div>' +
      '<p class="t-small" style="margin-top:6px;max-width:56ch">' + U.esc(ins.statement) + '</p>' +
      '</header>' +
      '<div class="exp__body">' + U.datarows([
        { label: 'Duration', value: ins.experiment.duration },
        { label: 'Measure', value: ins.experiment.measure },
        { label: 'Expected outcome', value: ins.experiment.expected },
        { label: 'Evidence', value: ins.occurrence }
      ]) + '</div>' +
      '<footer class="exp__foot">' + U.confidence(ins.confidence) +
      (started ? U.badge('Running since today', 'live') : '<button class="btn" data-start="' + ins.id + '">Start experiment</button>') +
      '</footer></article>';
  }

  function render(state) {
    var live = S.experiments.filter(function (e) { return e.status === 'running'; });
    var done = S.experiments.filter(function (e) { return e.status === 'complete'; });
    var startedIds = Object.keys(state.started);
    var openIns = S.insights().filter(function (i) {
      return !S.experiments.some(function (e) { return e.insight === i.id; });
    });

    return '' +
      '<header class="page-head">' +
      '<h1 class="t-page">Experiments</h1>' +
      '<p class="page-head__lead">Change one variable, hold everything else, and compare the result with your own baseline. Three weeks is usually enough to see whether anything moved.</p>' +
      '</header>' +

      '<section class="section">' +
      U.sectionHead('Running', live.length + startedIds.length + ' active') +
      '<div class="stack stack-4">' + live.map(running).join('') +
      startedIds.map(function (id) { return proposed(S.insight(id), true); }).join('') + '</div>' +
      '</section>' +

      '<section class="section">' +
      U.sectionHead('Proposed', 'Drawn from patterns with enough evidence to test') +
      (openIns.filter(function (i) { return !state.started[i.id]; }).length
        ? '<div class="grid-2">' + openIns.filter(function (i) { return !state.started[i.id]; }).map(function (i) { return proposed(i, false); }).join('') + '</div>'
        : U.empty('Nothing waiting', 'Every pattern with enough evidence is already being tested. New proposals appear as patterns strengthen.')) +
      '</section>' +

      '<section class="section">' +
      U.sectionHead('Completed', done.length + ' finished') +
      '<div class="stack stack-4">' + done.map(completed).join('') + '</div>' +
      '</section>';
  }

  BL.views = BL.views || {};
  BL.views.experiments = { title: 'Experiments', render: render };
})(typeof window !== 'undefined' ? window : globalThis);
