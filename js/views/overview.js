/* Baseline: Overview */
(function (global) {
  var BL = global.BL, S = BL.stats, D = BL.data, U = BL.ui, ch = BL.charts;

  function greeting() {
    var h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  }

  /* The lead paragraph is assembled from the same numbers shown below it. */
  function lead(win) {
    var sleep = S.summary('sleep', win), spend = S.summary('spend', win), screen = S.summary('screen', win);
    var ins = S.insights();
    var parts = [];

    if (Math.abs(sleep.diff) < 6) {
      parts.push('Sleep held steady at <strong>' + S.dur(sleep.value) + '</strong> a night');
    } else {
      parts.push('Sleep ' + (sleep.diff > 0 ? 'rose' : 'fell') + ' <strong>' + S.unsign(S.durShort(sleep.diff)) +
        '</strong> to ' + S.dur(sleep.value) + ' a night');
    }
    parts.push('and screen time ' + (screen.diff <= 0 ? 'came down to ' : 'rose to ') + S.dur(screen.value) + '.');

    var second = 'Spending averaged <strong>' + S.money(spend.value) + '</strong> a day, ' +
      (Math.abs(spend.pct) < 3 ? 'in line with the previous ' + win + ' days' : (spend.pct > 0 ? 'up ' : 'down ') + Math.abs(Math.round(spend.pct)) + '% on the previous ' + win + ' days') +
      ', and Fridays remain the heaviest day of your week.';

    var third = ins[1].kicker + ' is still the clearest thing to work on: Mondays run ' +
      S.unsign(S.durShort(ins[1].values.monAvg - ins[1].values.weekAvg)) + ' short of your own average.';

    return parts.join(' ') + ' ' + second + ' ' + third;
  }

  function rangeLabel(win) {
    var days = D.last(win);
    return S.dateLabel(days[0].date) + ' to ' + S.dateLabel(days[days.length - 1].date, { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function trendPanel(state) {
    var m = S.metrics[state.metric];
    var days = D.last(state.range);
    var values = days.map(m.get);
    var baseline = S.mean(D.days.map(m.get));
    return U.panel(m.label + ' over time', rangeLabel(state.range),
      ch.chart({
        type: 'line', height: 232, values: values,
        labels: days.map(function (d) { return S.dateLabel(d.date); }),
        baseline: baseline,
        baselineLabel: 'your baseline · ' + m.format(baseline),
        fmtAxis: m.axis,
        aria: m.label + ' for the last ' + state.range + ' days',
        tip: function (i) {
          return '<b>' + m.format(values[i]) + '</b><br><span>' + S.longDate(days[i].date) + '</span>';
        }
      }) +
      '<p class="chart-note">The dashed line is your own average across all ' + D.days.length + ' recorded days, not a general recommendation.</p>'
    );
  }

  function rhythmPanel(state) {
    var m = S.metrics[state.metric];
    var rows = S.byDow(state.metric);
    var avg = S.mean(D.days.map(m.get));
    var peak = rows.reduce(function (a, b) { return b.value > a.value ? b : a; });
    var items = rows.map(function (r) {
      return {
        label: r.label, value: r.value,
        highlight: r.label === peak.label,
        muted: r.value < avg,
        tip: '<b>' + m.format(r.value) + '</b><br><span>' + r.label + ' average · ' + r.n + ' days</span>'
      };
    });
    return U.panel('By day of week', m.label,
      ch.chart({ type: 'bars', height: 232, items: items, baseline: avg, baselineLabel: 'your average', fmtAxis: m.axis, aria: m.label + ' by day of week' }) +
      '<p class="chart-note">' + peak.label + ' is your highest ' + m.label.toLowerCase() + ' day, ' +
      (m.key === 'spend' ? S.money(peak.value - avg) : S.unsign(S.durShort(peak.value - avg))) +
      ' above your average.</p>'
    );
  }

  function experimentStrip() {
    var running = S.experiments.filter(function (e) { return e.status === 'running'; })[0];
    if (!running) return '';
    return U.panel('Currently testing', null,
      '<div class="row-between wrap" style="gap:24px">' +
      '<div class="grow"><div class="t-sub">' + U.esc(running.title) + '</div>' +
      '<p class="t-small" style="margin-top:6px">Week ' + running.elapsed + ' of ' + running.duration +
      ' · measuring ' + U.esc(running.measure) + ' · interim change ' + S.durShort(running.interim) + '</p>' +
      '<div class="progress" style="margin-top:14px;max-width:420px"><span style="width:' +
      Math.round((running.elapsed / running.duration) * 100) + '%"></span></div></div>' +
      '<a class="btn btn--ghost" href="#/experiments">Open experiments</a>' +
      '</div>'
    );
  }

  function render(state) {
    var ins = S.insights().slice(0, 3);
    return '' +
      '<header class="page-head">' +
      '<h1 class="t-page">' + greeting() + ', ' + D.user.name + '</h1>' +
      '<p class="page-head__lead">' + lead(state.range) + '</p>' +
      '</header>' +

      '<section class="section">' +
      U.sectionHead('Last ' + state.range + ' days', rangeLabel(state.range),
        U.segment('range', [{ value: 7, label: '7 days' }, { value: 30, label: '30 days' }, { value: 90, label: '90 days' }], state.range)) +
      U.metricRow(state.metric, state.range) +
      '<div class="grid-2" style="margin-top:20px">' + trendPanel(state) + rhythmPanel(state) + '</div>' +
      '</section>' +

      '<section class="section">' +
      U.sectionHead('Notable patterns', 'Ranked by strength and sample size',
        '<a class="btn--quiet" href="#/patterns">Explore all patterns</a>') +
      '<div class="stack stack-4">' + ins.map(function (i, n) { return U.insightBlock(i, n); }).join('') + '</div>' +
      '</section>' +

      '<section class="section">' + experimentStrip() + '</section>';
  }

  BL.views = BL.views || {};
  BL.views.overview = { title: 'Overview', render: render };
})(typeof window !== 'undefined' ? window : globalThis);
