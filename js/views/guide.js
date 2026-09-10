/* Baseline. Guide. Reference, never a prerequisite. */
(function (global) {
  var BL = global.BL, S = BL.stats, D = BL.data, U = BL.ui, ch = BL.charts, P = BL.patterns, A = BL.analysis;

  var WHERE = [
    { key: 'overview', title: 'Overview', line: 'Start here. What Baseline noticed, and what changed.' },
    { key: 'patterns', title: 'Findings', line: 'Everything Baseline reports, and a place to compare any two things.' },
    { key: 'habits', title: 'Behaviours', line: 'What you tend to do, counted rather than remembered.' },
    { key: 'experiments', title: 'Experiments', line: 'Change one thing for a few weeks. Then see what moved.' },
    { key: 'timeline', title: 'Timeline', line: 'A single day, hour by hour.' },
    { key: 'data', title: 'Your data', line: 'What is connected, and how to take a copy.' }
  ];

  function chapter(title, body) {
    return '<article class="guide-chapter"><h3 class="t-sub">' + U.esc(title) + '</h3>' + body + '</article>';
  }

  function render() {
    var base = A.mean(A.values('sleepMin'));
    var days = D.last(30);
    var st = P.stats();

    return '' +
      '<header class="page-head">' +
      '<h1 class="t-page">How Baseline works</h1>' +
      '<p class="page-head__lead">Baseline watches a few ordinary things and tells you where they line up. ' +
      'It compares you with nobody but yourself.</p>' +
      '<p class="guide-launch"><button class="btn btn--ghost" type="button" data-tour="start">Show me around</button></p>' +
      '</header>' +

      '<section class="section">' +
      U.sectionHead('The one idea', null, null, 'If you take nothing else from this page, take this.') +
      U.panel(null, null,
        '<div class="guide-idea">' +
        '<div class="guide-idea__text">' +
        '<p class="t-body measure">Most apps compare you with a general rule. Eight hours a night. Ten thousand steps. ' +
        'Baseline does not. It works out what you normally do, then measures everything against that.</p>' +
        '<p class="t-body measure" style="margin-top:14px">That number is ' + U.term('baseline') +
        '. Right now your usual night is <strong>' + S.dur(base) + '</strong>.</p>' +
        '<p class="t-body measure" style="margin-top:12px">It is the dashed line on every chart. It is also the ' +
        'line under the word Baseline at the top of this page.</p>' +
        '</div>' +
        '<div class="guide-idea__chart">' +
        ch.chart({
          type: 'line', height: 190, values: days.map(function (d) { return d.sleepMin; }),
          labels: days.map(function (d) { return S.dateLabel(d.date); }),
          baseline: base, baselineLabel: 'your usual, ' + S.dur(base),
          fmtAxis: function (v) { return (v / 60).toFixed(1) + 'h'; },
          aria: 'Your sleep over the last 30 days against your own average',
          tip: function (i) { return { value: S.dur(days[i].sleepMin), sub: S.longDate(days[i].date) }; }
        }) +
        '<p class="chart-note">Your sleep over the last 30 days.</p>' +
        '</div></div>') +
      '</section>' +

      '<section class="section">' +
      U.sectionHead('How a finding is made', null, null, 'The same steps run every time your record updates.') +
      '<ol class="steps">' +
      '<li class="steps__item"><span class="steps__n num">1</span><span><strong>Your sources become one record.</strong> ' +
      'A bank transaction, a calendar entry and a phone session all become the same kind of event.</span></li>' +
      '<li class="steps__item"><span class="steps__n num">2</span><span><strong>Baseline looks for candidates.</strong> ' +
      'Days of the week, pairs of behaviours, recent change, things that stay still, and unusual days.</span></li>' +
      '<li class="steps__item"><span class="steps__n num">3</span><span><strong>Most are thrown away.</strong> ' +
      'This time it looked at ' + st.considered + ' possible findings and kept ' + st.qualified +
      '. Anything too small, too rare, or caused by one unusual day is dropped.</span></li>' +
      '<li class="steps__item"><span class="steps__n num">4</span><span><strong>What is left is ranked and explained.</strong> ' +
      'Then Baseline suggests one thing you could test.</span></li>' +
      '</ol>' +
      '</section>' +

      '<section class="section">' +
      U.sectionHead('Reading the charts', null, null, 'There are only four kinds.') +
      '<div class="guide-chapters">' +
      chapter('Two bars, for a comparison',
        '<p class="t-small">This is how every finding opens. One group of your days against another. ' +
        'The dark bar is the group the finding is about.</p>') +
      chapter('A line, for change over time',
        '<p class="t-small">Time runs left to right. The solid line is what happened. The dashed line is your usual. ' +
        'What matters is how long the solid line stays on one side.</p>') +
      chapter('A cloud of dots, for two things at once',
        '<p class="t-small">One dot is one day. If the dots slope, the two tend to move together. ' +
        'If they sit in a shapeless cloud, they do not.</p>') +
      chapter('A grid of squares, for a calendar',
        '<p class="t-small">Every square is one day. Columns are weeks. Rows run Monday at the top down to Sunday. ' +
        'Darker means more.</p>') +
      '</div></section>' +

      '<section class="section">' +
      U.sectionHead('What Baseline can and cannot tell you', null, null, 'The difference matters.') +
      '<div class="grid-2 plain-pair">' +
      '<div><h3 class="t-sub">What it can see</h3>' +
      '<ul class="ticklist">' +
      '<li>That two things happen on the same days.</li>' +
      '<li>How often that repeated, and across how many days.</li>' +
      '<li>How far a day sits from what is normal for you.</li>' +
      '<li>Whether something changed after you deliberately changed it.</li>' +
      '</ul></div>' +
      '<div><h3 class="t-sub">What it cannot</h3>' +
      '<ul class="ticklist ticklist--no">' +
      '<li>That one thing caused another. No product can see that from a record alone.</li>' +
      '<li>What is healthy. There are no targets here and no scores.</li>' +
      '<li>Anything about a day it has no data for.</li>' +
      '<li>How you felt.</li>' +
      '</ul></div>' +
      '</div>' +
      U.reading('This is why Baseline keeps offering experiments. Two things happening together is a question. ' +
        'An experiment is how you answer it.') +
      '</section>' +

      '<section class="section">' +
      U.sectionHead('Where to find things', null, null, 'Six screens.') +
      '<div class="wherelist">' + WHERE.map(function (w) {
        return '<a class="where" href="#/' + w.key + '">' +
          '<span class="where__icon">' + U.icon(w.key) + '</span>' +
          '<span class="where__body"><span class="where__title">' + U.esc(w.title) + '</span>' +
          '<span class="where__line">' + U.esc(w.line) + '</span></span></a>';
      }).join('') + '</div>' +
      '</section>' +

      '<section class="section">' +
      U.sectionHead('The words Baseline uses', null, null,
        'Each one is marked wherever it appears. Select it to read it there and then.') +
      '<dl class="glossary">' + Object.keys(U.glossary).map(function (k) {
        var g = U.glossary[k];
        return '<div class="glossary__item"><dt>' + U.esc(g.term) + '</dt>' +
          '<dd><span class="glossary__short">' + U.esc(g.short) + '</span> ' + U.esc(g.body) + '</dd></div>';
      }).join('') + '</dl>' +
      '</section>';
  }

  BL.views = BL.views || {};
  BL.views.guide = { title: 'How Baseline works', render: render };
})(typeof window !== 'undefined' ? window : globalThis);
