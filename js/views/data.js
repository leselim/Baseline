/* Baseline. Data. What is connected and what each source contributes. */
(function (global) {
  var BL = global.BL, S = BL.stats, D = BL.data, U = BL.ui, ch = BL.charts;

  function sourceCard(s) {
    var connected = s.state === 'connected';
    var stateLabel = connected ? 'Connected' : s.state === 'available' ? 'Not connected' : 'Coming later';
    return '<article class="source">' +
      '<div class="source__head">' +
      '<h3 class="t-sub">' + U.esc(s.name) + '</h3>' +
      U.badge(stateLabel, connected ? 'live' : 'done') +
      '</div>' +
      '<div class="source__grid">' +
      '<div><span class="t-label">Baseline reads</span>' +
      '<ul class="plainlist plainlist--tight">' + s.reads.map(function (r) {
        return '<li>' + U.esc(r) + '</li>';
      }).join('') + '</ul></div>' +
      '<div><span class="t-label">Used for</span>' +
      '<ul class="plainlist plainlist--tight">' + s.contributes.map(function (r) {
        return '<li>' + U.esc(r) + '</li>';
      }).join('') + '</ul></div>' +
      '<div><span class="t-label">History</span>' +
      '<p class="t-body">' + (connected ? U.esc(s.from + ' to ' + s.to) : 'None yet') + '</p>' +
      (connected ? '<p class="t-fine">' + s.days + ' days, ' + S.num(s.events) + ' records</p>' : '') +
      '</div>' +
      '<div><span class="t-label">Last update</span>' +
      '<p class="t-body num">' + (connected ? U.esc(s.sync) : 'Never') + '</p>' +
      (connected ? '' : '<p style="margin-top:12px"><button class="btn btn--ghost" type="button">Connect</button></p>') +
      '</div>' +
      '</div></article>';
  }

  function render() {
    var sources = S.sources();
    var connected = sources.filter(function (s) { return s.state === 'connected'; });
    var full = D.days.filter(function (d) { return d.sources === D.connectedSources; }).length;

    return '' +
      '<header class="page-head">' +
      '<h1 class="t-page">Your data</h1>' +
      '<p class="page-head__lead">Where the findings come from. Your record belongs to you and stays in your account.</p>' +
      '<div class="stat-inline">' +
      '<div class="stat-inline__item"><span class="t-label">Connected</span>' +
      '<span class="t-data-m">' + connected.length + '</span><span class="t-fine">of ' + sources.length + ' sources</span></div>' +
      '<div class="stat-inline__item"><span class="t-label">Days of history</span>' +
      '<span class="t-data-m">' + D.days.length + '</span><span class="t-fine">since ' + D.user.since + '</span></div>' +
      '<div class="stat-inline__item"><span class="t-label">Records held</span>' +
      '<span class="t-data-m">' + S.num(D.events.length) + '</span><span class="t-fine">across every source</span></div>' +
      '</div>' +
      '</header>' +

      '<section class="section">' +
      U.sectionHead('Sources', null, null,
        'Each source is an account you chose to connect. You can disconnect any of them at any time.') +
      '<div class="stack stack-5">' + sources.map(sourceCard).join('') + '</div>' +
      '</section>' +

      '<section class="section">' +
      U.sectionHead('How complete your record is', null, null,
        'One square per day. Darker means more sources had something to record.') +
      U.panel(null, null,
        ch.chart({
          type: 'heatmap', height: 176, days: D.days, className: 'chart--fit',
          value: function (d) { return d.sources; },
          monthLabel: function (d) { return d.toLocaleDateString('en-ZA', { month: 'short' }); },
          legendLabel: function (v) { return v + ' of ' + D.connectedSources; },
          tip: function (d) {
            return { value: d.sources + ' of ' + D.connectedSources + ' sources', sub: S.longDate(d.date) };
          },
          aria: 'Number of sources recording on each day'
        }) +
        '<div class="stat-inline" style="margin-top:26px">' +
        '<div class="stat-inline__item"><span class="t-label">Days with every source</span>' +
        '<span class="t-data-m">' + full + '</span></div>' +
        '<div class="stat-inline__item"><span class="t-label">Days with four</span>' +
        '<span class="t-data-m">' + (D.days.length - full) + '</span></div>' +
        '<div class="stat-inline__item"><span class="t-label">Days with none</span>' +
        '<span class="t-data-m">0</span></div>' +
        '</div>' +
        U.reading('The lighter band along the bottom is the weekend, when your calendar has nothing to record. ' +
          'A gap never removes a finding. It only lowers the ' + U.term('evidence') + ' behind it.')) +
      '</section>' +

      '<section class="section">' +
      U.sectionHead('Export', null, null, 'Your record is yours.') +
      U.panel(null, null,
        '<p class="t-body measure">Take a copy of every record, finding and experiment as CSV or JSON.</p>' +
        '<p class="row wrap" style="margin-top:20px"><button class="btn btn--ghost" type="button">Export CSV</button>' +
        '<button class="btn btn--ghost" type="button">Export JSON</button></p>') +
      '</section>';
  }

  BL.views = BL.views || {};
  BL.views.data = { title: 'Your data', render: render };
})(typeof window !== 'undefined' ? window : globalThis);
