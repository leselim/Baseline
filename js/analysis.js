/* Baseline. Analysis primitives and the feature layer.
 *
 * This file knows nothing about the interface. It turns the event record into
 * per day features, and provides the statistics the pattern engine needs.
 */
(function (global) {
  var BL = (global.BL = global.BL || {});
  var D = BL.data;

  // ------------------------------------------------------------ primitives
  function mean(a) { return a.length ? a.reduce(function (x, y) { return x + y; }, 0) / a.length : 0; }
  function sd(a) {
    if (a.length < 2) return 0;
    var m = mean(a);
    return Math.sqrt(a.reduce(function (s, v) { return s + (v - m) * (v - m); }, 0) / (a.length - 1));
  }
  function sorted(a) { return a.slice().sort(function (x, y) { return x - y; }); }
  function quantile(a, q) {
    if (!a.length) return 0;
    var s = sorted(a), pos = (s.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
    return s[lo] + (s[hi] - s[lo]) * (pos - lo);
  }
  function median(a) { return quantile(a, 0.5); }

  /* Mean with the most extreme values removed at both ends. Comparing this
   * with the plain mean is how the engine notices that a finding is really
   * one unusual day. */
  function trimmedMean(a, frac) {
    if (a.length < 5) return mean(a);
    var s = sorted(a), k = Math.max(1, Math.floor(a.length * (frac || 0.1)));
    return mean(s.slice(k, s.length - k));
  }

  /* Median absolute deviation. Robust to the outliers it is used to find. */
  function outliers(a) {
    if (a.length < 6) return [];
    var med = median(a);
    var mad = median(a.map(function (v) { return Math.abs(v - med); })) || 1;
    return a.map(function (v, i) { return { i: i, v: v, z: 0.6745 * (v - med) / mad }; })
      .filter(function (o) { return Math.abs(o.z) > 3.5; });
  }

  function pearson(xs, ys) {
    var n = xs.length;
    if (n < 3) return 0;
    var mx = mean(xs), my = mean(ys), sx = 0, sy = 0, sxy = 0;
    for (var i = 0; i < n; i++) {
      var dx = xs[i] - mx, dy = ys[i] - my;
      sx += dx * dx; sy += dy * dy; sxy += dx * dy;
    }
    return (sx && sy) ? sxy / Math.sqrt(sx * sy) : 0;
  }

  function ranks(a) {
    var idx = a.map(function (v, i) { return { v: v, i: i }; })
      .sort(function (p, q) { return p.v - q.v; });
    var r = new Array(a.length);
    for (var i = 0; i < idx.length;) {
      var j = i;
      while (j + 1 < idx.length && idx[j + 1].v === idx[i].v) j++;
      var avg = (i + j) / 2 + 1;
      for (var k = i; k <= j; k++) r[idx[k].i] = avg;
      i = j + 1;
    }
    return r;
  }
  /* Rank correlation, so one extreme day cannot manufacture a relationship. */
  function spearman(xs, ys) { return pearson(ranks(xs), ranks(ys)); }

  /* Standardised difference between two groups. This is what "how big" means
   * internally; the interface only ever sees the difference in real units. */
  function cohensD(a, b) {
    if (a.length < 2 || b.length < 2) return 0;
    var sa = sd(a), sb = sd(b);
    var pooled = Math.sqrt(((a.length - 1) * sa * sa + (b.length - 1) * sb * sb) / (a.length + b.length - 2));
    return pooled ? (mean(a) - mean(b)) / pooled : 0;
  }

  /* Welch two sample t, converted to a rough two sided p. Enough to keep
   * noise out; the product never shows the number. */
  function welchP(a, b) {
    if (a.length < 3 || b.length < 3) return 1;
    var va = sd(a) * sd(a) / a.length, vb = sd(b) * sd(b) / b.length;
    if (!va && !vb) return 1;
    var t = Math.abs(mean(a) - mean(b)) / Math.sqrt(va + vb);
    var df = Math.pow(va + vb, 2) / (va * va / (a.length - 1) + vb * vb / (b.length - 1));
    // Normal approximation, adequate above roughly 15 degrees of freedom.
    var z = t * (1 - 1 / (4 * df)) / Math.sqrt(1 + t * t / (2 * df));
    return 2 * (1 - normCdf(Math.abs(z)));
  }
  function normCdf(z) {
    var t = 1 / (1 + 0.2316419 * z);
    var d = 0.3989423 * Math.exp(-z * z / 2);
    var p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return 1 - p;
  }

  function linearFit(xs, ys) {
    var n = xs.length, mx = mean(xs), my = mean(ys), num = 0, den = 0;
    for (var i = 0; i < n; i++) { num += (xs[i] - mx) * (ys[i] - my); den += (xs[i] - mx) * (xs[i] - mx); }
    var slope = den ? num / den : 0;
    return { slope: slope, intercept: my - slope * mx };
  }

  // --------------------------------------------------------------- metrics
  // One entry per thing the product can talk about. Labels are the plain
  // words a reader sees; nothing here is phrased for a statistician.
  var METRICS = [
    { key: 'spendTotal', order: 3, label: 'Spending', short: 'spending', unit: 'rand', group: 'money',
      get: function (d) { return d.spendTotal; }, actionable: true },
    { key: 'discretionary', order: 3, label: 'Food and social spending', short: 'food and social spending', unit: 'rand', group: 'money',
      get: function (d) { return d.discretionary; }, actionable: true },
    { key: 'eveningSpend', order: 3, label: 'Evening spending', short: 'evening spending', unit: 'rand', group: 'money',
      get: function (d) { return d.eveningSpend; }, actionable: true },
    { key: 'txnCount', noun: 'purchases', order: 3, label: 'Number of purchases', short: 'purchases', unit: 'count', group: 'money',
      get: function (d) { return d.txnCount; }, actionable: false },
    { key: 'sleepMin', order: 4, label: 'Sleep', short: 'sleep', unit: 'duration', group: 'sleep',
      get: function (d) { return d.sleepMin; }, actionable: true },
    { key: 'onsetClock', order: 3, label: 'When you fall asleep', short: 'sleep start', unit: 'clock', zeroAt: 1320, group: 'sleep',
      get: function (d) { return d.onsetClock; }, actionable: true },
    { key: 'wakeMin', order: 4, label: 'When you wake up', short: 'wake time', unit: 'clock', zeroAt: 300, group: 'sleep',
      get: function (d) { return d.wakeMin; }, actionable: false },
    { key: 'screenMin', order: 2, label: 'Screen time', short: 'screen time', unit: 'duration', group: 'phone',
      get: function (d) { return d.screenMin; }, actionable: true },
    { key: 'phoneLateMin', order: 1, label: 'Late phone use', short: 'late phone use', unit: 'minutes', group: 'phone',
      get: function (d) { return d.phoneLateMin; }, actionable: true },
    { key: 'steps', noun: 'steps', order: 3, label: 'Steps', short: 'steps', unit: 'count', group: 'movement',
      get: function (d) { return d.steps; }, actionable: true },
    { key: 'workEndMin', order: 1, label: 'When work finishes', short: 'work finish', unit: 'clock', zeroAt: 900, group: 'work',
      get: function (d) { return d.workEndMin; }, actionable: false },
    { key: 'firstCommitMin', order: 0, label: 'When your day starts', short: 'day start', unit: 'clock', zeroAt: 420, group: 'work',
      get: function (d) { return d.firstCommitMin; }, actionable: false },
    { key: 'workMin', order: 1, label: 'Time at work', short: 'time at work', unit: 'duration', group: 'work',
      get: function (d) { return d.workMin; }, actionable: false }
  ];
  var metricByKey = {};
  METRICS.forEach(function (m) { metricByKey[m.key] = m; });
  function metric(key) { return metricByKey[key]; }

  /* Days where the metric was actually recorded. Weekends have no calendar,
   * so a work metric simply has fewer days behind it, and the engine treats
   * that as a smaller sample rather than a zero. */
  function series(metricKey, days) {
    var m = metric(metricKey);
    var out = [];
    (days || D.days).forEach(function (d) {
      var v = m.get(d);
      if (v !== null && v !== undefined && !isNaN(v)) out.push({ day: d, v: v });
    });
    return out;
  }
  function values(metricKey, days) { return series(metricKey, days).map(function (p) { return p.v; }); }

  // ------------------------------------------------------- transaction view
  function transactions(days) {
    var out = [];
    (days || D.days).forEach(function (d) {
      d.txns.forEach(function (t) { out.push({ day: d, minute: t.minute, amount: t.amount, category: t.category }); });
    });
    return out;
  }

  /* How the day's spending splits across the clock. Used for the question
   * "when does this actually happen". */
  function byHourBucket(txns, bucketHours) {
    var size = (bucketHours || 3) * 60;
    var buckets = [];
    for (var start = 0; start < 1440; start += size) {
      buckets.push({ from: start, to: start + size, total: 0, count: 0 });
    }
    txns.forEach(function (t) {
      var b = buckets[Math.min(buckets.length - 1, Math.floor(t.minute / size))];
      b.total += t.amount; b.count++;
    });
    return buckets;
  }

  function byCategory(txns) {
    var map = {};
    D.categories.forEach(function (c) { map[c] = { category: c, total: 0, count: 0 }; });
    txns.forEach(function (t) { map[t.category].total += t.amount; map[t.category].count++; });
    return D.categories.map(function (c) { return map[c]; });
  }

  /* Split the record into calendar weeks, so consistency can be measured as
   * "how many weeks did this hold" rather than "how many days". */
  function weeks(days) {
    var out = [], cur = [];
    (days || D.days).forEach(function (d) {
      cur.push(d);
      if (d.dow === 0) { out.push(cur); cur = []; }
    });
    if (cur.length) out.push(cur);
    return out;
  }

  BL.analysis = {
    mean: mean, sd: sd, median: median, quantile: quantile, sorted: sorted,
    trimmedMean: trimmedMean, outliers: outliers,
    pearson: pearson, spearman: spearman, cohensD: cohensD, welchP: welchP, linearFit: linearFit,
    metrics: METRICS, metric: metric, series: series, values: values,
    transactions: transactions, byHourBucket: byHourBucket, byCategory: byCategory, weeks: weeks
  };
})(typeof window !== 'undefined' ? window : globalThis);
