// SEPA Resource Library - Daily Shelter Report (pages/shelter.html), website v0.27.39
// A running report for each open shelter, one per day, kept by its shift supervisors.
//   - OPEN A SHELTER (Start screen) needs the lead user name and password (same as the other forms). The phone that opens it
//     and everyone sent the link ("Add supervisor") can read and type. No password for them.
//   - TODAY'S REPORT: Supervisors, the Running log (each entry stamped with the time and the name), and
//     the 16 status questions (each answer shows who gave it and when). Everything saves as it is typed.
//     Other phones' changes appear within a few seconds.
//   - At midnight the day LOCKS and moves to PREVIOUS DAYS; a blank report starts by itself.
//   - HQ (the same HQ login as the Escalation and Reception Center forms, 24 hours per device) sees every open shelter (Change shelter),
//     can edit any day and any log entry (for example to take out something that breaks client privacy),
//     and downloads for Excel. HQ changes are marked as made by HQ.
//   - CLOSE SHELTER AND ERASE ALL DATA needs the lead user name and password (or an HQ login).
// What this phone keeps: for each shelter, its link code and the supervisor's name, and the list of
// "Your shelters"; the HQ login. The report itself lives only in the Google Sheet.
(function () {
  var URL = (typeof SEPA_BACKEND_URL === 'string') ? SEPA_BACKEND_URL : '';
  var $ = function (id) { return document.getElementById(id); };
  if (!$('sr-today')) return;

  // The 16 questions (the Red Cross shelter status check). 'yn' = Yes / No; 'tx' = typed answer.
  // v0.27.43: a 4th item on a Yes / No question ('Yes' or 'No') opens a "Please explain" box for that answer
  // (Sean: 7 Yes, 9 No, 10 Yes, 15 Yes). The explanation is saved as its own answer, e.g. q7x.
  var QS = [
    ['yn', "Yesterday's midnight shelter count was submitted?"],
    ['yn', 'Shift inspection complete in the last 24 hours?'],
    ['yn', 'Inventory complete in the last 24 hours?'],
    ['yn', 'Shift briefing complete in the last 24 hours?'],
    ['yn', 'Resident meeting complete in the last 24 hours?'],
    ['yn', 'Is a MCPC available at the shelter with sufficient funds?'],
    ['yn', 'Are there Red Cross standards that are not being met at the shelter?', '', 'Yes'],
    ['tx', 'What are the most important issues you are experiencing? Please specify:', 'Examples: security needed, need pet services, lack of heating/cooling, shelter capacity exceeded, large numbers of non-dormitory clients seeking services.'],
    ['yn', 'Were meal orders received on time and met client needs?', '', 'No'],
    ['yn', 'Are there outstanding issues reported to DRO HQ including material supplies and facility issues that are not being resolved?', '', 'Yes'],
    ['tx', 'What client needs are not being met? Please specify:', 'Examples: function and access, adequate toilet and shower facilities, reunification, health/cultural/religious dietary meals and infant needs.'],
    ['tx', 'Do clients have adequate access to Disaster Health Services, Disaster Mental Health, Disaster Spiritual Care and Shelter Resident Transition at the shelter site? What specific shortfalls must be addressed? Please specify:'],
    ['tx', 'How is the morale and wellbeing of the shelter workers? Are there issues that need to be addressed? Please specify:'],
    ['tx', 'Are additional shelter workers needed to provide effective services to clients and why? Please specify:'],
    ['yn', 'Does the shelter workforce need any additional training to effectively operate the shelter or provide culturally competent service delivery?', '', 'Yes'],
    ['tx', 'Which shelter workers will out-process in the next 48 hours? Please specify:']
  ];

  // ---------------------------------------------------------------- small helpers
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v === '' || v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function param(name) { var m = new RegExp('[?&]' + name + '=([^&#]*)').exec(location.search); return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : ''; }
  function hashParam(name) { var m = new RegExp('[#&]' + name + '=([^&]*)').exec(location.hash || ''); return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : ''; }
  function goodId(v) { return /^[A-Za-z0-9]{8,24}$/.test(v || '') ? v : ''; }
  function goodKey(v) { return /^[A-Za-z0-9]{16,40}$/.test(v || '') ? v : ''; }
  function newId() {
    var abc = 'abcdefghjkmnpqrstuvwxyz23456789', out = '', i, rnd = [];
    try { rnd = crypto.getRandomValues(new Uint8Array(12)); } catch (e) { for (i = 0; i < 12; i++) rnd.push(Math.floor(Math.random() * 256)); }
    for (i = 0; i < 12; i++) out += abc.charAt(rnd[i] % abc.length);
    return out;
  }
  function call(data) {
    if (!URL) return Promise.resolve({ ok: false, error: 'The form is not connected yet.' });
    return fetch(URL, { method: 'POST', body: JSON.stringify(data) })
      .then(function (r) { return r.json(); })
      .catch(function () { return { ok: false, offline: true, error: 'No connection. It will try again by itself.' }; });
  }
  function oldScript(r) { return r && !r.offline && /unknown request/i.test(r.error || ''); }
  function pageLink(query) { return location.href.split('?')[0].split('#')[0] + (query ? '?' + query : ''); }
  function clock(t) {      // "2026-10-16 15:25:00" -> "3:25 PM"
    var m = /(\d{1,2}):(\d{2})/.exec((t || '').split(' ')[1] || '');
    if (!m) return t || '';
    var h = +m[1];
    return ((h % 12) || 12) + ':' + m[2] + (h < 12 ? ' AM' : ' PM');
  }
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  function dayName(d, withYear) {     // "2026-10-16" -> "Friday, October 16" (", 2026")
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d || ''); if (!m) return d || '';
    var x = new Date(+m[1], +m[2] - 1, +m[3]);
    return DAYS[x.getDay()] + ', ' + MONTHS[x.getMonth()] + ' ' + x.getDate() + (withYear ? ', ' + m[1] : '');
  }
  function when(t, today) {          // a time stamp: "3:25 PM" today, "Oct 14, 3:25 PM" otherwise
    var d = (t || '').split(' ')[0];
    if (!d || d === today) return clock(t);
    var m = /^\d{4}-(\d{2})-(\d{2})/.exec(d);
    return (m ? MONTHS[+m[1] - 1].slice(0, 3) + ' ' + (+m[2]) + ', ' : '') + clock(t);
  }
  function ago(ms) {
    var s = Math.max(0, Math.round(ms / 1000));
    if (s < 90) return 'just now';
    if (s < 5400) return Math.round(s / 60) + ' minutes ago';
    if (s < 129600) return Math.round(s / 3600) + ' hours ago';
    return Math.round(s / 86400) + ' days ago';
  }
  function notice(msg) { var n = $('sr-notice'); n.textContent = msg || ''; n.hidden = !msg; }

  // ---------------------------------------------------------------- what this phone remembers
  function token() { return lsGet('sepaEscHQ') || ''; }      // the same HQ login as the Escalation and Reception Center forms
  function mine() { try { return JSON.parse(lsGet('sepaShList') || '[]') || []; } catch (e) { return []; } }
  function remember(id, name) {
    var list = mine().filter(function (x) { return x.id !== id; });
    list.unshift({ id: id, name: name || '' });
    lsSet('sepaShList', JSON.stringify(list.slice(0, 12)));
  }
  function forget(id) {
    lsSet('sepaShList', JSON.stringify(mine().filter(function (x) { return x.id !== id; })));
    lsSet('sepaShKey:' + id, ''); lsSet('sepaShName:' + id, '');
  }

  // ---------------------------------------------------------------- HQ login (pop-in form, used by several screens)
  function needLogin(why, retry, cancel) {
    var box = $('sr-login'), err = $('sr-login-error');
    box.hidden = false; err.hidden = true;
    if (why) $('sr-login-why').textContent = why;
    var c = $('sr-login-cancel'); c.hidden = !cancel;
    c.onclick = function () { box.hidden = true; if (cancel) cancel(); };
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(function () { $('sr-l-user').focus({ preventScroll: true }); }, 300);
    $('sr-login-form').onsubmit = function (e) {
      e.preventDefault();
      var btn = $('sr-login-btn'); btn.disabled = true; err.hidden = true;
      call({ action: 'escLogin', user: $('sr-l-user').value, password: $('sr-l-pass').value }).then(function (a) {
        btn.disabled = false;
        if (a && a.ok && a.token) { lsSet('sepaEscHQ', a.token); $('sr-l-pass').value = ''; box.hidden = true; showLogout(); retry(); }
        else { err.textContent = oldScript(a) ? 'The Daily Shelter Report is not switched on yet. The site admin needs to update the Google script.' : (a && a.error) || 'Could not connect. Please try again.'; err.hidden = false; }
      });
    };
  }
  function showLogout() {
    var out = $('sr-logout'); out.hidden = !token();
    out.onclick = function () { var t = token(); lsSet('sepaEscHQ', ''); call({ action: 'logout', token: t }).then(function () { location.reload(); }); };
  }

  // ---------------------------------------------------------------- Excel (HQ only)
  function csvCell(v) {
    v = String(v == null ? '' : v);
    if (/^[=+\-@]/.test(v)) v = "'" + v;           // never a formula
    return '"' + v.replace(/"/g, '""') + '"';
  }
  function download(id, auth) {
    return call(auth({ action: 'shExport', id: id })).then(function (r) {
      if (!(r && r.ok)) return r;
      var rows = [['Daily Shelter Report', r.shelter.name], ['Address', r.shelter.address], ['Opened', r.shelter.opened], [],
        ['STATUS CHECK, one row per day'], ['Day'].concat([].concat.apply([], QS.map(function (q, i) { return q[3] ? [(i + 1) + '. ' + q[1], (i + 1) + '. Explanation'] : [(i + 1) + '. ' + q[1]]; }))).concat(['Answered by (question: name, time)'])];
      r.days.forEach(function (d) {
        var who = [];
        rows.push([d.day].concat([].concat.apply([], QS.map(function (q, i) {
          var a = d.answers['q' + (i + 1)], x = d.answers['q' + (i + 1) + 'x']; if (a && a.v) who.push((i + 1) + ': ' + a.by + ' ' + clock(a.at));
          return q[3] ? [a ? a.v : '', x ? x.v : ''] : [a ? a.v : ''];
        }))).concat([who.join('; ')]));
      });
      rows.push([], ['RUNNING LOG'], ['Day', 'Time', 'Supervisor', 'Entry', 'Edited', 'Flagged']);
      r.log.forEach(function (e) { rows.push([e.day, clock(e.at), e.by, e.text, e.edited, e.flag]); });
      var text = '﻿' + rows.map(function (row) { return row.map(csvCell).join(','); }).join('\r\n');
      var a = document.createElement('a');
      a.href = URL_.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
      a.download = 'Shelter report - ' + (r.shelter.name || 'shelter').replace(/[\\\/:*?"<>|]+/g, ' ').slice(0, 60) + '.csv';
      document.body.appendChild(a); a.click(); setTimeout(function () { a.remove(); }, 1000);
      return r;
    });
  }
  var URL_ = window.URL || window.webkitURL;

  // ================================================================ START SCREEN
  var startShown = false;
  function startScreen() {
    $('sr-start').hidden = false;
    if (startShown) return; startShown = true;
    // v0.27.42: "Your shelters" became "Current Operations" at the top (js/current-ops.js): this phone's
    // open shelters (checked), and for HQ every open shelter. Then "Or open a new shelter".
    $('sr-mine-box').hidden = true;
    if (typeof SEPACurrentOps !== 'undefined') SEPACurrentOps.show('sh', $('sr-start'), 'Or open a new shelter');
    var f = $('sr-open-form');
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var err = $('sr-open-error'), btn = $('sr-open-btn');
      var name = $('sr-o-name').value.trim(), me = $('sr-o-me').value.trim();
      err.hidden = true;
      if (!name) { err.textContent = 'Please type the shelter name.'; err.hidden = false; return; }
      if (!me) { err.textContent = 'Please type your name.'; err.hidden = false; return; }
      if (!token() && (!$('sr-o-user').value.trim() || !$('sr-o-pass').value)) { err.textContent = 'Please type the user name and password.'; err.hidden = false; return; }
      var id = newId(), key = newId() + newId();
      btn.disabled = true; btn.textContent = 'Opening...';
      call({ action: 'shOpen', id: id, key: key, token: token(), shelter: name, address: $('sr-o-addr').value.trim(), me: me,
        user: $('sr-o-user').value, password: $('sr-o-pass').value }).then(function (r) {
        btn.disabled = false; btn.textContent = 'Open the shelter';
        if (!(r && r.ok)) { err.textContent = oldScript(r) ? 'The Daily Shelter Report is not switched on yet. The site admin needs to update the Google script.' : (r && r.error) || 'Could not connect. Please try again.'; err.hidden = false; return; }
        lsSet('sepaShKey:' + id, key); lsSet('sepaShName:' + id, me); remember(id, name);
        lsSet('sepaShNote', 'Shelter opened. Use Add supervisor to bring in the next supervisor.');
        location.href = pageLink('s=' + id);
      });
    });
  }

  // ================================================================ HQ LIST
  function hqList() {
    $('sr-title').textContent = 'Daily Shelter Report: HQ';
    $('sr-intro').textContent = 'Every open shelter, most recent activity first.';
    function load() {
      $('sr-list-tools').hidden = false;
      var s = $('sr-list-status'), box = $('sr-list');
      call({ action: 'shList', token: token() }).then(function (r) {
        if (r && r.login) { $('sr-list-tools').hidden = true; return needLogin('', load); }
        if (!(r && r.ok)) { s.textContent = oldScript(r) ? 'The Daily Shelter Report is not switched on yet. The site admin needs to update the Google script.' : (r && r.error) || 'Could not load the shelters.'; return; }
        showLogout();
        s.textContent = r.items.length ? r.items.length + (r.items.length === 1 ? ' open shelter.' : ' open shelters.') : 'No shelters are open right now.';
        box.innerHTML = '';
        r.items.forEach(function (it) {
          var a = el('a', 'vt-item'); a.href = pageLink('s=' + it.id + '&as=hq');
          a.appendChild(el('strong', '', it.name)); a.appendChild(el('span', '', (it.address ? it.address + ' · ' : '') + 'last activity ' + ago(r.now - it.ms)));
          box.appendChild(a);
        });
      });
    }
    load();
  }

  // ================================================================ ONE SHELTER (today, or previous days)
  function shelter(id, prev) {
    var asHq = param('as') === 'hq';
    var linkKey = goodKey(hashParam('k')), linkName = hashParam('n');
    if (linkKey) { lsSet('sepaShKey:' + id, linkKey); if (linkName && !lsGet('sepaShName:' + id)) lsSet('sepaShName:' + id, linkName); history.replaceState(null, '', pageLink('s=' + id + (prev ? '&v=prev' : '') + (asHq ? '&as=hq' : ''))); }
    var key = goodKey(lsGet('sepaShKey:' + id));
    if (!key && !asHq) {
      if (token()) { location.replace(pageLink('s=' + id + (prev ? '&v=prev' : '') + '&as=hq')); return; }
      notice('This phone does not have the link for that shelter. Ask a supervisor to send it with Add supervisor.');
      return startScreen();
    }
    var me = lsGet('sepaShName:' + id) || '';
    if (key && !me && !asHq) {
      $('sr-name-ask').hidden = false;
      if (linkName) $('sr-my-name').value = linkName;
      $('sr-name-form').onsubmit = function (e) {
        e.preventDefault();
        var n = $('sr-my-name').value.trim(), err = $('sr-name-error');
        if (!n) { err.textContent = 'Please type your name.'; err.hidden = false; return; }
        lsSet('sepaShName:' + id, n);
        call({ action: 'shAddSup', id: id, key: key, me: n, name: n, self: true });
        location.reload();
      };
      return;
    }
    function auth(o) { o.id = id; if (key) o.key = key; o.me = me; if (token()) o.token = token(); if (asHq) o.asHq = true; return o; }

    var S = { today: '', ms: '', hq: false, name: '', joinKey: '' };
    var cur = { day: '', answers: {} };      // the day shown in the status check
    var pending = {}, timers = {}, sending = 0;

    // ---- the pinned bar: Today's report | Previous days, the shelter name, Change shelter
    function bar() {
      var list = mine();
      var change = (S.hq || list.length > 1) ? { label: 'Change shelter', title: 'Change shelter',
        note: S.hq ? 'Every open shelter, most recent activity first.' : 'Shelters this phone has been sent.',
        allHref: S.hq ? pageLink('view=hq') : '', allLabel: 'See all shelters on one page',
        load: function (done) {
          if (!S.hq) return done(list.map(function (x) { return { href: pageLink('s=' + x.id), title: x.name || 'Shelter', sub: x.id === id ? '' : 'Tap to open', current: x.id === id }; }));
          call({ action: 'shList', token: token() }).then(function (r) {
            if (!(r && r.ok)) return done(null, r && r.login ? 'Please log in again as HQ.' : 'Could not load the shelters.');
            done(r.items.map(function (it) {
              var have = goodKey(lsGet('sepaShKey:' + it.id));
              return { href: pageLink('s=' + it.id + (have ? '' : '&as=hq')), title: it.name, current: it.id === id,
                sub: (it.address ? it.address + ' · ' : '') + 'last activity ' + ago(r.now - it.ms) };
            }));
          });
        } } : null;
      var q = 's=' + id + (asHq ? '&as=hq' : '');
      SEPAViewBar.show({ on: prev ? 'b' : 'a', showSwitch: true,
        a: { label: "Today's report", href: pageLink(q) },
        // v0.27.43: greyed out until the shelter has an earlier day (Sean: on day one it led to an empty screen)
        b: { label: 'Previous days', href: pageLink(q + '&v=prev'), disabled: S.days ? '' : 'No earlier days yet. Today\'s report moves here at midnight.' },
        name: S.name + (S.hq ? ' (HQ)' : ''), change: change, actions: null });
    }

    // ---- first load
    function gone(r) {
      if (r && r.closed) { forget(id); notice('This shelter has been closed and its data erased.'); $('sr-today').hidden = $('sr-prev').hidden = true; startScreen(); return true; }
      if (r && r.nokey) {
        if (r.hqLogin || asHq) { needLogin('Your HQ login has ended. Log in again to open this shelter.', function () { location.reload(); }); return true; }
        forget(id); notice('This link no longer opens that shelter.'); startScreen(); return true;
      }
      if (r && r.gone) { forget(id); notice(r.error); startScreen(); return true; }
      return false;
    }
    call(auth({ action: 'shGet' })).then(function (r) {
      if (gone(r)) return;
      if (!(r && r.ok)) {
        notice(oldScript(r) ? 'The Daily Shelter Report is not switched on yet. The site admin needs to update the Google script.' : (r && r.error) || 'Could not connect. Please check your signal and reload.');
        return;
      }
      S.name = r.shelter.name; S.hq = !!r.hq; S.joinKey = r.joinKey || ''; S.days = (r.days || []).length;
      if (prev && !S.days) { location.replace(pageLink('s=' + id + (asHq ? '&as=hq' : ''))); return; }   // nothing to show yet
      if (key) remember(id, S.name);
      document.title = S.name + ' - Daily Shelter Report';
      $('sr-title').textContent = 'Daily Shelter Report';
      $('sr-intro').textContent = S.name + (r.shelter.address ? ', ' + r.shelter.address : '');
      showLogout();
      bar();
      var carried = lsGet('sepaShNote'); if (carried) { notice(carried); lsSet('sepaShNote', ''); }
      if (asHq && !S.hq) return needLogin('Log in as HQ to open this shelter.', function () { location.reload(); });
      if (prev) prevScreen(r); else todayScreen(r);
    });

    // ================================================================ TODAY
    function todayScreen(r) {
      $('sr-today').hidden = false;
      Array.prototype.forEach.call(document.querySelectorAll('.sr-hq-only'), function (b) { b.hidden = !S.hq; });
      buildQs($('sr-qs'), true, '');
      apply(r);
      // the log
      $('sr-log-form').onsubmit = function (e) {
        e.preventDefault();
        var t = $('sr-log-in').value.trim(), err = $('sr-log-error'), btn = $('sr-log-btn');
        err.hidden = true; if (!t) return;
        btn.disabled = true;
        var flag = $('sr-flag').getAttribute('aria-pressed') === 'true';
        call(auth({ action: 'shLog', text: t, flag: flag })).then(function (x) {
          btn.disabled = false;
          if (gone(x)) return;
          if (!(x && x.ok)) { err.textContent = (x && x.error) || 'Not saved: no connection. Please try again.'; err.hidden = false; return; }
          $('sr-log-in').value = ''; setFlag(false); poll(true);
        });
      };
      // v0.27.41: "Flag as an issue" (red) before adding an entry
      function setFlag(on) { var f = $('sr-flag'); f.setAttribute('aria-pressed', on ? 'true' : 'false'); f.classList.toggle('on', on); $('sr-log-btn').textContent = on ? 'Add flagged issue to the log' : 'Add to the log'; }
      $('sr-flag').onclick = function () { setFlag(this.getAttribute('aria-pressed') !== 'true'); };
      $('sr-add').onclick = openAdd;
      $('sr-log-all').onclick = openAll;
      window.addEventListener('resize', function () { fitLog(); });
      $('sr-close').onclick = openClose;
      $('sr-dl').onclick = function () { var b = this; b.disabled = true; download(id, auth).then(function (x) { b.disabled = false; if (x && x.login) needLogin('', function () {}); }); };
      setInterval(function () { if (!document.hidden) poll(false); }, 6000);
      document.addEventListener('visibilitychange', function () { if (!document.hidden) poll(true); });
      window.addEventListener('pagehide', flushAll);
    }
    function poll(force) {
      if (sending) return;
      call(auth({ action: 'shGet', since: force ? '' : S.ms, day: S.today })).then(function (r) {
        if (gone(r)) return;
        if (!(r && r.ok)) { state(r && r.offline ? 'No connection. Your typing is kept on this page; it will save when the signal is back.' : '', true); return; }
        if (r.same) { S.hq = !!r.hq; return; }
        apply(r);
      });
    }
    function apply(r) {
      if (S.today && r.today !== S.today) {
        notice('A new day started at midnight. Yesterday\'s report is locked and in Previous days.');
        Array.prototype.forEach.call($('sr-qs').querySelectorAll('textarea'), function (t) { t.value = ''; });
        pending = {};
      }
      S.today = r.today; S.ms = r.ms; S.hq = !!r.hq; S.joinKey = r.joinKey || S.joinKey;
      if ((r.days || []).length !== S.days) { S.days = (r.days || []).length; bar(); }   // after midnight the Previous days switch comes alive
      cur.day = r.today; cur.answers = r.report.answers || {};
      $('sr-date').textContent = dayName(r.today, true);
      $('sr-saved').textContent = r.report.saved ? clock(r.report.saved) + ' by ' + r.report.savedBy : 'Nothing saved yet today';
      fillQs($('sr-qs'), cur.answers, r.today);
      drawSups(r.sups || []);
      var wrap = $('sr-log-wrap'), keep = wrap.scrollTop;
      drawLog($('sr-log'), r.report.log || [], r.today, '');
      S.log = r.report.log || [];
      fitLog(); wrap.scrollTop = keep;
      if (!$('sr-all-modal').hidden) drawAll();
      drawCarry(r.carry || [], r.today);
      state('', false);
    }
    function state(msg, bad) {
      var s = $('sr-state');
      if (msg) { s.textContent = msg; s.className = 'sr-state sr-bad'; return; }
      if (bad) return;
      var n = Object.keys(pending).length + sending;
      s.textContent = n ? 'Saving...' : '✓ Saved';
      s.className = 'sr-state' + (n ? '' : ' sr-good');
    }
    function drawSups(list) {
      var ul = $('sr-sups'); ul.innerHTML = '';
      list.forEach(function (s) {
        var li = el('li');
        var b = el('b', '', s.name); li.appendChild(b);
        if (s.by === 'Opened the shelter') li.appendChild(el('span', 'sr-tag', 'Opened the shelter'));
        if (me && s.name.toLowerCase() === me.toLowerCase()) li.appendChild(el('span', 'sr-tag sr-you', 'You'));
        li.appendChild(el('small', '', 'Added ' + when(s.added, S.today) + (s.by && s.by !== 'Opened the shelter' && s.by !== 'Opened the link' ? ' · ' + s.by.replace(/^Added by/, 'by') : '')));
        ul.appendChild(li);
      });
    }

    // ---- the 16 questions. editable: answers can be changed here. day: '' = today, or an earlier day (HQ).
    function buildQs(box, editable, day) {
      box.innerHTML = '';
      QS.forEach(function (q, i) {
        var k = 'q' + (i + 1), wrap = el('div', 'sr-q'); wrap.dataset.q = k;
        var lab = el('p', 'sr-q-text', (i + 1) + '. ' + q[1]); lab.id = 'srl-' + k + (day || '');
        wrap.appendChild(lab);
        if (q[0] === 'yn') {
          var g = el('div', 'rc-choice sr-yn'); g.setAttribute('role', 'radiogroup'); g.setAttribute('aria-labelledby', lab.id);
          ['Yes', 'No'].forEach(function (v) {
            var b = el('button', '', v); b.type = 'button'; b.dataset.v = v; b.disabled = !editable;
            b.addEventListener('click', function () {
              var now = b.classList.contains('on') ? '' : v;      // tap again to clear
              Array.prototype.forEach.call(g.children, function (x) { x.classList.toggle('on', x.dataset.v === now); x.setAttribute('aria-checked', x.dataset.v === now); });
              save(k, now, day, wrap);
              showExplain(wrap, now);
            });
            b.setAttribute('role', 'radio');
            g.appendChild(b);
          });
          wrap.appendChild(g);
        } else {
          var t = el('textarea', 'esc-in sr-tx'); t.rows = 3; t.maxLength = 3000; t.setAttribute('aria-labelledby', lab.id);
          if (q[2]) t.placeholder = q[2];
          t.readOnly = !editable;
          t.addEventListener('input', function () { pending[k + day] = 1; state(); clearTimeout(timers[k + day]); timers[k + day] = setTimeout(function () { save(k, t.value, day, wrap); }, 1200); });
          t.addEventListener('blur', function () { if (pending[k + day]) { clearTimeout(timers[k + day]); save(k, t.value, day, wrap); } });
          wrap.appendChild(t);
        }
        wrap.appendChild(el('p', 'sr-by'));
        if (q[0] === 'yn' && q[3]) {        // v0.27.43: the "Please explain" box
          var x = el('div', 'sr-q sr-explain'), xk = k + 'x'; x.dataset.q = xk; x.dataset.when = q[3]; x.hidden = true;
          var xl = el('label', 'sr-explain-label', 'Please explain:'); xl.htmlFor = 'srx-' + xk + (day || '');
          var xt = el('textarea', 'esc-in sr-tx'); xt.rows = 3; xt.maxLength = 3000; xt.id = 'srx-' + xk + (day || ''); xt.readOnly = !editable;
          xt.addEventListener('input', function () { pending[xk + day] = 1; state(); clearTimeout(timers[xk + day]); timers[xk + day] = setTimeout(function () { save(xk, xt.value, day, x); }, 1200); });
          xt.addEventListener('blur', function () { if (pending[xk + day]) { clearTimeout(timers[xk + day]); save(xk, xt.value, day, x); } });
          x.appendChild(xl); x.appendChild(xt); x.appendChild(el('p', 'sr-by'));
          wrap.appendChild(x);
        }
        box.appendChild(wrap);
      });
    }
    // The explain box shows when the answer is the one that needs explaining, or when something is already typed in it.
    function showExplain(wrap, v) {
      var x = wrap.querySelector(':scope > .sr-explain'); if (!x) return;
      var t = x.querySelector('textarea');
      x.hidden = !(v === x.dataset.when || (t && t.value.trim()));
      if (!x.hidden && v === x.dataset.when && document.activeElement && document.activeElement.tagName === 'BUTTON' && wrap.contains(document.activeElement)) setTimeout(function () { t.focus(); }, 50);
    }
    function fillQs(box, answers, today, locked) {
      var all = Array.prototype.slice.call(box.querySelectorAll('.sr-q'));
      all.sort(function (x, y) { return y.classList.contains('sr-explain') - x.classList.contains('sr-explain'); });   // explanations first
      all.forEach(function (wrap) {
        var k = wrap.dataset.q, a = answers[k] || {}, v = a.v || '';
        var busy = pending[k + (wrap.dataset.day || '')];
        var t = wrap.querySelector(':scope > textarea');
        if (t) { if (!busy && document.activeElement !== t) t.value = v; }
        else if (!busy) Array.prototype.forEach.call(wrap.querySelectorAll(':scope > .sr-yn > button'), function (b) { b.classList.toggle('on', b.dataset.v === v); b.setAttribute('aria-checked', b.dataset.v === v); });
        // v0.27.41: no question is required (Sean): nothing is marked as missing.
        wrap.querySelector(':scope > .sr-by').textContent = v ? (a.by + ', ' + when(a.at, today) + (a.hq ? ' (changed by HQ after the day locked)' : '')) : '';
        if (!wrap.classList.contains('sr-explain')) {
          var on = wrap.querySelector(':scope > .sr-yn > button.on');
          showExplain(wrap, on ? on.dataset.v : '');
        }
      });
    }
    function save(k, v, day, wrap) {
      delete pending[k + day]; pending[k + day] = 1; sending++; state();
      var o = auth({ action: 'shSave', q: k, v: v }); if (day) { o.day = day; o.asHq = true; }
      call(o).then(function (r) {
        sending--; delete pending[k + day];
        if (gone(r)) return;
        if (r && r.locked) { notice(r.error + ' Your answer was not saved.'); poll(true); return; }
        if (r && r.login) { needLogin('Your HQ login has ended. Log in again to keep editing.', function () { save(k, v, day, wrap); }); return; }
        if (!(r && r.ok)) {        // keep it and try again shortly
          pending[k + day] = 1; state('Not saved yet: no connection. It will keep trying.', true);
          clearTimeout(timers[k + day]); timers[k + day] = setTimeout(function () { save(k, v, day, wrap); }, 5000);
          return;
        }
        if (r.at) { var by = wrap.querySelector(':scope > .sr-by'); by.textContent = v ? r.by + ', ' + clock(r.at) + (day ? ' (changed by HQ after the day locked)' : '') : ''; }
        if (!day) { S.ms = r.ms; poll(true); }
        state();
      });
    }
    function flushAll() {
      Object.keys(timers).forEach(function (k) { clearTimeout(timers[k]); });
      Array.prototype.forEach.call(document.querySelectorAll('.sr-q'), function (wrap) {
        var t = wrap.querySelector(':scope > textarea'), k = wrap.dataset.q, day = wrap.dataset.day || '';
        if (t && pending[k + day] && navigator.sendBeacon) {
          var o = auth({ action: 'shSave', q: k, v: t.value }); if (day) { o.day = day; o.asHq = true; }
          try { navigator.sendBeacon(URL, JSON.stringify(o)); } catch (e) {}
        }
      });
    }

    // ---- a log list. canEdit (HQ): Edit / Remove on each entry. day: which day (for reloading).
    function entryMs(e) { return parseInt(String(e.id || '').slice(1, 9), 36) || 0; }   // entry ids start with the exact save time
    function drawLog(ul, list, today, day) {
      ul.innerHTML = '';
      if (!list.length) { ul.appendChild(el('li', 'sr-log-none', 'No entries yet.')); return; }
      // v0.27.41: flagged issues first (newest first among them), then everything else newest first
      list.slice().sort(function (x, y) { return (!!y.flag - !!x.flag) || (x.at < y.at ? 1 : x.at > y.at ? -1 : 0) || (entryMs(y) - entryMs(x)); }).forEach(function (e) {
        var li = el('li', e.flag ? 'sr-flagged' : ''), head = el('small');
        if (e.flag) {
          var fl = el('span', 'sr-flag-label', 'Flagged issue');
          li.appendChild(fl);
        }
        head.appendChild(el('b', '', e.by)); head.appendChild(document.createTextNode(' · ' + when(e.at, today)));
        li.appendChild(head);
        if (e.text) li.appendChild(el('span', 'sr-log-text', e.text));
        else li.appendChild(el('span', 'sr-log-gone', 'This entry was removed by HQ.'));
        if (e.edited) li.appendChild(el('small', 'sr-edited', e.edited.replace(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/, function (t) { return when(t, today); })));
        if (e.flag) li.appendChild(el('small', 'sr-flag-by', e.flag.replace(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/, function (t) { return when(t, today); })));
        var tools = el('span', 'sr-log-tools'), any = false;
        if (!day || S.hq) {      // today: anyone; an earlier day: HQ while editing it
          var fb = el('button', 'link-btn sr-flag-btn', e.flag ? 'Remove flag' : 'Flag as an issue'); fb.type = 'button';
          fb.addEventListener('click', function () { flagEntry(e, !e.flag, day, fb); });
          tools.appendChild(fb); any = true;
        }
        if (S.hq) {
          var ed = el('button', 'link-btn', 'Edit (HQ)'); ed.type = 'button';
          ed.addEventListener('click', function () { editEntry(li, e, day); });
          tools.appendChild(ed); any = true;
        }
        if (any) li.appendChild(tools);
        ul.appendChild(li);
      });
    }
    // v0.27.43: the log box shows the flagged issues and the 3 newest entries; older ones scroll inside the box,
    // so a long day does not push the rest of the report down. "See all of today's entries" opens them all.
    function fitLog() {
      var wrap = $('sr-log-wrap'), ul = $('sr-log'), lis = ul.children, more = $('sr-log-more');
      var flagged = ul.querySelectorAll('li.sr-flagged').length, show = flagged + 3, entries = (S.log || []).length;
      $('sr-log-all').hidden = !entries;
      if (lis.length <= show) { wrap.style.maxHeight = ''; wrap.classList.remove('sr-scrolls'); more.hidden = true; return; }
      var last = lis[show - 1];
      wrap.style.maxHeight = (last.offsetTop + last.offsetHeight + 2) + 'px';
      wrap.classList.add('sr-scrolls');
      var rest = lis.length - show;
      more.textContent = rest + (rest === 1 ? ' earlier entry' : ' earlier entries') + ': scroll inside the box, or see them all below.';
      more.hidden = false;
    }
    function drawAll() {
      var ul = $('sr-all-list');
      drawLog(ul, S.log || [], S.today, '');
      Array.prototype.forEach.call(ul.querySelectorAll('.sr-log-tools'), function (t) { t.remove(); });   // read only here
      $('sr-all-title').textContent = "All of today's entries (" + (S.log || []).length + ')';
    }
    function openAll() {
      var m = $('sr-all-modal'); drawAll(); m.hidden = false;
      function shut() { m.hidden = true; }
      $('sr-all-x').onclick = shut; m.onclick = function (e) { if (e.target === m) shut(); };
      document.addEventListener('keydown', function k(e) { if (e.key === 'Escape') { shut(); document.removeEventListener('keydown', k); } });
      $('sr-all-x').focus();
    }
    // v0.27.41: flagged issues from earlier days, in their own box above the log, until someone removes the flag
    function drawCarry(list, today) {
      var box = $('sr-carry'), ul = $('sr-carry-list');
      box.hidden = !list.length; ul.innerHTML = '';
      list.slice().sort(function (x, y) { return x.at < y.at ? 1 : -1; }).forEach(function (e) {
        var li = el('li', 'sr-flagged'), head = el('small');
        head.appendChild(el('b', '', e.by)); head.appendChild(document.createTextNode(' · ' + dayName(e.day, false) + ', ' + clock(e.at)));
        li.appendChild(head);
        if (e.text) li.appendChild(el('span', 'sr-log-text', e.text)); else li.appendChild(el('span', 'sr-log-gone', 'This entry was removed by HQ.'));
        li.appendChild(el('small', 'sr-flag-by', e.flag.replace(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/, function (t) { return when(t, today); })));
        var tools = el('span', 'sr-log-tools'), fb = el('button', 'link-btn sr-flag-btn', 'Remove flag (dealt with)'); fb.type = 'button';
        fb.addEventListener('click', function () { flagEntry(e, false, '', fb); });
        tools.appendChild(fb); li.appendChild(tools); ul.appendChild(li);
      });
    }
    function flagEntry(e, on, day, btn) {
      btn.disabled = true;
      var o = auth({ action: 'shLogFlag', entry: e.id, flag: on }); if (day) o.asHq = true;
      call(o).then(function (r) {
        btn.disabled = false;
        if (gone(r)) return;
        if (r && r.locked) { notice(r.error); return; }
        if (!(r && r.ok)) { notice((r && r.error) || 'Not saved: no connection. Please try again.'); return; }
        if (day) openDay(day, true); else poll(true);
      });
    }
    function editEntry(li, e, day) {
      if (li.querySelector('.sr-log-edit')) return;
      var f = el('div', 'sr-log-edit'), t = el('textarea', 'esc-in'); t.rows = 3; t.value = e.text; t.maxLength = 3000;
      var row = el('div', 'esc-buttons'), sv = el('button', 'primary-btn', 'Save change'), rm = el('button', 'esc-btn esc-danger', 'Remove entry'), cc = el('button', 'esc-btn', 'Cancel');
      [sv, rm, cc].forEach(function (b) { b.type = 'button'; row.appendChild(b); });
      var err = el('p', 'form-error'); err.hidden = true;
      f.appendChild(el('p', 'esc-group-how', 'HQ only. The entry stays in the log, marked as edited (or removed) by HQ.'));
      f.appendChild(t); f.appendChild(row); f.appendChild(err); li.appendChild(f); t.focus();
      function go(text) {
        sv.disabled = rm.disabled = true;
        call(auth({ action: 'shLogEdit', entry: e.id, text: text, asHq: true })).then(function (r) {
          sv.disabled = rm.disabled = false;
          if (r && r.login) return needLogin('Log in as HQ to edit the log.', function () { go(text); }, function () {});
          if (!(r && r.ok)) { err.textContent = (r && r.error) || 'Not saved: no connection.'; err.hidden = false; return; }
          if (day) openDay(day, true); else poll(true);
        });
      }
      sv.addEventListener('click', function () { if (t.value.trim()) go(t.value); });
      rm.addEventListener('click', function () { go(''); });
      cc.addEventListener('click', function () { f.remove(); });
    }

    // ---- Add supervisor
    function openAdd() {
      var m = $('sr-add-modal'); m.hidden = false;
      $('sr-add-form').hidden = false; $('sr-add-done').hidden = true; $('sr-add-error').hidden = true;
      $('sr-add-name').value = ''; setTimeout(function () { $('sr-add-name').focus(); }, 50);
      $('sr-add-x').onclick = function () { m.hidden = true; };
      m.onclick = function (e) { if (e.target === m) m.hidden = true; };
      $('sr-add-form').onsubmit = function (e) {
        e.preventDefault();
        var n = $('sr-add-name').value.trim(), err = $('sr-add-error'), btn = $('sr-add-btn');
        if (!n) { err.textContent = 'Please type their name.'; err.hidden = false; return; }
        btn.disabled = true;
        call(auth({ action: 'shAddSup', name: n })).then(function (r) {
          btn.disabled = false;
          if (gone(r)) { m.hidden = true; return; }
          if (!(r && r.ok)) { err.textContent = (r && r.error) || 'Not saved: no connection. Please try again.'; err.hidden = false; return; }
          drawSups(r.sups || []);
          var k = key || r.joinKey, url = pageLink('s=' + id) + '#k=' + k + '&n=' + encodeURIComponent(n);
          $('sr-add-form').hidden = true; $('sr-add-done').hidden = false;
          $('sr-add-ok').textContent = n + ' was added. Now send them the link.';
          $('sr-add-link').value = url; $('sr-add-hint').textContent = '';
          $('sr-add-send').onclick = function () {
            var text = 'You are a shift supervisor for ' + S.name + '. Open this link for the Daily Shelter Report:';
            if (navigator.share) { navigator.share({ title: 'Daily Shelter Report', text: text, url: url }).catch(function () {}); return; }
            var hold = function () { $('sr-add-hint').textContent = 'Press and hold the link above to copy it, then paste it into a text.'; };
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function () { $('sr-add-hint').textContent = 'The link was copied. Paste it into a text to ' + n + '.'; }, hold);
            else hold();
          };
        });
      };
    }

    // ---- Close shelter and erase all data
    function openClose() {
      var m = $('sr-close-modal'); m.hidden = false;
      $('sr-close-name').textContent = S.name;
      $('sr-close-creds').hidden = S.hq; $('sr-close-dl-line').hidden = !S.hq; $('sr-close-nodl').hidden = S.hq;
      $('sr-close-error').hidden = true;
      function shut() { m.hidden = true; }
      $('sr-close-x').onclick = shut; $('sr-close-no').onclick = shut;
      m.onclick = function (e) { if (e.target === m) shut(); };
      $('sr-close-dl').onclick = function () { var b = this; b.disabled = true; download(id, auth).then(function () { b.disabled = false; }); };
      $('sr-close-form').onsubmit = function (e) {
        e.preventDefault();
        var btn = $('sr-close-yes'), err = $('sr-close-error');
        btn.disabled = true; err.hidden = true;
        var o = { action: 'shClose', id: id };
        if (S.hq) o.token = token(); else {
          o.user = $('sr-c-user').value; o.password = $('sr-c-pass').value;
          if (!o.user.trim() || !o.password) { btn.disabled = false; err.textContent = 'Please type the user name and password.'; err.hidden = false; return; }
        }
        call(o).then(function (r) {
          btn.disabled = false;
          if (!(r && r.ok)) { err.textContent = (r && r.error) || 'Could not connect. Please try again.'; err.hidden = false; return; }
          forget(id); lsSet('sepaShNote', 'The shelter was closed and all its data erased.');
          location.href = pageLink(S.hq ? 'view=hq' : '');
        });
      };
    }

    // ================================================================ PREVIOUS DAYS
    function prevScreen(r) {
      $('sr-prev').hidden = false;
      S.today = r.today;
      var box = $('sr-days');
      if (!r.days.length) { box.innerHTML = '<p class="esc-group-how">No earlier days yet. Today\'s report moves here at midnight.</p>'; return; }
      $('sr-prev-how').textContent = S.hq ? 'Each day locked at midnight. Tap a day to read it. As HQ you can also edit it.' : 'Each day\'s report locks at midnight. Tap a day to read it.';
      box.innerHTML = '';
      r.days.forEach(function (d) {
        var b = el('button', 'sr-day'); b.type = 'button'; b.dataset.day = d.day; b.setAttribute('aria-expanded', 'false');
        b.appendChild(el('b', '', dayName(d.day, false)));
        b.appendChild(el('span', '', d.entries + (d.entries === 1 ? ' log entry' : ' log entries') + ' · ' + (d.answered === QS.length ? 'all ' + QS.length + ' answered' : d.answered + ' of ' + QS.length + ' answered')));
        var body = el('div', 'sr-day-body'); body.hidden = true; body.id = 'sr-day-' + d.day;
        b.addEventListener('click', function () {
          var open = body.hidden; body.hidden = !open; b.classList.toggle('open', open); b.setAttribute('aria-expanded', open);
          if (open && !body.dataset.loaded) openDay(d.day, false);
        });
        box.appendChild(b); box.appendChild(body);
      });
    }
    function openDay(day, editing) {
      var body = $('sr-day-' + day); if (!body) return;
      body.dataset.loaded = '1';
      body.innerHTML = '<p class="esc-group-how">Loading&hellip;</p>';
      call(auth({ action: 'shDay', day: day })).then(function (r) {
        if (gone(r)) return;
        if (!(r && r.ok)) { body.innerHTML = '<p class="form-error">Could not load that day. Please try again.</p>'; return; }
        S.hq = !!r.hq;
        body.innerHTML = '';
        var lock = el('p', 'sr-lock', editing ? 'HQ editing. Changes save as you type and are marked as made by HQ.' : 'Locked at midnight. Read only.');
        body.appendChild(lock);
        if (!editing) {
          var eb = el('button', 'esc-btn sr-hq-edit', 'Edit this day (HQ)'); eb.type = 'button';
          eb.addEventListener('click', function () {
            if (S.hq && token()) return openDay(day, true);
            needLogin('Only HQ can edit a locked day. Log in as HQ.', function () { S.hq = true; openDay(day, true); }, function () {});
          });
          body.appendChild(eb);
        } else {
          var done = el('button', 'esc-btn sr-hq-edit', 'Done editing'); done.type = 'button';
          done.addEventListener('click', function () { openDay(day, false); });
          body.appendChild(done);
        }
        body.appendChild(el('h3', 'sr-h3', 'Running log'));
        var ul = el('ul', 'sr-log'); body.appendChild(ul);
        var hqWas = S.hq; if (!editing) S.hq = false; drawLog(ul, r.report.log || [], r.today, day); S.hq = hqWas;
        body.appendChild(el('h3', 'sr-h3', 'Status check'));
        body.appendChild(el('p', 'sr-meta-line', r.report.saved ? 'Last saved ' + when(r.report.saved, r.today) + ' by ' + r.report.savedBy : 'Nothing was saved in the status check that day.'));
        var qs = el('div', 'sr-qs'); body.appendChild(qs);
        buildQs(qs, editing, day);
        Array.prototype.forEach.call(qs.querySelectorAll('.sr-q'), function (w) { w.dataset.day = day; });
        fillQs(qs, r.report.answers || {}, r.today, true);
        if (editing) window.addEventListener('pagehide', flushAll);
      });
    }
  }

  // ================================================================ which screen
  showLogout();
  var sid = goodId(param('s'));
  if (param('view') === 'hq') hqList();
  else if (sid) shelter(sid, param('v') === 'prev');
  else { var n = lsGet('sepaShNote'); if (n) { notice(n); lsSet('sepaShNote', ''); } startScreen(); }
})();
