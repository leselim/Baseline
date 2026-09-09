/* Baseline: shell, router, state */
(function (global) {
  var BL = global.BL, U = BL.ui, D = BL.data;

  var NAV = [
    { group: null, items: [
      { key: 'overview', label: 'Overview', icon: 'overview' },
      { key: 'patterns', label: 'Patterns', icon: 'patterns' },
      { key: 'habits', label: 'Habits', icon: 'habits' },
      { key: 'experiments', label: 'Experiments', icon: 'experiments' },
      { key: 'timeline', label: 'Timeline', icon: 'timeline' }
    ] },
    { group: 'Account', items: [
      { key: 'data', label: 'Data', icon: 'data' },
      { key: 'settings', label: 'Settings', icon: 'settings' }
    ] }
  ];
  var TABS = ['overview', 'patterns', 'experiments', 'timeline'];

  var state = {
    route: 'overview',
    insightId: null,
    range: 30,
    metric: 'sleep',
    pair: { x: 'phoneLate', y: 'onset' },
    day: D.latest.iso,
    filter: 'all',
    started: {},
    toggles: { weekend: true, lowconf: false, weekly: true, reminders: true, changes: false },
    sheet: false
  };

  /* ------------------------------------------------------------------ shell */
  function wordmark(cls) {
    return '<span class="wordmark ' + (cls || '') + '"><span>Baseline</span><span class="rule"></span></span>';
  }

  function navHTML() {
    return '<nav class="nav" aria-label="Main">' +
      '<a class="nav__brand" href="#/overview" aria-label="Baseline, home">' + wordmark() + '</a>' +
      NAV.map(function (g) {
        return '<div class="nav__group">' +
          (g.group ? '<div class="nav__grouplabel">' + g.group + '</div>' : '') +
          '<ul>' + g.items.map(function (i) {
            return '<li><a class="nav__item" href="#/' + i.key + '" data-nav="' + i.key + '">' +
              U.icon(i.icon) + '<span>' + i.label + '</span></a></li>';
          }).join('') + '</ul></div>';
      }).join('') +
      '<div class="nav__foot"><div class="nav__user">' +
      '<span class="nav__avatar">' + D.user.name.charAt(0) + '</span>' +
      '<span class="nav__userinfo"><span class="nav__username">' + D.user.fullName + '</span><br>' +
      '<span class="nav__usermeta">' + D.days.length + ' days recorded</span></span>' +
      '</div></div></nav>';
  }

  function chromeHTML() {
    return '<header class="topbar">' + wordmark() +
      '<span class="topbar__meta">' + D.days.length + ' days recorded</span></header>';
  }

  function tabbarHTML() {
    var items = TABS.map(function (k) {
      var item = NAV[0].items.filter(function (i) { return i.key === k; })[0];
      return '<button type="button" data-nav="' + k + '">' + U.icon(item.icon) + item.label + '</button>';
    }).join('');
    return '<nav class="tabbar" aria-label="Sections">' + items +
      '<button type="button" data-sheet="open">' + U.icon('more') + 'More</button></nav>';
  }

  function sheetHTML() {
    var extra = [{ key: 'habits', label: 'Habits', icon: 'habits' },
      { key: 'data', label: 'Data', icon: 'data' },
      { key: 'settings', label: 'Settings', icon: 'settings' }];
    return '<div class="sheet" data-sheet="close"><div class="sheet__panel">' +
      '<div class="t-label" style="margin-bottom:8px">More</div>' +
      extra.map(function (i) {
        return '<div class="sheet__item" data-nav="' + i.key + '">' + U.icon(i.icon) + i.label + '</div>';
      }).join('') + '</div></div>';
  }

  /* ----------------------------------------------------------------- router */
  function parse() {
    var h = (location.hash || '#/overview').replace(/^#\/?/, '').split('/');
    var route = h[0] || 'overview';
    if (route === 'insight') {
      state.route = 'insight';
      state.insightId = h[1];
    } else if (BL.views[route]) {
      state.route = route;
      state.insightId = null;
    } else {
      state.route = 'overview';
    }
  }

  var lastRoute = null;
  function render() {
    var view = BL.views[state.route] || BL.views.overview;
    var main = document.getElementById('view');
    var changed = lastRoute !== state.route + (state.insightId || '');
    lastRoute = state.route + (state.insightId || '');
    main.classList.remove('view--enter');
    main.innerHTML = view.render(state);
    if (changed) { void main.offsetWidth; main.classList.add('view--enter'); }
    document.title = (state.route === 'insight' ? 'Pattern' : view.title) + ' · Baseline';
    document.querySelectorAll('[data-nav]').forEach(function (el) {
      var on = el.getAttribute('data-nav') === state.route;
      if (on) el.setAttribute('aria-current', 'page'); else el.removeAttribute('aria-current');
    });
    BL.charts.mount(main);
  }

  function go(route) {
    location.hash = '#/' + route;
  }

  /* -------------------------------------------------------------- behaviour */
  function onClick(e) {
    var t = e.target;

    var nav = t.closest('[data-nav]');
    if (nav && nav.tagName !== 'A') {
      go(nav.getAttribute('data-nav'));
      closeSheet();
      return;
    }

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
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    var start = t.closest('[data-start]');
    if (start) {
      state.started[start.getAttribute('data-start')] = true;
      go('experiments');
      return;
    }

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

  function onChange(e) {
    var v = e.target.closest('[data-var]');
    if (!v) return;
    state.pair[v.getAttribute('data-var')] = e.target.value;
    render();
  }

  function openSheet() { document.querySelector('.sheet').classList.add('on'); }
  function closeSheet() {
    var s = document.querySelector('.sheet');
    if (s) s.classList.remove('on');
  }

  /* -------------------------------------------------------------------- boot */
  function boot() {
    document.getElementById('app').insertAdjacentHTML('afterbegin', navHTML());
    document.getElementById('workspace').insertAdjacentHTML('afterbegin', chromeHTML());
    document.body.insertAdjacentHTML('beforeend', tabbarHTML() + sheetHTML());
    document.addEventListener('click', onClick);
    document.addEventListener('change', onChange);
    global.addEventListener('hashchange', function () { parse(); render(); closeSheet(); });
    parse();
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(typeof window !== 'undefined' ? window : globalThis);
