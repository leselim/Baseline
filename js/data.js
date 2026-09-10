/* Baseline. Demonstration dataset.
 *
 * Everything the product shows is derived from this generator. It emits
 * normalised EVENTS first, the way a real connector would, and only then
 * rolls them up into days. Nothing downstream reads a hardcoded finding.
 *
 * An event is the common shape every source is translated into:
 *
 *   { id, source, kind, date, iso, minute, value, unit, category, meta }
 *
 * minute is minutes past midnight on the local day, so a bank transaction, a
 * calendar entry and a phone session can be compared on the same axis.
 *
 * The structure written into the data on purpose, so the analysis has
 * something true to find:
 *
 *   Thursday and Friday evenings carry more food and social spending
 *   Work finishes later on Thursday and Friday
 *   Late phone use pushes sleep onset later the same night
 *   Free mornings leave room for exercise
 *   Monday sleep is short because Sunday evenings run late
 *   Three Fridays in August carry a real intervention, so the finished
 *     experiment measures an effect that is genuinely in the record
 */
(function (global) {
  var BL = (global.BL = global.BL || {});

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var rand = mulberry32(20260225);
  function gauss() {
    var u = 0, v = 0;
    while (u === 0) u = rand();
    while (v === 0) v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function pick(list) { return list[Math.floor(rand() * list.length)]; }

  // ---------------------------------------------------------------- calendar
  var DAYS = 182;                       // 26 whole weeks, so every weekday has 26
  var END = new Date(2026, 8, 8);       // Tue 8 Sep 2026, last complete day
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var DOW_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  function iso(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function dateAt(offsetFromStart) {
    var d = new Date(END);
    d.setDate(END.getDate() - (DAYS - 1 - offsetFromStart));
    return d;
  }

  // ----------------------------------------------------------------- sources
  var SOURCES = [
    { id: 'phone', name: 'Phone', kind: 'device', state: 'connected',
      reads: ['Screen time', 'When the screen was last active'],
      contributes: ['Evening activity', 'Screen time patterns'] },
    { id: 'sleep', name: 'Sleep tracker', kind: 'wearable', state: 'connected',
      reads: ['When you fell asleep', 'When you woke up'],
      contributes: ['Sleep patterns', 'Sleep and evening links'] },
    { id: 'bank', name: 'Bank account', kind: 'finance', state: 'connected',
      reads: ['Transaction time', 'Amount', 'Merchant category'],
      contributes: ['Spending patterns', 'Category patterns', 'Transaction timing'] },
    { id: 'calendar', name: 'Calendar', kind: 'productivity', state: 'connected',
      reads: ['Start and end times', 'Busy or free'],
      contributes: ['When your day starts', 'When work finishes'] },
    { id: 'movement', name: 'Step count', kind: 'wearable', state: 'connected',
      reads: ['Steps per day', 'Recorded sessions'],
      contributes: ['Movement patterns', 'Exercise timing'] },
    { id: 'location', name: 'Location', kind: 'device', state: 'available',
      reads: ['Time at home, work and elsewhere'],
      contributes: ['Travel patterns', 'Time away from home'] },
    { id: 'computer', name: 'Computer activity', kind: 'device', state: 'available',
      reads: ['Active hours', 'When work sessions end'],
      contributes: ['Work patterns', 'Late work and sleep links'] },
    { id: 'browser', name: 'Browser', kind: 'device', state: 'planned',
      reads: ['Active hours by site category'],
      contributes: ['Attention patterns'] }
  ];

  // ---------------------------------------------------------------- evenings
  // A night's phone use belongs to the evening. The sleep it relates to is
  // recorded against the following morning, so evenings are generated first.
  var lateProb = { 0: 0.62, 1: 0.12, 2: 0.10, 3: 0.10, 4: 0.30, 5: 0.44, 6: 0.42 };
  var evenings = [];
  for (var i = 0; i < DAYS + 1; i++) {
    var ed = new Date(END);
    ed.setDate(END.getDate() - (DAYS - i));
    var edw = ed.getDay();
    var lateMin = rand() < lateProb[edw] ? 30 + rand() * 55 : rand() * 12;
    evenings.push({ date: ed, dow: edw, lateMin: lateMin, isLate: lateMin >= 20 });
  }

  // ------------------------------------------------------------- transactions
  // Mean rand per category per weekday, plus the hour each category tends to
  // fall in. Evening categories are drawn from an evening distribution, which
  // is what makes "most of this happens after 18:00" a measured result.
  var SPEND = {
    food:      [110, 92, 88, 96, 128, 138, 92],
    social:    [40, 18, 22, 24, 62, 88, 72],
    transport: [45, 68, 62, 64, 74, 92, 52],
    groceries: [60, 70, 40, 85, 45, 40, 62],
    other:     [35, 40, 45, 52, 58, 60, 46]
  };
  var CATS = ['food', 'social', 'transport', 'groceries', 'other'];
  var CAT_LABEL = { food: 'Food', social: 'Social', transport: 'Transport', groceries: 'Groceries', other: 'Other' };
  var SPEND_SCALE = 1.2;

  // Where in the day each category usually lands. Evening spending on the
  // later weekdays shifts an hour or so further into the evening.
  var CAT_TIME = {
    food:      { mid: 13 * 60, spread: 200, eveningMid: 19 * 60 + 40, eveningSpread: 70, eveningShare: 0.55 },
    social:    { mid: 19 * 60, spread: 120, eveningMid: 20 * 60 + 20, eveningSpread: 80, eveningShare: 0.80 },
    transport: { mid: 9 * 60, spread: 240, eveningMid: 18 * 60, eveningSpread: 90, eveningShare: 0.30 },
    groceries: { mid: 16 * 60, spread: 180, eveningMid: 17 * 60 + 30, eveningSpread: 70, eveningShare: 0.25 },
    other:     { mid: 12 * 60, spread: 300, eveningMid: 19 * 60, eveningSpread: 120, eveningShare: 0.20 }
  };

  var MERCHANTS = {
    food: ['Kauai', 'Woolworths Cafe', 'Nandos', 'Ocean Basket', 'Seattle Coffee', 'Simply Asia'],
    social: ['Beerhouse', 'Truth Coffee', 'Yours Truly', 'The Power & the Glory', 'Tjing Tjing'],
    transport: ['Uber', 'Shell', 'MyCiTi', 'Engen', 'Bolt'],
    groceries: ['Checkers', 'Woolworths', 'Pick n Pay', 'Food Lovers'],
    other: ['Takealot', 'Clicks', 'Dis-Chem', 'Cape Union Mart', 'Netflix']
  };

  /* The finished experiment. Three Fridays in August where the intervention
   * was actually applied to the generated record, so the result the product
   * reports later is measured rather than asserted. */
  var TRIAL = { experiment: 'friday-dinner', dow: 5, isoDates: {}, effect: 0.42 };
  (function markTrial() {
    var fridays = [];
    for (var k = 0; k < DAYS; k++) {
      var d = dateAt(k);
      if (d.getDay() === 5) fridays.push(iso(d));
    }
    // the three Fridays ending four weeks before the record closes
    fridays.slice(-7, -4).forEach(function (f) { TRIAL.isoDates[f] = true; });
  })();

  var events = [];
  var eventSeq = 0;
  function emit(source, kind, date, minute, value, unit, category, meta) {
    events.push({
      id: 'e' + (++eventSeq),
      source: source, kind: kind,
      date: date, iso: iso(date),
      minute: Math.round(minute),
      value: value, unit: unit,
      category: category || null,
      meta: meta || null
    });
  }

  function drawMinute(cat, evening) {
    var t = CAT_TIME[cat];
    var m = evening
      ? t.eveningMid + gauss() * t.eveningSpread
      : t.mid + gauss() * t.spread;
    return clamp(m, 6 * 60 + 30, 23 * 60 + 30);
  }

  // ------------------------------------------------------------------- days
  var days = [];
  for (var j = 0; j < DAYS; j++) {
    var day = dateAt(j);
    var dow = day.getDay();
    var weekend = dow === 0 || dow === 6;
    var night = evenings[j];
    var dayIso = iso(day);
    var inTrial = !!TRIAL.isoDates[dayIso];

    // ---- sleep -----------------------------------------------------------
    var onsetOffset = clamp(55 + 1.0 * night.lateMin + gauss() * 26, 5, 210);
    var onsetClock = 1350 + onsetOffset;                 // 22:30 baseline
    var wake = weekend ? 470 + gauss() * 32 : 408 + gauss() * 18;
    if (dow === 1) wake -= 12;
    wake = clamp(wake, 330, 620);
    var latency = 8 + rand() * 7;
    var sleepMin = clamp(wake + 1440 - onsetClock - latency, 240, 600);

    emit('sleep', 'sleep_start', night.date, Math.min(1439, onsetClock), onsetClock, 'clock', null, null);
    emit('sleep', 'sleep_end', day, wake, sleepMin, 'minutes', null, null);

    // ---- phone -----------------------------------------------------------
    /* A real drift in the last few weeks, so recent change is something the
     * engine discovers rather than something the interface asserts. */
    var recentIndex = j - (DAYS - 26);
    var drift = recentIndex > 0 ? Math.min(1, recentIndex / 20) * 52 : 0;
    var screenMin = Math.round(clamp(205 + drift + night.lateMin * 0.55 + (weekend ? 55 : 0) + gauss() * 28, 90, 520));
    emit('phone', 'screen_time', day, 1439, screenMin, 'minutes', null, null);
    if (night.lateMin > 4) {
      emit('phone', 'late_session', night.date, 1410, Math.round(night.lateMin), 'minutes', null, null);
    }

    // ---- calendar --------------------------------------------------------
    // Work runs later on Thursday and Friday. This is the behaviour that
    // later turns up beside the spending pattern.
    var firstCommit = weekend ? null : clamp(510 + gauss() * 55, 420, 690);
    var workStart = weekend ? null : clamp((firstCommit || 540) - 18 + gauss() * 12, 400, 700);
    var lateFinishBias = (dow === 4 || dow === 5) ? 46 : 0;
    var workEnd = weekend ? null : clamp(1032 + lateFinishBias + gauss() * 42, 930, 1290);
    if (!weekend) {
      emit('calendar', 'first_commitment', day, firstCommit, firstCommit, 'clock', null, null);
      emit('calendar', 'work_end', day, workEnd, workEnd, 'clock', null, null);
      var meetings = Math.max(0, Math.round(2.4 + gauss() * 1.3));
      emit('calendar', 'meeting_count', day, firstCommit, meetings, 'count', null, null);
    }
    var socialEvent = rand() < (dow === 4 ? 0.34 : dow === 5 ? 0.48 : dow === 6 ? 0.40 : 0.10);
    if (socialEvent) emit('calendar', 'social_event', day, 19 * 60 + rand() * 120, 1, 'count', 'social', null);

    // ---- movement --------------------------------------------------------
    var pEx = weekend ? 0.45 : (firstCommit >= 540 ? 0.62 : 0.28);
    var exercise = rand() < pEx;
    var steps = Math.round(clamp(5900 + gauss() * 900 + (exercise ? 4200 + rand() * 1400 : 0) + (weekend ? 400 : 0), 1800, 19000));
    emit('movement', 'steps', day, 1439, steps, 'count', null, null);
    if (exercise) emit('movement', 'session', day, (firstCommit ? firstCommit - 70 : 540) + gauss() * 90, 1, 'count', null, null);

    // ---- transactions ----------------------------------------------------
    var spend = {}, total = 0, txns = [];
    CATS.forEach(function (cat) {
      var target = SPEND[cat][dow] * SPEND_SCALE * (1 + gauss() * 0.18);
      if (cat === 'social' && rand() < 0.35 && dow !== 4 && dow !== 5 && dow !== 6) target *= 0.25;
      if (cat === 'groceries' && rand() < 0.40) target *= 0.20;
      target = Math.max(0, target);

      // The intervention: a planned Friday dinner moves evening food down.
      if (inTrial && (cat === 'food' || cat === 'social')) target *= (1 - TRIAL.effect);

      if (target < 12) { spend[cat] = 0; return; }
      var n = target > 220 ? 3 : target > 110 ? 2 : 1;
      var catTotal = 0;
      for (var t = 0; t < n; t++) {
        var share = n === 1 ? 1 : (t === n - 1 ? 1 : 0.3 + rand() * 0.4);
        var amount = Math.max(9, Math.round(target * share / n * (n === 1 ? 1 : n * 0.6)));
        var evening = rand() < (CAT_TIME[cat].eveningShare + ((dow === 4 || dow === 5) && (cat === 'food' || cat === 'social') ? 0.18 : 0));
        var minute = drawMinute(cat, evening);
        emit('bank', 'transaction', day, minute, amount, 'rand', cat,
          { merchant: pick(MERCHANTS[cat]), trial: inTrial });
        txns.push({ minute: Math.round(minute), amount: amount, category: cat });
        catTotal += amount;
      }
      // A rare large purchase, so the outlier checks have something real to find.
      if (cat === 'other' && rand() < 0.045) {
        var big = 300 + Math.round(rand() * 900);
        var bigMin = drawMinute(cat, false);
        emit('bank', 'transaction', day, bigMin, big, 'rand', cat, { merchant: pick(MERCHANTS.other), large: true });
        txns.push({ minute: Math.round(bigMin), amount: big, category: cat });
        catTotal += big;
      }
      spend[cat] = catTotal;
      total += catTotal;
    });

    days.push({
      i: j,
      date: day, iso: dayIso,
      dow: dow, dowLabel: DOW[dow], dowFull: DOW_FULL[dow], weekend: weekend,
      sleepMin: Math.round(sleepMin),
      onsetClock: Math.round(onsetClock),
      wakeMin: Math.round(wake),
      phoneLateMin: Math.round(night.lateMin),
      lateNight: night.isLate,
      eveningLateMin: Math.round(evenings[j + 1] ? evenings[j + 1].lateMin : 0),
      screenMin: screenMin,
      steps: steps,
      exercise: exercise,
      socialEvent: socialEvent,
      firstCommitMin: firstCommit ? Math.round(firstCommit) : null,
      workStartMin: workStart ? Math.round(workStart) : null,
      workEndMin: workEnd ? Math.round(workEnd) : null,
      workMin: workEnd && workStart ? Math.round(workEnd - workStart) : null,
      spend: spend,
      spendTotal: total,
      discretionary: (spend.food || 0) + (spend.social || 0) + (spend.other || 0),
      txns: txns,
      txnCount: txns.length,
      eveningSpend: txns.filter(function (t) { return t.minute >= 1080 && t.minute < 1320; })
        .reduce(function (a, t) { return a + t.amount; }, 0),
      eveningFood: txns.filter(function (t) { return t.minute >= 1080 && (t.category === 'food' || t.category === 'social'); })
        .reduce(function (a, t) { return a + t.amount; }, 0),
      trial: inTrial ? TRIAL.experiment : null,
      sources: weekend ? 4 : 5,
      sourceNames: weekend
        ? ['Phone', 'Sleep tracker', 'Bank account', 'Step count']
        : ['Phone', 'Sleep tracker', 'Bank account', 'Step count', 'Calendar']
    });
  }

  var byIso = {};
  days.forEach(function (d) { byIso[d.iso] = d; });
  var eventsByIso = {};
  events.forEach(function (e) { (eventsByIso[e.iso] = eventsByIso[e.iso] || []).push(e); });

  BL.data = {
    days: days,
    byIso: byIso,
    events: events,
    eventsByIso: eventsByIso,
    eventsFor: function (isoDay) { return eventsByIso[isoDay] || []; },
    sources: SOURCES,
    categories: CATS,
    categoryLabel: CAT_LABEL,
    dowNames: DOW,
    dowFull: DOW_FULL,
    dowOrder: [1, 2, 3, 4, 5, 6, 0],
    dowShort: { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 0: 'Sun' },
    last: function (n) { return days.slice(Math.max(0, days.length - n)); },
    previous: function (n) { return days.slice(Math.max(0, days.length - n * 2), days.length - n); },
    latest: days[days.length - 1],
    first: days[0],
    trial: TRIAL,
    connectedSources: SOURCES.filter(function (s) { return s.state === 'connected'; }).length,
    user: {
      name: 'Nina', fullName: 'Nina Abrahams', email: 'nina@abrahams.co.za',
      city: 'Cape Town', currency: 'R', since: 'March 2026'
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
