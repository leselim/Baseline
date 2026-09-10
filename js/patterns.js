/* Baseline. Pattern discovery.
 *
 * The pipeline, in order:
 *
 *   features  ->  candidate detection  ->  qualification  ->  enrichment
 *             ->  deduplication        ->  ranking        ->  patterns
 *
 * Detectors are deliberately generous. Qualification is deliberately strict.
 * Most of what is found here is discarded, and that is the point: a product
 * that reports every relationship it can measure is noise, not intelligence.
 */
(function (global) {
  var BL = (global.BL = global.BL || {});
  var D = BL.data, A = BL.analysis;

  // Gates. A candidate must clear all of these to reach the interface.
  var GATE = {
    dayOfWeek:    { minOccurrences: 12, minD: 0.40, minRelative: 0.12, maxP: 0.05, minConsistency: 0.58 },
    relationship: { minDays: 40, minRho: 0.32, maxP: 0.02 },
    change:       { minWindow: 21, minD: 0.45, minRelative: 0.10, maxP: 0.05 },
    stability:    { minDays: 90, maxCv: 0.06, maxSpreadMinutes: 30 },
    exception:    { minZ: 3.5, withinDays: 30 },
    sequence:     { minPairs: 45, minRho: 0.30, maxP: 0.02 }
  };
  // How much of the raw effect must survive trimming the extremes.
  var ROBUST_FLOOR = 0.55;

  function pctChange(a, b) { return b ? (a - b) / Math.abs(b) : 0; }

  /* ------------------------------------------------------------ detectors */

  /* Type 1 and its grouped form. Compares a set of weekdays against the rest
   * of the record for every metric worth acting on. */
  function detectDayOfWeek() {
    var out = [];
    var subjects = [];
    D.dowOrder.forEach(function (dw) {
      subjects.push({ id: 'dow' + dw, dows: [dw], label: D.dowFull[dw] + 's', shortLabel: D.dowFull[dw] });
    });
    subjects.push({ id: 'thufri', dows: [4, 5], label: 'Thursdays and Fridays', shortLabel: 'Thursday and Friday' });
    subjects.push({ id: 'weekend', dows: [0, 6], label: 'weekends', shortLabel: 'Weekends' });
    subjects.push({ id: 'weekstart', dows: [1, 2], label: 'Mondays and Tuesdays', shortLabel: 'Monday and Tuesday' });

    A.metrics.forEach(function (m) {
      subjects.forEach(function (subj) {
        var inSet = [], outSet = [], inDays = [];
        A.series(m.key).forEach(function (p) {
          if (subj.dows.indexOf(p.day.dow) >= 0) { inSet.push(p.v); inDays.push(p.day); }
          else outSet.push(p.v);
        });
        if (inSet.length < GATE.dayOfWeek.minOccurrences || outSet.length < 20) return;
        out.push({
          type: 'time', detector: 'dayOfWeek', metric: m, subject: subj,
          inSet: inSet, outSet: outSet, inDays: inDays, gate: GATE.dayOfWeek
        });
      });
    });
    return out;
  }

  /* Type 2. Rank correlation between two metrics on the same day. */
  function detectRelationships() {
    var out = [];
    var keys = A.metrics.map(function (m) { return m.key; });
    for (var i = 0; i < keys.length; i++) {
      for (var j = i + 1; j < keys.length; j++) {
        var mx = A.metric(keys[i]), my = A.metric(keys[j]);
        if (mx.group === my.group) continue;            // same family says little
        /* Read the pair in the order the behaviours happen. Phone use and
         * work finish come before sleep and spending, so they belong on the
         * left of the sentence. This is presentation order, not a claim
         * about cause. */
        if ((mx.order || 5) > (my.order || 5)) { var tmp = mx; mx = my; my = tmp; }
        var xs = [], ys = [], days = [];
        D.days.forEach(function (d) {
          var a = mx.get(d), b = my.get(d);
          if (a == null || b == null || isNaN(a) || isNaN(b)) return;
          xs.push(a); ys.push(b); days.push(d);
        });
        if (xs.length < GATE.relationship.minDays) continue;
        out.push({ type: 'relationship', detector: 'relationship', mx: mx, my: my, xs: xs, ys: ys, days: days, gate: GATE.relationship });
      }
    }
    return out;
  }

  /* Type 3. The most recent window against the window before it. */
  function detectChange() {
    var out = [], w = 28;
    A.metrics.forEach(function (m) {
      var recent = A.values(m.key, D.last(w));
      var prior = A.values(m.key, D.previous(w));
      if (recent.length < GATE.change.minWindow || prior.length < GATE.change.minWindow) return;
      out.push({ type: 'change', detector: 'change', metric: m, window: w, inSet: recent, outSet: prior, gate: GATE.change });
    });
    return out;
  }

  /* Type 4. Something that barely moves is a finding in its own right. */
  function detectStability() {
    var out = [];
    A.metrics.forEach(function (m) {
      var v = A.values(m.key);
      if (v.length < GATE.stability.minDays) return;
      /* A measure that is zero most days is not stable, it is mostly absent. */
      var present = v.filter(function (x) { return x > 0; }).length / v.length;
      if (present < 0.7) return;
      var mu = A.mean(v), s = A.sd(v);
      /* A clock time measured against a 24 hour span looks stable no matter
       * what it does, so times are judged in minutes instead. */
      var isTime = m.unit === 'clock' || m.unit === 'duration' || m.unit === 'minutes';
      if (isTime) {
        if (s > GATE.stability.maxSpreadMinutes) return;
      } else {
        if (!mu || s / Math.abs(mu) > GATE.stability.maxCv) return;
      }
      out.push({ type: 'stability', detector: 'stability', metric: m, values: v,
        cv: isTime ? s / 120 : s / Math.abs(mu), sd: s, mean: mu, gate: GATE.stability });
    });
    return out;
  }

  /* Type 5. One day, and only one, that sits outside everything else in the
   * record. "Your highest in six months" has to be literally true, so the
   * day must be the record maximum as well as a statistical outlier. */
  function detectExceptions() {
    var out = [];
    var recentIso = {};
    D.last(GATE.exception.withinDays).forEach(function (d) { recentIso[d.iso] = true; });
    A.metrics.forEach(function (m) {
      var pts = A.series(m.key);
      if (pts.length < 90) return;
      var vals = pts.map(function (p) { return p.v; });
      var max = Math.max.apply(null, vals), min = Math.min.apply(null, vals);
      var best = null;
      A.outliers(vals).forEach(function (o) {
        if (!recentIso[pts[o.i].day.iso]) return;
        if (Math.abs(o.z) < GATE.exception.minZ) return;
        if (o.v !== max && o.v !== min) return;          // must be the extreme itself
        if (!best || Math.abs(o.z) > Math.abs(best.z)) best = o;
      });
      if (!best) return;
      out.push({ type: 'exception', detector: 'exception', metric: m, day: pts[best.i].day,
        z: best.z, value: best.v, values: vals, gate: GATE.exception });
    });
    return out;
  }

  /* Type 6. Today's behaviour against tomorrow's. */
  function detectSequences() {
    var out = [];
    var leads = ['workEndMin', 'phoneLateMin', 'screenMin', 'steps', 'spendTotal'];
    var follows = ['sleepMin', 'onsetClock', 'spendTotal', 'steps', 'screenMin'];
    leads.forEach(function (lk) {
      follows.forEach(function (fk) {
        if (lk === fk) return;
        var ml = A.metric(lk), mf = A.metric(fk);
        var xs = [], ys = [], days = [];
        for (var i = 0; i < D.days.length - 1; i++) {
          var a = ml.get(D.days[i]), b = mf.get(D.days[i + 1]);
          if (a == null || b == null || isNaN(a) || isNaN(b)) continue;
          xs.push(a); ys.push(b); days.push(D.days[i]);
        }
        if (xs.length < GATE.sequence.minPairs) return;
        out.push({ type: 'sequence', detector: 'sequence', ml: ml, mf: mf, xs: xs, ys: ys, days: days, gate: GATE.sequence });
      });
    });
    return out;
  }

  /* ---------------------------------------------------------- qualification
   * Each candidate is measured on sample, effect, consistency, robustness
   * and recency. Anything that fails a gate is dropped here and never
   * reaches the interface.
   */
  function qualifyGroups(c) {
    var g = c.gate;
    var inM = A.mean(c.inSet), outM = A.mean(c.outSet);
    var diff = inM - outM;
    var rel = pctChange(inM, outM);
    var d = A.cohensD(c.inSet, c.outSet);
    var p = A.welchP(c.inSet, c.outSet);
    if (Math.abs(d) < g.minD && Math.abs(rel) < g.minRelative) return null;
    if (p > g.maxP) return null;

    // Robustness. Recompute with the extremes trimmed off both groups.
    var tIn = A.trimmedMean(c.inSet, 0.12), tOut = A.trimmedMean(c.outSet, 0.12);
    var trimmedDiff = tIn - tOut;
    var survives = diff ? trimmedDiff / diff : 0;
    var outlierDriven = survives < ROBUST_FLOOR;

    return {
      inMean: inM, outMean: outM, diff: diff, relative: rel, d: d, p: p,
      trimmedDiff: trimmedDiff, survives: survives, outlierDriven: outlierDriven,
      n: c.inSet.length, nOther: c.outSet.length
    };
  }

  /* How many weeks the pattern actually held. A finding that is true on
   * average but only shows up in half the weeks is not a pattern. */
  function weeklyConsistency(c, direction) {
    var wks = A.weeks(), hit = 0, counted = 0;
    wks.forEach(function (wk) {
      var inV = [], outV = [];
      wk.forEach(function (d) {
        var v = c.metric.get(d);
        if (v == null || isNaN(v)) return;
        if (c.subject.dows.indexOf(d.dow) >= 0) inV.push(v); else outV.push(v);
      });
      if (!inV.length || outV.length < 2) return;
      counted++;
      var delta = A.mean(inV) - A.mean(outV);
      if (direction > 0 ? delta > 0 : delta < 0) hit++;
    });
    return { weeks: hit, ofWeeks: counted, share: counted ? hit / counted : 0 };
  }

  /* Has it held recently? A pattern that has faded is reported as a change,
   * not as a current habit. */
  function recencyOf(c, direction) {
    var half = Math.floor(D.days.length / 2);
    var recentDays = D.days.slice(half), earlyDays = D.days.slice(0, half);
    function delta(days) {
      var a = [], b = [];
      days.forEach(function (d) {
        var v = c.metric.get(d);
        if (v == null || isNaN(v)) return;
        if (c.subject.dows.indexOf(d.dow) >= 0) a.push(v); else b.push(v);
      });
      return (a.length && b.length) ? A.mean(a) - A.mean(b) : 0;
    }
    var r = delta(recentDays), e = delta(earlyDays);
    var ratio = e ? r / e : 1;
    var status = ratio < 0.25 ? 'fading' : ratio > 1.6 ? 'strengthening' : 'holding';
    return { recent: r, earlier: e, ratio: ratio, status: status };
  }

  function gradeEvidence(q, n) {
    if (n < 12 || q.p > 0.05) return 'thin';
    if (q.p < 0.01 && n >= 20 && !q.outlierDriven) return 'strong';
    return 'some';
  }

  /* ------------------------------------------------------------ enrichment */

  /* Which categories account for the gap, largest first. */
  function categoryContributors(inDays, outDays) {
    var inTx = A.byCategory(A.transactions(inDays));
    var outTx = A.byCategory(A.transactions(outDays));
    var perIn = inDays.length, perOut = outDays.length;
    return inTx.map(function (row, i) {
      var a = row.total / perIn, b = outTx[i].total / perOut;
      return { category: row.category, label: D.categoryLabel[row.category], perDayIn: a, perDayOut: b, diff: a - b };
    }).sort(function (x, y) { return Math.abs(y.diff) - Math.abs(x.diff); });
  }

  /* When in the day the extra spending happens. */
  function timingProfile(inDays) {
    var tx = A.transactions(inDays);
    var buckets = A.byHourBucket(tx, 3);
    var total = buckets.reduce(function (a, b) { return a + b.total; }, 0) || 1;
    var evening = tx.filter(function (t) { return t.minute >= 1080 && t.minute < 1320; });
    return {
      buckets: buckets,
      eveningShare: evening.reduce(function (a, t) { return a + t.amount; }, 0) / total,
      eveningCount: evening.length,
      totalCount: tx.length,
      perDay: tx.length / Math.max(1, inDays.length)
    };
  }

  /* What else moves on the same days. This is the "why might this be
   * happening" layer, and it is association only. */
  function companions(inDays, excludeKey, alsoExclude) {
    var isoIn = {};
    inDays.forEach(function (d) { isoIn[d.iso] = true; });
    var out = [];
    A.metrics.forEach(function (m) {
      if (m.key === excludeKey || m.key === alsoExclude) return;
      var a = [], b = [];
      D.days.forEach(function (d) {
        var v = m.get(d);
        if (v == null || isNaN(v)) return;
        (isoIn[d.iso] ? a : b).push(v);
      });
      if (a.length < 10 || b.length < 20) return;
      var d0 = A.cohensD(a, b), p = A.welchP(a, b);
      if (Math.abs(d0) < 0.45 || p > 0.02) return;
      out.push({ metric: m, inMean: A.mean(a), outMean: A.mean(b), diff: A.mean(a) - A.mean(b), d: d0, p: p });
    });
    return out.sort(function (x, y) { return Math.abs(y.d) - Math.abs(x.d); }).slice(0, 3);
  }

  /* ------------------------------------------------------------- assembly */
  function buildDayOfWeek(c) {
    var q = qualifyGroups(c);
    if (!q) return null;
    var direction = q.diff > 0 ? 1 : -1;
    var cons = weeklyConsistency(c, direction);
    if (cons.share < c.gate.minConsistency) return null;
    var rec = recencyOf(c, direction);
    var isoIn = {};
    c.inDays.forEach(function (d) { isoIn[d.iso] = true; });
    var outDays = D.days.filter(function (d) { return !isoIn[d.iso] && c.metric.get(d) != null; });

    var p = {
      id: 'time.' + c.metric.key + '.' + c.subject.id,
      type: 'time', metricKey: c.metric.key, metric: c.metric, subject: c.subject,
      direction: direction,
      inDays: c.inDays, outDays: outDays,
      sample: { n: q.n, nOther: q.nOther, unit: c.subject.label },
      effect: { diff: q.diff, relative: q.relative, d: q.d, inMean: q.inMean, outMean: q.outMean },
      consistency: cons, recency: rec,
      robustness: { survives: q.survives, outlierDriven: q.outlierDriven, trimmedDiff: q.trimmedDiff },
      evidence: { grade: gradeEvidence(q, q.n), p: q.p }
    };
    if (c.metric.group === 'money') {
      p.contributors = categoryContributors(c.inDays, outDays);
      p.timing = timingProfile(c.inDays);
    }
    p.companions = companions(c.inDays, c.metric.key);
    return p;
  }

  function buildRelationship(c) {
    var rho = A.spearman(c.xs, c.ys);
    var r = A.pearson(c.xs, c.ys);
    if (Math.abs(rho) < c.gate.minRho) return null;
    // A weak rank correlation beside a strong linear one means outliers.
    var outlierDriven = Math.abs(r) - Math.abs(rho) > 0.12;
    var n = c.xs.length;
    var tStat = Math.abs(rho) * Math.sqrt((n - 2) / Math.max(1e-9, 1 - rho * rho));
    var p = 2 * (1 - normCdfLocal(tStat));
    if (p > c.gate.maxP) return null;

    var hiCut = A.quantile(c.xs, 0.75), loCut = A.quantile(c.xs, 0.25);
    var hi = [], lo = [], hiDays = [];
    c.xs.forEach(function (x, i) {
      if (x >= hiCut) { hi.push(c.ys[i]); hiDays.push(c.days[i]); }
      else if (x <= loCut) lo.push(c.ys[i]);
    });
    var p2 = {
      id: 'rel.' + c.mx.key + '.' + c.my.key,
      type: 'relationship', metric: c.my, other: c.mx, metricKey: c.my.key,
      direction: rho > 0 ? 1 : -1,
      sample: { n: n, unit: 'days' },
      effect: { diff: A.mean(hi) - A.mean(lo), inMean: A.mean(hi), outMean: A.mean(lo), rho: rho, r: r, d: A.cohensD(hi, lo) },
      consistency: { share: Math.min(1, Math.abs(rho) / 0.7), weeks: null, ofWeeks: null },
      recency: { status: 'holding' },
      robustness: { outlierDriven: outlierDriven, survives: Math.abs(rho) / Math.max(1e-9, Math.abs(r)) },
      evidence: { grade: (p < 0.01 && n >= 60 && !outlierDriven) ? 'strong' : 'some', p: p },
      fit: A.linearFit(c.xs, c.ys),
      points: c.days.map(function (d, i) { return { day: d, x: c.xs[i], y: c.ys[i] }; }),
      inDays: hiDays
    };
    p2.companions = companions(hiDays, c.my.key, c.mx.key);
    return p2;
  }
  function normCdfLocal(z) {
    var t = 1 / (1 + 0.2316419 * z);
    var dd = 0.3989423 * Math.exp(-z * z / 2);
    return 1 - dd * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  }

  function buildChange(c) {
    var q = qualifyGroups(c);
    if (!q) return null;
    return {
      id: 'change.' + c.metric.key,
      type: 'change', metricKey: c.metric.key, metric: c.metric,
      direction: q.diff > 0 ? 1 : -1,
      window: c.window,
      inDays: D.last(c.window), outDays: D.previous(c.window),
      sample: { n: q.n, nOther: q.nOther, unit: 'days' },
      effect: { diff: q.diff, relative: q.relative, d: q.d, inMean: q.inMean, outMean: q.outMean },
      consistency: { share: 0.7 },
      recency: { status: 'current' },
      robustness: { survives: q.survives, outlierDriven: q.outlierDriven },
      evidence: { grade: gradeEvidence(q, q.n), p: q.p },
      companions: []
    };
  }

  function buildStability(c) {
    return {
      id: 'stable.' + c.metric.key,
      type: 'stability', metricKey: c.metric.key, metric: c.metric, direction: 0,
      sample: { n: c.values.length, unit: 'days' },
      effect: { diff: 0, sd: c.sd, inMean: c.mean, outMean: c.mean, cv: c.cv },
      consistency: { share: 1 - c.cv * 6 },
      recency: { status: 'holding' },
      robustness: { survives: 1, outlierDriven: false },
      evidence: { grade: c.values.length >= 100 ? 'strong' : 'some', p: 0 },
      companions: []
    };
  }

  function buildException(c) {
    return {
      id: 'exception.' + c.metric.key + '.' + c.day.iso,
      type: 'exception', metricKey: c.metric.key, metric: c.metric, day: c.day,
      direction: c.z > 0 ? 1 : -1,
      sample: { n: c.values.length, unit: 'days' },
      effect: { diff: c.value - A.median(c.values), inMean: c.value, outMean: A.median(c.values), z: c.z },
      consistency: { share: 0 },
      recency: { status: 'current' },
      robustness: { survives: 1, outlierDriven: false },
      evidence: { grade: 'some', p: 0 },
      companions: []
    };
  }

  function buildSequence(c) {
    var rho = A.spearman(c.xs, c.ys);
    if (Math.abs(rho) < c.gate.minRho) return null;
    var n = c.xs.length;
    var tStat = Math.abs(rho) * Math.sqrt((n - 2) / Math.max(1e-9, 1 - rho * rho));
    var p = 2 * (1 - normCdfLocal(tStat));
    if (p > c.gate.maxP) return null;
    var hiCut = A.quantile(c.xs, 0.75), loCut = A.quantile(c.xs, 0.25);
    var hi = [], lo = [];
    c.xs.forEach(function (x, i) { if (x >= hiCut) hi.push(c.ys[i]); else if (x <= loCut) lo.push(c.ys[i]); });
    return {
      id: 'seq.' + c.ml.key + '.' + c.mf.key,
      type: 'sequence', metricKey: c.mf.key, metric: c.mf, other: c.ml,
      direction: rho > 0 ? 1 : -1,
      sample: { n: n, unit: 'day pairs' },
      effect: { diff: A.mean(hi) - A.mean(lo), inMean: A.mean(hi), outMean: A.mean(lo), rho: rho },
      consistency: { share: Math.min(1, Math.abs(rho) / 0.7) },
      recency: { status: 'holding' },
      robustness: { outlierDriven: false, survives: 1 },
      evidence: { grade: p < 0.01 && n >= 80 ? 'strong' : 'some', p: p },
      companions: []
    };
  }

  /* ---------------------------------------------------------------- rank
   * Seven dimensions, combined internally and never shown. Effect size and
   * consistency carry the most weight, because a reliable finding nobody can
   * act on is not worth a reader's attention.
   */
  function score(p) {
    var evidence = p.evidence.grade === 'strong' ? 1 : p.evidence.grade === 'some' ? 0.6 : 0.2;
    var effect = Math.min(1, Math.abs(p.effect.d || p.effect.rho || 0) / 0.9);
    var consistency = Math.max(0, Math.min(1, p.consistency.share || 0));
    var recency = p.recency.status === 'fading' ? 0.25
      : p.recency.status === 'strengthening' ? 1
        : p.recency.status === 'current' ? 0.9 : 0.7;
    var actionable = p.metric.actionable ? 1 : 0.5;
    var novelty = p.type === 'time' ? 0.75 : p.type === 'relationship' ? 1
      : p.type === 'sequence' ? 0.9 : p.type === 'change' ? 0.85 : 0.6;
    var relevance = Math.min(1, Math.abs(p.effect.relative || 0) / 0.35) || 0.5;
    var s = evidence * 0.24 + effect * 0.22 + consistency * 0.18 + recency * 0.10 +
      actionable * 0.10 + novelty * 0.08 + relevance * 0.08;
    if (p.robustness.outlierDriven) s *= 0.45;      // heavily demoted, not hidden
    return s;
  }

  /* ------------------------------------------------------------ dedupe
   * Findings about the same metric, in the same direction, over overlapping
   * days are one finding. The clearest version is kept and the rest are
   * attached to it as related.
   */
  function dedupe(list) {
    var kept = [];
    list.forEach(function (p) {
      var dup = kept.filter(function (k) {
        if (k.type !== p.type) return false;
        /* One metric has one weekly shape. A high Friday and a low Tuesday
         * on the same measure describe the same shape from two ends, so the
         * clearer one is kept and the other becomes related. */
        if (p.type === 'time') return k.metricKey === p.metricKey;
        if (p.type === 'relationship' || p.type === 'sequence') {
          return k.metricKey === p.metricKey && k.other && p.other && k.other.group === p.other.group;
        }
        /* Two measures of the same thing spiking on one day is one unusual
         * day, not two findings. */
        if (p.type === 'exception') {
          return k.day.iso === p.day.iso && k.metric.group === p.metric.group;
        }
        if (p.type === 'stability' || p.type === 'change') {
          return k.metricKey === p.metricKey;
        }
        if (k.metric.group !== p.metric.group) return false;
        if (k.direction !== p.direction) return false;
        return overlap(k, p) > 0.5;
      })[0];
      if (dup) {
        dup.related = dup.related || [];
        dup.related.push(p);
      } else {
        kept.push(p);
      }
    });
    return kept;
  }
  function overlap(a, b) {
    if (!a.inDays || !b.inDays) return a.metricKey === b.metricKey ? 1 : 0;
    var seen = {}, hit = 0;
    a.inDays.forEach(function (d) { seen[d.iso] = true; });
    b.inDays.forEach(function (d) { if (seen[d.iso]) hit++; });
    return hit / Math.min(a.inDays.length, b.inDays.length);
  }

  /* ---------------------------------------------------------------- run */
  var cache = null;
  function discover() {
    if (cache) return cache;
    var candidates = []
      .concat(detectDayOfWeek().map(buildDayOfWeek))
      .concat(detectRelationships().map(buildRelationship))
      .concat(detectChange().map(buildChange))
      .concat(detectStability().map(buildStability))
      .concat(detectExceptions().map(buildException))
      .concat(detectSequences().map(buildSequence))
      .filter(Boolean);

    candidates.forEach(function (p) { p.score = score(p); });
    candidates.sort(function (a, b) { return b.score - a.score; });
    cache = dedupe(candidates);
    cache.forEach(function (p, i) { p.rank = i + 1; });
    return cache;
  }

  function all() { return discover(); }
  function byId(id) { return discover().filter(function (p) { return p.id === id; })[0]; }
  function top(n) {
    return discover().filter(function (p) {
      return p.evidence.grade !== 'thin' && !p.robustness.outlierDriven && p.recency.status !== 'fading';
    }).slice(0, n || 3);
  }
  function changes(n) {
    return discover().filter(function (p) { return p.type === 'change' || p.type === 'exception'; }).slice(0, n || 2);
  }
  function stats() {
    var considered = detectDayOfWeek().length + detectRelationships().length + detectChange().length +
      detectStability().length + detectExceptions().length + detectSequences().length;
    return { considered: considered, qualified: discover().length, shown: top(3).length };
  }

  BL.patterns = { all: all, top: top, byId: byId, changes: changes, stats: stats, gates: GATE };
})(typeof window !== 'undefined' ? window : globalThis);
