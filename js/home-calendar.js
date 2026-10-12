// SEPA Resource Library - small DAT shift calendar on the homepage
// Shows how many volunteers are signed up each day (green number).
// Upcoming days with no one signed up get a light amber color.
// Clicking a day opens the shift signup page with that day already chosen.
// It reads the same Google Sheet as the shift page (link is in js/config.js).
//
// Two tabs (since v0.20): Field Responders and Duty Officers. Each has its own signups in the Sheet.
// Field Responders always shows when the page opens. The Duty Officers signups are fetched the first
// time someone clicks that tab, then kept, so switching back and forth is instant.
(function () {
  var box = document.getElementById('home-cal');
  if (!box) return;
  var URL = (typeof SEPA_BACKEND_URL === 'string') ? SEPA_BACKEND_URL : '';
  if (!URL) { box.hidden = true; return; }

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];
  var LONG_DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var $ = function (id) { return document.getElementById(id); };
  var team = 'dat';          // 'dat' = Field Responders, 'do' = Duty Officers
  var cache = {};            // each tab's data once it has loaded
  var data, viewYear, viewMonth;
  var titleLink = box.querySelector('.home-cal-link');

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function toText(y, m, d) { return y + '-' + pad(m + 1) + '-' + pad(d); }
  function parts(t) { var p = t.split('-'); return [+p[0], +p[1] - 1, +p[2]]; }
  function addDays(t, n) { var p = parts(t), d = new Date(p[0], p[1], p[2] + n); return toText(d.getFullYear(), d.getMonth(), d.getDate()); }
  function dow(t) { var p = parts(t); return new Date(p[0], p[1], p[2]).getDay(); }
  function niceDate(t) { var p = parts(t); return LONG_DOW[dow(t)] + ', ' + MONTHS[p[1]] + ' ' + p[2]; }
  function lastDay() { return addDays(data.today, data.daysAhead); }
  function isOpen(t) { return t >= data.today && t <= lastDay(); }
  function recOn(r, t) { return r.from <= t && r.days.indexOf(dow(t)) !== -1; }
  function signedUp(t) {
    return data.one.filter(function (s) { return s.date === t; }).length +
      data.rec.filter(function (r) { return recOn(r, t); }).length;
  }
  // The shift page for this tab (and day). Field Responders keeps the plain address it always had.
  function pageLink(t) {
    var q = [];
    if (t) q.push('date=' + t);
    if (team === 'do') q.push('team=do');
    return 'pages/shifts.html' + (q.length ? '?' + q.join('&') : '');
  }

  function status(msg) { var el = $('home-cal-status'); el.textContent = msg; el.hidden = !msg; }

  // A message inside the calendar box, in place of the days (used while the Duty Officers tab loads,
  // or if it cannot). The tabs stay, so people can always switch back.
  function inner(msg, html) {
    var el = $('home-cal-msg');
    if (html) el.innerHTML = msg; else el.textContent = msg;
    el.hidden = !msg;
    box.querySelectorAll('.cal-dow, #home-cal-days, .cal-key, .cal-monthnav').forEach(function (x) {
      x.style.visibility = msg ? 'hidden' : '';
    });
    box.classList.toggle('home-cal-waiting', !!msg);
  }

  function draw() {
    $('home-cal-month').textContent = MONTHS[viewMonth] + ' ' + viewYear;
    var grid = $('home-cal-days');
    grid.innerHTML = '';
    var first = new Date(viewYear, viewMonth, 1).getDay();
    var count = new Date(viewYear, viewMonth + 1, 0).getDate();
    for (var i = 0; i < first; i++) grid.appendChild(document.createElement('span'));
    for (var d = 1; d <= count; d++) {
      var t = toText(viewYear, viewMonth, d);
      var el;
      if (isOpen(t)) {
        var n = signedUp(t);
        el = document.createElement('a');
        el.href = pageLink(t);
        el.target = '_blank';
        el.rel = 'noopener';
        el.className = 'cal-day open' + (n ? '' : ' empty') + (t === data.today ? ' today' : '');
        el.appendChild(document.createTextNode(d));
        if (n) { var c = document.createElement('span'); c.className = 'count-badge'; c.textContent = n; el.appendChild(c); }
        el.setAttribute('aria-label', niceDate(t) + ', ' + (n ? n + ' signed up' : 'no one signed up yet') + '. Open to sign up.');
      } else {
        el = document.createElement('span');
        el.className = 'cal-day closed';
        el.textContent = d;
      }
      grid.appendChild(el);
    }
    var tp = parts(data.today), lp = parts(lastDay());
    $('home-cal-prev').disabled = viewYear * 12 + viewMonth <= tp[0] * 12 + tp[1];
    $('home-cal-next').disabled = viewYear * 12 + viewMonth >= lp[0] * 12 + lp[1];
  }

  function move(n) {
    var dt = new Date(viewYear, viewMonth + n, 1);
    viewYear = dt.getFullYear(); viewMonth = dt.getMonth();
    draw();
  }

  function fetchTeam(t) {
    return fetch(URL + (t === 'do' ? '?team=do' : '')).then(function (r) { return r.json(); }).then(function (d) {
      // An older Google script only knows the Field Responder calendar and answers without "team".
      // Never show those signups on the Duty Officers tab.
      if (t === 'do' && d.team !== 'do') throw new Error('old script');
      d.one = d.one || []; d.rec = d.rec || [];
      cache[t] = d;
      return d;
    });
  }

  function showTeam(d) {
    var keepMonth = data && viewYear !== undefined;
    data = d;
    var p = parts(data.today);
    if (!keepMonth) { viewYear = p[0]; viewMonth = p[1]; }
    inner('');
    draw();
  }

  function setTab(t) {
    team = t;
    box.querySelectorAll('.cal-tab').forEach(function (b) {
      var on = b.dataset.team === t;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    });
    if (titleLink) titleLink.href = pageLink(null);
  }

  function switchTo(t) {
    if (t === team) return;
    setTab(t);
    if (cache[t]) return showTeam(cache[t]);
    inner('Loading the ' + (t === 'do' ? 'Duty Officers' : 'Field Responders') + ' calendar...');
    fetchTeam(t).then(function (d) { if (team === t) showTeam(d); }).catch(function (err) {
      if (team !== t) return;
      inner(err && err.message === 'old script'
        ? 'The Duty Officers calendar is not switched on yet. The site admin needs to update the Google script.'
        : 'This calendar could not load right now. <a href="' + pageLink(null) + '" target="_blank" rel="noopener">Open the shift sign-up page</a> instead.',
        !(err && err.message === 'old script'));
    });
  }

  status('Loading the calendar...');
  fetchTeam('dat').then(function (d) {
    status('');
    $('home-cal-body').hidden = false;
    showTeam(d);
    $('home-cal-prev').addEventListener('click', function () { move(-1); });
    $('home-cal-next').addEventListener('click', function () { move(1); });
    box.querySelectorAll('.cal-tab').forEach(function (b) {
      b.addEventListener('click', function () { switchTo(b.dataset.team); });
      b.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        var other = box.querySelector('.cal-tab:not(.on)');
        switchTo(other.dataset.team); other.focus();
      });
    });
  }).catch(function () {
    // The "Sign Up for DAT Shifts" button left the homepage in v0.13, so link to the shift page here.
    var el = $('home-cal-status');
    el.innerHTML = 'The calendar could not load right now. ' +
      '<a href="pages/shifts.html" target="_blank" rel="noopener">Open the shift sign-up page</a> instead.';
    el.hidden = false;
  });
})();
