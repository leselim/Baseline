/* Baseline: Timeline */
(function (global) {
  var BL = global.BL, S = BL.stats, D = BL.data, U = BL.ui, ch = BL.charts;

  var FILTERS = [
    { value: 'all', label: 'Everything' },
    { value: 'sleep', label: 'Sleep' },
    { value: 'work', label: 'Work' },
    { value: 'move', label: 'Movement' },
    { value: 'phone', label: 'Phone' },
    { value: 'spend', label: 'Spending' }
  ];

  function picker(days, activeIso) {
    return '<div class="daypicker">' + days.map(function (d) {
      return '<button type="button" data-day="' + d.iso + '" aria-pressed="' + (d.iso === activeIso) + '">' +
        '<span class="daypicker__dow">' + d.dowLabel + '</span>' +
        '<span class="daypicker__date num">' + d.date.getDate() + '</span></button>';
    }).join('') + '</div>';
  }

  function render(state) {
    var day = D.byIso[state.day] || D.latest;
    var events = S.timeline(day);
    var shown = state.filter === 'all' ? events : events.filter(function (e) { return e.kind === state.filter; });

    var spans = [];
    spans.push({ from: 0, to: day.wakeMin, color: '#001D39', tip: '<b>Asleep</b><br><span>until ' + S.clock(day.wakeMin) + '</span>' });
    if (day.workStartMin) spans.push({ from: day.workStartMin, to: day.workEndMin, color: '#6EA2B3', tip: '<b>At work</b><br><span>' + S.dur(day.workMin) + '</span>' });
    spans.push({ from: Math.min(1440, day.onsetClock), to: 1440, color: '#001D39', tip: '<b>Asleep</b><br><span>from ' + S.clock(day.onsetClock) + '</span>' });

    var body = shown.length
      ? '<div class="timeline">' + shown.map(function (e) {
        return '<div class="tl-item tl-item--' + e.kind + '">' +
          '<span class="tl-item__time num">' + S.clock(e.min) + '</span>' +
          '<span class="tl-item__mark"></span>' +
          '<div class="tl-item__label">' + U.esc(e.label) + '</div>' +
          (e.note ? '<div class="tl-item__note">' + U.esc(e.note) + '</div>' : '') +
          '</div>';
      }).join('') + '</div>'
      : U.empty('Nothing in this category', 'No ' + state.filter + ' events were recorded on ' + S.longDate(day.date) + '.');

    var side = U.panel('That day in numbers', null, U.datarows([
      { label: 'Sleep', value: S.dur(day.sleepMin) },
      { label: 'Sleep onset', value: S.clock(day.onsetClock) },
      { label: 'Wake', value: S.clock(day.wakeMin) },
      { label: 'Screen time', value: S.dur(day.screenMin) },
      { label: 'Steps', value: S.num(day.steps) },
      { label: 'Spending', value: S.money(day.spendTotal) },
      { label: 'Largest category', value: largest(day) }
    ]), '<p class="t-fine">Compared with your ' + day.dowLabel + ' average: sleep ' +
      S.durShort(day.sleepMin - S.byDow('sleep').filter(function (r) { return r.dow === day.dow; })[0].value) +
      ', spending ' + (function () {
        var avg = S.byDow('spend').filter(function (r) { return r.dow === day.dow; })[0].value;
        var d = day.spendTotal - avg;
        return (d >= 0 ? '+' : S.minus) + S.money(Math.abs(d));
      })() + '.</p>');

    return '' +
      '<header class="page-head">' +
      '<h1 class="t-page">Timeline</h1>' +
      '<p class="page-head__lead">A single day, reconstructed from the sources you have connected. Useful when a number in the overview needs an explanation.</p>' +
      '</header>' +

      '<section class="section">' +
      U.sectionHead(S.longDate(day.date), day.weekend ? 'Weekend' : 'Weekday',
        U.segment('filter', FILTERS, state.filter)) +
      picker(D.last(14), day.iso) +
      '<div style="margin-top:18px">' + U.panel(null, null,
        ch.chart({ type: 'daystrip', height: 62, spans: spans, marks: [{ at: day.wakeMin, label: 'wake' }, { at: Math.min(1438, day.onsetClock), label: 'sleep' }] })) + '</div>' +
      '<div class="grid-side" style="margin-top:20px">' +
      U.panel(null, null, body) + side +
      '</div></section>';
  }

  function largest(day) {
    var best = null;
    D.categories.forEach(function (c) { if (!best || day.spend[c] > day.spend[best]) best = c; });
    return best.charAt(0).toUpperCase() + best.slice(1) + ' · ' + S.money(day.spend[best]);
  }

  BL.views = BL.views || {};
  BL.views.timeline = { title: 'Timeline', render: render };
})(typeof window !== 'undefined' ? window : globalThis);
