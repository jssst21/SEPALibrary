// SEPA Resource Library - DAT shift signup calendar
//
// ONE SETTING TO CHANGE: paste the Google "Web app URL" between the quotes.
// Until it is filled in, the page runs in preview mode and saves nothing.
var SIGNUP_URL = '';

(function () {
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var LONG_DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var preview = !SIGNUP_URL;

  var data = null;          // { today, daysAhead, shifts, taken }
  var viewYear, viewMonth;  // month being shown
  var pickedDate = null, pickedShift = null;

  var $ = function (id) { return document.getElementById(id); };

  // ---------- date helpers (dates are "YYYY-MM-DD" text) ----------
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function toText(y, m, d) { return y + '-' + pad(m + 1) + '-' + pad(d); }
  function parts(t) { var p = t.split('-'); return [+p[0], +p[1] - 1, +p[2]]; }
  function addDays(t, n) {
    var p = parts(t), dt = new Date(p[0], p[1], p[2] + n);
    return toText(dt.getFullYear(), dt.getMonth(), dt.getDate());
  }
  function dow(t) { var p = parts(t); return new Date(p[0], p[1], p[2]).getDay(); }
  function niceDate(t) { var p = parts(t); return LONG_DOW[dow(t)] + ', ' + MONTHS[p[1]] + ' ' + p[2]; }

  function lastDay() { return addDays(data.today, data.daysAhead); }

  function shiftsOn(t) {
    return data.shifts.filter(function (s) {
      if (s.days === 'All') return true;
      return s.days.split(',').some(function (d) {
        return d.trim().slice(0, 3).toLowerCase() === DOW[dow(t)].toLowerCase();
      });
    });
  }
  function spotsLeft(t, s) { return Math.max(0, s.spots - (data.taken[t + '|' + s.name] || 0)); }
  function dayStatus(t) {
    if (t < data.today || t > lastDay()) return 'closed';
    var list = shiftsOn(t);
    if (!list.length) return 'closed';
    return list.some(function (s) { return spotsLeft(t, s) > 0; }) ? 'open' : 'full';
  }

  // ---------- load ----------
  function sampleData() {
    var n = new Date();
    return {
      today: toText(n.getFullYear(), n.getMonth(), n.getDate()),
      daysAhead: 60,
      shifts: [
        { name: 'Day Shift', start: '8:00 AM', end: '8:00 PM', spots: 3, days: 'All' },
        { name: 'Night Shift', start: '8:00 PM', end: '8:00 AM', spots: 3, days: 'All' }
      ],
      taken: {}
    };
  }

  function notice(msg) { var el = $('notice'); el.textContent = msg; el.hidden = !msg; }

  function load(done) {
    if (preview) {
      data = sampleData();
      notice('Preview mode: this calendar is not connected yet, so signups are not saved.');
      return done();
    }
    fetch(SIGNUP_URL).then(function (r) { return r.json(); }).then(function (d) {
      data = d; done();
    }).catch(function () {
      notice('The signup calendar could not load. Please refresh the page or try again later.');
    });
  }

  // ---------- step 1: calendar ----------
  function drawMonth() {
    $('month-label').textContent = MONTHS[viewMonth] + ' ' + viewYear;
    var box = $('days');
    box.innerHTML = '';
    var first = new Date(viewYear, viewMonth, 1).getDay();
    var count = new Date(viewYear, viewMonth + 1, 0).getDate();
    for (var i = 0; i < first; i++) box.appendChild(document.createElement('span'));
    for (var d = 1; d <= count; d++) {
      var t = toText(viewYear, viewMonth, d);
      var st = dayStatus(t);
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'cal-day ' + st + (t === pickedDate ? ' picked' : '') + (t === data.today ? ' today' : '');
      b.textContent = d;
      b.disabled = st !== 'open';
      b.setAttribute('aria-label', niceDate(t) + (st === 'open' ? ', shifts open' : st === 'full' ? ', full' : ''));
      b.dataset.date = t;
      b.addEventListener('click', function () { pickDay(this.dataset.date); });
      box.appendChild(b);
    }
    var tp = parts(data.today), lp = parts(lastDay());
    $('prev').disabled = viewYear * 12 + viewMonth <= tp[0] * 12 + tp[1];
    $('next').disabled = viewYear * 12 + viewMonth >= lp[0] * 12 + lp[1];
  }

  function moveMonth(n) {
    var dt = new Date(viewYear, viewMonth + n, 1);
    viewYear = dt.getFullYear(); viewMonth = dt.getMonth();
    drawMonth();
  }

  // ---------- step 2: shifts ----------
  function pickDay(t) {
    pickedDate = t; pickedShift = null;
    drawMonth();
    $('day-label').textContent = niceDate(t);
    var box = $('shifts');
    box.innerHTML = '';
    shiftsOn(t).forEach(function (s) {
      var left = spotsLeft(t, s);
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'shift-btn';
      b.disabled = left === 0;
      b.innerHTML = '<strong></strong><span class="shift-time"></span><span class="shift-spots"></span>';
      b.querySelector('strong').textContent = s.name;
      b.querySelector('.shift-time').textContent = s.start + ' to ' + s.end;
      b.querySelector('.shift-spots').textContent = left === 0 ? 'Full' : left + (left === 1 ? ' spot' : ' spots') + ' open';
      b.addEventListener('click', function () { pickShift(s); });
      box.appendChild(b);
    });
    $('step-shift').hidden = false;
    $('step-info').hidden = true;
    $('step-shift').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------- step 3: details ----------
  function pickShift(s) {
    pickedShift = s;
    $('picked').textContent = niceDate(pickedDate) + ' - ' + s.name + ' (' + s.start + ' to ' + s.end + ')';
    $('step-info').hidden = false;
    $('form-error').hidden = true;
    $('step-info').scrollIntoView({ behavior: 'smooth', block: 'start' });
    $('signup-form').elements.name.focus({ preventScroll: true });
  }

  function showError(msg) { var el = $('form-error'); el.textContent = msg; el.hidden = false; }

  function submit(e) {
    e.preventDefault();
    var f = e.target.elements;
    var info = {
      date: pickedDate, shift: pickedShift.name,
      name: f.name.value.trim(), phone: f.phone.value.trim(),
      email: f.email.value.trim(), notes: f.notes.value.trim(), website: f.website.value
    };
    if (!info.name) return showError('Please enter your name.');
    if (!info.phone && !info.email) return showError('Please enter a phone number or email so we can reach you.');

    var btn = $('submit-btn');
    btn.disabled = true; btn.textContent = 'Sending...';

    var finish = function (res) {
      btn.disabled = false; btn.textContent = 'Sign me up';
      if (!res.ok) return showError(res.error || 'Something went wrong. Please try again.');
      var key = pickedDate + '|' + pickedShift.name;
      data.taken[key] = (data.taken[key] || 0) + 1;
      $('done-text').textContent = info.name + ', you are on the ' + pickedShift.name + ' (' +
        pickedShift.start + ' to ' + pickedShift.end + ') on ' + niceDate(pickedDate) + '.' +
        (preview ? ' (Preview mode: nothing was saved.)' : '');
      ['step-day', 'step-shift', 'step-info'].forEach(function (id) { $(id).hidden = true; });
      $('step-done').hidden = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (preview) return setTimeout(function () { finish({ ok: true }); }, 400);

    fetch(SIGNUP_URL, { method: 'POST', body: JSON.stringify(info) })
      .then(function (r) { return r.json(); })
      .then(finish)
      .catch(function () { finish({ ok: false, error: 'Could not send. Please check your connection and try again.' }); });
  }

  function again() {
    pickedDate = null; pickedShift = null;
    $('signup-form').reset();
    $('step-done').hidden = true; $('step-shift').hidden = true; $('step-info').hidden = true;
    $('step-day').hidden = false;
    drawMonth();
  }

  // ---------- start ----------
  load(function () {
    var p = parts(data.today);
    viewYear = p[0]; viewMonth = p[1];
    drawMonth();
    $('prev').addEventListener('click', function () { moveMonth(-1); });
    $('next').addEventListener('click', function () { moveMonth(1); });
    $('signup-form').addEventListener('submit', submit);
    $('again').addEventListener('click', again);
  });
})();
