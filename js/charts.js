/* Baseline. charts
 * Hand-drawn SVG, rendered at the container's real pixel width so that
 * labels stay legible at every breakpoint. Every chart carries the same
 * dashed reference line: the reader's own baseline.
 *
 * Tooltips carry plain text only. Structure comes from data-tip (the
 * figure) and data-tip-sub (the context), which are written into the
 * tooltip with textContent, never innerHTML.
 */
(function (global) {
  var BL = (global.BL = global.BL || {});
  var registry = {};
  var seq = 0;

  var C = {
    ink: '#001D39', deep: '#0A4174', steel: '#49769F', teal: '#4E8EA2',
    mist: '#6EA2B3', sky: '#7BBDE8', pale: '#BDD8E9',
    line: 'rgba(0,29,57,0.10)', soft: 'rgba(0,29,57,0.05)', text3: '#5A7793'
  };

  /* The heat ramp is four steps of the product palette, light to dark,
   * plus one neutral for days with nothing recorded. */
  var HEAT = ['#BDD8E9', '#7BBDE8', '#49769F', '#0A4174'];
  var HEAT_EMPTY = '#EDF1F5';

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function tipAttrs(tip) {
    if (!tip) return '';
    if (typeof tip === 'string') return ' data-tip="' + esc(tip) + '"';
    return ' data-tip="' + esc(tip.value) + '"' + (tip.sub ? ' data-tip-sub="' + esc(tip.sub) + '"' : '');
  }
  function niceMax(v) {
    if (v <= 0) return 1;
    var mag = Math.pow(10, Math.floor(Math.log10(v)));
    var n = v / mag;
    var step = n <= 1.2 ? 1.2 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
    return step * mag;
  }
  function label(x, y, text, opts) {
    opts = opts || {};
    return '<text x="' + x + '" y="' + y + '" fill="' + (opts.fill || C.text3) + '" font-size="' + (opts.size || 11) +
      '" text-anchor="' + (opts.anchor || 'start') + '" font-weight="' + (opts.weight || 400) +
      '" letter-spacing="' + (opts.tracking || 0) + '">' + esc(text) + '</text>';
  }
  /* Roboto sets close enough to this factor for label placement. */
  function textWidth(text, size) { return String(text).length * size * 0.55; }

  /* Break a line into as many lines as the available width needs. */
  function wrapText(text, maxWidth, size) {
    var words = String(text).split(' '), lines = [], line = '';
    words.forEach(function (word) {
      var next = line ? line + ' ' + word : word;
      if (line && textWidth(next, size) > maxWidth) { lines.push(line); line = word; }
      else line = next;
    });
    if (line) lines.push(line);
    return lines;
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
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" height="' + h + '" role="img" aria-label="' + esc(s.aria || 'Trend') + '">' +
      '<path d="' + area + '" fill="' + col + '" opacity="0.07"/>' +
      '<path d="' + d + '" fill="none" stroke="' + col + '" stroke-width="1.25" stroke-linejoin="round"/>' +
      '<circle cx="' + x(vals.length - 1).toFixed(1) + '" cy="' + y(last).toFixed(1) + '" r="2" fill="' + col + '"/>' +
      '</svg>';
  }

  /* ------------------------------------------------------------------- line */
  function line(w, h, s) {
    var vals = s.values, labels = s.labels || [];
    var m = { t: 16, r: 14, b: 26, l: 46 };
    var iw = w - m.l - m.r, ih = h - m.t - m.b;
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    var span = max - min || 1;
    var floor = min >= 0 ? 0 : -Infinity;
    min = Math.max(floor, min - span * 0.18);
    max += span * 0.18;
    if (s.zero) min = 0;
    var x = function (i) { return m.l + (i / Math.max(1, vals.length - 1)) * iw; };
    var y = function (v) { return m.t + ih - ((v - min) / (max - min)) * ih; };

    var out = '<svg viewBox="0 0 ' + w + ' ' + h + '" height="' + h + '" role="img" aria-label="' + esc(s.aria || 'Trend chart') + '">';
    for (var g = 0; g <= 2; g++) {
      var gv = min + ((max - min) / 2) * g;
      var gy = y(gv).toFixed(1);
      out += '<line x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + gy + '" y2="' + gy + '" stroke="' + C.soft + '"/>';
      out += label(m.l - 8, +gy + 3.5, s.fmtAxis ? s.fmtAxis(gv) : Math.round(gv), { anchor: 'end' });
    }
    if (s.baseline !== undefined && s.baseline >= min && s.baseline <= max) {
      var by = y(s.baseline).toFixed(1);
      out += '<line x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + by + '" y2="' + by + '" stroke="' + C.steel +
        '" stroke-width="1" stroke-dasharray="2 4" opacity="0.9"/>';
      if (w > 420) out += label(w - m.r, +by - 7, s.baselineLabel || 'your usual', { anchor: 'end', size: 10.5, fill: C.steel });
    }
    var d = vals.map(function (v, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); }).join(' ');
    out += '<path d="' + d + ' L' + x(vals.length - 1).toFixed(1) + ' ' + (m.t + ih) + ' L' + m.l + ' ' + (m.t + ih) + ' Z" fill="' + C.sky + '" opacity="0.08"/>';
    out += '<path d="' + d + '" fill="none" stroke="' + C.deep + '" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>';

    /* Date labels are placed only where they physically fit. The widest
     * label in the set decides the spacing, so nothing can ever collide. */
    var widest = labels.reduce(function (a, t) { return Math.max(a, textWidth(t || '', 11)); }, 0);
    var slot = widest + 18;
    var every = Math.max(1, Math.ceil(slot / Math.max(1, iw / Math.max(1, vals.length - 1))));
    var lastLabelRight = -Infinity;
    vals.forEach(function (v, i) {
      var isLast = i === vals.length - 1;
      if (labels[i] && (i % every === 0 || isLast)) {
        var lx = x(i);
        var anchor = isLast ? 'end' : i === 0 ? 'start' : 'middle';
        var tw = textWidth(labels[i], 11);
        var left = anchor === 'end' ? lx - tw : anchor === 'start' ? lx : lx - tw / 2;
        var right = left + tw;
        if (left > lastLabelRight + 8 && right <= w - m.r + 2) {
          out += label(lx, h - 8, labels[i], { anchor: anchor });
          lastLabelRight = right;
        }
      }
      var tip = s.tip ? s.tip(i) : null;
      out += '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(v).toFixed(1) + '" r="9" fill="transparent"' + tipAttrs(tip) + '/>';
      if (i === vals.length - 1) out += '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(v).toFixed(1) + '" r="2.75" fill="' + C.deep + '"/>';
    });
    return out + '</svg>';
  }

  /* ------------------------------------------------------------------- bars */
  function bars(w, h, s) {
    var items = s.items;
    var m = { t: 16, r: 8, b: 28, l: 48 };
    var iw = w - m.l - m.r, ih = h - m.t - m.b;
    var max = niceMax(Math.max.apply(null, items.map(function (i) { return i.value; })));
    var step = iw / items.length;
    var bw = Math.min(46, step * 0.56);
    var y = function (v) { return m.t + ih - (v / max) * ih; };

    var out = '<svg viewBox="0 0 ' + w + ' ' + h + '" height="' + h + '" role="img" aria-label="' + esc(s.aria || 'Comparison by day') + '">';
    for (var g = 0; g <= 2; g++) {
      var gv = (max / 2) * g, gy = y(gv).toFixed(1);
      out += '<line x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + gy + '" y2="' + gy + '" stroke="' + (g === 0 ? C.line : C.soft) + '"/>';
      out += label(m.l - 8, +gy + 3.5, s.fmtAxis ? s.fmtAxis(gv) : Math.round(gv), { anchor: 'end' });
    }
    if (s.baseline) {
      var by = y(s.baseline).toFixed(1);
      out += '<line x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + by + '" y2="' + by + '" stroke="' + C.steel + '" stroke-width="1" stroke-dasharray="2 4"/>';
      if (w > 420) out += label(w - m.r, +by - 7, s.baselineLabel || 'your usual', { anchor: 'end', size: 10.5, fill: C.steel });
    }
    /* If a column is too narrow for the full name, the first letter is used
     * and the full name stays available to a screen reader and the tooltip. */
    var longest = items.reduce(function (a, it) { return Math.max(a, textWidth(it.label, 11)); }, 0);
    var shortLabels = longest + 6 > step;

    items.forEach(function (it, i) {
      var cx = m.l + step * i + step / 2;
      var top = y(it.value);
      var fill = it.highlight ? C.deep : (it.muted ? C.pale : C.mist);
      /* Bars are few enough to be reachable one by one from the keyboard. */
      out += '<rect x="' + (cx - bw / 2).toFixed(1) + '" y="' + top.toFixed(1) + '" width="' + bw.toFixed(1) +
        '" height="' + Math.max(1, m.t + ih - top).toFixed(1) + '" fill="' + fill + '" rx="2"' +
        (it.tip ? ' tabindex="0" role="img" aria-label="' + esc(it.tip.value + ', ' + (it.tip.sub || '')) + '"' : '') +
        tipAttrs(it.tip) + '/>';
      out += label(cx, h - 9, shortLabels ? it.label.charAt(0) : it.label,
        { anchor: 'middle', fill: it.highlight ? C.ink : C.text3, weight: it.highlight ? 500 : 400 });
    });
    return out + '</svg>';
  }

  /* ---------------------------------------------------------------- scatter */
  function scatter(w, h, s) {
    var pts = s.points;
    /* The axis names sit on their own line above and below the plot, so a
     * tick value can never land on top of them. */
    var m = { t: 32, r: 16, b: 44, l: 58 };
    var iw = w - m.l - m.r, ih = h - m.t - m.b;
    var xs = pts.map(function (p) { return p.x; }), ys = pts.map(function (p) { return p.y; });
    var xmin = Math.min.apply(null, xs), xmax = Math.max.apply(null, xs);
    var ymin = Math.min.apply(null, ys), ymax = Math.max.apply(null, ys);
    var xp = (xmax - xmin) * 0.06 || 1, yp = (ymax - ymin) * 0.08 || 1;
    /* Padding an axis below zero would invent values that cannot exist, such
     * as negative minutes of phone use. Counts stop at zero. */
    var xFloor = Math.min.apply(null, xs) >= 0 ? 0 : -Infinity;
    var yFloor = Math.min.apply(null, ys) >= 0 ? 0 : -Infinity;
    xmin = Math.max(xFloor, xmin - xp); xmax += xp;
    ymin = Math.max(yFloor, ymin - yp); ymax += yp;
    var X = function (v) { return m.l + ((v - xmin) / (xmax - xmin)) * iw; };
    var Y = function (v) { return m.t + ih - ((v - ymin) / (ymax - ymin)) * ih; };

    var out = '<svg viewBox="0 0 ' + w + ' ' + h + '" height="' + h + '" role="img" aria-label="' + esc(s.aria || 'Relationship between two measures') + '">';
    for (var g = 0; g <= 3; g++) {
      var gv = ymin + ((ymax - ymin) / 3) * g, gy = Y(gv).toFixed(1);
      out += '<line x1="' + m.l + '" x2="' + (w - m.r) + '" y1="' + gy + '" y2="' + gy + '" stroke="' + C.soft + '"/>';
      out += label(m.l - 8, +gy + 3.5, s.fmtY(gv), { anchor: 'end' });
    }
    /* How many values fit along the bottom depends on how wide the widest
     * one is. Four on a laptop, two on a small phone. */
    var sampleX = [xmin, (xmin + xmax) / 2, xmax].map(function (v) { return textWidth(s.fmtX(v), 11); });
    var widestX = Math.max.apply(null, sampleX);
    var xTicks = Math.max(2, Math.min(4, Math.floor(iw / (widestX + 22))));
    for (var k = 0; k < xTicks; k++) {
      var xv = xmin + ((xmax - xmin) / (xTicks - 1)) * k;
      out += label(X(xv), h - 24, s.fmtX(xv), { anchor: k === 0 ? 'start' : k === xTicks - 1 ? 'end' : 'middle' });
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
        '" opacity="' + (p.accent ? 0.95 : 0.6) + '"' + tipAttrs(p.tip) + '/>';
    });
    out += label(w, h - 5, s.xLabel, { anchor: 'end', size: 11.5, fill: C.steel });
    out += label(0, 12, s.yLabel, { anchor: 'start', size: 11.5, fill: C.steel });
    return out + '</svg>';
  }


  /* ---------------------------------------------------------------- compare
   * Two or three labelled bars, read left to right. This is the picture that
   * opens every observation in the product: it answers "more or less than
   * what?" before a single word is read.
   */
  function compare(w, h, s) {
    var rows = s.rows;
    var valueW = Math.max.apply(null, rows.map(function (r) { return textWidth(r.display, 14); })) + 10;
    var longest = Math.max.apply(null, rows.map(function (r) { return textWidth(r.label, 13); }));
    /* Side by side only while the label fits beside a bar worth drawing.
     * Otherwise the label moves above its bar, which always fits. */
    var stacked = w < 340 || longest + 12 > w - valueW - 96;
    var labelW = stacked ? 0 : longest + 14;
    var rowH = stacked ? 52 : 46;
    var barH = 14;
    var pad = 2;
    /* The caption wraps rather than running off the edge, so a long one can
     * never overflow a narrow phone. */
    var capLines = s.caption ? wrapText(s.caption, w, 12.5) : [];
    var trackX = labelW + pad;
    var trackW = Math.max(40, w - trackX - valueW - 10);
    /* Bars are measured from a base the caller supplies. Zero for counts and
     * money; an hour of the evening for clock times, so two bedtimes an hour
     * apart look an hour apart. */
    var base = s.base || 0;
    var max = Math.max.apply(null, rows.map(function (r) { return Math.abs(r.value - base); })) || 1;
    var height = rows.length * rowH + (capLines.length ? capLines.length * 16 + 6 : 0);

    var out = '<svg viewBox="0 0 ' + w + ' ' + height + '" height="' + height +
      '" role="img" aria-label="' + esc(s.aria || 'Comparison') + '">';

    rows.forEach(function (r, i) {
      var top = i * rowH;
      var barY = stacked ? top + 22 : top + (rowH - barH) / 2 - 2;
      var fill = r.accent ? C.deep : C.pale;
      var bw = Math.max(3, (Math.abs(r.value - base) / max) * trackW);

      if (stacked) {
        out += label(0, top + 13, r.label, { size: 13, fill: r.accent ? C.ink : C.text3, weight: r.accent ? 500 : 400 });
        out += '<rect x="0" y="' + barY + '" width="' + (w - valueW - 8).toFixed(1) + '" height="' + barH +
          '" rx="3" fill="' + C.soft + '"/>';
        out += '<rect x="0" y="' + barY + '" width="' +
          Math.max(3, (Math.abs(r.value - base) / max) * (w - valueW - 8)).toFixed(1) + '" height="' + barH +
          '" rx="3" fill="' + fill + '"' + tipAttrs(r.tip) + '/>';
        out += label(w, barY + barH - 2, r.display, { anchor: 'end', size: 14, fill: C.ink, weight: 500 });
      } else {
        out += label(labelW - 12, barY + barH - 3, r.label, {
          anchor: 'end', size: 13, fill: r.accent ? C.ink : C.text3, weight: r.accent ? 500 : 400
        });
        out += '<rect x="' + trackX + '" y="' + barY + '" width="' + trackW.toFixed(1) + '" height="' + barH +
          '" rx="3" fill="' + C.soft + '"/>';
        out += '<rect x="' + trackX + '" y="' + barY + '" width="' + bw.toFixed(1) + '" height="' + barH +
          '" rx="3" fill="' + fill + '"' + tipAttrs(r.tip) + '/>';
        out += label(w, barY + barH - 3, r.display, { anchor: 'end', size: 14, fill: C.ink, weight: 500 });
      }
    });

    capLines.forEach(function (lineText, i) {
      out += label(0, rows.length * rowH + 12 + i * 16, lineText, { size: 12.5, fill: C.text3 });
    });
    return out + '</svg>';
  }

  /* ---------------------------------------------------------------- heatmap
   * One calendar grid. Columns are weeks, rows are weekdays with Monday at
   * the top. Everything in the drawing, weekday labels, month labels, cells
   * and legend, is placed with the same two functions, colX and rowY, so the
   * header can never drift away from the grid it describes.
   */
  function heatScale(days, valueFn) {
    var vals = [];
    days.forEach(function (d) {
      var v = valueFn(d);
      if (v !== null && v !== undefined && !isNaN(v)) vals.push(v);
    });
    vals.sort(function (a, b) { return a - b; });
    var uniq = vals.filter(function (v, i) { return i === 0 || v !== vals[i - 1]; });

    if (!uniq.length) {
      return { discrete: true, steps: [], level: function () { return -1; } };
    }
    /* Few distinct values (a count of connected sources, say) read better as
     * themselves than as quartiles. */
    if (uniq.length <= HEAT.length) {
      return {
        discrete: true,
        steps: uniq,
        level: function (v) {
          if (v === null || v === undefined || isNaN(v)) return -1;
          return uniq.indexOf(v);
        }
      };
    }
    var cuts = [0.25, 0.5, 0.75].map(function (q) { return vals[Math.floor(vals.length * q)]; });
    return {
      discrete: false,
      steps: cuts,
      level: function (v) {
        if (v === null || v === undefined || isNaN(v)) return -1;
        var i = 0;
        while (i < cuts.length && v > cuts[i]) i++;
        return i;
      }
    };
  }

  function heatmap(w, h, s) {
    var days = s.days;
    var gap = 3;
    var m = { t: 20, r: 4, b: 30, l: 34 };
    var rows = 7;

    /* Monday-first offset, so row 0 really is Monday whatever day the
     * record happens to start on. */
    var offset = (days[0].date.getDay() + 6) % 7;
    var cols = Math.ceil((offset + days.length) / 7);

    var avail = Math.max(120, w - m.l - m.r);
    var size = Math.max(11, Math.min(18, Math.floor(avail / cols) - gap));
    var step = size + gap;
    var gridW = cols * step - gap;
    var gridRight = m.l + gridW;
    var height = m.t + rows * step - gap + m.b;

    function colX(col) { return m.l + col * step; }
    function rowY(row) { return m.t + row * step; }

    /* Months are worked out before the drawing starts, because the widest
     * trailing label decides how much room the picture needs. A month is
     * named at the first column it occupies; months holding a single column
     * are left unnamed rather than crowded against their neighbour. */
    var monthAt = {}, order = [];
    for (var col = 0; col < cols; col++) {
      var idx = Math.max(0, col * 7 - offset);
      if (idx >= days.length) break;
      var d0 = days[idx].date;
      var key = d0.getFullYear() + '-' + d0.getMonth();
      if (!monthAt[key]) { monthAt[key] = { col: col, days: 0, date: d0 }; order.push(key); }
    }
    /* A month is only worth naming if it holds a real part of the record;
     * two stray days at either end would only crowd its neighbour. */
    days.forEach(function (d) {
      var k = d.date.getFullYear() + '-' + d.date.getMonth();
      if (monthAt[k]) monthAt[k].days++;
    });
    var marks = [], lastRight = -Infinity;
    order.forEach(function (key) {
      var mo = monthAt[key];
      if (mo.days < 4) return;
      var text = s.monthLabel ? s.monthLabel(mo.date) : '';
      var x = colX(mo.col);
      if (x < lastRight + 8) return;
      marks.push({ x: x, text: text });
      lastRight = x + textWidth(text, 10.5);
    });
    var width = Math.max(gridRight + m.r, lastRight + m.r);

    var scale = heatScale(days, s.value);
    function fill(level) { return level < 0 ? HEAT_EMPTY : HEAT[Math.min(HEAT.length - 1, level)]; }

    var out = '<svg viewBox="0 0 ' + width + ' ' + height + '" width="' + width + '" height="' + height +
      '" role="img" aria-label="' + esc(s.aria || 'Daily record') + '">';

    /* Weekday labels, centred on their own rows. */
    [['Mon', 0], ['Wed', 2], ['Fri', 4]].forEach(function (d) {
      out += label(m.l - 9, rowY(d[1]) + size / 2 + 3.5, d[0], { anchor: 'end', size: 10.5 });
    });

    marks.forEach(function (mk) { out += label(mk.x, m.t - 7, mk.text, { size: 10.5 }); });

    /* Cells. */
    days.forEach(function (d, i) {
      var slot = i + offset;
      var c = Math.floor(slot / 7), r = slot % 7;
      var v = s.value(d);
      var tip = s.tip ? s.tip(d) : null;
      out += '<rect x="' + colX(c).toFixed(1) + '" y="' + rowY(r).toFixed(1) +
        '" width="' + size + '" height="' + size + '" rx="2" fill="' + fill(scale.level(v)) + '"' + tipAttrs(tip) + '/>';
    });

    /* Legend, right-aligned to the last column of the grid it explains. */
    var ly = m.t + rows * step - gap + 21;
    var sw = 10, sgap = 3;
    if (scale.discrete && s.legendLabel) {
      var items = scale.steps.map(function (v, i) { return { text: s.legendLabel(v), level: i }; });
      var totalW = items.reduce(function (a, it) { return a + sw + 5 + textWidth(it.text, 10.5) + 14; }, 0) - 14;
      var lx = Math.max(m.l, gridRight - totalW);
      items.forEach(function (it) {
        out += '<rect x="' + lx + '" y="' + (ly - sw + 1) + '" width="' + sw + '" height="' + sw + '" rx="2" fill="' + fill(it.level) + '"/>';
        out += label(lx + sw + 5, ly, it.text, { size: 10.5 });
        lx += sw + 5 + textWidth(it.text, 10.5) + 14;
      });
    } else {
      var less = s.legendLow || 'Less', more = s.legendHigh || 'More';
      var rampW = HEAT.length * (sw + sgap) - sgap;
      var total = textWidth(less, 10.5) + 7 + rampW + 7 + textWidth(more, 10.5);
      var lx2 = Math.max(m.l, gridRight - total);
      out += label(lx2, ly, less, { size: 10.5 });
      var rx = lx2 + textWidth(less, 10.5) + 7;
      HEAT.forEach(function (col2, i) {
        out += '<rect x="' + (rx + i * (sw + sgap)) + '" y="' + (ly - sw + 1) + '" width="' + sw + '" height="' + sw + '" rx="2" fill="' + col2 + '"/>';
      });
      out += label(rx + rampW + 7, ly, more, { size: 10.5 });
    }
    return out + '</svg>';
  }

  /* -------------------------------------------------------------- day strip
   * A single day, midnight to midnight. Sleep that begins after midnight
   * belongs to the following day, so it is drawn as a short band at the far
   * right and named honestly rather than clamped out of existence.
   */
  function daystrip(w, h, s) {
    var m = { l: 8, r: 8, t: 20, b: 18 };
    var iw = w - m.l - m.r;
    var X = function (min) { return m.l + (Math.max(0, Math.min(1440, min)) / 1440) * iw; };
    var y = m.t + 6;
    var out = '<svg viewBox="0 0 ' + w + ' ' + h + '" height="' + h + '" role="img" aria-label="' + esc(s.aria || 'Day at a glance') + '">';
    out += '<rect x="' + m.l + '" y="' + y + '" width="' + iw + '" height="8" rx="2" fill="rgba(0,29,57,0.05)"/>';
    (s.spans || []).forEach(function (sp) {
      if (sp.to <= sp.from) return;
      var x1 = X(sp.from), x2 = X(sp.to);
      out += '<rect x="' + x1.toFixed(1) + '" y="' + y + '" width="' + Math.max(2, x2 - x1).toFixed(1) +
        '" height="8" rx="2" fill="' + sp.color + '"' + tipAttrs(sp.tip) + '/>';
    });
    (s.marks || []).forEach(function (mk) {
      var mx = X(mk.at);
      var anchor = mx < 30 ? 'start' : mx > w - 30 ? 'end' : 'middle';
      out += '<line x1="' + mx.toFixed(1) + '" x2="' + mx.toFixed(1) + '" y1="' + (y - 5) + '" y2="' + (y + 13) + '" stroke="' + C.ink + '" stroke-width="1"/>';
      out += label(mx, y - 9, mk.label, { anchor: anchor, size: 10, fill: C.ink });
    });
    [0, 6, 12, 18, 24].forEach(function (hh) {
      out += label(X(hh * 60), h - 4, hh === 24 ? '24:00' : String(hh).padStart(2, '0') + ':00',
        { anchor: hh === 0 ? 'start' : hh === 24 ? 'end' : 'middle', size: 10 });
    });
    return out + '</svg>';
  }

  var renderers = { sparkline: sparkline, line: line, bars: bars, scatter: scatter,
    heatmap: heatmap, daystrip: daystrip, compare: compare };

  /* ------------------------------------------------------------- lifecycle */
  function reset() { registry = {}; seq = 0; }

  function chart(spec) {
    var id = 'c' + (++seq);
    registry[id] = spec;
    var h = spec.height || 200;
    return '<div class="chart ' + (spec.className || '') + '" data-chart="' + id + '" style="min-height:' + h + 'px"></div>';
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
    raf = requestAnimationFrame(function () { hide(); mount(document); });
  });

  /* --------------------------------------------------------------- tooltip
   * Works on hover, on keyboard focus and on touch. Text only, and always
   * kept inside the viewport.
   */
  var tip, tipTarget;
  function ensureTip() {
    if (!tip) {
      tip = document.createElement('div');
      tip.className = 'tooltip';
      tip.setAttribute('role', 'status');
      tip.innerHTML = '<b></b><span></span>';
      document.body.appendChild(tip);
    }
    return tip;
  }
  function show(target) {
    var el = ensureTip();
    tipTarget = target;
    el.firstChild.textContent = target.getAttribute('data-tip') || '';
    el.lastChild.textContent = target.getAttribute('data-tip-sub') || '';
    el.classList.add('on');
    var r = target.getBoundingClientRect();
    var tw = el.offsetWidth, th = el.offsetHeight;
    var left = r.left + r.width / 2;
    left = Math.min(Math.max(left, tw / 2 + 8), global.innerWidth - tw / 2 - 8);
    var top = r.top - 8;
    var flip = top - th < 8;
    el.classList.toggle('tooltip--below', flip);
    el.style.left = left + 'px';
    el.style.top = (flip ? r.bottom + 8 : top) + 'px';
  }
  function hide() {
    if (tip) tip.classList.remove('on');
    tipTarget = null;
  }
  function targetOf(e) { return e.target && e.target.closest ? e.target.closest('[data-tip]') : null; }

  document.addEventListener('mouseover', function (e) { var t = targetOf(e); if (t) show(t); });
  document.addEventListener('mouseout', function (e) { if (targetOf(e)) hide(); });
  document.addEventListener('focusin', function (e) { var t = targetOf(e); if (t) show(t); });
  document.addEventListener('focusout', function (e) { if (targetOf(e)) hide(); });
  document.addEventListener('touchstart', function (e) {
    var t = targetOf(e);
    if (t && t !== tipTarget) { show(t); } else { hide(); }
  }, { passive: true });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); });
  global.addEventListener('scroll', hide, { passive: true });

  BL.charts = { chart: chart, mount: mount, reset: reset, textWidth: textWidth, colors: C, heat: HEAT, heatEmpty: HEAT_EMPTY, heatScale: heatScale };
})(typeof window !== 'undefined' ? window : globalThis);
