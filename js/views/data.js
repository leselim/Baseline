/* Baseline: Data */
(function (global) {
  var BL = global.BL, S = BL.stats, D = BL.data, U = BL.ui, ch = BL.charts;

  var SOURCES = [
    { name: 'Phone', detail: 'Screen time and evening activity', sync: '06:12 today', coverage: 1.0, records: D.days.length * 2, status: 'connected' },
    { name: 'Sleep tracker', detail: 'Onset, duration and wake time', sync: '06:04 today', coverage: 0.97, records: D.days.length, status: 'connected' },
    { name: 'Bank account', detail: 'Card and transfer transactions, categorised', sync: 'Yesterday, 23:40', coverage: 1.0, records: D.days.length * 4, status: 'connected' },
    { name: 'Calendar', detail: 'Commitment times and working hours', sync: '06:12 today', coverage: 0.88, records: D.days.filter(function (d) { return !d.weekend; }).length, status: 'connected' },
    { name: 'Step count', detail: 'Daily movement and exercise sessions', sync: '05:58 today', coverage: 0.99, records: D.days.length, status: 'connected' },
    { name: 'Location', detail: 'Time at home, work and elsewhere', sync: null, coverage: 0, records: 0, status: 'available' }
  ];

  function sourceRow(s) {
    return '<div class="source">' +
      '<div><div class="source__name">' + U.esc(s.name) + '</div><div class="source__meta">' + U.esc(s.detail) + '</div></div>' +
      '<div class="source__sync t-small">' + (s.sync ? U.esc(s.sync) : '<span class="fine">Not connected</span>') + '</div>' +
      '<div class="source__coverage">' + (s.status === 'connected'
        ? '<div class="coverage"><span style="width:' + Math.round(s.coverage * 100) + '%"></span></div>' +
        '<div class="t-fine" style="margin-top:6px">' + Math.round(s.coverage * 100) + '% of days</div>'
        : '') + '</div>' +
      '<div style="text-align:right">' + (s.status === 'connected'
        ? '<span class="t-small num">' + S.num(s.records) + '</span>'
        : '<button class="btn btn--ghost" type="button">Connect</button>') + '</div>' +
      '</div>';
  }

  function render() {
    var totalRecords = SOURCES.reduce(function (a, s) { return a + s.records; }, 0);
    var months = [];
    var lastCol = -99;
    D.days.forEach(function (d, i) {
      if (i % 7 === 0) {
        var col = i / 7;
        var label = d.date.toLocaleDateString('en-ZA', { month: 'short' });
        if (!months.length || (months[months.length - 1].label !== label && col - lastCol >= 2)) {
          months.push({ col: col, label: label });
          lastCol = col;
        }
      }
    });

    return '' +
      '<header class="page-head">' +
      '<h1 class="t-page">Data</h1>' +
      '<p class="page-head__lead">Everything the platform knows comes from these sources. Nothing is inferred from anyone else\'s data, and nothing leaves your account.</p>' +
      '</header>' +

      '<section class="section">' +
      U.sectionHead('Sources', totalRecords.toLocaleString('en-ZA') + ' records across ' + D.days.length + ' days') +
      U.panel(null, null, SOURCES.map(sourceRow).join(''),
        '<p class="t-fine">Connecting location would let the platform separate time at home from time elsewhere, which currently limits two patterns.</p>') +
      '</section>' +

      '<section class="section">' +
      U.sectionHead('Coverage', S.dateLabel(D.first.date, { day: 'numeric', month: 'long' }) + ' to ' + S.dateLabel(D.latest.date, { day: 'numeric', month: 'long', year: 'numeric' })) +
      U.panel(null, null,
        ch.chart({
          type: 'heatmap', height: 150, days: D.days, months: months,
          value: function (d) { return d.screenMin ? 1 : null; },
          tip: function (d) { return '<b>Complete</b><br><span>' + S.longDate(d.date) + ' · 5 sources</span>'; },
          aria: 'Data coverage by day'
        }) +
        '<p class="chart-note">Complete days across the full record. Gaps reduce confidence rather than removing a pattern.</p>') +
      '</section>' +

      '<section class="section">' +
      U.sectionHead('Your record') +
      '<div class="grid-3">' +
      U.panel(null, null, '<div class="t-label">Days recorded</div><div class="t-data-xl" style="margin-top:10px">' + D.days.length + '</div><p class="t-fine" style="margin-top:8px">Since ' + D.user.since + '</p>') +
      U.panel(null, null, '<div class="t-label">Baseline window</div><div class="t-data-xl" style="margin-top:10px">90</div><p class="t-fine" style="margin-top:8px">Days used to define what is normal for you</p>') +
      U.panel(null, null, '<div class="t-label">Patterns tracked</div><div class="t-data-xl" style="margin-top:10px">' + S.insights().length + '</div><p class="t-fine" style="margin-top:8px">Above the minimum sample size</p>') +
      '</div></section>' +

      '<section class="section">' +
      U.sectionHead('Export') +
      U.panel(null, null,
        '<p class="t-body measure">Take everything with you: daily records, categorised transactions, detected patterns and experiment results, as CSV or JSON.</p>' +
        '<div class="row" style="margin-top:18px"><button class="btn btn--ghost" type="button">Export CSV</button>' +
        '<button class="btn btn--ghost" type="button">Export JSON</button></div>') +
      '</section>';
  }

  BL.views = BL.views || {};
  BL.views.data = { title: 'Data', render: render };
})(typeof window !== 'undefined' ? window : globalThis);
