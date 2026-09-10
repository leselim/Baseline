/* Baseline. shell, router, state, and the two pieces of guidance:
 * an inline explainer for the words, and a walkthrough for the layout.
 */
(function (global) {
  var BL = global.BL, U = BL.ui, D = BL.data;

  var NAV = [
    { group: null, items: [
      { key: 'overview', label: 'Overview', icon: 'overview' },
      { key: 'patterns', label: 'Findings', icon: 'patterns' },
      { key: 'habits', label: 'Behaviours', icon: 'habits' },
      { key: 'experiments', label: 'Experiments', icon: 'experiments' },
      { key: 'timeline', label: 'Timeline', icon: 'timeline' }
    ] },
    { group: 'Account', items: [
      { key: 'data', label: 'Your data', icon: 'data' },
      { key: 'settings', label: 'Settings', icon: 'settings' }
    ] }
  ];
  var TABS = ['overview', 'patterns', 'experiments', 'timeline'];

  var state = {
    route: 'overview',
    patternId: null,
    range: 30,
    metric: 'sleepMin',
    pair: { x: 'phoneLateMin', y: 'onsetClock' },
    day: D.latest.iso,
    filter: 'all',
    started: {},
    toggles: { weekend: true, lowconf: false, weekly: true, reminders: true, changes: false }
  };

  /* ------------------------------------------------------------------ shell */
  function wordmark(cls) {
    return '<span class="wordmark ' + (cls || '') + '"><span>Baseline</span><span class="rule"></span></span>';
  }

  function navHTML() {
    return '<nav class="nav" aria-label="Main">' +
      '<a class="nav__brand" href="#/overview" aria-label="Baseline, home">' + wordmark() + '</a>' +
      '<div class="nav__scroll">' +
      NAV.map(function (g) {
        return '<div class="nav__group">' +
          (g.group ? '<div class="nav__grouplabel">' + g.group + '</div>' : '') +
          '<ul>' + g.items.map(function (i) {
            return '<li><a class="nav__item" href="#/' + i.key + '" data-nav="' + i.key + '">' +
              U.icon(i.icon) + '<span>' + i.label + '</span></a></li>';
          }).join('') + '</ul></div>';
      }).join('') + '</div>' +
      '<div class="nav__foot">' +
      '<a class="nav__item nav__item--guide" href="#/guide" data-nav="guide" title="How to read this">' +
      U.icon('guide') + '<span>How to read this</span></a>' +
      '<div class="nav__user">' +
      '<span class="nav__avatar" aria-hidden="true">' + D.user.name.charAt(0) + '</span>' +
      '<span class="nav__userinfo"><span class="nav__username">' + D.user.fullName + '</span>' +
      '<span class="nav__usermeta">' + D.days.length + ' days recorded</span></span>' +
      '</div></div></nav>';
  }

  function chromeHTML() {
    return '<header class="topbar">' + wordmark() +
      '<a class="topbar__guide" href="#/guide" aria-label="How to read this">' + U.icon('guide') + 'Guide</a></header>';
  }

  function tabbarHTML() {
    var items = TABS.map(function (k) {
      var item = NAV[0].items.filter(function (i) { return i.key === k; })[0];
      return '<button type="button" data-nav="' + k + '">' + U.icon(item.icon) + item.label + '</button>';
    }).join('');
    return '<nav class="tabbar" aria-label="Sections">' + items +
      '<button type="button" data-sheet="open" aria-haspopup="true">' + U.icon('more') + 'More</button></nav>';
  }

  function sheetHTML() {
    var extra = [{ key: 'habits', label: 'Behaviours', icon: 'habits' },
      { key: 'guide', label: 'How to read this', icon: 'guide' },
      { key: 'data', label: 'Your data', icon: 'data' },
      { key: 'settings', label: 'Settings', icon: 'settings' }];
    return '<div class="sheet" data-sheet="close" role="dialog" aria-label="More sections" aria-hidden="true">' +
      '<div class="sheet__panel">' +
      '<div class="t-label" style="margin-bottom:8px">More</div>' +
      extra.map(function (i) {
        return '<button type="button" class="sheet__item" data-nav="' + i.key + '">' + U.icon(i.icon) + i.label + '</button>';
      }).join('') + '</div></div>';
  }

  /* ----------------------------------------------------------------- router */
  function parse() {
    var h = (location.hash || '#/overview').replace(/^#\/?/, '').split('/');
    var route = h[0] || 'overview';
    if (route === 'pattern') {
      state.route = 'pattern';
      state.patternId = h.slice(1).join('/');
    } else if (BL.views[route]) {
      state.route = route;
      state.patternId = null;
    } else {
      state.route = 'overview';
      state.patternId = null;
    }
  }

  var lastRoute = null;
  function render() {
    var view = BL.views[state.route] || BL.views.overview;
    var main = document.getElementById('view');
    var changed = lastRoute !== state.route + (state.patternId || '');
    lastRoute = state.route + (state.patternId || '');
    closeTerm();
    BL.charts.reset();
    main.classList.remove('view--enter');
    main.innerHTML = view.render(state);
    if (changed) { void main.offsetWidth; main.classList.add('view--enter'); }
    document.title = 'Baseline ' + view.title;
    document.querySelectorAll('[data-nav]').forEach(function (el) {
      var on = el.getAttribute('data-nav') === state.route;
      if (on) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current');
    });
    BL.charts.mount(main);
    if (tour.open) tour.place();
  }

  function go(route) { location.hash = '#/' + route; }

  /* ------------------------------------------------- inline word explainer */
  var termEl;
  function closeTerm() {
    if (termEl) { termEl.remove(); termEl = null; }
    document.querySelectorAll('.term[aria-expanded="true"]').forEach(function (b) {
      b.setAttribute('aria-expanded', 'false');
    });
  }
  function openTerm(btn) {
    var g = U.glossary[btn.getAttribute('data-term')];
    if (!g) return;
    closeTerm();
    btn.setAttribute('aria-expanded', 'true');
    termEl = document.createElement('div');
    termEl.className = 'termcard';
    termEl.setAttribute('role', 'dialog');
    termEl.setAttribute('aria-label', g.term);
    termEl.innerHTML = '<p class="termcard__term"></p><p class="termcard__short"></p>' +
      '<p class="termcard__body"></p><a class="btn--quiet" href="#/guide">All the words Baseline uses</a>';
    termEl.querySelector('.termcard__term').textContent = g.term;
    termEl.querySelector('.termcard__short').textContent = g.short;
    termEl.querySelector('.termcard__body').textContent = g.body;
    document.body.appendChild(termEl);

    var r = btn.getBoundingClientRect();
    var w = termEl.offsetWidth, h = termEl.offsetHeight;
    var left = Math.min(Math.max(r.left, 12), global.innerWidth - w - 12);
    var below = r.bottom + 10 + h < global.innerHeight;
    termEl.style.left = left + 'px';
    termEl.style.top = (below ? r.bottom + 10 : Math.max(12, r.top - h - 10)) + 'px';
    termEl.focus && termEl.focus();
  }

  /* -------------------------------------------------------------- walkthrough
   * Five steps, each pointing at something really on the page. It dims what
   * is not being talked about rather than covering the screen with a picture
   * of the product.
   */
  var STEPS = [
    { sel: '[data-tour-step="patterns"] .finding', title: 'What Baseline noticed',
      body: 'The picture comes first. Two bars, one group of your days against another. The words underneath say what it means.' },
    { sel: '[data-tour-step="patterns"] .evidence', title: 'The statistics are still here',
      body: 'Open this for how many days were used, how big the difference is, and how reliable it looks.' },
    { sel: '[data-tour-step="metrics"] .metrics', title: 'Your own numbers',
      body: 'Sleep, spending, screen time and steps. Choose one to change the charts below.' },
    { sel: '[data-tour-step="charts"]', title: 'The dashed line is you',
      body: 'It is your own average. Above it means more than usual for you.' },
    { sel: '.nav__item--guide, .topbar__guide', title: 'If you get stuck',
      body: 'Underlined words open where they stand. The guide explains how a finding is made.' }
  ];

  var tour = {
    open: false, i: 0, raf: null, spot: null, card: null, veil: null, lastFocus: null,

    start: function () {
      /* The walkthrough points at things that only exist on the Overview, so
       * get there first and let the view render before measuring anything. */
      if (state.route !== 'overview') { go('overview'); global.setTimeout(tour.begin, 80); return; }
      tour.begin();
    },

    begin: function () {
      tour.i = 0;
      tour.lastFocus = document.activeElement;
      tour.open = true;

      tour.veil = document.createElement('div');
      tour.veil.className = 'tour-veil';
      tour.spot = document.createElement('div');
      tour.spot.className = 'tour-spot';
      tour.card = document.createElement('div');
      tour.card.className = 'tour-card';
      tour.card.setAttribute('role', 'dialog');
      tour.card.setAttribute('aria-modal', 'true');
      tour.card.setAttribute('aria-label', 'Walkthrough');
      tour.card.tabIndex = -1;
      document.body.appendChild(tour.veil);
      document.body.appendChild(tour.spot);
      document.body.appendChild(tour.card);
      global.addEventListener('scroll', tour.follow, { passive: true });
      tour.place();
      tour.card.focus();
    },

    /* The highlight is fixed to the viewport, so it has to keep up if the
     * page moves underneath it. */
    follow: function () {
      if (!tour.open || tour.raf) return;
      tour.raf = global.requestAnimationFrame(function () {
        tour.raf = null;
        tour.spot.classList.add('tour-spot--still');
        tour.paint();
      });
    },

    place: function () {
      if (!tour.open) return;
      var step = STEPS[tour.i];
      var el = tour.find(step.sel);
      /* A step whose target has not been painted yet is worth waiting for
       * once, rather than skipping past. */
      if (!el) { global.setTimeout(tour.paint, 80); return; }
      tour.spot.classList.remove('tour-spot--still');

      var r = el.getBoundingClientRect();
      if (r.top < 70 || r.bottom > global.innerHeight - 40) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        return global.setTimeout(tour.paint, 320);
      }
      tour.paint();
    },

    find: function (sel) {
      var el = null;
      sel.split(',').some(function (s) { el = document.querySelector(s.trim()); return !!el; });
      return el;
    },

    paint: function () {
      if (!tour.open) return;
      var step = STEPS[tour.i];
      var el = tour.find(step.sel);
      if (!el) return;
      var r = el.getBoundingClientRect(), pad = 8;

      tour.spot.style.left = (r.left - pad) + 'px';
      tour.spot.style.top = (r.top - pad) + 'px';
      tour.spot.style.width = (r.width + pad * 2) + 'px';
      tour.spot.style.height = (r.height + pad * 2) + 'px';

      tour.card.innerHTML =
        '<p class="tour-card__count num">Step ' + (tour.i + 1) + ' of ' + STEPS.length + '</p>' +
        '<h2 class="tour-card__title"></h2><p class="tour-card__body"></p>' +
        '<div class="tour-card__foot">' +
        '<button class="btn--quiet" type="button" data-tour="end">Skip</button>' +
        '<div class="tour-card__nav">' +
        (tour.i > 0 ? '<button class="btn btn--ghost" type="button" data-tour="prev">Back</button>' : '') +
        '<button class="btn" type="button" data-tour="' + (tour.i === STEPS.length - 1 ? 'finish' : 'next') + '">' +
        (tour.i === STEPS.length - 1 ? 'Done' : 'Next') + '</button>' +
        '</div></div>';
      tour.card.querySelector('.tour-card__title').textContent = step.title;
      tour.card.querySelector('.tour-card__body').textContent = step.body;

      var narrow = global.innerWidth <= 720;
      if (narrow) {
        tour.card.classList.add('tour-card--sheet');
        tour.card.style.left = ''; tour.card.style.top = '';
      } else {
        tour.card.classList.remove('tour-card--sheet');
        var cw = tour.card.offsetWidth, chh = tour.card.offsetHeight;
        var below = r.bottom + 14 + chh < global.innerHeight - 12;
        var left = Math.min(Math.max(r.left, 16), global.innerWidth - cw - 16);
        tour.card.style.left = left + 'px';
        tour.card.style.top = (below ? r.bottom + 14 : Math.max(16, r.top - chh - 14)) + 'px';
      }
    },

    next: function () { if (tour.i < STEPS.length - 1) { tour.i++; tour.place(); } else tour.end(true); },
    prev: function () { if (tour.i > 0) { tour.i--; tour.place(); } },

    end: function (completed) {
      if (!tour.open) return;
      tour.open = false;
      global.removeEventListener('scroll', tour.follow);
      [tour.veil, tour.spot, tour.card].forEach(function (n) { if (n) n.remove(); });
      tour.veil = tour.spot = tour.card = null;
      if (tour.lastFocus && tour.lastFocus.focus) tour.lastFocus.focus();
    }
  };

  /* -------------------------------------------------------------- behaviour */
  function onClick(e) {
    var t = e.target;

    var tourBtn = t.closest('[data-tour]');
    if (tourBtn) {
      var act = tourBtn.getAttribute('data-tour');
      if (act === 'start') tour.start();
      else if (act === 'next') tour.next();
      else if (act === 'prev') tour.prev();
      else if (act === 'finish') tour.end(true);
      else if (act === 'end') tour.end(false);
      return;
    }

    var termBtn = t.closest('.term');
    if (termBtn) {
      e.preventDefault();
      if (termBtn.getAttribute('aria-expanded') === 'true') closeTerm(); else openTerm(termBtn);
      return;
    }
    if (!t.closest('.termcard')) closeTerm();

    var nav = t.closest('[data-nav]');
    if (nav && nav.tagName !== 'A') { go(nav.getAttribute('data-nav')); closeSheet(); return; }

    var seg = t.closest('[data-segment]');
    if (seg) {
      var name = seg.getAttribute('data-segment');
      var value = seg.getAttribute('data-value');
      if (name === 'range') state.range = parseInt(value, 10);
      if (name === 'filter') state.filter = value;
      render();
      return;
    }

    var metric = t.closest('[data-metric]');
    if (metric) { state.metric = metric.getAttribute('data-metric'); render(); return; }

    var day = t.closest('[data-day]');
    if (day) { state.day = day.getAttribute('data-day'); render(); return; }

    var pair = t.closest('[data-pair]');
    if (pair) {
      var p = pair.getAttribute('data-pair').split(',');
      state.pair = { x: p[0], y: p[1] };
      render();
      global.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    var start = t.closest('[data-start]');
    if (start) { state.started[start.getAttribute('data-start')] = true; go('experiments'); return; }

    var tog = t.closest('[data-toggle]');
    if (tog) {
      var key = tog.getAttribute('data-toggle');
      state.toggles[key] = !state.toggles[key];
      tog.setAttribute('aria-checked', state.toggles[key] ? 'true' : 'false');
      return;
    }

    if (t.closest('[data-sheet="open"]')) { openSheet(); return; }
    if (t.closest('[data-sheet="close"]') && !t.closest('.sheet__panel')) closeSheet();
  }

  function onKey(e) {
    if (e.key === 'Escape') { tour.end(false); closeTerm(); closeSheet(); return; }
    if (tour.open) {
      if (e.key === 'ArrowRight') { e.preventDefault(); tour.next(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); tour.prev(); }
      if (e.key === 'Tab') {
        var f = tour.card.querySelectorAll('button, a[href]');
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === tour.card)) {
          e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
      return;
    }
    /* Table rows behave like the buttons they are. */
    var row = e.target.closest && e.target.closest('tr[data-pair]');
    if (row && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); row.click(); }
  }

  function onChange(e) {
    var v = e.target.closest('[data-var]');
    if (!v) return;
    state.pair[v.getAttribute('data-var')] = e.target.value;
    render();
  }

  function openSheet() {
    var s = document.querySelector('.sheet');
    s.classList.add('on');
    s.setAttribute('aria-hidden', 'false');
  }
  function closeSheet() {
    var s = document.querySelector('.sheet');
    if (s) { s.classList.remove('on'); s.setAttribute('aria-hidden', 'true'); }
  }

  var rz;
  global.addEventListener('resize', function () {
    closeTerm();
    clearTimeout(rz);
    rz = setTimeout(function () { if (tour.open) tour.place(); }, 120);
  });

  /* -------------------------------------------------------------------- boot */
  function boot() {
    document.getElementById('app').insertAdjacentHTML('afterbegin', navHTML());
    document.getElementById('workspace').insertAdjacentHTML('afterbegin', chromeHTML());
    document.body.insertAdjacentHTML('beforeend', tabbarHTML() + sheetHTML());
    document.addEventListener('click', onClick);
    document.addEventListener('change', onChange);
    document.addEventListener('keydown', onKey);
    global.addEventListener('hashchange', function () { parse(); render(); closeSheet(); });
    parse();
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(typeof window !== 'undefined' ? window : globalThis);
