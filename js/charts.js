/* Baseline: charts
 * Hand-drawn SVG, rendered at the container's real pixel width so that
 * labels stay legible at every breakpoint. Every chart carries the same
 * dashed reference line: the user's own baseline.
 */
(function (global) {
  var BL = (global.BL = global.BL || {});
  var registry = {};
  var seq = 0;

  var C = {
    ink: '#001D39', deep: '#0A4174', steel: '#49769F', teal: '#4E8EA2',
    mist: '#6EA2B3', sky: '#7BBDE8', pale: '#BDD8E9',
    line: 'rgba(0,29,57,0.10)', soft: 'rgba(0,29,57,0.05)', text3: '#7791AB'
  };

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function niceMax(v) {
    if (v <= 0) return 1;
    var mag = Math.pow(10, Math.floor(Math.log10(v)));
    var n = v / mag;
    var step = n <= 1.2 ? 1.2 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
    return step * mag;
  }
  function label(x, y, text, opts) {
    opts = opts || {};
    var strokeAttr = opts.halo ? ' stroke="' + (typeof opts.halo === 'string' ? opts.halo : '#F4F6F8') + '" stroke-width="4" paint-order="stroke fill" stroke-linejoin="round"' : '';
    return '<text x="' + x + '" y="' + y + '" fill="' + (opts.fill || C.text3) + '" font-size="' + (opts.size || 11) +
      '" text-anchor="' + (opts.anchor || 'start') + '" font-weight="' + (opts.weight || 400) +
      '" letter-spacing="' + (opts.tracking || 0) + '"' + strokeAttr + '>' + esc(text) + '</text>';
  }

  /* -------------------------------------------------------------- sparkline */
  function sparkline(w, h, s) {
    var vals = s.values;
    if (!vals.length) return '';
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    var pad = (max - min) * 0.25 || 1;
    min -= pad; max += pad;
    var x = function (i) { return (i / (vals.length - 1)) * (w - 2) + 1; };
    var y = function (v) { return h - 3 - ((v - min) / (max - min)) * (h - 6); };
    var d = vals.map(function (v, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); }).join(' ');
    var area = d + ' L' + x(vals.length - 1).toFixed(1) + ' ' + h + ' L' + x(0).toFixed(1) + ' ' + h + ' Z';
    var col = s.color || C.steel;
    var last = vals[vals.length - 1];
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" height="' + h + '" role="img" aria-label="Trend">' +
      '<path d="' + area + '" fill="' + col + '" opacity="0.07"/>' +
      '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="1.25" stroke-linejoin="round"/>' +
      '<circle cx="' + x(vals.length - 1).toFixed(1) + '" cy="' + y(last).toFixed(1) + '" r="2" fill="' + col + '"/>' +
      '</svg>';
  }

  /* ------------------------------------------------------------------- line */
  function line(w, h, s) {
    var vals = s.values, labels = s.labels || [];
    var hasBaselineLabel = s.baseline !== undefined && s.baselineLabel && w >= 300;
    var m = { t: hasBaselineLabel ? 20 : 14, r: hasBaselineLabel ? 145 : 14, b: 26, l: 44 };
    var iw = w - m.l - m.r, ih = h - m.t - m.b;
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    if (s.baseline !== undefined) {
      min = Math.min(min, s.baseline);
      max = Math.max(max, s.baseline);
    }
    var span = max - min || 1;
    min -= span * 0.18; max += span * 0.18;
    if (s.zero) min = 0;
    var x = function (i) { return m.l + (i / Math.max(1, vals.length - 1)) * iw; };
    var y = function (v) { return m.t + ih - ((v - min) / (max - min)) * ih; };

    var out = '<svg viewBox="0 0 ' + w + ' ' + h + '" height="' + h + '" role="img" aria-label="' + esc(s.aria || 'Trend chart') + '">';
    // horizontal grid
    for (var g = 0; g <= 2; g++) {
      var gv = min + ((max - min) / 2) * g;
      var gy = y(gv).toFixed(1);
      out += '<line x1="' + m.l + '" x2="' + (w - 8) + '" y1="' + gy + '" y2="' + gy + '" stroke="' + C.soft + '"/>';
      out += label(m.l - 8, +gy + 3.5, s.fmtAxis ? s.fmtAxis(gv) : Math.round(gv), { anchor: 'end' });
    }
    // the baseline: personal average across the whole record
    if (s.baseline !== undefined && s.baseline >= min && s.baseline <= max) {
      var by = y(s.baseline).toFixed(1);
      out += '<line x1="' + m.l + '" x2="' + (w - 8) + '" y1="' + by + '" y2="' + by + '" stroke="' + C.steel +
        '" stroke-width="1" stroke-dasharray="2 4" opacity="0.85"/>';
      if (hasBaselineLabel) out += label(w - 8, +by - 10, s.baselineLabel || 'baseline', { anchor: 'end', size: 10.5, fill: C.steel, halo: true });
    }
    var d = vals.map(function (v, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); }).join(' ');
    out += '<path d="' + d + ' L' + x(vals.length - 1).toFixed(1) + ' ' + (m.t + ih) + ' L' + m.l + ' ' + (m.t + ih) + ' Z" fill="' + C.sky + '" opacity="0.08"/>';
    out += '<path d="' + d + '" fill="none" stroke="' + C.deep + '" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>';

    // x labels, evenly thinned to fit without overlap
    var maxLabels = Math.max(2, Math.floor(iw / 72));
    var showIndices = {};
    if (vals.length <= maxLabels) {
      for (var k = 0; k < vals.length; k++) showIndices[k] = true;
    } else {
      for (var k = 0; k < maxLabels; k++) {
        var idx = Math.round(k * (vals.length - 1) / (maxLabels - 1));
        showIndices[idx] = true;
      }
    }
    vals.forEach(function (v, i) {
      if (labels[i] && showIndices[i]) {
        out += label(x(i), h - 8, labels[i], { anchor: i === vals.length - 1 ? 'end' : (i === 0 ? 'start' : 'middle') });
      }
      var tip = s.tip ? s.tip(i) : null;
      out += '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(v).toFixed(1) + '" r="9" fill="transparent"' +
        (tip ? ' data-tip="' + esc(tip) + '"' : '') + '/>';
      if (i === vals.length - 1) out += '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(v).toFixed(1) + '" r="2.75" fill="' + C.deep + '"/>';
    });
    return out + '</svg>';
  }

  /* ------------------------------------------------------------------- bars */
  function bars(w, h, s) {
    var items = s.items;
    var hasBaselineLabel = s.baseline && s.baselineLabel && w >= 300;
    var m = { t: hasBaselineLabel ? 20 : 14, r: hasBaselineLabel ? 85 : 8, b: 28, l: 46 };
    var iw = w - m.l - m.r, ih = h - m.t - m.b;
    var maxVal = Math.max.apply(null, items.map(function (i) { return i.value; }).concat(s.baseline ? [s.baseline] : []));
    var max = niceMax(maxVal);
    var step = iw / items.length;
    var bw = Math.min(46, step * 0.56);
    var y = function (v) { return m.t + ih - (v / max) * ih; };

    var out = '<svg viewBox="0 0 ' + w + ' ' + h + '" height="' + h + '" role="img" aria-label="' + esc(s.aria || 'Comparison by day') + '">';
    for (var g = 0; g <= 2; g++) {
      var gv = (max / 2) * g, gy = y(gv).toFixed(1);
      out += '<line x1="' + m.l + '" x2="' + (w - 8) + '" y1="' + gy + '" y2="' + gy + '" stroke="' + (g === 0 ? C.line : C.soft) + '"/>';
      out += label(m.l - 8, +gy + 3.5, s.fmtAxis ? s.fmtAxis(gv) : Math.round(gv), { anchor: 'end' });
    }
    if (s.baseline) {
      var by = y(s.baseline).toFixed(1);
      out += '<line x1="' + m.l + '" x2="' + (w - 8) + '" y1="' + by + '" y2="' + by + '" stroke="' + C.steel + '" stroke-width="1" stroke-dasharray="2 4"/>';
    }
    items.forEach(function (it, i) {
      var cx = m.l + step * i + step / 2;
      var top = y(it.value);
      var fill = it.highlight ? C.deep : (it.muted ? C.pale : C.mist);
      out += '<rect x="' + (cx - bw / 2).toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + bw.toFixed(1) +
        '" height="' + Math.max(1, m.t + ih - top).toFixed(1) + '" fill="' + fill + '" rx="2"' +
        (it.tip ? ' data-tip="' + esc(it.tip) + '"' : '') + '/>';
      out += label(cx, h - 9, it.label, { anchor: 'middle', fill: it.highlight ? C.ink : C.text3, weight: it.highlight ? 500 : 400 });
    });
    if (s.baseline && hasBaselineLabel) {
      var by = y(s.baseline).toFixed(1);
      out += label(w - 8, +by - 10, s.baselineLabel || 'your average', { anchor: 'end', size: 10.5, fill: C.steel, halo: true });
    }
    return out + '</svg>';
  }

  /* ---------------------------------------------------------------- scatter */
  function scatter(w, h, s) {
    var pts = s.points;
    var hasYLabel = !!s.yLabel;
    var m = { t: hasYLabel ? 32 : 16, r: 16, b: 40, l: 56 };
    var iw = w - m.l - m.r, ih = h - m.t - m.b;
    var xs = pts.map(function (p) { return p.x; }), ys = pts.map(function (p) { return p.y; });
    var xmin = Math.min.apply(null, xs), xmax = Math.max.apply(null, xs);
    var ymin = Math.min.apply(null, ys), ymax = Math.max.apply(null, ys);
    var xp = (xmax - xmin) * 0.06 || 1, yp = (ymax - ymin) * 0.08 || 1;
    xmin -= xp; xmax += xp; ymin -= yp; ymax += yp;
    var X = function (v) { return m.l + ((v - xmin) / (xmax - xmin)) * iw; };
    var Y = function (v) { return m.t + ih - ((v - ymin) / (ymax - ymin)) * ih; };

    var out = '<svg viewBox="0 0 ' + w + ' ' + h + '" height="' + h + '" role="img" aria-label="' + esc(s.aria || 'Relationship between two measures') + '">';
    for (var g = 0; g <= 3; g++) {
      var gv = ymin + ((ymax - ymin) / 3) * g, gy = Y(gv).toFixed(1);
      out += '<line x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + gy + '" y2="' + gy + '" stroke="' + C.soft + '"/>';
      out += label(m.l - 8, +gy + 3.5, s.fmtY(gv), { anchor: 'end' });
    }
    for (var k = 0; k <= 3; k++) {
      var xv = xmin + ((xmax - xmin) / 3) * k;
      out += label(X(xv), h - 20, s.fmtX(xv), { anchor: k === 0 ? 'start' : k === 3 ? 'end' : 'middle' });
    }
    if (s.fit) {
      var x1 = xmin, x2 = xmax;
      var y1 = s.fit.intercept + s.fit.slope * x1, y2 = s.fit.intercept + s.fit.slope * x2;
      y1 = Math.max(ymin, Math.min(ymax, y1)); y2 = Math.max(ymin, Math.min(ymax, y2));
      out += '<line x1="' + X(x1).toFixed(1) + '" y1="' + Y(y1).toFixed(1) + '" x2="' + X(x2).toFixed(1) + '" y2="' + Y(y2).toFixed(1) +
        '" stroke="' + C.deep + '" stroke-width="1.25" stroke-dasharray="3 3" opacity="0.9"/>';
    }
    pts.forEach(function (p) {
      out += '<circle cx="' + X(p.x).toFixed(1) + '" cy="' + Y(p.y).toFixed(1) + '" r="3.2" fill="' + (p.accent ? C.deep : C.mist) +
        '" opacity="' + (p.accent ? 0.95 : 0.6) + '"' + (p.tip ? ' data-tip="' + esc(p.tip) + '"' : '') + '/>';
    });
    out += label(w - m.r, h - 3, s.xLabel, { anchor: 'end', size: 11, fill: C.steel });
    if (s.yLabel) {
      out += label(m.l - 46, 12, s.yLabel, { anchor: 'start', size: 11, fill: C.steel });
    }
    return out + '</svg>';
  }

  /* ---------------------------------------------------------------- heatmap */
  function heatmap(w, h, s) {
    var days = s.days;                       // chronological
    var rows = 7, cols = Math.ceil(days.length / 7);
    var m = { t: 14, r: 6, b: 16, l: 30 };
    var cell = Math.min(14, Math.floor((w - m.l - m.r) / cols) - 2);
    var gap = 2.5;
    var size = cell;
    var height = m.t + rows * (size + gap) + m.b;
    var vals = days.map(s.value).filter(function (v) { return v !== null; });
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);

    var out = '<svg viewBox="0 0 ' + w + ' ' + height + '" height="' + height + '" role="img" aria-label="' + esc(s.aria || 'Daily coverage') + '">';
    ['Mon', 'Wed', 'Fri'].forEach(function (d, i) {
      out += label(m.l - 8, m.t + [0, 2, 4][i] * (size + gap) + size - 2, d, { anchor: 'end', size: 10 });
    });
    days.forEach(function (d, i) {
      var col = Math.floor(i / 7), row = i % 7;
      var v = s.value(d);
      var t = v === null ? null : (max === min ? 0.6 : (v - min) / (max - min));
      var fill = v === null ? 'rgba(0,29,57,0.04)' : mix(t);
      out += '<rect x="' + (m.l + col * (size + gap)).toFixed(1) + '" y="' + (m.t + row * (size + gap)).toFixed(1) +
        '" width="' + size + '" height="' + size + '" rx="2" fill="' + fill + '"' +
        (s.tip ? ' data-tip="' + esc(s.tip(d)) + '"' : '') + '/>';
    });
    if (s.months) {
      var lastX = -999;
      s.months.forEach(function (mo) {
        var lx = m.l + mo.col * (size + gap);
        if (lx - lastX >= 24) {
          out += label(lx, m.t - 4, mo.label, { size: 10 });
          lastX = lx;
        }
      });
    }
    return out + '</svg>';

    function mix(t) {
      // pale → deep, in the product palette
      var a = [189, 216, 233], b = [10, 65, 116];
      var e = 0.25 + t * 0.75;
      return 'rgb(' + a.map(function (c, i) { return Math.round(c + (b[i] - c) * e); }).join(',') + ')';
    }
  }

  /* -------------------------------------------------------------- day strip */
  function daystrip(w, h, s) {
    var m = { l: 8, r: 8, t: 18, b: 18 };
    var iw = w - m.l - m.r;
    var X = function (min) { return m.l + (min / 1440) * iw; };
    var y = m.t + 6;
    var out = '<svg viewBox="0 0 ' + w + ' ' + h + '" height="' + h + '" role="img" aria-label="Day at a glance">';
    out += '<rect x="' + m.l + '" y="' + y + '" width="' + iw + '" height="8" rx="2" fill="rgba(0,29,57,0.05)"/>';
    (s.spans || []).forEach(function (sp) {
      var x1 = X(Math.max(0, sp.from)), x2 = X(Math.min(1440, sp.to));
      out += '<rect x="' + x1.toFixed(1) + '" y="' + y + '" width="' + Math.max(2, x2 - x1).toFixed(1) + '" height="8" rx="2" fill="' + sp.color + '"' +
        (sp.tip ? ' data-tip="' + esc(sp.tip) + '"' : '') + '/>';
    });
    (s.marks || []).forEach(function (mk) {
      out += '<line x1="' + X(mk.at).toFixed(1) + '" x2="' + X(mk.at).toFixed(1) + '" y1="' + (y - 5) + '" y2="' + (y + 13) + '" stroke="' + C.ink + '" stroke-width="1"/>';
      out += label(X(mk.at), y - 9, mk.label, { anchor: 'middle', size: 10, fill: C.ink });
    });
    [0, 6, 12, 18, 24].forEach(function (hh) {
      out += label(X(hh * 60), h - 4, hh === 24 ? '24:00' : String(hh).padStart(2, '0') + ':00',
        { anchor: hh === 0 ? 'start' : hh === 24 ? 'end' : 'middle', size: 10 });
    });
    return out + '</svg>';
  }

  var renderers = { sparkline: sparkline, line: line, bars: bars, scatter: scatter, heatmap: heatmap, daystrip: daystrip };

  /* ------------------------------------------------------------- lifecycle */
  function chart(spec) {
    var id = 'c' + (++seq);
    registry[id] = spec;
    var h = spec.height || 200;
    return '<div class="chart" data-chart="' + id + '" style="min-height:' + h + 'px"></div>';
  }

  function mount(root) {
    (root || document).querySelectorAll('[data-chart]').forEach(function (el) {
      var spec = registry[el.getAttribute('data-chart')];
      if (!spec) return;
      var w = Math.max(220, Math.round(el.clientWidth));
      el.style.minHeight = '';
      el.innerHTML = renderers[spec.type](w, spec.height || 200, spec);
    });
  }

  var raf;
  global.addEventListener('resize', function () {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(function () { mount(document); });
  });

  /* --------------------------------------------------------------- tooltip */
  var tip;
  function ensureTip() {
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'tooltip';
      document.body.appendChild(tip);
    }
    return tip;
  }
  document.addEventListener('mouseover', function (e) {
    var t = e.target.closest ? e.target.closest('[data-tip]') : null;
    if (!t) return;
    var el = ensureTip();
    el.innerHTML = t.getAttribute('data-tip');
    var r = t.getBoundingClientRect();
    el.style.left = (r.left + r.width / 2) + 'px';
    el.style.top = (r.top - 8) + 'px';
    el.classList.add('on');
  });
  document.addEventListener('mouseout', function (e) {
    if (e.target.closest && e.target.closest('[data-tip]') && tip) tip.classList.remove('on');
  });

  BL.charts = { chart: chart, mount: mount, colors: C };
})(typeof window !== 'undefined' ? window : globalThis);
