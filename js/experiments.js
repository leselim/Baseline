/* Baseline. Experiments.
 *
 * An experiment always points back at the pattern that suggested it. The
 * result is measured from the record, not asserted: the finished experiment
 * below compares the days the intervention actually ran against the reader's
 * other comparable days.
 */
(function (global) {
  var BL = (global.BL = global.BL || {});
  var D = BL.data, A = BL.analysis, S = BL.stats, P = BL.patterns, E = BL.explain;

  /* What each kind of finding suggests trying. Written as an invitation,
   * never as an instruction. */
  var IDEAS = {
    eveningSpend: {
      question: 'What happens if the evening is planned earlier?',
      action: 'Decide on dinner before you leave work.',
      measure: 'eveningSpend', measureLabel: 'Evening spending',
      weeks: 3
    },
    discretionary: {
      question: 'What happens if there is a set amount for the evening?',
      action: 'Set an amount for food and going out before the day starts.',
      measure: 'discretionary', measureLabel: 'Food and social spending',
      weeks: 3
    },
    spendTotal: {
      question: 'What happens if the day is planned in advance?',
      action: 'Plan the evening before you leave work.',
      measure: 'spendTotal', measureLabel: 'Spending',
      weeks: 3
    },
    phoneLateMin: {
      question: 'What happens if the phone goes away earlier?',
      action: 'Put your phone in another room from 23:00.',
      measure: 'onsetClock', measureLabel: 'When you fall asleep',
      weeks: 3
    },
    onsetClock: {
      question: 'What happens if the phone goes away earlier?',
      action: 'Put your phone in another room from 23:00.',
      measure: 'onsetClock', measureLabel: 'When you fall asleep',
      weeks: 3
    },
    screenMin: {
      question: 'What happens if the evening starts without a screen?',
      action: 'Leave the phone charging in another room after dinner.',
      measure: 'screenMin', measureLabel: 'Screen time',
      weeks: 3
    },
    sleepMin: {
      question: 'What happens if the evening before is shorter?',
      action: 'Start winding down thirty minutes earlier.',
      measure: 'sleepMin', measureLabel: 'Sleep',
      weeks: 3
    },
    steps: {
      question: 'What happens if a morning is kept free?',
      action: 'Keep two mornings a week clear before 09:00.',
      measure: 'steps', measureLabel: 'Steps',
      weeks: 4
    }
  };

  /* An experiment Baseline could suggest, built from a pattern. */
  function proposalFor(pattern) {
    var idea = IDEAS[pattern.metricKey] || IDEAS[pattern.other && pattern.other.key];
    if (!idea) return null;
    var m = A.metric(idea.measure);
    return {
      id: 'try.' + pattern.id,
      status: 'suggested',
      patternId: pattern.id,
      pattern: pattern,
      why: E.finding(pattern),
      question: idea.question,
      action: idea.action,
      measure: m, measureLabel: idea.measureLabel,
      weeks: idea.weeks,
      scope: pattern.type === 'time' ? pattern.subject.label : 'the days it happens',
      baselineLabel: 'Your usual ' + (pattern.type === 'time' ? pattern.subject.label : 'days')
    };
  }

  /* The finished experiment. The dataset carries a real intervention on three
   * Fridays, so this comparison is a measurement rather than a claim. */
  function completed() {
    var trialIso = D.trial.isoDates;
    var trialDays = D.days.filter(function (d) { return trialIso[d.iso]; });
    if (!trialDays.length) return [];
    var dow = trialDays[0].dow;
    var controlDays = D.days.filter(function (d) { return d.dow === dow && !trialIso[d.iso]; });

    var m = A.metric('eveningSpend');
    var before = A.mean(A.values('eveningSpend', controlDays));
    var after = A.mean(A.values('eveningSpend', trialDays));
    var d = A.cohensD(A.values('eveningSpend', trialDays), A.values('eveningSpend', controlDays));

    var pattern = P.byId('time.eveningSpend.thufri') || P.top(1)[0];
    return [{
      id: 'done.friday-dinner',
      status: 'complete',
      patternId: pattern ? pattern.id : null,
      pattern: pattern,
      why: 'Your evening spending is higher at the end of the week.',
      question: 'What happens if the evening meal is decided earlier?',
      action: 'Decide on dinner before leaving work.',
      measure: m, measureLabel: 'Evening spending',
      weeks: 3,
      scope: D.dowFull[dow] + 's',
      ranFrom: S.dateLabel(trialDays[0].date, { day: 'numeric', month: 'long' }),
      ranTo: S.dateLabel(trialDays[trialDays.length - 1].date, { day: 'numeric', month: 'long' }),
      result: {
        before: before, after: after, diff: after - before,
        relative: before ? (after - before) / before : 0,
        d: d,
        nTrial: trialDays.length, nControl: controlDays.length,
        direction: after < before ? 'lower' : 'higher'
      },
      limitations: [
        'Three days is a small test. Treat the size of the change as rough.',
        'Other things about those weeks were not held still.'
      ]
    }];
  }

  /* One experiment is in progress, so the loop is visible end to end. Its
   * part way figure is measured from the days that have run so far. */
  function running() {
    var pattern = P.byId('rel.phoneLateMin.onsetClock') ||
      P.all().filter(function (p) { return p.metricKey === 'onsetClock' || p.metricKey === 'phoneLateMin'; })[0];
    if (!pattern) return [];
    var elapsedDays = D.last(14);
    var priorDays = D.previous(14);
    var m = A.metric('onsetClock');
    var so = A.mean(A.values('onsetClock', elapsedDays));
    var was = A.mean(A.values('onsetClock', priorDays));
    /* If the days so far do not separate, Baseline says so rather than
     * reporting a figure that means nothing yet. */
    var tooEarly = Math.abs(A.cohensD(A.values('onsetClock', elapsedDays), A.values('onsetClock', priorDays))) < 0.3;
    return [{
      id: 'run.phone-curfew',
      status: 'running',
      patternId: pattern.id,
      pattern: pattern,
      why: E.finding(pattern),
      question: 'What happens if the phone goes away earlier?',
      action: 'Put your phone in another room from 23:00.',
      measure: m, measureLabel: 'When you fall asleep',
      weeks: 3, elapsed: 2,
      scope: 'weeknights',
      interim: { before: was, after: so, diff: so - was, tooEarly: tooEarly }
    }];
  }

  var cache = null;
  function all() {
    if (!cache) {
      var taken = {};
      running().concat(completed()).forEach(function (e) { taken[e.patternId] = true; });
      var suggestions = P.top(6).map(proposalFor).filter(function (e) {
        return e && !taken[e.patternId];
      }).slice(0, 3);
      cache = running().concat(completed()).concat(suggestions);
    }
    return cache;
  }
  function byStatus(s) { return all().filter(function (e) { return e.status === s; }); }
  function forPattern(id) { return all().filter(function (e) { return e.patternId === id; })[0]; }

  BL.experiments = { all: all, byStatus: byStatus, forPattern: forPattern, proposalFor: proposalFor };
})(typeof window !== 'undefined' ? window : globalThis);
