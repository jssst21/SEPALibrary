// SEPA Resource Library - DAT shift signup calendar
// The Google connection is set in js/config.js
//
// The 4 standard shifts are listed just below (start hour on a 24-hour clock, 6 hours each).
var STANDARD_SHIFTS = [
  { name: 'Overnight', start: 0 },
  { name: 'Morning', start: 6 },
  { name: 'Afternoon', start: 12 },
  { name: 'Evening', start: 18 }
];
var STANDARD_HOURS = 6;

var SIGNUP_URL = (typeof SEPA_BACKEND_URL === 'string') ? SEPA_BACKEND_URL : '';

(function () {
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];
  var DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var LONG_DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var preview = !SIGNUP_URL;

  var data = null;          // { today, daysAhead, minHours, one: [...], rec: [...] }
  var viewYear, viewMonth;
  var pickedDate = null;
  var choice = null;        // { type: 'one' | 'rec', start, hours, days }
  var pickers = {};         // the two time pickers (custom, recurring)
  var recBlock = null;      // which standard shift is chosen in the recurring panel (null = custom)

  var $ = function (id) { return document.getElementById(id); };

  // ---------- dates ("YYYY-MM-DD" text) ----------
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

  // ---------- times ----------
  function hourText(h) { h = ((h % 24) + 24) % 24; return (h % 12 || 12) + ':00 ' + (h < 12 ? 'AM' : 'PM'); }
  function rangeText(start, hours) {
    var end = start + hours;
    return hourText(start) + ' to ' + hourText(end) + (end > 24 ? ' (next day)' : '');
  }

  // ---------- who is already covering a day (times only, no names) ----------
  function recOn(r, t) { return r.from <= t && r.days.indexOf(dow(t)) !== -1; }
  function intervalsOn(t) {
    var y = addDays(t, -1), out = [];
    data.one.forEach(function (s) {
      if (s.date === t) out.push([s.start, s.start + s.hours]);
      if (s.date === y && s.start + s.hours > 24) out.push([0, s.start + s.hours - 24]);
    });
    data.rec.forEach(function (r) {
      if (recOn(r, t)) out.push([r.start, r.start + r.hours]);
      if (recOn(r, y) && r.start + r.hours > 24) out.push([0, r.start + r.hours - 24]);
    });
    return out;
  }
  function coverCount(t, start, hours) {
    return intervalsOn(t).filter(function (iv) { return iv[0] < start + hours && iv[1] > start; }).length;
  }
  function signupsStarting(t) {
    return data.one.filter(function (s) { return s.date === t; }).length +
      data.rec.filter(function (r) { return recOn(r, t); }).length;
  }
  function isOpen(t) { return t >= data.today && t <= lastDay(); }

  // ---------- load ----------
  function notice(msg) { var el = $('notice'); el.textContent = msg; el.hidden = !msg; }

  function load(done) {
    if (preview) {
      var n = new Date();
      data = { today: toText(n.getFullYear(), n.getMonth(), n.getDate()), daysAhead: 60, minHours: 6, one: [], rec: [] };
      notice('Preview mode: this calendar is not connected yet, so signups are not saved.');
      return done();
    }
    fetch(SIGNUP_URL).then(function (r) { return r.json(); }).then(function (d) {
      data = d;
      data.one = d.one || []; data.rec = d.rec || []; data.minHours = d.minHours || 6;
      done();
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
      var t = toText(viewYear, viewMonth, d), open = isOpen(t), n = open ? signupsStarting(t) : 0;
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'cal-day ' + (open ? 'open' : 'closed') + (t === pickedDate ? ' picked' : '') + (t === data.today ? ' today' : '');
      b.disabled = !open;
      b.dataset.date = t;
      b.appendChild(document.createTextNode(d));
      if (n) { var c = document.createElement('span'); c.className = 'count-badge'; c.textContent = n; b.appendChild(c); }
      b.setAttribute('aria-label', niceDate(t) + (n ? ', ' + n + ' signed up' : ''));
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

  // ---------- time picker (two sliders with - / + buttons) ----------
  function makePicker(box, startHour, hours) {
    var st = { start: startHour, hours: Math.max(hours, data.minHours) };
    box.innerHTML =
      '<div class="tp-row"><span class="tp-label">Start</span>' +
      '<button type="button" class="tp-step" data-k="start" data-d="-1" aria-label="Earlier start">&minus;</button>' +
      '<input type="range" class="tp-range" data-k="start" min="0" max="23" step="1" aria-label="Start time">' +
      '<button type="button" class="tp-step" data-k="start" data-d="1" aria-label="Later start">+</button>' +
      '<output class="tp-value" data-k="start"></output></div>' +
      '<div class="tp-row"><span class="tp-label">End</span>' +
      '<button type="button" class="tp-step" data-k="hours" data-d="-1" aria-label="Earlier end">&minus;</button>' +
      '<input type="range" class="tp-range" data-k="hours" min="' + data.minHours + '" max="24" step="1" aria-label="End time">' +
      '<button type="button" class="tp-step" data-k="hours" data-d="1" aria-label="Later end">+</button>' +
      '<output class="tp-value" data-k="hours"></output></div>' +
      '<p class="tp-summary"></p>' +
      '<p class="tp-min">Minimum ' + data.minHours + ' hours. Shifts can run overnight.</p>';
    function draw() {
      box.querySelector('input[data-k=start]').value = st.start;
      box.querySelector('input[data-k=hours]').value = st.hours;
      box.querySelector('output[data-k=start]').textContent = hourText(st.start);
      var end = st.start + st.hours;
      box.querySelector('output[data-k=hours]').textContent = hourText(end) + (end > 24 ? ' (next day)' : '');
      box.querySelector('.tp-summary').textContent = rangeText(st.start, st.hours) + ' · ' + st.hours + ' hours';
    }
    function set(k, v) {
      if (k === 'start') st.start = Math.min(23, Math.max(0, v));
      else st.hours = Math.min(24, Math.max(data.minHours, v));
      draw();
    }
    box.querySelectorAll('.tp-range').forEach(function (r) {
      r.addEventListener('input', function () { set(r.dataset.k, parseInt(r.value, 10)); });
    });
    box.querySelectorAll('.tp-step').forEach(function (b) {
      b.addEventListener('click', function () { set(b.dataset.k, st[b.dataset.k] + parseInt(b.dataset.d, 10)); });
    });
    draw();
    return st;
  }

  // ---------- step 2: hours ----------
  function pickDay(t, quiet) {
    pickedDate = t; choice = null;
    drawMonth();
    $('day-label').textContent = niceDate(t);

    var box = $('shifts');
    box.innerHTML = '';
    STANDARD_SHIFTS.forEach(function (s) {
      var n = coverCount(t, s.start, STANDARD_HOURS);
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'shift-btn';
      b.innerHTML = '<strong></strong><span class="shift-time"></span><span class="shift-spots"></span>';
      b.querySelector('strong').textContent = s.name;
      b.querySelector('.shift-time').textContent = rangeText(s.start, STANDARD_HOURS);
      b.querySelector('.shift-spots').textContent = n ? n + ' signed up' : 'No one yet';
      if (!n) b.querySelector('.shift-spots').classList.add('none');
      b.addEventListener('click', function () { choose({ type: 'one', start: s.start, hours: STANDARD_HOURS }); });
      box.appendChild(b);
    });

    // reset the Custom and Recurring panels
    togglePanel('custom', false); togglePanel('rec', false);
    pickers.custom = makePicker(document.querySelector('.time-picker[data-for=custom]'), 9, 8);
    pickers.rec = makePicker(document.querySelector('.time-picker[data-for=rec]'), 9, 8);
    drawWeekdays(t);
    drawRecChoices();
    $('rec-note').textContent = 'Starts ' + niceDate(t) + ' and repeats every week until the site admin removes it. ' +
      'To stop or change it later, contact the admin.';
    $('rec-error').hidden = true;

    $('step-shift').hidden = false;
    $('step-info').hidden = true;
    if (!quiet) $('step-shift').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function togglePanel(which, show) {
    var panel = $(which + '-panel'), btn = $(which + '-btn');
    if (show === undefined) show = panel.hidden;
    panel.hidden = !show;
    btn.setAttribute('aria-expanded', String(show));
    btn.classList.toggle('active', show);
  }

  function drawWeekdays(t) {
    var box = $('weekdays');
    box.innerHTML = '';
    DOW.forEach(function (name, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'day-toggle' + (i === dow(t) ? ' on' : '');
      b.textContent = name;
      b.dataset.day = i;
      b.setAttribute('aria-pressed', String(i === dow(t)));
      b.addEventListener('click', function () {
        var on = !b.classList.contains('on');
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', String(on));
      });
      box.appendChild(b);
    });
  }

  function drawRecChoices() {
    var box = $('rec-choices');
    box.innerHTML = '';
    recBlock = STANDARD_SHIFTS[1];
    STANDARD_SHIFTS.concat([null]).forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'rec-choice' + (s === recBlock ? ' on' : '');
      b.textContent = s ? s.name + ': ' + rangeText(s.start, STANDARD_HOURS) : 'Custom hours';
      b.addEventListener('click', function () {
        recBlock = s;
        box.querySelectorAll('.rec-choice').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        document.querySelector('.time-picker[data-for=rec]').hidden = !!s;
      });
      box.appendChild(b);
    });
    document.querySelector('.time-picker[data-for=rec]').hidden = true;
  }

  function goRecurring() {
    var days = [];
    document.querySelectorAll('.day-toggle.on').forEach(function (b) { days.push(parseInt(b.dataset.day, 10)); });
    if (!days.length) { $('rec-error').textContent = 'Please pick at least one day of the week.'; $('rec-error').hidden = false; return; }
    $('rec-error').hidden = true;
    var start = recBlock ? recBlock.start : pickers.rec.start, hours = recBlock ? STANDARD_HOURS : pickers.rec.hours;
    choose({ type: 'rec', start: start, hours: hours, days: days });
  }

  // ---------- step 3: details ----------
  function describe(c) {
    if (c.type === 'one') return niceDate(pickedDate) + ', ' + rangeText(c.start, c.hours) + ' (' + c.hours + ' hours)';
    return 'Every ' + c.days.map(function (d) { return DOW[d]; }).join(', ') + ', ' + rangeText(c.start, c.hours) +
      ', starting ' + niceDate(pickedDate);
  }

  function choose(c) {
    choice = c;
    $('picked').textContent = describe(c);
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
      name: f.name.value.trim(), phone: f.phone.value.trim(),
      email: f.email.value.trim(), notes: f.notes.value.trim(), website: f.website.value,
      start: choice.start, hours: choice.hours
    };
    if (choice.type === 'one') { info.action = 'shiftSignup'; info.date = pickedDate; }
    else { info.action = 'recurringSignup'; info.from = pickedDate; info.days = choice.days; }
    if (!info.name) return showError('Please enter your name.');
    if (!info.phone && !info.email) return showError('Please enter a phone number or email so we can reach you.');

    var btn = $('submit-btn');
    btn.disabled = true; btn.textContent = 'Sending...';

    var finish = function (res) {
      btn.disabled = false; btn.textContent = 'Sign me up';
      if (!res.ok) return showError(res.error || 'Something went wrong. Please try again.');
      if (choice.type === 'one') data.one.push({ date: pickedDate, start: choice.start, hours: choice.hours });
      else data.rec.push({ days: choice.days, start: choice.start, hours: choice.hours, from: pickedDate });
      $('done-text').textContent = info.name + ': ' + describe(choice) + '.' +
        (preview ? ' (Preview mode: nothing was saved.)' : '');
      $('step-done').hidden = false;
      document.body.classList.add('no-scroll');
      $('again').focus();
    };

    if (preview) return setTimeout(function () { finish({ ok: true }); }, 400);

    fetch(SIGNUP_URL, { method: 'POST', body: JSON.stringify(info) })
      .then(function (r) { return r.json(); })
      .then(finish)
      .catch(function () { finish({ ok: false, error: 'Could not send. Please check your connection and try again.' }); });
  }

  function again() {
    pickedDate = null; choice = null;
    $('signup-form').reset();
    $('step-done').hidden = true; $('step-info').hidden = true;
    document.body.classList.remove('no-scroll');
    pickDay(data.today, true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ---------- start ----------
  load(function () {
    var p = parts(data.today);
    viewYear = p[0]; viewMonth = p[1];
    drawMonth();
    $('prev').addEventListener('click', function () { moveMonth(-1); });
    $('next').addEventListener('click', function () { moveMonth(1); });
    $('custom-btn').addEventListener('click', function () { togglePanel('custom'); togglePanel('rec', false); });
    $('rec-btn').addEventListener('click', function () { togglePanel('rec'); togglePanel('custom', false); });
    $('custom-go').addEventListener('click', function () {
      choose({ type: 'one', start: pickers.custom.start, hours: pickers.custom.hours });
    });
    $('rec-go').addEventListener('click', goRecurring);
    $('signup-form').addEventListener('submit', submit);
    $('again').addEventListener('click', again);
    pickDay(data.today, true);   // show today's shifts right away
  });
})();
