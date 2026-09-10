/* Baseline. Component library.
 * Views assemble these. None of them computes a finding.
 */
(function (global) {
  var BL = (global.BL = global.BL || {});
  var S = BL.stats, ch = BL.charts, E = BL.explain;

  var paths = {
    overview: '<path d="M3 13h4l2.5-7 3 14L15 13h6"/>',
    patterns: '<circle cx="6" cy="17" r="1.6"/><circle cx="11" cy="11" r="1.6"/><circle cx="16" cy="13" r="1.6"/><circle cx="20" cy="6" r="1.6"/><path d="M3 21V3"/><path d="M3 21h18"/>',
    habits: '<path d="M4 7h12a4 4 0 0 1 0 8H8"/><path d="M7 4 4 7l3 3"/><path d="M17 18l3-3-3-3"/>',
    experiments: '<path d="M9 3v6L4.5 17A2 2 0 0 0 6.2 20h11.6a2 2 0 0 0 1.7-3L15 9V3"/><path d="M8 3h8"/><path d="M7.5 14h9"/>',
    timeline: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    data: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    settings: '<path d="M4 7h9"/><path d="M17 7h3"/><path d="M4 17h4"/><path d="M12 17h8"/><circle cx="15" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    guide: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H5.5A1.5 1.5 0 0 1 4 16.5z"/><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H14a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h4.5a1.5 1.5 0 0 0 1.5-1.5z"/>',
    more: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>'
  };
  function icon(name) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (paths[name] || '') + '</svg>';
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // -------------------------------------------------------------- glossary
  var GLOSSARY = {
    baseline: { term: 'your usual', short: 'Your own normal.',
      body: 'The average of your whole record. It is the dashed line on every chart. Baseline never compares you with anyone else.' },
    together: { term: 'happen together', short: 'Two things change on the same days.',
      body: 'Baseline can see that two behaviours move at the same time. It cannot see whether one leads to the other. That is what an experiment is for.' },
    evidence: { term: 'evidence', short: 'How much of your record supports this.',
      body: 'Built from how many days were used, how big the difference is, how many weeks it held, and whether it survives removing your most unusual days.' },
    sample: { term: 'days used', short: 'How many days a finding rests on.',
      body: 'A Friday pattern can only use the Fridays in your record. More days make a finding steadier.' },
    correlation: { term: 'how closely they move', short: 'A number from zero to one.',
      body: 'Nearer one means the two rise and fall together more often. Baseline uses a rank based version, so one extreme day cannot create a relationship that is not there.' }
  };
  function term(key, text) {
    var g = GLOSSARY[key];
    if (!g) return esc(text || key);
    return '<button type="button" class="term" data-term="' + key + '" aria-label="' +
      esc((text || g.term) + ', what this means') + '">' + esc(text || g.term) + '</button>';
  }

  // ------------------------------------------------------------- fragments
  function label(text) { return '<span class="t-label">' + esc(text) + '</span>'; }

  function sectionHead(title, note, controls, lead) {
    return '<div class="section__head">' +
      '<div class="section__title"><h2 class="t-label">' + esc(title) + '</h2>' +
      (note ? '<span class="section__note">' + esc(note) + '</span>' : '') + '</div>' +
      (controls ? '<div class="section__controls">' + controls + '</div>' : '') + '</div>' +
      (lead ? '<p class="section__lead">' + lead + '</p>' : '');
  }

  function segment(name, options, active, aria) {
    return '<div class="segment" role="group"' + (aria ? ' aria-label="' + esc(aria) + '"' : '') + '>' +
      options.map(function (o) {
        return '<button type="button" data-segment="' + name + '" data-value="' + esc(o.value) +
          '" aria-pressed="' + (o.value === active) + '">' + esc(o.label) + '</button>';
      }).join('') + '</div>';
  }

  function delta(text, good) {
    var cls = good === null ? 'delta--flat' : good ? 'delta--good' : 'delta--warn';
    return '<span class="delta ' + cls + '">' + esc(text) + '</span>';
  }

  function datarows(rows) {
    return '<dl class="datarow">' + rows.map(function (r) {
      return '<div class="datarow__item"><dt>' + (r.html || esc(r.label)) + '</dt>' +
        '<dd class="num">' + esc(r.value) + '</dd></div>';
    }).join('') + '</dl>';
  }

  function empty(title, body, action) {
    return '<div class="empty"><h3>' + esc(title) + '</h3><p class="t-small">' + esc(body) + '</p>' +
      (action ? '<div style="margin-top:20px">' + action + '</div>' : '') + '</div>';
  }

  function reading(html) { return '<p class="reading">' + html + '</p>'; }

  function evidenceTag(grade) {
    var text = grade === 'strong' ? 'Strong evidence' : grade === 'some' ? 'Some evidence' : 'Not enough data';
    return '<span class="tag tag--' + grade + '">' + text + '</span>';
  }

  function disclosure(summaryText, body) {
    return '<details class="evidence">' +
      '<summary><span class="evidence__label">' + esc(summaryText) + '</span></summary>' +
      '<div class="evidence__body">' + body + '</div></details>';
  }

  /* The comparison picture that opens every finding. */
  function compareChart(cmp, maxWidth) {
    return '<div class="visual"' + (maxWidth ? ' style="max-width:' + maxWidth + 'px"' : '') + '>' +
      ch.chart({
        type: 'compare', rows: cmp.rows, caption: cmp.caption, base: cmp.base,
        aria: cmp.aria, height: cmp.rows.length * 46 + 22
      }) + '</div>';
  }

  function panel(title, note, body, foot, controls) {
    return '<section class="panel">' +
      (title ? '<header class="panel__head"><div class="section__title"><h3 class="t-label">' + esc(title) + '</h3>' +
        (note ? '<span class="section__note">' + esc(note) + '</span>' : '') + '</div>' +
        (controls || '') + '</header>' : '') +
      '<div class="panel__body">' + body + '</div>' +
      (foot ? '<footer class="panel__foot">' + foot + '</footer>' : '') +
      '</section>';
  }

  function badge(text, kind) {
    return '<span class="badge ' + (kind ? 'badge--' + kind : '') + '">' + esc(text) + '</span>';
  }

  // ------------------------------------------------------------ metric row
  function metricRow(activeKey, windowDays) {
    return '<div class="metrics" role="group" aria-label="Choose a measure">' + S.headline.map(function (k) {
      var m = S.summary(k, windowDays);
      var good = m.significant ? m.improving : null;
      var plain = !m.significant ? 'About usual'
        : S.unsign(m.metric.delta(m.diff)) + (m.diff > 0 ? ' more than usual' : ' less than usual');
      var on = k === activeKey;
      return '<button class="metric" type="button" data-metric="' + k + '" aria-pressed="' + on + '">' +
        '<span class="metric__label">' + label(m.metric.label) + '</span>' +
        '<span class="metric__value t-data-m">' + esc(m.metric.format(m.value)) + '</span>' +
        '<span class="metric__delta">' + delta(plain, good) + '</span>' +
        '<span class="metric__spark">' + ch.chart({
          type: 'sparkline', values: m.values, height: 30, className: 'chart--spark',
          color: on ? '#0A4174' : '#6EA2B3', aria: m.metric.label + ' over the last ' + windowDays + ' days'
        }) + '</span></button>';
    }).join('') + '</div>';
  }

  /* ------------------------------------------------------------- findings
   * A finding card. Picture, one sentence, how often, then the evidence
   * folded away. Everything it prints comes from the explanation object.
   */
  function findingCard(x, opts) {
    opts = opts || {};
    var p = x.pattern;
    return '<article class="finding">' +
      '<h3 class="finding__title t-section">' + esc(x.finding) + '</h3>' +
      compareChart(x.compare) +
      '<div class="finding__body">' +
      '<p class="finding__sub">' + esc(x.subtitle) + '</p>' +
      '<p class="finding__often">' + esc(x.howOften) + '</p>' +
      (x.related ? '<p class="finding__often">' + esc(x.related.lead) + '</p>' : '') +
      (opts.compact ? '' : disclosure('Show the evidence',
        datarows(x.technical) +
        '<p class="t-fine" style="margin-top:14px">' + esc(x.unknown) + '</p>')) +
      '<p class="finding__actions">' +
      '<a class="btn btn--ghost" href="#/pattern/' + p.id + '">View pattern</a>' +
      evidenceTag(p.evidence.grade) +
      '</p>' +
      '</div></article>';
  }

  BL.ui = {
    icon: icon, esc: esc, label: label, sectionHead: sectionHead, segment: segment,
    delta: delta, datarows: datarows, empty: empty, reading: reading,
    metricRow: metricRow, panel: panel, badge: badge, term: term, glossary: GLOSSARY,
    evidenceTag: evidenceTag, disclosure: disclosure, compareChart: compareChart,
    findingCard: findingCard
  };
})(typeof window !== 'undefined' ? window : globalThis);
