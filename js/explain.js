/* Baseline. Explanation layers.
 *
 * Turns a pattern object into the words the interface shows. This file may
 * not compute anything: every number it prints comes from the pattern.
 *
 * The layers, in the order a reader meets them:
 *
 *   finding        what we saw, in one short sentence
 *   compare        the same thing as a picture
 *   howOften       how many times it happened
 *   related        what accounts for it
 *   alsoHappens    what else moves on the same days
 *   unknown        what Baseline cannot tell from this
 *   technical      the evidence, for anyone who wants it
 */
(function (global) {
  var BL = (global.BL = global.BL || {});
  var D = BL.data, A = BL.analysis, S = BL.stats;

  /* Plain verbs per measure, so a finding reads like a sentence rather than
   * like a variable name. */
  var VERB = {
    spendTotal:     ['You spend more', 'You spend less'],
    discretionary:  ['You spend more on food and going out', 'You spend less on food and going out'],
    eveningSpend:   ['You spend more in the evening', 'You spend less in the evening'],
    txnCount:       ['You buy things more often', 'You buy things less often'],
    sleepMin:       ['You sleep longer', 'You sleep less'],
    onsetClock:     ['You fall asleep later', 'You fall asleep earlier'],
    wakeMin:        ['You wake up later', 'You wake up earlier'],
    screenMin:      ['You use your phone more', 'You use your phone less'],
    phoneLateMin:   ['You stay on your phone later', 'You put your phone down earlier'],
    steps:          ['You move more', 'You move less'],
    workEndMin:     ['You finish work later', 'You finish work earlier'],
    firstCommitMin: ['Your day starts later', 'Your day starts earlier'],
    workMin:        ['You work longer', 'You work less']
  };
  function verb(key, dir) {
    var v = VERB[key] || ['This goes up', 'This goes down'];
    return dir > 0 ? v[0] : v[1];
  }

  function fmt(m, v) { return m.format(v); }
  function diffText(m, v) { return S.unsign(m.delta(v)); }

  /* ------------------------------------------------------------- finding */
  function finding(p) {
    if (p.type === 'time') return verb(p.metricKey, p.direction) + ' on ' + p.subject.label + '.';
    if (p.type === 'relationship') {
      return p.other.label + ' and ' + p.metric.label.toLowerCase() + ' often happen together.';
    }
    if (p.type === 'sequence') {
      return 'A late ' + p.other.short + ' is often followed by ' + lowerFirst(effectWord(p)) + '.';
    }
    if (p.type === 'change') {
      return verb(p.metricKey, p.direction) + ' than you did a month ago.';
    }
    if (p.type === 'stability') return 'Your ' + p.metric.short + ' barely changes.';
    if (p.type === 'exception') {
      return S.longDate(p.day.date) + ' was your ' + (p.direction > 0 ? 'highest' : 'lowest') +
        ' ' + p.metric.short + ' in six months.';
    }
    return p.metric.label + '.';
  }
  function effectWord(p) {
    return p.direction > 0 ? 'more ' + p.metric.short : 'less ' + p.metric.short;
  }
  function lowerFirst(s) { return s.charAt(0).toLowerCase() + s.slice(1); }

  /* One short sentence under the picture. */
  function subtitle(p) {
    var m = p.metric;
    if (p.type === 'time') {
      return 'On those days it is ' + fmt(m, p.effect.inMean) + '. On other days it is ' +
        fmt(m, p.effect.outMean) + '.';
    }
    if (p.type === 'relationship') {
      return 'On days with the most ' + p.other.short + ' it is ' + fmt(m, p.effect.inMean) +
        '. On days with the least it is ' + fmt(m, p.effect.outMean) + '.';
    }
    if (p.type === 'sequence') {
      return 'The day after, it is ' + fmt(m, p.effect.inMean) + ' instead of ' + fmt(m, p.effect.outMean) + '.';
    }
    if (p.type === 'change') {
      return 'The last ' + p.window + ' days average ' + fmt(m, p.effect.inMean) +
        '. The ' + p.window + ' days before averaged ' + fmt(m, p.effect.outMean) + '.';
    }
    if (p.type === 'stability') {
      return 'Across ' + p.sample.n + ' days it stays within about ' + diffText(m, p.effect.sd) + ' of ' +
        fmt(m, p.effect.inMean) + '.';
    }
    if (p.type === 'exception') {
      return 'It was ' + fmt(m, p.effect.inMean) + '. A usual day is ' + fmt(m, p.effect.outMean) + '.';
    }
    return '';
  }

  /* ------------------------------------------------------------ how often */
  function howOften(p) {
    if (p.type === 'time' && p.consistency.ofWeeks) {
      return 'Seen in ' + p.consistency.weeks + ' of your last ' + p.consistency.ofWeeks + ' weeks.';
    }
    if (p.type === 'relationship') return 'Seen across ' + p.sample.n + ' days.';
    if (p.type === 'sequence') return 'Seen across ' + p.sample.n + ' pairs of days.';
    if (p.type === 'change') return 'Based on the last ' + p.window + ' days.';
    if (p.type === 'stability') return 'Seen across ' + p.sample.n + ' days.';
    if (p.type === 'exception') return 'This happened once.';
    return '';
  }

  /* -------------------------------------------------------------- picture */
  function compare(p) {
    var m = p.metric;
    var labels;
    if (p.type === 'time') labels = [p.subject.shortLabel, 'Other days'];
    else if (p.type === 'relationship') labels = ['Most ' + p.other.short, 'Least ' + p.other.short];
    else if (p.type === 'sequence') labels = ['After a high ' + p.other.short, 'After other days'];
    else if (p.type === 'change') labels = ['Last ' + (p.window || 28) + ' days', 'The month before'];
    else if (p.type === 'exception') labels = [S.dateLabel(p.day.date), 'A usual day'];
    else labels = ['Your usual', 'Your usual'];

    return {
      base: m.zeroAt,
      aria: labels[0] + ' compared with ' + labels[1],
      caption: p.type === 'time'
        ? 'Averages across ' + p.sample.n + ' ' + p.subject.label
        : 'Averages across ' + p.sample.n + ' days',
      rows: [
        { label: labels[0], value: p.effect.inMean, display: fmt(m, p.effect.inMean), accent: true },
        { label: labels[1], value: p.effect.outMean, display: fmt(m, p.effect.outMean) }
      ]
    };
  }

  /* --------------------------------------------------- what accounts for it */
  function related(p) {
    if (!p.contributors) return null;
    var top = p.contributors.filter(function (c) { return c.diff > 0; }).slice(0, 3);
    if (!top.length) return null;
    var share = top[0].diff / p.contributors.reduce(function (a, c) { return a + Math.max(0, c.diff); }, 0);
    return {
      lead: top.length > 1
        ? 'Most of the difference is ' + top[0].label.toLowerCase() + ' and ' + top[1].label.toLowerCase() + '.'
        : 'Most of the difference is ' + top[0].label.toLowerCase() + '.',
      share: share,
      rows: p.contributors.slice(0, 4).map(function (c) {
        return {
          label: c.label, value: Math.abs(c.diff), display: S.moneySigned(c.diff),
          accent: c.diff > 0 && c === p.contributors[0]
        };
      })
    };
  }

  function timing(p) {
    if (!p.timing) return null;
    var b = p.timing.buckets;
    var peak = b.reduce(function (a, x) { return x.total > a.total ? x : a; });
    return {
      lead: 'Most of it happens between ' + S.clock(peak.from) + ' and ' + S.clock(peak.to) + '.',
      eveningShare: p.timing.eveningShare,
      perDay: p.timing.perDay,
      rows: b.filter(function (x) { return x.total > 0; }).map(function (x) {
        return {
          label: S.clock(x.from) + ' to ' + S.clock(x.to),
          value: x.total, display: S.money(x.total),
          accent: x === peak
        };
      })
    };
  }

  /* --------------------------------------------- what else moves with it */
  function alsoHappens(p) {
    if (!p.companions || !p.companions.length) return null;
    return {
      lead: 'These things also change on the same days.',
      items: p.companions.map(function (c) {
        return {
          label: c.metric.label,
          sentence: companionSentence(c),
          diff: c.diff, metric: c.metric
        };
      })
    };
  }

  /* Counts read badly as "more by 1", so they get their own phrasing. */
  function companionSentence(c) {
    var m = c.metric, dir = c.diff > 0 ? 1 : -1;
    if (m.unit === 'count') {
      var n = Math.abs(c.diff);
      var one = n < 1.5;
      var amount = one ? 'about one' : 'about ' + Math.round(n);
      var noun = m.noun || 'a day';
      if (one && noun.slice(-1) === 's') noun = noun.slice(0, -1);
      return verb(m.key, dir) + ', ' + amount + ' ' + (dir > 0 ? 'more' : 'fewer') + ' ' + noun + '.';
    }
    return verb(m.key, dir) + ' by ' + diffText(m, c.diff) + '.';
  }

  /* ------------------------------------------------------ what we cannot say */
  function unknown(p) {
    if (p.robustness.outlierDriven) {
      return 'One unusual day accounts for much of this difference. Treat it carefully.';
    }
    if (p.type === 'exception') {
      return 'A single day does not make a pattern. Baseline will watch whether it repeats.';
    }
    if (p.companions && p.companions.length) {
      return 'These behaviours happen together. Baseline cannot tell from this data whether one leads to the other.';
    }
    return 'Baseline can see that this repeats. It cannot tell you why from this data alone.';
  }

  /* Possible explanations. Written as questions, never as conclusions. */
  var HYPOTHESIS = {
    workEndMin: 'A later finish may leave less time to plan an evening meal.',
    phoneLateMin: 'A later phone session may push the whole evening back.',
    screenMin: 'More screen time may be a sign of a less structured evening.',
    firstCommitMin: 'A later start may leave a free window in the morning.',
    steps: 'More movement may go with a more active day overall.',
    sleepMin: 'A shorter night may change how the next day is spent.',
    txnCount: 'More separate purchases may mean less was planned in advance.',
    spendTotal: 'A higher total may simply follow from being out for longer.',
    discretionary: 'More going out may be what the day was for.',
    wakeMin: 'A later start to the day may shift everything after it.'
  };
  function possible(p) {
    var out = [];
    (p.companions || []).forEach(function (c) {
      if (HYPOTHESIS[c.metric.key]) out.push(HYPOTHESIS[c.metric.key]);
    });
    if (p.type === 'time' && p.subject.dows.indexOf(5) >= 0 && !out.length) {
      out.push('The end of the working week may simply be when plans are made.');
    }
    return out.slice(0, 2);
  }

  /* -------------------------------------------------------- the evidence */
  var GRADE = { strong: 'Strong evidence', some: 'Some evidence', thin: 'Not enough data' };
  function evidenceLabel(p) { return GRADE[p.evidence.grade]; }

  function technical(p) {
    var rows = [
      { label: 'Days used', value: p.sample.n + ' ' + (p.type === 'time' ? p.subject.label : p.sample.unit) },
      { label: 'Size of the difference', value: diffText(p.metric, p.effect.diff) +
        (p.effect.relative ? ' (' + S.pct(p.effect.relative * 100) + ')' : '') }
    ];
    if (p.consistency.ofWeeks) {
      rows.push({ label: 'Weeks it held', value: p.consistency.weeks + ' of ' + p.consistency.ofWeeks });
    }
    if (p.effect.rho != null) {
      rows.push({ label: 'How closely they move', value: (p.effect.rho > 0 ? '+' : S.minus) + Math.abs(p.effect.rho).toFixed(2) });
    }
    if (p.effect.d != null) {
      rows.push({ label: 'Standardised effect', value: (p.effect.d > 0 ? '+' : S.minus) + Math.abs(p.effect.d).toFixed(2) });
    }
    rows.push({ label: 'Chance of a fluke', value: p.evidence.p < 0.001 ? 'Below 1 in 1000' : p.evidence.p < 0.01 ? 'Below 1 in 100' : 'Below 1 in 20' });
    rows.push({ label: 'Held after removing extremes', value: p.robustness.outlierDriven ? 'No' : 'Yes' });
    rows.push({ label: 'Still happening', value: p.recency.status === 'fading' ? 'Less often lately' : 'Yes' });
    return rows;
  }

  function explain(p) {
    return {
      pattern: p,
      finding: finding(p),
      subtitle: subtitle(p),
      howOften: howOften(p),
      compare: compare(p),
      related: related(p),
      timing: timing(p),
      alsoHappens: alsoHappens(p),
      possible: possible(p),
      unknown: unknown(p),
      evidenceLabel: evidenceLabel(p),
      technical: technical(p)
    };
  }

  BL.explain = { explain: explain, finding: finding, evidenceLabel: evidenceLabel, verb: verb };
})(typeof window !== 'undefined' ? window : globalThis);
