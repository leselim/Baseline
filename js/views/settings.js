/* Baseline: Settings */
(function (global) {
  var BL = global.BL, S = BL.stats, D = BL.data, U = BL.ui;

  function field(label, help, control) {
    return '<div class="field"><div><div class="field__label">' + U.esc(label) + '</div>' +
      (help ? '<p class="field__help">' + U.esc(help) + '</p>' : '') + '</div>' +
      '<div>' + control + '</div></div>';
  }

  function toggle(id, on, label) {
    return '<div class="row" style="gap:12px"><button class="switch" type="button" role="switch" data-toggle="' + id +
      '" aria-checked="' + (on ? 'true' : 'false') + '" aria-label="' + U.esc(label) + '"></button>' +
      '<span class="t-small">' + U.esc(label) + '</span></div>';
  }

  function render(state) {
    var t = state.toggles;
    return '' +
      '<header class="page-head">' +
      '<h1 class="t-page">Settings</h1>' +
      '<p class="page-head__lead">How the platform reads your data and when it gets in touch.</p>' +
      '</header>' +

      '<section class="section">' +
      U.sectionHead('Account') +
      U.panel(null, null,
        field('Name', null, '<input class="input" style="max-width:340px" value="' + U.esc(D.user.fullName) + '">') +
        field('Email', 'Used for the weekly summary and nothing else.', '<input class="input" style="max-width:340px" value="' + U.esc(D.user.email) + '">') +
        field('Currency', 'Applied to every spending figure.', '<select class="select"><option>South African rand (R)</option><option>Pound sterling (£)</option><option>Euro (€)</option><option>US dollar ($)</option></select>') +
        field('Week starts on', null, '<select class="select"><option>Monday</option><option>Sunday</option></select>')) +
      '</section>' +

      '<section class="section">' +
      U.sectionHead('Analysis') +
      U.panel(null, null,
        field('Baseline window', 'How far back the platform looks to decide what is normal for you. Shorter windows react faster; longer windows are steadier.',
          '<select class="select"><option>30 days</option><option selected>90 days</option><option>180 days</option><option>All ' + D.days.length + ' days</option></select>') +
        field('Minimum sample', 'A pattern is not reported until it has been observed at least this many times.',
          '<select class="select"><option>8 occurrences</option><option selected>12 occurrences</option><option>20 occurrences</option></select>') +
        field('Weekend handling', 'Weekends behave differently for most people. Keeping them separate avoids diluting weekday patterns.',
          toggle('weekend', t.weekend, 'Analyse weekends separately')) +
        field('Show low-confidence patterns', 'Off by default. When on, patterns below the sample threshold appear with their confidence marked.',
          toggle('lowconf', t.lowconf, 'Include low-confidence patterns')),
        '<p class="t-fine">Changing the baseline window recalculates every figure in the product against your new reference period.</p>') +
      '</section>' +

      '<section class="section">' +
      U.sectionHead('Contact') +
      U.panel(null, null,
        field('Weekly summary', 'One email on Monday morning covering the previous week.', toggle('weekly', t.weekly, 'Send a weekly summary')) +
        field('Experiment reminders', 'A short prompt on the days an active experiment asks something of you.', toggle('reminders', t.reminders, 'Remind me during experiments')) +
        field('Notable changes', 'Only when a pattern moves by more than a quarter of its usual range.', toggle('changes', t.changes, 'Tell me when something shifts'))) +
      '</section>' +

      '<section class="section">' +
      U.sectionHead('Data and privacy') +
      U.panel(null, null,
        field('Retention', 'Records older than this are removed. Patterns already established are kept as summaries.',
          '<select class="select"><option>1 year</option><option selected>3 years</option><option>Keep everything</option></select>') +
        field('Delete account', 'Removes every record, pattern and experiment. This cannot be undone.',
          '<button class="btn btn--ghost" type="button">Delete account and all data</button>')) +
      '</section>';
  }

  BL.views = BL.views || {};
  BL.views.settings = { title: 'Settings', render: render };
})(typeof window !== 'undefined' ? window : globalThis);
