/* Baseline: statistics + derived insight layer */
(function (global) {
  var BL = (global.BL = global.BL || {});
  var D = BL.data;

  // ------------------------------------------------------------------ maths
  function mean(a) { return a.length ? a.reduce(function (s, v) { return s + v; }, 0) / a.length : 0; }
  function sum(a) { return a.reduce(function (s, v) { return s + v; }, 0); }
  function sd(a) {
    if (a.length < 2) return 0;
    var m = mean(a);
    return Math.sqrt(sum(a.map(function (v) { return (v - m) * (v - m); })) / (a.length - 1));
  }
  function pearson(xs, ys) {
    var n = Math.min(xs.length, ys.length);
    if (n < 3) return 0;
    var mx = mean(xs), my = mean(ys), num = 0, dx = 0, dy = 0;
    for (var i = 0; i < n; i++) {
      var a = xs[i] - mx, b = ys[i] - my;
      num += a * b; dx += a * a; dy += b * b;
    }
    return dx && dy ? num / Math.sqrt(dx * dy) : 0;
  }
  function linreg(xs, ys) {
    var n = xs.length, mx = mean(xs), my = mean(ys), num = 0, den = 0;
    for (var i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) * (xs[i] - mx); }
    var slope = den ? num / den : 0;
    return { slope: slope, intercept: my - slope * mx };
  }

  // --------------------------------------------------------------- formatting
  function pad(n) { return String(n).padStart(2, '0'); }
  var MINUS = '\u2212';
  function group(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function unsign(s) { return String(s).replace(/^[+\-\u2212]/, ''); }
  function dur(min) {
    min = Math.round(min);
    var neg = min < 0; min = Math.abs(min);
    return (neg ? MINUS : '') + Math.floor(min / 60) + 'h ' + pad(min % 60) + 'm';
  }
  function durShort(min) {
    min = Math.round(min);
    if (min === 0) return 'no change';
    var neg = min < 0 ? MINUS : '+';
    min = Math.abs(min);
    return min >= 60 ? neg + Math.floor(min / 60) + 'h ' + pad(min % 60) + 'm' : neg + min + 'm';
  }
  function clock(minsFromMidnight) {
    var m = Math.round(minsFromMidnight) % 1440;
    if (m < 0) m += 1440;
    return pad(Math.floor(m / 60)) + ':' + pad(m % 60);
  }
  function money(v) { return (v < 0 ? MINUS : '') + 'R' + group(Math.abs(v)); }
  function num(v) { return group(v); }
  function pct(v, digits) {
    var d = digits === undefined ? 0 : digits;
    if (Math.abs(v) < 0.5 && !d) return 'no change';
    return (v >= 0 ? '+' : MINUS) + Math.abs(v).toFixed(d) + '%';
  }
  function dateLabel(d, opts) {
    return d.toLocaleDateString('en-ZA', opts || { day: 'numeric', month: 'short' });
  }
  function longDate(d) {
    return d.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  // ------------------------------------------------------------------ metrics
  // Each metric knows how to read a day, how to render itself, and which
  // direction counts as an improvement.
  var metrics = {
    sleep: {
      key: 'sleep', label: 'Sleep', unit: 'duration',
      get: function (d) { return d.sleepMin; },
      format: function (v) { return dur(v); },
      delta: function (v) { return durShort(v); },
      better: 'up', axis: function (v) { return (v / 60).toFixed(1) + 'h'; }
    },
    spend: {
      key: 'spend', label: 'Spending', unit: 'per day',
      get: function (d) { return d.spendTotal; },
      format: function (v) { return money(v); },
      delta: function (v) { return Math.abs(v) < 1 ? 'no change' : (v >= 0 ? '+' : MINUS) + money(Math.abs(v)); },
      better: 'down', axis: function (v) { return 'R' + Math.round(v); }
    },
    screen: {
      key: 'screen', label: 'Screen time', unit: 'per day',
      get: function (d) { return d.screenMin; },
      format: function (v) { return dur(v); },
      delta: function (v) { return durShort(v); },
      better: 'down', axis: function (v) { return (v / 60).toFixed(1) + 'h'; }
    },
    steps: {
      key: 'steps', label: 'Activity', unit: 'steps',
      get: function (d) { return d.steps; },
      format: function (v) { return num(v); },
      delta: function (v) { return Math.abs(v) < 10 ? 'no change' : (v >= 0 ? '+' : MINUS) + num(Math.abs(v)); },
      better: 'up', axis: function (v) { return Math.round(v / 1000) + 'k'; }
    }
  };

  function series(days, metricKey) { return days.map(metrics[metricKey].get); }

  function summary(metricKey, window) {
    var m = metrics[metricKey];
    var cur = D.last(window), prev = D.previous(window);
    var curAvg = mean(series(cur, metricKey));
    var prevAvg = mean(series(prev, metricKey));
    var baseline = mean(series(D.days, metricKey));
    var diff = curAvg - prevAvg;
    var improving = m.better === 'up' ? diff > 0 : diff < 0;
    return {
      metric: m,
      value: curAvg,
      total: sum(series(cur, metricKey)),
      previous: prevAvg,
      baseline: baseline,
      diff: diff,
      pct: prevAvg ? (diff / prevAvg) * 100 : 0,
      improving: improving,
      significant: Math.abs(diff) > 0.03 * Math.abs(prevAvg),
      values: series(cur, metricKey)
    };
  }

  function byDow(metricKey, days) {
    days = days || D.days;
    var buckets = {};
    D.dowOrder.forEach(function (dw) { buckets[dw] = []; });
    days.forEach(function (d) { buckets[d.dow].push(metrics[metricKey].get(d)); });
    return D.dowOrder.map(function (dw) {
      return { dow: dw, label: D.dowShort[dw], value: mean(buckets[dw]), n: buckets[dw].length };
    });
  }

  function categoryMeanByDow(cat, dow) {
    return mean(D.days.filter(function (d) { return d.dow === dow; }).map(function (d) { return d.spend[cat]; }));
  }

  // -------------------------------------------------------------- confidence
  // Confidence is a function of sample size and effect consistency, it is
  // stated, never inflated.
  function confidence(n, ratio) {
    var score = Math.min(1, n / 40) * 0.5 + Math.min(1, ratio) * 0.5;
    if (score > 0.72) return { label: 'High', level: 3, score: score };
    if (score > 0.5) return { label: 'Moderate', level: 2, score: score };
    return { label: 'Low', level: 1, score: score };
  }

  // ----------------------------------------------------------------- insights
  function fridaySpending() {
    var fri = D.days.filter(function (d) { return d.dow === 5; });
    var wed = D.days.filter(function (d) { return d.dow === 3; });
    var friAvg = mean(fri.map(function (d) { return d.spendTotal; }));
    var wedAvg = mean(wed.map(function (d) { return d.spendTotal; }));
    var delta = ((friAvg - wedAvg) / wedAvg) * 100;
    var contributors = D.categories.map(function (c) {
      return { key: c, label: c.charAt(0).toUpperCase() + c.slice(1), diff: categoryMeanByDow(c, 5) - categoryMeanByDow(c, 3) };
    }).sort(function (a, b) { return b.diff - a.diff; });
    var above = fri.filter(function (d) { return d.spendTotal > wedAvg; }).length;
    var recent = fri.slice(-16);
    var recentAbove = recent.filter(function (d) { return d.spendTotal > wedAvg; }).length;
    return {
      id: 'friday-spending',
      kicker: 'Friday spending',
      metric: 'spend',
      headline: pct(delta),
      statement: 'Friday spending is consistently higher than your midweek baseline.',
      detail: 'Across ' + fri.length + ' Fridays, you spent ' + money(friAvg) + ' on average against ' + money(wedAvg) + ' on Wednesdays.',
      contributors: contributors,
      occurrence: recentAbove + ' of the last ' + recent.length + ' Fridays',
      sample: fri.length + ' Fridays observed',
      confidence: confidence(fri.length, recentAbove / recent.length),
      values: { friAvg: friAvg, wedAvg: wedAvg, delta: delta, above: above },
      experiment: {
        title: 'Set a Friday discretionary limit of R300',
        duration: '3 Fridays',
        measure: 'Friday discretionary spend',
        expected: 'Friday total closer to your midweek baseline'
      }
    };
  }

  function mondaySleep() {
    var mon = D.days.filter(function (d) { return d.dow === 1; });
    var monAvg = mean(mon.map(function (d) { return d.sleepMin; }));
    var weekAvg = mean(D.days.map(function (d) { return d.sleepMin; }));
    var below = mon.filter(function (d) { return d.sleepMin < weekAvg; }).length;
    return {
      id: 'monday-sleep',
      kicker: 'Monday sleep',
      metric: 'sleep',
      headline: durShort(monAvg - weekAvg),
      statement: 'Your Monday sleep sits below your own weekly average, week after week.',
      detail: 'Monday averages ' + dur(monAvg) + ' against a weekly average of ' + dur(weekAvg) + '.',
      rows: [
        { label: 'Average Monday', value: dur(monAvg) },
        { label: 'Weekly average', value: dur(weekAvg) },
        { label: 'Difference', value: durShort(monAvg - weekAvg) }
      ],
      occurrence: below + ' of ' + mon.length + ' Mondays below average',
      sample: mon.length + ' Mondays observed',
      confidence: confidence(mon.length, below / mon.length),
      values: { monAvg: monAvg, weekAvg: weekAvg },
      experiment: {
        title: 'Put your phone away by 23:00 on Sunday',
        duration: '3 weeks',
        measure: 'Monday sleep duration',
        expected: 'More consistent Monday mornings'
      }
    };
  }

  function phoneSleep() {
    var late = D.days.filter(function (d) { return d.lateNight; });
    var early = D.days.filter(function (d) { return !d.lateNight; });
    var lateOnset = mean(late.map(function (d) { return d.onsetClock; }));
    var earlyOnset = mean(early.map(function (d) { return d.onsetClock; }));
    var r = pearson(D.days.map(function (d) { return d.phoneLateMin; }), D.days.map(function (d) { return d.onsetClock; }));
    return {
      id: 'phone-sleep',
      kicker: 'Phone activity and sleep onset',
      metric: 'sleep',
      headline: durShort(lateOnset - earlyOnset),
      statement: 'On nights when phone activity continues past 23:30, sleep begins later.',
      detail: 'Sleep onset averages ' + clock(lateOnset) + ' after late phone activity, against ' + clock(earlyOnset) + ' otherwise.',
      rows: [
        { label: 'Sleep onset, late nights', value: clock(lateOnset) },
        { label: 'Sleep onset, other nights', value: clock(earlyOnset) },
        { label: 'Correlation', value: r.toFixed(2) }
      ],
      occurrence: 'Observed across ' + late.length + ' nights',
      sample: late.length + ' late nights of ' + D.days.length + ' recorded',
      confidence: confidence(late.length, Math.abs(r)),
      values: { lateOnset: lateOnset, earlyOnset: earlyOnset, r: r, n: late.length },
      experiment: {
        title: 'No phone after 23:00 on weeknights',
        duration: '2 weeks',
        measure: 'Sleep onset time',
        expected: 'Earlier and less variable sleep onset'
      }
    };
  }

  function morningStart() {
    var wk = D.days.filter(function (d) { return !d.weekend && d.firstCommitMin; });
    var late = wk.filter(function (d) { return d.firstCommitMin >= 540; });
    var earlyStart = wk.filter(function (d) { return d.firstCommitMin < 540; });
    var pLate = late.filter(function (d) { return d.exercise; }).length / late.length * 100;
    var pEarly = earlyStart.filter(function (d) { return d.exercise; }).length / earlyStart.length * 100;
    return {
      id: 'first-commitment',
      kicker: 'First commitment and exercise',
      metric: 'steps',
      headline: pct(pLate - pEarly, 0),
      statement: 'You exercise more often on days when your first commitment starts after 09:00.',
      detail: 'Exercise occurs on ' + Math.round(pLate) + '% of those days, against ' + Math.round(pEarly) + '% when the day starts earlier.',
      rows: [
        { label: 'First commitment after 09:00', value: Math.round(pLate) + '% of days' },
        { label: 'First commitment before 09:00', value: Math.round(pEarly) + '% of days' },
        { label: 'Weekdays observed', value: wk.length }
      ],
      occurrence: wk.length + ' weekdays observed',
      sample: wk.length + ' weekdays observed',
      confidence: confidence(wk.length, Math.abs(pLate - pEarly) / 40),
      values: { pLate: pLate, pEarly: pEarly },
      experiment: {
        title: 'Hold your calendar until 09:15 on Tuesdays and Thursdays',
        duration: '4 weeks',
        measure: 'Exercise frequency',
        expected: 'One additional session per week'
      }
    };
  }

  var insightCache = null;
  function insights() {
    if (!insightCache) insightCache = [fridaySpending(), mondaySleep(), phoneSleep(), morningStart()];
    return insightCache;
  }
  function insight(id) {
    return insights().filter(function (i) { return i.id === id; })[0];
  }

  // ----------------------------------------------------------- explorer vars
  var variables = [
    { key: 'phoneLate', label: 'Late-night phone activity', unit: 'minutes past 23:30', get: function (d) { return d.phoneLateMin; }, fmt: function (v) { return Math.round(v) + 'm'; } },
    { key: 'onset', label: 'Sleep onset', unit: 'clock time', get: function (d) { return d.onsetClock; }, fmt: function (v) { return clock(v); } },
    { key: 'sleep', label: 'Sleep duration', unit: 'hours', get: function (d) { return d.sleepMin; }, fmt: function (v) { return dur(v); } },
    { key: 'screen', label: 'Screen time', unit: 'hours', get: function (d) { return d.screenMin; }, fmt: function (v) { return dur(v); } },
    { key: 'steps', label: 'Steps', unit: 'count', get: function (d) { return d.steps; }, fmt: function (v) { return num(v); } },
    { key: 'spend', label: 'Daily spending', unit: 'rand', get: function (d) { return d.spendTotal; }, fmt: function (v) { return money(v); } },
    { key: 'discretionary', label: 'Discretionary spending', unit: 'rand', get: function (d) { return d.discretionary; }, fmt: function (v) { return money(v); } },
    { key: 'work', label: 'Hours at work', unit: 'hours', get: function (d) { return d.workMin; }, fmt: function (v) { return dur(v); } },
    { key: 'wake', label: 'Wake time', unit: 'clock time', get: function (d) { return d.wakeMin; }, fmt: function (v) { return clock(v); } },
    { key: 'firstCommit', label: 'First commitment', unit: 'clock time', get: function (d) { return d.firstCommitMin; }, fmt: function (v) { return clock(v); } }
  ];
  function variable(key) { return variables.filter(function (v) { return v.key === key; })[0]; }

  function relationship(xKey, yKey) {
    var vx = variable(xKey), vy = variable(yKey);
    var pts = [];
    D.days.forEach(function (d) {
      var x = vx.get(d), y = vy.get(d);
      if (x === null || y === null || isNaN(x) || isNaN(y)) return;
      pts.push({ x: x, y: y, day: d });
    });
    var r = pearson(pts.map(function (p) { return p.x; }), pts.map(function (p) { return p.y; }));
    var fit = linreg(pts.map(function (p) { return p.x; }), pts.map(function (p) { return p.y; }));
    var xs = pts.map(function (p) { return p.x; }).slice().sort(function (a, b) { return a - b; });
    var lowCut = xs[Math.floor(xs.length * 0.25)], highCut = xs[Math.floor(xs.length * 0.75)];
    var lowGroup = pts.filter(function (p) { return p.x <= lowCut; }).map(function (p) { return p.y; });
    var highGroup = pts.filter(function (p) { return p.x >= highCut; }).map(function (p) { return p.y; });
    var gap = mean(highGroup) - mean(lowGroup);
    var strength = Math.abs(r) > 0.6 ? 'strong' : Math.abs(r) > 0.35 ? 'moderate' : Math.abs(r) > 0.18 ? 'weak' : 'no meaningful';
    return {
      x: vx, y: vy, points: pts, r: r, fit: fit, gap: gap, strength: strength,
      lowMean: mean(lowGroup), highMean: mean(highGroup), n: pts.length,
      direction: r > 0 ? 'higher' : 'lower',
      confidence: confidence(pts.length, Math.abs(r))
    };
  }

  var pairSuggestions = [
    ['phoneLate', 'onset'], ['screen', 'sleep'], ['sleep', 'steps'],
    ['work', 'steps'], ['sleep', 'spend'], ['firstCommit', 'steps'], ['wake', 'discretionary']
  ];

  // ------------------------------------------------------------------ habits
  function habits() {
    var recent = D.last(56);
    function build(id, label, note, test) {
      var hits = recent.filter(test);
      var weeks = [];
      for (var w = 0; w < 8; w++) {
        var slice = recent.slice(w * 7, w * 7 + 7);
        weeks.push(slice.filter(test).length);
      }
      var perWeek = hits.length / 8;
      return {
        id: id, label: label, note: note,
        perWeek: perWeek,
        consistency: Math.round((hits.length / recent.length) * 100),
        weeks: weeks,
        days: recent.map(function (d) { return { day: d, hit: test(d) } }),
        trend: weeks.slice(4).reduce(function (a, b) { return a + b; }, 0) - weeks.slice(0, 4).reduce(function (a, b) { return a + b; }, 0)
      };
    }
    return [
      build('exercise', 'Exercise session', 'Any recorded activity above your daily step baseline', function (d) { return d.exercise; }),
      build('early-sleep', 'Asleep before midnight', 'Sleep onset recorded before 00:00', function (d) { return d.onsetClock < 1440; }),
      build('steps', 'Above 8,000 steps', 'Daily step count above 8,000', function (d) { return d.steps > 8000; }),
      build('screen', 'Screen time under 4h', 'Total daily screen time below four hours', function (d) { return d.screenMin < 240; }),
      build('spend-light', 'Discretionary under R250', 'Food, social and other spending below R250', function (d) { return d.discretionary < 250; })
    ];
  }

  // -------------------------------------------------------------- timeline
  function timeline(day) {
    var ev = [];
    function push(min, label, kind, note) { if (min !== null && min !== undefined) ev.push({ min: Math.round(min), label: label, kind: kind, note: note }); }
    push(day.wakeMin, 'Wake', 'sleep', 'Sleep ended after ' + dur(day.sleepMin));
    if (!day.weekend) {
      push(day.workStartMin - 40, 'Left home', 'move', null);
      push(day.workStartMin, 'Work started', 'work', day.firstCommitMin ? 'First commitment ' + clock(day.firstCommitMin) : null);
      push(day.workStartMin + 210, 'Lunch', 'spend', money(day.spend.food * 0.45));
      push(day.workEndMin, 'Work ended', 'work', dur(day.workMin) + ' recorded');
    } else {
      push(day.wakeMin + 95, 'Left home', 'move', null);
      push(day.wakeMin + 260, 'Lunch', 'spend', money(day.spend.food * 0.5));
    }
    if (day.exercise) push((day.weekend ? day.wakeMin + 120 : day.workEndMin + 45), 'Exercise', 'move', num(day.steps) + ' steps recorded');
    if (day.spend.social > 90) push(day.weekend ? 1180 : 1140, 'Social spending', 'spend', money(day.spend.social));
    push(day.eveningLateMin > 20 ? 1290 : 1245, 'Phone activity increased', 'phone', dur(day.screenMin) + ' screen time today');
    push(day.onsetClock + (day.i < D.days.length - 1 ? 0 : 0) - 18, 'Phone inactive', 'phone', day.eveningLateMin > 20 ? 'Activity continued past 23:30' : null);
    push(day.onsetClock, 'Sleep', 'sleep', null);
    return ev.sort(function (a, b) { return a.min - b.min; });
  }

  // ------------------------------------------------------------ experiments
  var experiments = [
    {
      id: 'sunday-phone',
      title: 'Phone away by 23:00 on Sunday',
      status: 'running',
      insight: 'monday-sleep',
      premise: 'Sunday evening phone activity is associated with shorter Monday sleep.',
      duration: 3, elapsed: 2, unit: 'weeks',
      measure: 'Monday sleep duration',
      baseline: null, interim: 21,
      expected: 'More consistent Monday mornings'
    },
    {
      id: 'weeknight-curfew',
      title: 'No screens after 23:00 on weeknights',
      status: 'complete',
      insight: 'phone-sleep',
      premise: 'Late phone activity is associated with later sleep onset.',
      duration: 3, elapsed: 3, unit: 'weeks',
      measure: 'Monday sleep duration',
      result: 38, resultLabel: 'Monday sleep improved by',
      finished: '11 August 2026'
    }
  ];

  BL.stats = {
    mean: mean, sum: sum, sd: sd, pearson: pearson, linreg: linreg,
    dur: dur, durShort: durShort, unsign: unsign, minus: MINUS, clock: clock, money: money, num: num, pct: pct,
    dateLabel: dateLabel, longDate: longDate,
    metrics: metrics, series: series, summary: summary, byDow: byDow,
    insights: insights, insight: insight, confidence: confidence,
    variables: variables, variable: variable, relationship: relationship, pairSuggestions: pairSuggestions,
    habits: habits, timeline: timeline, experiments: experiments
  };
})(typeof window !== 'undefined' ? window : globalThis);
