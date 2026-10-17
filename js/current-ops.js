// SEPA Resource Library - "Current Operations" box (website v0.27.42; loading state v0.27.45; every device and Join v0.27.49)
// At the top of the Start screen of the Escalation Form, the Reception Center Form and the Daily Shelter
// Report (Sean: if you open the page, you are probably looking for the one happening right now).
//   - First list: the worksheets / reception centers / shelters THIS PHONE is on that are still open
//     (each is checked with the Google script; cleared or closed ones are left out).
//   - Second list, only on a phone logged in as HQ: every open one (not already in the first list).
//   - v0.27.45 (Sean: people were confused while it loaded): while it checks, the box shows "Looking for active
//     events..." (v0.27.49: "Looking for current events...") with a spinner. Found nothing: the box says "No active events found. Start a new one below."
//   - v0.27.49 (Sean: switching from the laptop to the phone, the event must be right there): the box ALWAYS
//     shows, on every device, and lists EVERY open event (names only; worksheets by town and start time).
//     Events this phone is not on show "Join": the lead or HQ logs in and goes straight in (coLogin), anyone
//     else asks (askJoin) and the page opens the event by itself once a lead / supervisor / HQ lets them in.
// Each page calls SEPACurrentOps.show('esc' | 'rec' | 'sh', theElementToPutItAbove, 'Or start a new one').
// It only reads what the phone already keeps and asks the Google script with calls the forms already use.
var SEPACurrentOps = (function () {
  var URL = (typeof SEPA_BACKEND_URL === 'string') ? SEPA_BACKEND_URL : '';
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function keysStarting(p) { var out = []; try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (k && k.indexOf(p) === 0) out.push(k.slice(p.length)); } } catch (e) {} return out; }
  function goodId(v) { return /^[A-Za-z0-9]{8,24}$/.test(v || '') ? v : ''; }
  function goodKey(v) { return /^[A-Za-z0-9]{16,40}$/.test(v || '') ? v : ''; }
  function post(d) {
    if (!URL) return Promise.resolve(null);
    return fetch(URL, { method: 'POST', body: JSON.stringify(d) }).then(function (r) { return r.json(); }).catch(function () { return { offline: true }; });
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ago(ms) {
    var s = Math.max(0, Math.round(ms / 1000));
    if (s < 90) return 'just now';
    if (s < 5400) return Math.round(s / 60) + ' minutes ago';
    if (s < 129600) return Math.round(s / 3600) + ' hours ago';
    return Math.round(s / 86400) + ' days ago';
  }
  function clock(t) {
    var m = /(\d{4})-(\d{2})-(\d{2}) (\d{1,2}):(\d{2})/.exec(t || ''); if (!m) return '';
    var h = +m[4], d = new Date(+m[1], +m[2] - 1, +m[3]), now = new Date();
    var day = d.toDateString() === now.toDateString() ? 'today' : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()] + ' ' + d.getDate();
    return day + ' ' + ((h % 12) || 12) + ':' + m[5] + (h < 12 ? ' AM' : ' PM');
  }
  var token = function () { return lsGet('sepaEscHQ') || ''; };   // one HQ login for all three forms

  // ---- what this phone is on, still open
  function mineEsc() {
    var ids = keysStarting('sepaEscKey:').filter(function (id) { return goodId(id) && goodKey(lsGet('sepaEscKey:' + id)); });
    return Promise.all(ids.map(function (id) {
      return post({ action: 'escPing', id: id }).then(function (r) {
        if (r && r.cleared) return null;
        var w = {}; try { w = JSON.parse(lsGet('sepaEsc:' + id) || '{}') || {}; } catch (e) {}
        var addr = String(w.incident_addresses || '').split('\n')[0].trim();
        return { id: id, href: 'escalation.html?id=' + id, title: addr || 'Worksheet (no address typed yet)',
          sub: lsGet('sepaEscLead:' + id) === '1' ? 'You are the lead' : 'You are on this worksheet' };
      });
    }));
  }
  function mineRec() {
    var ids = keysStarting('sepaRecKey:').filter(function (id) { return goodId(id) && goodKey(lsGet('sepaRecKey:' + id)); });
    return Promise.all(ids.map(function (id) {
      return post({ action: 'recPing', id: id, key: lsGet('sepaRecKey:' + id) }).then(function (r) {
        if (r && (r.cleared || r.found === false || r.nokey)) return null;
        var name = (r && r.center) || lsGet('sepaRecCenter:' + id) || 'Reception center';
        return { id: id, href: 'reception.html?id=' + id, title: name,
          sub: goodKey(lsGet('sepaRecLead:' + id)) ? 'You are the lead' : 'You are doing intakes here' };
      });
    }));
  }
  function mineSh() {
    var list = []; try { list = JSON.parse(lsGet('sepaShList') || '[]') || []; } catch (e) {}
    return Promise.all(list.map(function (x) {
      var key = goodKey(lsGet('sepaShKey:' + x.id));
      if (!goodId(x.id) || !key) return null;
      return post({ action: 'shGet', id: x.id, key: key, me: lsGet('sepaShName:' + x.id) || '' }).then(function (r) {
        if (r && (r.closed || r.gone || r.nokey)) return null;
        var sub = r && r.ok ? ((r.shelter.address ? r.shelter.address + ' · ' : '') + (r.report && r.report.saved ? 'last saved ' + clock(r.report.saved) : 'opened ' + clock(r.shelter.opened))) : 'Tap to open its report';
        return { id: x.id, href: 'shelter.html?s=' + x.id, title: (r && r.ok && r.shelter.name) || x.name || 'Shelter', sub: sub };
      });
    }));
  }
  // ---- HQ: every open one
  function hqEsc() {
    return post({ action: 'escList', token: token() }).then(function (r) {
      if (!(r && r.ok)) return [];
      return r.items.map(function (it) {
        return { id: it.id, href: 'escalation.html?view=' + it.id, title: (it.address || '(no address typed yet)').split('\n')[0],
          sub: 'Started ' + clock(it.started) + ' · last change ' + ago((r.now || Date.now()) - (it.ms || 0)) + (it.asking ? ' · ' + it.asking + (it.asking === 1 ? ' person' : ' people') + ' asking to join' : '') };
      });
    });
  }
  function hqRec() {
    return post({ action: 'recList', token: token() }).then(function (r) {
      if (!(r && r.ok)) return [];
      return r.items.map(function (it) {
        return { id: it.id, href: 'reception.html?view=' + it.id, title: it.center || 'Reception center',
          sub: (it.lead ? 'Lead: ' + it.lead + ' · ' : '') + it.count + (it.count === 1 ? ' intake' : ' intakes') + (it.asking ? ' · ' + it.asking + (it.asking === 1 ? ' person' : ' people') + ' asking to join' : '') };
      });
    });
  }
  function hqSh() {
    return post({ action: 'shList', token: token() }).then(function (r) {
      if (!(r && r.ok)) return [];
      return r.items.map(function (it) {
        return { id: it.id, href: 'shelter.html?s=' + it.id + (goodKey(lsGet('sepaShKey:' + it.id)) ? '' : '&as=hq'), title: it.name,
          sub: (it.address ? it.address + ' · ' : '') + 'last activity ' + ago((r.now || Date.now()) - (it.ms || 0)) + (it.asking ? ' · ' + it.asking + (it.asking === 1 ? ' person' : ' people') + ' asking to join' : '') };
      });
    });
  }

  var WORDS = {
    esc: { what: 'worksheet', page: 'escalation.html', how: 'Open worksheets. Tap one to go in.', load: [mineEsc, hqEsc] },
    rec: { what: 'reception center', page: 'reception.html', how: 'Open reception centers. Tap one to go in.', load: [mineRec, hqRec] },
    sh: { what: 'shelter', page: 'shelter.html', how: 'Open shelters. Tap one to go in.', load: [mineSh, hqSh] }
  };
  function item(it, kind) {      // kind: 'mine' (this phone is on it), 'hq', 'join' (not on this phone yet)
    var label = kind === 'join' ? (it.waiting ? 'Waiting' : 'Join') : 'Open';
    return '<a class="co-item' + (kind === 'hq' ? ' co-hq' : kind === 'join' ? ' co-join' : '') + '" href="' + esc(it.href || '#') + '"' +
      (kind === 'join' ? ' data-join="' + esc(it.id) + '"' : '') + '><span class="co-text"><strong>' + esc(it.title) +
      '</strong><span>' + esc(it.sub) + '</span></span><b>' + label + '</b></a>';
  }
  function when(t) {
    var m = /(\d{4})-(\d{2})-(\d{2}) (\d{1,2}):(\d{2})/.exec(t || ''); if (!m) return '';
    var h = +m[4], d = new Date(+m[1], +m[2] - 1, +m[3]), now = new Date();
    var day = d.toDateString() === now.toDateString() ? 'today' : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][d.getMonth()] + ' ' + d.getDate();
    return day + ' ' + ((h % 12) || 12) + ':' + m[5] + (h < 12 ? ' AM' : ' PM');
  }
  // v0.27.49: EVERY open event of this form, for any device (names only; worksheets by town). Sean: on a new
  // device the event you have been working on must be right there at the top.
  function publicList(form) {
    return post({ action: 'coOpen', form: form }).then(function (r) {
      if (!(r && r.ok)) return null;
      return r.items.map(function (it) {
        var title = form === 'esc' ? (it.town || 'Incomplete address') :     // v0.27.51
          (it.name || (form === 'rec' ? 'Reception center' : 'Shelter'));
        var sub = 'Started ' + when(it.started) + (it.lead ? ' · Lead: ' + it.lead : '') + ' · not on this phone yet';
        return { id: it.id, title: title, sub: sub, lead: it.lead || '' };
      });
    });
  }
  function secret(n) {
    var abc = 'abcdefghjkmnpqrstuvwxyz23456789', out = '', rnd = [];
    try { rnd = crypto.getRandomValues(new Uint8Array(n)); } catch (e) { for (var i = 0; i < n; i++) rnd.push(Math.floor(Math.random() * 256)); }
    for (var j = 0; j < n; j++) out += abc.charAt(rnd[j] % abc.length);
    return out;
  }
  function lsSet(k, v) { try { if (v === '' || v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  // The same phone code js/ask-lead.js uses for "who is on this event" (so lead buttons work).
  function device(form, id) {
    var k = 'sepaDev:' + form + ':' + id, v = lsGet(k);
    if (!/^[A-Za-z0-9]{12,40}$/.test(v || '')) { v = secret(24); lsSet(k, v); }
    return v;
  }
  function pending(form) { try { return JSON.parse(lsGet('sepaAsk:' + form) || 'null'); } catch (e) { return null; } }
  // This phone is now on the event: remember it the way each form expects, then open it.
  function enter(form, id, key, name, extra, lead) {
    lsSet('sepaAsk:' + form, '');
    if (form === 'esc') {
      lsSet('sepaEscKey:' + id, key); lsSet('sepaEscCurrent', id); lsSet('sepaEscSeen:' + id, '1');
      if (lead) { lsSet('sepaEscCoLead:' + id, '1'); lsSet('sepaEscLead:' + id, '1'); }
      lsSet('sepaEscNote', lead ? 'You are in, as a lead. This is the same worksheet you started elsewhere: what you type goes into the same worksheet.' :
        'You were let in. You have joined this worksheet: what you type goes into the same worksheet as the rest of the team.'); lsSet('sepaEscNoteOk', '1');
      location.href = 'escalation.html?id=' + encodeURIComponent(id);
    } else if (form === 'rec') {
      lsSet('sepaRecKey:' + id, key); lsSet('sepaRecCurrent', id); lsSet('sepaRecJoined:' + id, '1');
      if (lead) lsSet('sepaRecCoLead:' + id, '1');
      if (extra) lsSet('sepaRecCenter:' + id, extra);
      if (!lsGet('sepaRecName') && name) lsSet('sepaRecName', name);
      location.href = 'reception.html?id=' + encodeURIComponent(id);
    } else {
      lsSet('sepaShKey:' + id, key); lsSet('sepaShName:' + id, name);
      var list = []; try { list = JSON.parse(lsGet('sepaShList') || '[]') || []; } catch (e) {}
      list = list.filter(function (x) { return x.id !== id; }); list.unshift({ id: id, name: extra || '' });
      lsSet('sepaShList', JSON.stringify(list.slice(0, 12)));
      location.href = 'shelter.html?s=' + encodeURIComponent(id);
    }
  }
  // A request sent earlier: keep checking until it is answered (the page opens the event by itself).
  var waitTimer = null;
  function watch(form, p, onStatus) {
    clearTimeout(waitTimer);
    function check() {
      post({ action: 'askStatus', form: form, id: p.id, rid: p.rid, ticket: p.ticket }).then(function (r) {
        if (r && r.ok && r.status === 'approved' && r.key) return enter(form, p.id, r.key, p.name, p.title, false);
        if (r && r.ok && (r.status === 'declined' || r.status === 'gone')) { lsSet('sepaAsk:' + form, ''); if (onStatus) onStatus(r.status); return; }
        waitTimer = setTimeout(check, 5000);
      });
    }
    check();
  }

  // ---- the "Join" pop-up: the lead or HQ logs in and goes straight in, anyone else asks to be let in
  function joinModal(form, it) {
    var W = WORDS[form], old = document.getElementById('co-join'); if (old) old.remove();
    var m = document.createElement('div'); m.className = 'f-modal co-modal'; m.id = 'co-join';
    var nameNow = lsGet('sepaAskName') || lsGet('sepaRecName') || '';
    m.innerHTML = '<div class="f-modal-box" role="dialog" aria-modal="true" aria-labelledby="co-join-t">' +
      '<button type="button" class="f-modal-x" aria-label="Close">&times;</button><h2 id="co-join-t">' + esc(it.title) + '</h2>' +
      '<div class="co-j-body"><p class="f-modal-note">This phone isn\'t on this ' + W.what + ' yet.</p>' +
      '<label class="field">Your name <input class="co-j-name" autocomplete="name" maxlength="60" value="' + esc(nameNow) + '"></label>' +
      '<p class="co-j-head">Lead or HQ? Log in to open it now</p>' +
      '<label class="field">User name <input class="co-j-user" autocomplete="username" autocapitalize="none" spellcheck="false"></label>' +
      '<label class="field">Password <input class="co-j-pass" type="password" autocomplete="current-password"></label>' +
      '<button type="button" class="primary-btn co-j-login">Log in and open</button>' +
      '<p class="co-j-or">or</p>' +
      (form !== 'sh' ? '<label class="field">Your phone (optional) <input class="co-j-phone" type="tel" autocomplete="tel" maxlength="30"></label>' : '') +
      '<button type="button" class="primary-btn co-j-ask">Request access</button>' +
      '<p class="esc-group-how">' + (form === 'sh' ? 'A supervisor of this shelter or HQ lets you in.' : 'The lead or HQ lets you in.') + ' This phone remembers the ' + W.what + ' after that.</p>' +
      '<p class="form-error co-j-err" hidden></p></div>' +
      '<div class="co-j-wait" hidden><p class="esc-status esc-warn co-j-msg"></p><button type="button" class="esc-btn co-j-cancel">Cancel my request</button></div></div>';
    document.body.appendChild(m);
    var q = function (c) { return m.querySelector(c); };
    function err(t) { q('.co-j-err').textContent = t || ''; q('.co-j-err').hidden = !t; }
    function close() { m.remove(); }
    q('.f-modal-x').onclick = close; m.onclick = function (e) { if (e.target === m) close(); };
    function waiting(p) {
      q('.co-j-body').hidden = true; q('.co-j-wait').hidden = false;
      q('.co-j-msg').textContent = 'Waiting for ' + (form === 'sh' ? 'a supervisor' : 'the lead') + (it.lead ? ' (' + it.lead + ')' : '') + ' or HQ to let you in… This opens by itself.';
      watch(form, p, function (st) { q('.co-j-msg').textContent = st === 'declined' ? 'You were not let in. Check with the lead directly.' : 'The request expired or the event closed. You can ask again.'; q('.co-j-cancel').textContent = 'Close'; });
    }
    q('.co-j-cancel').onclick = function () { clearTimeout(waitTimer); lsSet('sepaAsk:' + form, ''); close(); };
    q('.co-j-login').onclick = function () {
      var b = this, who = q('.co-j-name').value.trim();
      if (!who) return err('Please type your name.');
      if (!q('.co-j-user').value.trim() || !q('.co-j-pass').value) return err('Please type the user name and password.');
      b.disabled = true; err('');
      post({ action: 'coLogin', form: form, id: it.id, who: who, user: q('.co-j-user').value, password: q('.co-j-pass').value, dev: form === 'sh' ? '' : device(form, it.id) }).then(function (r) {
        b.disabled = false;
        if (!(r && r.ok)) return err(r && r.offline ? 'No connection. Please try again.' : /unknown request/i.test((r && r.error) || '') ? 'This is not switched on yet. The site admin needs to update the Google script.' : (r && r.error) || 'Could not log in.');
        lsSet('sepaAskName', who);
        enter(form, it.id, r.key, who, r.center || r.shelter || it.title, true);
      });
    };
    q('.co-j-ask').onclick = function () {
      var b = this, who = q('.co-j-name').value.trim();
      if (!who) return err('Please type your name, so the lead knows who is asking.');
      b.disabled = true; err('');
      var p = { id: it.id, ticket: secret(32), name: who, at: Date.now(), title: it.title };
      post({ action: 'askJoin', form: form, id: it.id, ticket: p.ticket, name: who, phone: form === 'sh' ? '' : q('.co-j-phone').value.trim() }).then(function (r) {
        b.disabled = false;
        if (!(r && r.ok)) return err(r && r.offline ? 'No connection. Please try again.' : (r && r.error) || 'Could not send. Please try again.');
        p.rid = r.rid; lsSet('sepaAsk:' + form, JSON.stringify(p)); lsSet('sepaAskName', who);
        waiting(p);
      });
    };
    var p0 = pending(form);
    if (p0 && p0.id === it.id && p0.rid) waiting(p0);
    else setTimeout(function () { (q('.co-j-name').value ? q('.co-j-user') : q('.co-j-name')).focus(); }, 50);
  }

  function show(form, before, orText) {
    var W = WORDS[form]; if (!W || !before || !before.parentNode) return;
    // v0.27.49: ALWAYS shown, on every device, with the loading message first (Sean: people pushed buttons
    // during the wait). Every device asks for the open events, so there is always something to wait for.
    var box = document.createElement('section'); box.className = 'co-box'; box.setAttribute('aria-label', 'Current Operations'); box.setAttribute('aria-live', 'polite');
    var or = document.createElement('p'); or.className = 'co-or'; or.textContent = orText || 'Or start a new one'; or.hidden = true;
    box.innerHTML = '<h2 class="co-h">Current Operations</h2><div class="co-load"><span class="co-spin" aria-hidden="true"></span>' +
      '<span>Looking for current events…<small>This takes a few seconds.</small></span></div>';
    before.parentNode.insertBefore(box, before); before.parentNode.insertBefore(or, before);
    function safe(p) { return Promise.resolve(p).then(function (r) { return r || []; }, function () { return []; }); }
    Promise.all([safe(W.load[0]()), token() ? safe(W.load[1]()) : Promise.resolve([]), publicList(form)]).then(function (res) {
      var mine = (res[0] || []).filter(Boolean), seen = {};
      mine.forEach(function (m) { seen[m.id] = 1; });
      var hq = (res[1] || []).filter(function (h) { return !seen[h.id]; });
      hq.forEach(function (h) { seen[h.id] = 1; });
      var p0 = pending(form);
      var join = (res[2] || []).filter(function (x) { return !seen[x.id]; }).map(function (x) {
        if (p0 && p0.id === x.id && p0.rid) { x.waiting = true; x.sub = 'You asked to join · waiting to be let in'; }
        return x;
      });
      if (res[2] === null && !mine.length && !hq.length) {
        box.innerHTML = '<h2 class="co-h">Current Operations</h2><p class="co-how co-none">Could not check for current events (no connection?). Reload the page to try again.</p>';
        return;
      }
      if (!mine.length && !hq.length && !join.length) {
        box.innerHTML = '<h2 class="co-h">Current Operations</h2><p class="co-how co-none">No current events. Start a new one below.</p>';
        return;
      }
      box.innerHTML = '<h2 class="co-h">Current Operations</h2><p class="co-how">' + esc(W.how) + '</p>' +
        mine.map(function (m) { return item(m, 'mine'); }).join('') +
        hq.map(function (h) { return item(h, 'hq'); }).join('') +
        join.map(function (j) { return item(j, 'join'); }).join('');
      Array.prototype.forEach.call(box.querySelectorAll('[data-join]'), function (a) {
        a.addEventListener('click', function (e) {
          e.preventDefault();
          var id = a.getAttribute('data-join'); joinModal(form, join.filter(function (x) { return x.id === id; })[0]);
        });
      });
      or.hidden = false;
      if (p0 && p0.rid && join.some(function (x) { return x.id === p0.id; })) watch(form, p0);    // opens by itself once let in
    });
  }
  return { show: show };
})();
