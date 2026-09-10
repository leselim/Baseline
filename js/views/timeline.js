/* Baseline. Timeline. The factual record of one day. */
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
    return '<div class="daypicker" role="group" aria-label="Choose a day">' + days.map(function (d) {
      return '<button class="daypicker__btn" type="button" data-day="' + d.iso + '" aria-pressed="' + (d.iso === activeIso) + '">' +
        '<span class="daypicker__dow">' + d.dowLabel + '</span>' +
        '<span class="daypicker__date num">' + d.date.getDate() + '</span></button>';
    }).join('') + '</div>';
  }

  function render(state) {
    var day = D.byIso[state.day] || D.latest;
    var events = S.timeline(day);
    var shown = state.filter === 'all' ? events : events.filter(function (e) { return e.kind === state.filter; });
    var pastMidnight = day.onsetClock >= 1440;

    var spans = [{ from: 0, to: day.wakeMin, color: '#001D39', tip: { value: 'Asleep', sub: 'until ' + S.clock(day.wakeMin) } }];
    if (day.workStartMin) {
      spans.push({ from: day.workStartMin, to: day.workEndMin, color: '#6EA2B3', tip: { value: 'At work', sub: S.dur(day.workMin) } });
    }
    if (!pastMidnight) {
      spans.push({ from: day.onsetClock, to: 1440, color: '#001D39', tip: { value: 'Asleep', sub: 'from ' + S.clock(day.onsetClock) } });
    }
    var marks = [{ at: day.wakeMin, label: 'awake' }];
    if (!pastMidnight) marks.push({ at: day.onsetClock, label: 'asleep' });

    var body = shown.length
      ? '<ol class="timeline">' + shown.map(function (e) {
        return '<li class="tl-item tl-item--' + e.kind + '">' +
          '<span class="tl-item__time num">' + S.clock(e.min) +
          (e.min >= 1440 ? '<span class="tl-item__next">next day</span>' : '') + '</span>' +
          '<span class="tl-item__mark"></span>' +
          '<span class="tl-item__label">' + U.esc(e.label) + '</span>' +
          (e.note ? '<span class="tl-item__note">' + U.esc(e.note) + '</span>' : '') +
          '</li>';
      }).join('') + '</ol>'
      : U.empty('Nothing in this group', 'Nothing was recorded on ' + S.longDate(day.date) + '. Choose Everything to see the whole day.');

    var dowSleep = S.byDow('sleepMin').filter(function (r) { return r.dow === day.dow; })[0].value;
    var dowSpend = S.byDow('spendTotal').filter(function (r) { return r.dow === day.dow; })[0].value;

    return '' +
      '<header class="page-head">' +
      '<h1 class="t-page">Timeline</h1>' +
      '<p class="page-head__lead">One day, hour by hour. This is the record the findings are drawn from.</p>' +
      '</header>' +

      '<section class="section">' +
      U.sectionHead(S.longDate(day.date), day.weekend ? 'Weekend' : 'Weekday',
        U.segment('filter', FILTERS, state.filter, 'Filter events'),
        'Pick any of the last fourteen days.') +
      picker(D.last(14), day.iso) +
      '<div style="margin-top:22px">' + U.panel(null, null,
        ch.chart({ type: 'daystrip', height: 66, spans: spans, marks: marks,
          aria: 'Midnight to midnight on ' + S.longDate(day.date) }) +
        U.reading(pastMidnight
          ? 'Midnight to midnight. You slept until ' + S.clock(day.wakeMin) + '. You fell asleep again at ' +
            S.clock(day.onsetClock) + ', which counts as the next day.'
          : 'Midnight to midnight. Dark bands are sleep. The pale band is time at work.')) + '</div>' +
      '<div class="grid-side" style="margin-top:24px">' +
      U.panel(null, null, body) +
      U.panel('That day', null, U.datarows([
        { label: 'Sleep', value: S.dur(day.sleepMin) },
        { label: 'Fell asleep', value: S.clock(day.onsetClock) },
        { label: 'Woke', value: S.clock(day.wakeMin) },
        { label: 'Screen time', value: S.dur(day.screenMin) },
        { label: 'Steps', value: S.num(day.steps) },
        { label: 'Spending', value: S.money(day.spendTotal) },
        { label: 'Purchases', value: String(day.txnCount) }
      ]),
        '<p class="t-fine">Against a usual ' + day.dowFull + ' for you. Sleep ' +
        S.durShort(day.sleepMin - dowSleep) + '. Spending ' + S.moneySigned(day.spendTotal - dowSpend) + '.</p>') +
      '</div></section>';
  }

  BL.views = BL.views || {};
  BL.views.timeline = { title: 'Timeline', render: render };
})(typeof window !== 'undefined' ? window : globalThis);
