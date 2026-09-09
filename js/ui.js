/* Baseline: component library */
(function (global) {
  var BL = (global.BL = global.BL || {});
  var S = BL.stats, ch = BL.charts;

  /* ------------------------------------------------------------------ icons
   * Only used for navigation, where they aid recognition. Never decorative.
   */
  var paths = {
    overview: '<path d="M3 13h4l2.5-7 3 14L15 13h6"/>',
    patterns: '<circle cx="6" cy="17" r="1.6"/><circle cx="11" cy="11" r="1.6"/><circle cx="16" cy="13" r="1.6"/><circle cx="20" cy="6" r="1.6"/><path d="M3 21V3"/><path d="M3 21h18"/>',
    habits: '<path d="M4 7h12a4 4 0 0 1 0 8H8"/><path d="M7 4 4 7l3 3"/><path d="M17 18l3-3-3-3"/>',
    experiments: '<path d="M9 3v6L4.5 17A2 2 0 0 0 6.2 20h11.6a2 2 0 0 0 1.7-3L15 9V3"/><path d="M8 3h8"/><path d="M7.5 14h9"/>',
    timeline: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    data: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    settings: '<path d="M4 7h9"/><path d="M17 7h3"/><path d="M4 17h4"/><path d="M12 17h8"/><circle cx="15" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    back: '<path d="M15 6l-6 6 6 6"/>',
    more: '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>'
  };
  function icon(name) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (paths[name] || '') + '</svg>';
  }

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

  /* --------------------------------------------------------------- fragments */
  function label(text) { return '<span class="t-label">' + esc(text) + '</span>'; }

  function sectionHead(title, note, controls) {
    return '<div class="section__head">' +
      '<div class="section__title">' + label(title) + (note ? '<span class="section__note">' + esc(note) + '</span>' : '') + '</div>' +
      (controls ? '<div class="row">' + controls + '</div>' : '') + '</div>';
  }

  function segment(name, options, active) {
    return '<div class="segment" role="group">' + options.map(function (o) {
      return '<button type="button" data-segment="' + name + '" data-value="' + esc(o.value) + '" aria-pressed="' + (o.value === active) + '">' + esc(o.label) + '</button>';
    }).join('') + '</div>';
  }

  function confidence(c) {
    var bars = [1, 2, 3].map(function (i) { return '<i class="' + (i <= c.level ? 'on' : '') + '"></i>'; }).join('');
    return '<div class="confidence"><span class="t-label">Confidence</span>' +
      '<span class="confidence__bars">' + bars + '</span>' +
      '<span class="t-small" style="color:var(--text)">' + c.label + '</span></div>';
  }

  function delta(text, good) {
    var cls = good === null ? 'delta--flat' : good ? 'delta--good' : 'delta--warn';
    return '<span class="delta ' + cls + '">' + esc(text) + '</span>';
  }

  function contributors(items, fmt) {
    var max = Math.max.apply(null, items.map(function (i) { return Math.abs(i.diff); })) || 1;
    return '<div class="contrib">' + items.map(function (i) {
      var w = (Math.abs(i.diff) / max) * 100;
      var up = i.diff >= 0;
      return '<div class="contrib__row">' +
        '<span class="contrib__label">' + esc(i.label) + '</span>' +
        '<span class="contrib__track"><span class="contrib__bar ' + (up ? 'contrib__bar--up' : 'contrib__bar--down') +
        '" style="width:' + w.toFixed(1) + '%;' + (up ? 'left:0' : 'right:0') + '"></span></span>' +
        '<span class="contrib__value">' + esc(fmt(i.diff)) + '</span>' +
        '</div>';
    }).join('') + '</div>';
  }

  function datarows(rows) {
    return '<dl class="datarow">' + rows.map(function (r) {
      return '<div class="datarow__item"><dt>' + esc(r.label) + '</dt><dd>' + esc(r.value) + '</dd></div>';
    }).join('') + '</dl>';
  }

  function empty(title, body, action) {
    return '<div class="empty"><h3>' + esc(title) + '</h3><p class="t-small">' + esc(body) + '</p>' +
      (action ? '<div style="margin-top:18px">' + action + '</div>' : '') + '</div>';
  }

  /* ---------------------------------------------------------------- metrics */
  function metricRow(activeKey, windowDays) {
    var keys = ['sleep', 'spend', 'screen', 'steps'];
    return '<div class="metrics">' + keys.map(function (k) {
      var s = S.summary(k, windowDays);
      var good = s.significant ? s.improving : null;
      var deltaText = s.metric.delta(s.diff);
      return '<button class="metric" type="button" data-metric="' + k + '" aria-pressed="' + (k === activeKey) + '">' +
        '<span class="metric__label">' + label(s.metric.label) + '<span class="t-fine">' + esc(s.metric.unit) + '</span></span>' +
        '<div class="metric__value t-data-l">' + esc(s.metric.format(s.value)) + '</div>' +
        '<div class="metric__delta">' + delta(deltaText, good) + '<span>vs previous ' + windowDays + ' days</span></div>' +
        '<div class="metric__spark">' + ch.chart({ type: 'sparkline', values: s.values, height: 34, color: k === activeKey ? '#0A4174' : '#6EA2B3' }) + '</div>' +
        '</button>';
    }).join('') + '</div>';
  }

  /* --------------------------------------------------------------- insights */
  function insightBlock(ins, index) {
    var aside;
    if (ins.contributors) {
      aside = '<div>' + label('Contributors vs Wednesday') + '<div style="margin-top:12px">' +
        contributors(ins.contributors.slice(0, 4), function (v) { return (v >= 0 ? '+' : S.minus) + S.money(Math.abs(v)); }) + '</div></div>';
    } else {
      aside = '<div>' + label('Measured') + '<div style="margin-top:6px">' + datarows(ins.rows) + '</div></div>';
    }
    return '<article class="insight">' +
      '<div>' +
      '<div class="insight__index"><span class="insight__no">' + String(index + 1).padStart(2, '0') + '</span>' +
      '<span class="insight__kicker">' + esc(ins.kicker) + '</span></div>' +
      '<div class="insight__headline"><span class="t-data-xl">' + esc(ins.headline) + '</span></div>' +
      '<p class="insight__statement">' + esc(ins.statement) + '</p>' +
      '<p class="insight__detail">' + esc(ins.detail) + '</p>' +
      '<div class="insight__meta">' + confidence(ins.confidence) +
      '<span class="t-small">' + esc(ins.occurrence) + '</span>' +
      '<a class="btn--quiet" href="#/insight/' + ins.id + '" style="margin-left:auto">View pattern</a>' +
      '</div></div>' +
      '<div class="insight__aside">' + aside + '</div>' +
      '</article>';
  }

  /* ------------------------------------------------------------------ misc */
  function panel(title, note, body, foot, controls) {
    return '<section class="panel">' +
      (title ? '<header class="panel__head"><div class="section__title">' + label(title) +
        (note ? '<span class="section__note">' + esc(note) + '</span>' : '') + '</div>' +
        (controls || '') + '</header>' : '') +
      '<div class="panel__body">' + body + '</div>' +
      (foot ? '<footer class="panel__foot">' + foot + '</footer>' : '') +
      '</section>';
  }

  function badge(text, kind) {
    return '<span class="badge ' + (kind ? 'badge--' + kind : '') + '">' + esc(text) + '</span>';
  }

  BL.ui = {
    icon: icon, esc: esc, label: label, sectionHead: sectionHead, segment: segment,
    confidence: confidence, delta: delta, contributors: contributors, datarows: datarows,
    empty: empty, metricRow: metricRow, insightBlock: insightBlock, panel: panel, badge: badge
  };
})(typeof window !== 'undefined' ? window : globalThis);
