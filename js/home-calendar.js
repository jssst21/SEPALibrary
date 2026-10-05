// SEPA Resource Library - small DAT shift calendar on the homepage
// Shows how many volunteers are signed up each day (green number).
// Upcoming days with no one signed up get a light amber color.
// Clicking a day opens the shift signup page with that day already chosen.
// It reads the same Google Sheet as the shift page (link is in js/config.js).
(function () {
  var box = document.getElementById('home-cal');
  if (!box) return;
  var URL = (typeof SEPA_BACKEND_URL === 'string') ? SEPA_BACKEND_URL : '';
  if (!URL) { box.hidden = true; return; }

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];
  var LONG_DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var $ = function (id) { return document.getElementById(id); };
  var data, viewYear, viewMonth;

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

  function status(msg) { var el = $('home-cal-status'); el.textContent = msg; el.hidden = !msg; }

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
        el.href = 'pages/shifts.html?date=' + t;
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

  status('Loading the calendar...');
  fetch(URL).then(function (r) { return r.json(); }).then(function (d) {
    data = d; data.one = d.one || []; data.rec = d.rec || [];
    var p = parts(data.today);
    viewYear = p[0]; viewMonth = p[1];
    status('');
    $('home-cal-body').hidden = false;
    draw();
    $('home-cal-prev').addEventListener('click', function () { move(-1); });
    $('home-cal-next').addEventListener('click', function () { move(1); });
  }).catch(function () {
    status('The calendar could not load right now. Use the "Sign Up for DAT Shifts" button instead.');
  });
})();
