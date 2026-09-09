/* Baseline: dataset
 * A single seeded generator produces every number in the product.
 * Views never hardcode figures; they read from BL.data and BL.stats.
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

  // ---------------------------------------------------------------- calendar
  var DAYS = 133;                       // 19 full weeks of history
  var END = new Date(2026, 8, 8);       // Tue 8 Sep 2026, last complete day
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function iso(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  // -------------------------------------------------------------- evenings
  // Evening behaviour is generated first: a night's phone use belongs to the
  // evening, but the sleep it affects is recorded on the following morning.
  var lateProb = { 0: 0.62, 1: 0.12, 2: 0.10, 3: 0.08, 4: 0.18, 5: 0.40, 6: 0.42 };

  var evenings = [];
  for (var i = 0; i < DAYS + 1; i++) {
    var d = new Date(END);
    d.setDate(END.getDate() - (DAYS - i));
    var dw = d.getDay();
    var late = rand() < lateProb[dw];
    var lateMin = late ? 30 + rand() * 55 : rand() * 12;
    evenings.push({ date: d, dow: dw, lateMin: lateMin, isLate: lateMin >= 20 });
  }

  // ------------------------------------------------------------------ spend
  // Mean rand per category per weekday. Friday/Wednesday ratio ≈ 1.40.
  var SPEND = {
    food:      [110, 92, 88, 96, 105, 120, 88],
    social:    [40, 18, 22, 24, 45, 76, 70],
    transport: [45, 68, 62, 64, 72, 92, 52],
    groceries: [60, 95, 40, 85, 45, 40, 62],
    other:     [35, 40, 45, 52, 60, 60, 46]
  };
  var SPEND_SCALE = 1.2;
  var CATS = ['food', 'social', 'transport', 'groceries', 'other'];

  // ------------------------------------------------------------------- days
  var days = [];
  for (var j = 0; j < DAYS; j++) {
    var day = new Date(END);
    day.setDate(END.getDate() - (DAYS - 1 - j));
    var dow = day.getDay();
    var weekend = dow === 0 || dow === 6;
    var night = evenings[j];               // the evening before this morning

    // sleep onset, clock minutes from midnight of the previous evening
    var onsetOffset = 55 + 1.0 * night.lateMin + gauss() * 26;
    onsetOffset = clamp(onsetOffset, 5, 210);
    var onsetClock = 1350 + onsetOffset;   // 22:30 baseline

    // wake, earlier on Mondays, later at weekends
    var wake = weekend ? 470 + gauss() * 32 : 408 + gauss() * 18;
    if (dow === 1) wake -= 12;
    wake = clamp(wake, 330, 620);

    var latency = 8 + rand() * 7;
    var sleepMin = wake + 1440 - onsetClock - latency;
    sleepMin = clamp(sleepMin, 240, 600);

    // calendar
    var firstCommit = weekend ? null : clamp(510 + gauss() * 55, 420, 690);
    var workStart = weekend ? null : clamp((firstCommit || 540) - 18 + gauss() * 12, 400, 700);
    var workEnd = weekend ? null : clamp(1050 + gauss() * 45, 930, 1260);

    // exercise, more likely when the first commitment is after 09:00
    var pEx = weekend ? 0.45 : (firstCommit >= 540 ? 0.62 : 0.28);
    var exercise = rand() < pEx;

    // steps
    var steps = 5900 + gauss() * 900 + (exercise ? 4200 + rand() * 1400 : 0) + (weekend ? 400 : 0);
    steps = Math.round(clamp(steps, 1800, 19000));

    // screen time
    var screenMin = 205 + night.lateMin * 0.55 + (weekend ? 55 : 0) + gauss() * 28;
    screenMin = Math.round(clamp(screenMin, 90, 460));

    // spending
    var spend = {}, total = 0;
    for (var c = 0; c < CATS.length; c++) {
      var cat = CATS[c];
      var base = SPEND[cat][dow] * SPEND_SCALE;
      var v = base * (1 + gauss() * 0.22);
      if (cat === 'social' && rand() < 0.35 && dow !== 5 && dow !== 6) v *= 0.25;
      if (cat === 'groceries' && rand() < 0.4) v *= 0.2;
      if (cat === 'other' && rand() < 0.05) v += 300 + rand() * 700;
      v = Math.max(0, Math.round(v));
      spend[cat] = v;
      total += v;
    }

    days.push({
      i: j,
      date: day,
      iso: iso(day),
      dow: dow,
      dowLabel: DOW[dow],
      weekend: weekend,
      sleepMin: Math.round(sleepMin),
      onsetClock: Math.round(onsetClock),
      wakeMin: Math.round(wake),
      phoneLateMin: Math.round(night.lateMin),   // previous evening, past 23:30
      lateNight: night.isLate,
      eveningLateMin: Math.round(evenings[j + 1] ? evenings[j + 1].lateMin : 0),
      screenMin: screenMin,
      steps: steps,
      exercise: exercise,
      firstCommitMin: firstCommit ? Math.round(firstCommit) : null,
      workStartMin: workStart ? Math.round(workStart) : null,
      workEndMin: workEnd ? Math.round(workEnd) : null,
      workMin: workEnd && workStart ? Math.round(workEnd - workStart) : null,
      spend: spend,
      spendTotal: total,
      discretionary: spend.food + spend.social + spend.other
    });
  }

  // --------------------------------------------------------------- accessors
  var byIso = {};
  days.forEach(function (d) { byIso[d.iso] = d; });

  BL.data = {
    days: days,
    byIso: byIso,
    categories: CATS,
    dowNames: DOW,
    dowOrder: [1, 2, 3, 4, 5, 6, 0],
    dowShort: { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 0: 'Sun' },
    last: function (n) { return days.slice(Math.max(0, days.length - n)); },
    previous: function (n) { return days.slice(Math.max(0, days.length - n * 2), days.length - n); },
    latest: days[days.length - 1],
    first: days[0],
    user: {
      name: 'Nina',
      fullName: 'Nina Abrahams',
      email: 'nina@abrahams.co.za',
      city: 'Cape Town',
      currency: 'R',
      since: 'March 2026'
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
