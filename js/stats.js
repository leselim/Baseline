/* Baseline. Formatting, summaries and the day record.
 * Statistics live in analysis.js. Findings live in patterns.js.
 * This file turns numbers into the words and shapes the interface uses.
 */
(function (global) {
  var BL = (global.BL = global.BL || {});
  var D = BL.data, A = BL.analysis;
  var MINUS = '\u2212';

  // ------------------------------------------------------------ formatting
  function pad(n) { return String(n).padStart(2, '0'); }
  function clock(min) {
    var m = ((Math.round(min) % 1440) + 1440) % 1440;
    return pad(Math.floor(m / 60)) + ':' + pad(m % 60);
  }
  function dur(min) {
    var v = Math.round(Math.abs(min));
    var h = Math.floor(v / 60), m = v % 60;
    return h ? h + 'h ' + pad(m) + 'm' : m + 'm';
  }
  function durShort(min) {
    var v = Math.round(min), s = v < 0 ? MINUS : '+';
    var a = Math.abs(v);
    return s + (a >= 60 ? Math.floor(a / 60) + 'h ' + pad(a % 60) + 'm' : a + 'm');
  }
  function money(v) {
    return 'R' + Math.round(Math.abs(v)).toLocaleString('en-ZA');
  }
  function moneySigned(v) { return (v < 0 ? MINUS : '+') + money(v); }
  function num(v) { return Math.round(v).toLocaleString('en-ZA'); }
  function pct(v, digits) {
    var d = digits === undefined ? 0 : digits;
    if (Math.abs(v) < 0.5 && !d) return 'no change';
    return (v >= 0 ? '+' : MINUS) + Math.abs(v).toFixed(d) + '%';
  }
  function points(v) { return (v >= 0 ? '+' : MINUS) + Math.abs(Math.round(v)); }
  function unsign(s) { return String(s).replace(/^[+\u2212-]/, ''); }
  function plural(n, one, many) { return n === 1 ? one : (many || one + 's'); }

  function dateLabel(d, opts) {
    return d.toLocaleDateString('en-ZA', opts || { day: 'numeric', month: 'short' });
  }
  function longDate(d) {
    return d.toLocaleDateString('en-ZA', { weekday: 'long', day: '2-digit', month: 'long' });
  }
  function relDay(d, latest) {
    var a = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var b = new Date(latest.getFullYear(), latest.getMonth(), latest.getDate());
    var diff = Math.round((b - a) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    return dateLabel(a);
  }
  function stamp(d, latest) { return relDay(d, latest) + ' ' + clock(d.getHours() * 60 + d.getMinutes()); }

  /* Every metric knows how to print itself, so no view has to decide whether
   * a number is minutes, rand or a count. */
  function fmtFor(m) {
    if (m.unit === 'rand') return money;
    if (m.unit === 'duration') return dur;
    if (m.unit === 'clock') return clock;
    if (m.unit === 'minutes') return function (v) { return Math.round(v) + 'm'; };
    return num;
  }
  function deltaFor(m) {
    if (m.unit === 'rand') return moneySigned;
    if (m.unit === 'duration' || m.unit === 'clock' || m.unit === 'minutes') return durShort;
    return function (v) { return (v >= 0 ? '+' : MINUS) + num(Math.abs(v)); };
  }
  function axisFor(m) {
    if (m.unit === 'rand') return function (v) { return 'R' + Math.round(v); };
    if (m.unit === 'duration') return function (v) { return (v / 60).toFixed(1) + 'h'; };
    if (m.unit === 'clock') return clock;
    if (m.unit === 'minutes') return function (v) { return Math.round(v) + 'm'; };
    return function (v) { return v >= 1000 ? (v / 1000).toFixed(1) + 'k' : Math.round(v); };
  }
  A.metrics.forEach(function (m) {
    m.format = fmtFor(m); m.delta = deltaFor(m); m.axis = axisFor(m);
  });

  // -------------------------------------------------------------- summaries
  var HEADLINE = ['sleepMin', 'spendTotal', 'screenMin', 'steps'];
  var metrics = {};
  A.metrics.forEach(function (m) { metrics[m.key] = m; });

  function summary(key, windowDays) {
    var m = A.metric(key);
    var now = A.values(key, D.last(windowDays));
    var before = A.values(key, D.previous(windowDays));
    var v = A.mean(now), p = A.mean(before);
    var diff = v - p;
    var lower = key === 'screenMin' || key === 'spendTotal';
    return {
      key: key, metric: m, values: now, value: v, previous: p, diff: diff,
      pct: p ? (diff / p) * 100 : 0,
      significant: Math.abs(A.cohensD(now, before)) > 0.35,
      improving: lower ? diff < 0 : diff > 0
    };
  }

  function byDow(key) {
    var m = A.metric(key);
    return D.dowOrder.map(function (dw) {
      var v = A.values(key, D.days.filter(function (d) { return d.dow === dw; }));
      return { dow: dw, label: D.dowShort[dw], full: D.dowFull[dw], value: A.mean(v), n: v.length };
    });
  }

  // ------------------------------------------------------------ behaviours
  var BEHAVIOURS = [
    { label: 'Exercise session', test: function (d) { return d.exercise; } },
    { label: 'Asleep before midnight', test: function (d) { return d.onsetClock < 1440; } },
    { label: 'Above 8,000 steps', test: function (d) { return d.steps > 8000; } },
    { label: 'Screen time under 4h', test: function (d) { return d.screenMin < 240; } },
    { label: 'Food and social under R250', test: function (d) { return d.discretionary < 250; } }
  ];
  function behaviours() {
    var window = D.last(56);
    return BEHAVIOURS.map(function (b) {
      var days = window.map(function (d) { return { day: d, hit: !!b.test(d) }; });
      var hits = days.filter(function (x) { return x.hit; }).length;
      var recent = days.slice(-28).filter(function (x) { return x.hit; }).length;
      var older = days.slice(0, 28).filter(function (x) { return x.hit; }).length;
      return {
        label: b.label, days: days,
        consistency: Math.round((hits / days.length) * 100),
        perWeek: hits / (days.length / 7),
        trend: recent - older
      };
    });
  }
  /* When a behaviour tends to happen, said plainly. */
  function behaviourWhen(h) {
    var byDw = {};
    h.days.forEach(function (x) {
      var k = x.day.dow;
      byDw[k] = byDw[k] || { hit: 0, n: 0 };
      byDw[k].n++; if (x.hit) byDw[k].hit++;
    });
    var rows = Object.keys(byDw).map(function (k) {
      return { dow: +k, rate: byDw[k].hit / byDw[k].n, n: byDw[k].n };
    }).filter(function (r) { return r.n >= 4; });
    if (rows.length < 3) return null;
    rows.sort(function (a, b) { return b.rate - a.rate; });
    var top = rows[0], bottom = rows[rows.length - 1];
    if (top.rate - bottom.rate < 0.25) return 'This happens fairly evenly across the week.';
    return 'Most often on ' + D.dowFull[top.dow] + 's. Least often on ' + D.dowFull[bottom.dow] + 's.';
  }

  // ------------------------------------------------------- explorer pairs
  function relationship(xKey, yKey) {
    var mx = A.metric(xKey), my = A.metric(yKey);
    var xs = [], ys = [], days = [];
    D.days.forEach(function (d) {
      var a = mx.get(d), b = my.get(d);
      if (a == null || b == null || isNaN(a) || isNaN(b)) return;
      xs.push(a); ys.push(b); days.push(d);
    });
    var rho = A.spearman(xs, ys);
    var hiCut = A.quantile(xs, 0.75), loCut = A.quantile(xs, 0.25);
    var hi = [], lo = [];
    xs.forEach(function (x, i) { if (x >= hiCut) hi.push(ys[i]); else if (x <= loCut) lo.push(ys[i]); });
    var abs = Math.abs(rho);
    return {
      x: mx, y: my, n: xs.length, r: rho,
      strength: abs < 0.18 ? 'no clear' : abs < 0.35 ? 'slight' : abs < 0.55 ? 'moderate' : 'close',
      highMean: A.mean(hi), lowMean: A.mean(lo),
      fit: A.linearFit(xs, ys),
      points: days.map(function (d, i) { return { day: d, x: xs[i], y: ys[i] }; }),
      grade: abs < 0.18 ? 'thin' : (abs > 0.45 && xs.length > 100 ? 'strong' : 'some')
    };
  }
  var pairSuggestions = [
    ['phoneLateMin', 'onsetClock'], ['workEndMin', 'discretionary'], ['screenMin', 'sleepMin'],
    ['firstCommitMin', 'steps'], ['sleepMin', 'spendTotal'], ['workMin', 'steps'],
    ['wakeMin', 'discretionary'], ['txnCount', 'discretionary']
  ];

  // ---------------------------------------------------------- day timeline
  function timeline(day) {
    var out = [];
    function push(min, label, kind, note) { out.push({ min: min, label: label, kind: kind, note: note || null }); }
    push(day.wakeMin, 'Woke up', 'sleep', dur(day.sleepMin) + ' of sleep');
    if (day.workStartMin) push(day.workStartMin, 'Work started', 'work', null);
    if (day.exercise) push((day.firstCommitMin ? day.firstCommitMin - 70 : 540), 'Exercise session', 'move', num(day.steps) + ' steps that day');
    day.txns.slice().sort(function (a, b) { return a.minute - b.minute; }).forEach(function (t) {
      push(t.minute, D.categoryLabel[t.category], 'spend', money(t.amount));
    });
    if (day.workEndMin) push(day.workEndMin, 'Work finished', 'work', null);
    if (day.eveningLateMin > 20) push(1410, 'Phone still active', 'phone', day.eveningLateMin + 'm after 23:30');
    push(day.onsetClock, 'Fell asleep', 'sleep', null);
    return out.sort(function (a, b) { return a.min - b.min; });
  }

  // -------------------------------------------------------------- sources
  function sources() {
    var latest = D.latest.date;
    var syncAt = { phone: 372, sleep: 364, bank: 1420, calendar: 372, movement: 358 };
    return D.sources.map(function (s) {
      if (s.state !== 'connected') {
        return { id: s.id, name: s.name, state: s.state, reads: s.reads, contributes: s.contributes,
          days: 0, coverage: 0, events: 0, sync: null, from: null, to: null };
      }
      var evts = D.events.filter(function (e) { return e.source === s.id; });
      var isoSet = {};
      evts.forEach(function (e) { isoSet[e.iso] = true; });
      var covered = Object.keys(isoSet).length;
      var when = new Date(latest);
      if (s.id === 'bank') when.setDate(when.getDate() - 1);
      var mins = syncAt[s.id] || 400;
      when.setHours(Math.floor(mins / 60) % 24, mins % 60, 0, 0);
      return {
        id: s.id, name: s.name, state: s.state, reads: s.reads, contributes: s.contributes,
        days: covered, coverage: covered / D.days.length, events: evts.length,
        sync: stamp(when, latest),
        from: dateLabel(D.first.date, { month: 'long' }), to: dateLabel(D.latest.date, { month: 'long' })
      };
    });
  }

  BL.stats = {
    minus: MINUS, clock: clock, dur: dur, durShort: durShort, money: money, moneySigned: moneySigned,
    num: num, pct: pct, points: points, unsign: unsign, plural: plural,
    dateLabel: dateLabel, longDate: longDate, relDay: relDay, stamp: stamp,
    mean: A.mean, median: A.median,
    metrics: metrics, headline: HEADLINE, summary: summary, byDow: byDow,
    behaviours: behaviours, behaviourWhen: behaviourWhen,
    variables: A.metrics, variable: A.metric, relationship: relationship, pairSuggestions: pairSuggestions,
    timeline: timeline, sources: sources
  };
})(typeof window !== 'undefined' ? window : globalThis);
