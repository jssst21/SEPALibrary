// SEPA Resource Library - asking the lead for the join link (v0.27.2)
// On the Start screen of the Escalation Form and the Reception Center Form. The page says which form it
// is with data-ask-form="escalation" or "reception" on its <body>.
//   ASK TO JOIN (in the app): for a responder who does not know who the lead is, whose lead is busy
//     elsewhere on a big scene, or who is joining a training exercise remotely. They pick the event
//     from a list of open ones (only its start time, the lead's name and, for Reception, the center
//     name are shown), type their name and send. The lead's phone shows "Bob Jones is asking to join"
//     with Approve and Decline. On Approve this page joins by itself; it keeps checking every few
//     seconds (and picks up again if the page is closed and reopened).
//   TEXT THE LEAD: opens a text message with the request already written, for when they know the lead.
//   HQ: a link to the HQ list, where HQ (logged in) can open any event without waiting for a link.
// The Google script keeps requests for 6 hours, then they vanish. Nothing typed in a form is shown to
// anyone who has not been approved.
// SEPAAskLead.render() draws the requests on the LEAD's phone (used by js/escalation.js and js/reception.js).
var SEPAAskLead = (function () {
  var FORMS = {
    escalation: { code: 'esc', name: 'Large Scene Reporting Tool' },
    reception: { code: 'rec', name: 'Reception Center Form' }
  };
  var formName = document.body.getAttribute('data-ask-form'), F = FORMS[formName];
  var page = location.href.split('?')[0].split('#')[0];
  var URL = (typeof SEPA_BACKEND_URL === 'string') ? SEPA_BACKEND_URL : '';
  function $q(root, sel) { return root.querySelector(sel); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v === '' || v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function post(data) {
    if (!URL) return Promise.resolve({ ok: false, error: 'Not connected.' });
    return fetch(URL, { method: 'POST', body: JSON.stringify(data) }).then(function (r) { return r.json(); }).catch(function () { return { ok: false, offline: true }; });
  }
  function secret() {
    var abc = 'abcdefghjkmnpqrstuvwxyz23456789', out = '', rnd = [];
    try { rnd = crypto.getRandomValues(new Uint8Array(32)); } catch (e) { for (var i = 0; i < 32; i++) rnd.push(Math.floor(Math.random() * 256)); }
    for (var j = 0; j < 32; j++) out += abc.charAt(rnd[j] % abc.length);
    return out;
  }
  function when(text) {   // "2026-10-13 19:42:05" -> "Tue 7:42 PM"
    var m = /^(\d{4})-(\d\d)-(\d\d)[ T](\d\d):(\d\d)/.exec(text || '');
    if (!m) return '';
    var d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]), h = d.getHours();
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()] + ' ' + ((h % 12) || 12) + ':' + m[5] + (h < 12 ? ' AM' : ' PM');
  }
  function ago(ms) {
    var s = Math.max(0, Math.round((Date.now() - ms) / 1000));
    return s < 60 ? 'just now' : s < 3600 ? Math.round(s / 60) + ' min ago' : Math.round(s / 3600) + ' hr ago';
  }

  // ---------------------------------------------------------------- the LEAD's phone: requests waiting
  // asks: [{rid, name, phone, at}]. answer(rid, yes) is called when the lead taps Approve or Decline.
  var seen = {};
  var errs = {};     // v0.27.60: why an answer did not go through, by request
  function render(box, asks, answer) {
    if (!box) return;
    asks = asks || [];
    var fresh = asks.filter(function (a) { return !seen[a.rid]; });
    asks.forEach(function (a) { seen[a.rid] = 1; });
    if (fresh.length) { try { if (navigator.vibrate) navigator.vibrate([200, 100, 200]); } catch (e) {} }
    document.title = document.title.replace(/^\(\d+\) /, '');
    if (asks.length) document.title = '(' + asks.length + ') ' + document.title;
    if (!asks.length) { box.hidden = true; box.innerHTML = ''; return; }
    box.hidden = false;
    box.innerHTML = '<p class="ask-req-head">' + (asks.length === 1 ? esc(asks[0].name) + ' is' : asks.length + ' people are') + ' asking to join</p>' +
      asks.map(function (a) {
        return '<div class="ask-req" data-rid="' + esc(a.rid) + '"><p class="ask-req-who"><strong>' + esc(a.name) + '</strong>' +
          (a.phone ? ' &middot; <a href="tel:' + esc(a.phone.replace(/[^0-9+]/g, '')) + '">' + esc(a.phone) + '</a>' : '') +
          ' <span class="ask-req-when">' + ago(a.at) + '</span></p>' +
          '<div class="esc-buttons"><button type="button" class="primary-btn" data-yes>Let in</button>' +
          '<button type="button" class="esc-btn" data-no>No</button></div>' +
          (errs[a.rid] ? '<p class="form-error">' + esc(errs[a.rid]) + '</p>' : '') + '</div>';      // v0.27.49 (were Approve / Decline)
      }).join('') + '<p class="esc-group-how">Let in adds them to this ' + (formName === 'reception' ? 'reception center' : 'worksheet') + ' straight away. Only let in people you expect.</p>';
    Array.prototype.forEach.call(box.querySelectorAll('.ask-req'), function (row) {
      var rid = row.getAttribute('data-rid');
      Array.prototype.forEach.call(row.querySelectorAll('button'), function (b) {
        b.addEventListener('click', function () {
          var btns = row.querySelectorAll('button');
          Array.prototype.forEach.call(btns, function (x) { x.disabled = true; });
          // v0.27.60 (Sean: the box would not go away): if the answer does not go through, say why instead of
          // quietly putting the same request back. The page's answer() returns the Google script's reply.
          var p = answer(rid, b.hasAttribute('data-yes'));
          if (p && p.then) p.then(function (x) {
            if (x && x.ok) { delete errs[rid]; return; }
            errs[rid] = x && x.offline ? 'No connection. Please try again.' : x && x.login ? 'Your HQ log in has run out. Log in again, then try again.' : (x && x.error) || 'That did not go through. Please try again.';
            if (!row.isConnected) return;
            Array.prototype.forEach.call(btns, function (y) { y.disabled = false; });
            var e = row.querySelector('.form-error'); if (!e) { e = document.createElement('p'); e.className = 'form-error'; row.appendChild(e); }
            e.textContent = errs[rid];
          });
        });
      });
    });
  }

  // ---------------------------------------------------------------- WHO IS ON THIS EVENT (v0.27.3)
  // Each phone gets its own code for each event it is on, so the lead and HQ can remove one person.
  function device(form, id) {
    var k = 'sepaDev:' + form + ':' + id, v = lsGet(k);
    if (!/^[A-Za-z0-9]{12,40}$/.test(v || '')) { v = secret().slice(0, 24); lsSet(k, v); }
    return v;
  }
  function forgetDevice(form, id) { lsSet('sepaDev:' + form + ':' + id, ''); }
  // The list the lead and HQ see, with Remove (asks first, on the page). list: [{dev, name, role, lastMs}].
  // role: 'lead' = started the event, 'co-lead' = made a lead with "Add a lead" (v0.27.24), '' = responder.
  // remove(dev, done) must call done(newList) when removed, or done(null, 'error message').
  // opt (v0.27.24, optional): opt.makeLead(dev, done) works like remove and adds a "Make lead" button;
  // opt.hq = true when HQ is looking, which also shows Remove for added leads (only HQ may remove them).
  var lastList = [], lastOpt = null, lastWhat = '', openBoxes = {};
  function isLead(x) { return x.role === 'lead' || x.role === 'co-lead'; }
  function roster(box, list, remove, what, opt) {
    if (!box) return;
    list = list || []; opt = opt || {};
    lastList = list; lastOpt = opt; lastWhat = what;
    if (box.querySelector('.rost-confirm:not([hidden])') || box.getAttribute('data-busy')) return;   // do not redraw under someone's finger
    if (!list.length) { box.hidden = true; box.innerHTML = ''; return; }
    box.hidden = false;
    var nLeads = list.filter(isLead).length;     // v0.27.63: warn HQ before removing the only lead
    // v0.27.71 (Sean, Oct 24: there may be many names): the list folds up under its heading, which keeps the count.
    // It starts CLOSED with an eye-catching Show button, and stays the way the person left it while the page is open.
    var shut = !openBoxes[box.id];
    box.innerHTML = '<button type="button" class="rost-head rost-toggle" aria-expanded="' + !shut + '"><span>Who is on this ' + what + ' (' + list.length + ')</span>' +
      '<span class="rost-tg' + (shut ? ' rost-tg-show' : '') + '">' + (shut ? 'Show names' : 'Hide') + '</span></button><div class="rost-body"' + (shut ? ' hidden' : '') + '>' + list.map(function (x) {
      var nm = x.name || 'Name not given', canRm = !isLead(x) || opt.hq, canLead = !isLead(x) && opt.makeLead;
      return '<div class="rost-row" data-dev="' + esc(x.dev) + '"><p class="rost-who"><strong>' + esc(nm) + '</strong>' + (isLead(x) ? ' (lead)' : '') +
        (x.lastMs ? ' <span class="ask-req-when">seen ' + ago(x.lastMs) + '</span>' : '') + '</p>' +
        ((canLead || canRm) ? '<span class="rost-acts">' + (canLead ? '<button type="button" class="esc-btn rost-rm rost-mk">Make lead</button>' : '') +
          (canRm ? '<button type="button" class="esc-btn rost-rm rost-rmv">Remove</button>' : '') + '</span>' : '') +
        (canLead ? '<p class="rost-confirm rost-confirm-lead" hidden>Make ' + esc(nm) + ' a lead? They get the lead\'s buttons on their phone. ' +
          '<button type="button" class="esc-btn rost-lead-yes">Yes, make lead</button> <button type="button" class="link-btn rost-no">Cancel</button></p>' : '') +
        (canRm ? '<p class="rost-confirm rost-confirm-rm" hidden>' + (isLead(x) && nLeads <= 1 ?
          '<strong>' + esc(nm) + ' is the only lead.</strong> Remove anyway? You can make someone else a lead, or yourself, any time. ' :
          'Remove ' + esc(nm) + (isLead(x) ? ' (a lead)' : '') + '? ') + 'What they entered stays here. ' +
          '<button type="button" class="esc-btn esc-danger rost-yes">Yes, remove</button> <button type="button" class="link-btn rost-no">Cancel</button></p>' : '') + '</div>';
    }).join('') + '<p class="rost-err form-error" hidden></p><p class="esc-group-how">' +
      (opt.makeLead ? 'Make lead gives someone the lead\'s buttons too, for example when you are leaving the scene. ' : '') +
      'Remove takes someone off this ' + what + ', for example to free them to start a second one. What they already entered stays here. Their phone leaves within about a minute.' +
      (opt.hq ? '' : ' Only HQ can remove a lead.') + '</p></div>';
    box.querySelector('.rost-toggle').addEventListener('click', function () {
      openBoxes[box.id] = !openBoxes[box.id];
      var sh = !openBoxes[box.id], tg = this.querySelector('.rost-tg');
      this.setAttribute('aria-expanded', String(!sh)); box.querySelector('.rost-body').hidden = sh;
      tg.textContent = sh ? 'Show names' : 'Hide'; tg.classList.toggle('rost-tg-show', sh);
    });
    Array.prototype.forEach.call(box.querySelectorAll('.rost-row'), function (row) {
      var acts = row.querySelector('.rost-acts');
      if (!acts) return;
      var dev = row.getAttribute('data-dev');
      function wire(btnSel, cfSel, yesSel, fn, fail) {
        var b = row.querySelector(btnSel), cf = row.querySelector(cfSel);
        if (!b) return;
        b.addEventListener('click', function () { acts.hidden = true; cf.hidden = false; });
        cf.querySelector('.rost-no').addEventListener('click', function () { cf.hidden = true; acts.hidden = false; });
        cf.querySelector(yesSel).addEventListener('click', function () {
          var y = this; y.disabled = true; box.setAttribute('data-busy', '1');
          fn(dev, function (newList, err) {
            box.removeAttribute('data-busy'); y.disabled = false;
            if (newList) { cf.hidden = true; roster(box, newList, remove, what, opt); return; }
            var e = box.querySelector('.rost-err'); e.textContent = err || fail; e.hidden = false;
          });
        });
      }
      wire('.rost-rmv', '.rost-confirm-rm', '.rost-yes', remove, 'Could not remove. Please try again.');
      if (opt.makeLead) wire('.rost-mk', '.rost-confirm-lead', '.rost-lead-yes', opt.makeLead, 'Could not make them a lead. Please try again.');
    });
  }

  // ---------------------------------------------------------------- "ADD A LEAD" POP-UP (v0.27.24)
  // Opened by the "Add a lead" button on a lead's phone. Lists the people on the event who are not leads
  // yet (from the last list the page fetched), each with Make lead. makeLead(dev, done) as in roster().
  // onDone(newList) is called after someone was made a lead, so the page can redraw its own list.
  // v0.27.60 (Sean: as HQ he could not make himself a lead). meForm: 'esc' | 'rec' shows "Make me a lead" at the
  // top for an HQ phone that is not a lead on this event yet; no password again (coLogin with the HQ login).
  function makeMeLead(form, id, who, done) {
    post({ action: 'coLogin', form: form, id: id, who: who, token: lsGet('sepaEscHQ') || '', dev: device(form, id) }).then(function (r) {
      if (!(r && r.ok)) return done(r && r.offline ? 'No connection. Please try again.' : r && r.login ? 'Your HQ log in has run out. Log in again, then try again.' : (r && r.error) || 'That did not go through. Please try again.');
      lsSet('sepaAskName', who);
      if (form === 'esc') {
        lsSet('sepaEscKey:' + id, r.key); lsSet('sepaEscLead:' + id, '1'); lsSet('sepaEscCoLead:' + id, '1'); lsSet('sepaEscSeen:' + id, '1'); lsSet('sepaEscCurrent', id);
        if (!lsGet('sepaEscName')) lsSet('sepaEscName', who);
        lsSet('sepaEscNote', 'You are now a lead on this worksheet.'); lsSet('sepaEscNoteOk', '1');
      } else {
        lsSet('sepaRecKey:' + id, r.key); lsSet('sepaRecCoLead:' + id, '1'); lsSet('sepaRecCurrent', id);
        if (r.center) lsSet('sepaRecCenter:' + id, r.center);
        if (!lsGet('sepaRecName')) lsSet('sepaRecName', who);
        lsSet('sepaRecNote', 'You are now a lead on this reception center.');
      }
      done(null);
    });
  }
  function leadPicker(makeLead, onDone, me) {     // me: { form, id, go() } (v0.27.60) or nothing
    var what = lastWhat || (formName === 'reception' ? 'reception center' : 'worksheet');
    var old = document.getElementById('ask-lead-pick'); if (old) old.remove();
    var m = document.createElement('div'); m.className = 'f-modal'; m.id = 'ask-lead-pick';
    var people = lastList.filter(function (x) { return !isLead(x); });
    var leads = lastList.filter(isLead).map(function (x) { return x.name || 'Name not given'; });
    m.innerHTML = '<div class="f-modal-box" role="dialog" aria-modal="true" aria-labelledby="ask-lead-pick-t">' +
      '<button type="button" class="f-modal-x" aria-label="Close">&times;</button><h2 id="ask-lead-pick-t">Add a lead</h2>' +
      (me ? '<div class="pick-me-box"><label class="field">Your name <input class="pick-me-name" autocomplete="name" maxlength="60" value="' +
        esc(lsGet(me.form === 'esc' ? 'sepaEscName' : 'sepaRecName') || lsGet('sepaAskName') || '') + '"></label>' +
        '<button type="button" class="primary-btn pick-me">Make me a lead</button><p class="form-error pick-me-err" hidden></p>' +
        '<p class="esc-group-how">You are logged in as HQ, so no password is needed. This phone joins as a lead.</p></div>' : '') +
      '<p class="f-modal-note">Tap the person who should also be a lead. Their phone gets the lead\'s buttons within about a minute. You stay a lead too.' +
      (leads.length ? ' Leads now: ' + esc(leads.join(', ')) + '.' : '') + '</p>' +
      (people.length ? people.map(function (x) {
        var nm = x.name || 'Name not given';
        return '<div class="rost-row pick-row" data-dev="' + esc(x.dev) + '"><p class="rost-who"><strong>' + esc(nm) + '</strong></p>' +
          '<button type="button" class="primary-btn pick-btn">Make lead</button>' +
          '<p class="rost-confirm" hidden>Make <strong>' + esc(nm) + '</strong> a lead? <button type="button" class="esc-btn pick-yes">Yes, make lead</button> ' +
          '<button type="button" class="link-btn pick-no">Cancel</button></p></div>';
      }).join('') : '<p class="pick-none">Nobody else is on this ' + esc(what) + ' yet.</p>') +
      '<p class="form-error pick-err" hidden></p>' +
      '<p class="esc-group-how">Not on the list? Tap <strong>Add a responder</strong> and send them the link first. Once they open it, they show up here.</p>' +
      '<button type="button" class="esc-btn pick-close">Close</button></div>';
    document.body.appendChild(m);
    function close() { m.remove(); }
    m.querySelector('.f-modal-x').addEventListener('click', close);
    m.querySelector('.pick-close').addEventListener('click', close);
    if (me) m.querySelector('.pick-me').addEventListener('click', function () {
      var b = this, who = m.querySelector('.pick-me-name').value.trim(), e = m.querySelector('.pick-me-err');
      if (!who) { e.textContent = 'Please type your name.'; e.hidden = false; return; }
      b.disabled = true; e.hidden = true;
      makeMeLead(me.form, me.id, who, function (err) {
        if (err) { b.disabled = false; e.textContent = err; e.hidden = false; return; }
        close(); me.go();
      });
    });
    m.addEventListener('click', function (e) { if (e.target === m) close(); });
    Array.prototype.forEach.call(m.querySelectorAll('.pick-row'), function (row) {
      var b = row.querySelector('.pick-btn'), cf = row.querySelector('.rost-confirm');
      b.addEventListener('click', function () { b.hidden = true; cf.hidden = false; });
      row.querySelector('.pick-no').addEventListener('click', function () { cf.hidden = true; b.hidden = false; });
      row.querySelector('.pick-yes').addEventListener('click', function () {
        var y = this; y.disabled = true;
        makeLead(row.getAttribute('data-dev'), function (newList, err) {
          y.disabled = false;
          if (!newList) { var e = m.querySelector('.pick-err'); e.textContent = err || 'Could not make them a lead. Please try again.'; e.hidden = false; return; }
          cf.hidden = true;
          row.innerHTML = '<p class="rost-who"><strong>' + row.querySelector('strong').innerHTML + '</strong> is now a lead. Their phone gets the lead\'s buttons within about a minute.</p>';
          if (onDone) onDone(newList);
        });
      });
    });
    var first = m.querySelector('.pick-btn') || m.querySelector('.pick-close'); if (first) first.focus();
  }

  // ---------------------------------------------------------------- the RESPONDER's Start screen
  function responder(box) {
    var app = $q(box, '.ask-app'), wait = $q(box, '.ask-wait'), err = $q(box, '.ask-error'), list = $q(box, '.ask-events');
    var picked = '', timer = null, PKEY = 'sepaAsk:' + F.code;
    function showErr(m) { err.textContent = m; err.hidden = !m; }
    function pending() { try { return JSON.parse(lsGet(PKEY) || 'null'); } catch (e) { return null; } }

    function loadEvents() {
      list.innerHTML = '<p class="esc-group-how">Loading open events&hellip;</p>';
      post({ action: 'askList', form: F.code }).then(function (r) {
        if (!(r && r.ok)) { list.innerHTML = '<p class="esc-group-how">' + (r && r.offline ? 'No connection. Try again when you have a signal.' : 'Could not load the open events. Try again in a moment.') + '</p>'; return; }
        if (!r.items.length) { list.innerHTML = '<p class="esc-group-how">No open events right now. Check with your lead, or try again in a minute.</p>'; return; }
        list.innerHTML = r.items.map(function (it) {
          var main = F.code === 'rec' ? (it.center || 'Reception center') : 'Worksheet started ' + when(it.started);
          var sub = (F.code === 'rec' ? 'Started ' + when(it.started) + ' · ' : '') + (it.lead ? 'Lead: ' + it.lead : "Lead's name not entered yet");
          return '<button type="button" class="ask-event" data-id="' + esc(it.id) + '"><strong>' + esc(main) + '</strong><span>' + esc(sub) + '</span></button>';
        }).join('');
        Array.prototype.forEach.call(list.querySelectorAll('.ask-event'), function (b) {
          b.addEventListener('click', function () {
            picked = b.getAttribute('data-id');
            Array.prototype.forEach.call(list.querySelectorAll('.ask-event'), function (x) { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
          });
        });
      });
    }

    function waiting(p, msg) {
      app.hidden = true; wait.hidden = false;
      $q(wait, '.ask-wait-msg').textContent = msg || 'Request sent. Waiting for the lead to approve it. Keep this page open; it joins by itself as soon as they do.';
      clearTimeout(timer);
      var check = function () {
        post({ action: 'askStatus', form: F.code, id: p.id, rid: p.rid, ticket: p.ticket }).then(function (r) {
          if (r && r.ok && r.status === 'approved' && r.key) return joined(p, r.key);
          if (r && r.ok && (r.status === 'declined' || r.status === 'gone')) {
            lsSet(PKEY, '');
            $q(wait, '.ask-wait-msg').textContent = r.status === 'declined' ? 'The lead declined the request. Check with them directly.' : 'The request expired or the event has closed. You can ask again.';
            $q(wait, '.ask-cancel').textContent = 'Ask again';
            return;
          }
          var age = Date.now() - (p.at || Date.now());
          if (age < 7 * 86400 * 1000) timer = setTimeout(check, age < 10 * 60 * 1000 ? 5000 : 20000);
        });
      };
      check();
    }

    function joined(p, key) {
      lsSet(PKEY, '');
      if (F.code === 'esc') {
        lsSet('sepaEscKey:' + p.id, key); lsSet('sepaEscCurrent', p.id); lsSet('sepaEscSeen:' + p.id, '1');
        lsSet('sepaEscNote', 'Your lead approved your request. You have joined their worksheet: what you type goes into the same worksheet as the rest of the team.'); lsSet('sepaEscNoteOk', '1');
      } else {
        lsSet('sepaRecKey:' + p.id, key); lsSet('sepaRecCurrent', p.id); lsSet('sepaRecJoined:' + p.id, '1');
        if (!lsGet('sepaRecName') && p.name) lsSet('sepaRecName', p.name);
      }
      location.replace(page + '?id=' + encodeURIComponent(p.id));
    }

    $q(box, '[data-ask-app]').addEventListener('click', function () {
      wait.hidden = true; app.hidden = false; showErr('');
      var nm = $q(box, '.ask-name');
      if (!nm.value) nm.value = lsGet('sepaRecName') || lsGet('sepaAskName') || ((document.getElementById('rec-lead-name') || {}).value || '');
      loadEvents();
    });
    $q(box, '.ask-send').addEventListener('click', function () {
      var name = $q(box, '.ask-name').value.trim(), phone = $q(box, '.ask-phone').value.trim(), btn = this;
      if (!picked) return showErr('Please tap the event you are joining.');
      if (!name) return showErr('Please enter your name, so the lead knows who is asking.');
      showErr(''); btn.disabled = true;
      var p = { id: picked, ticket: secret(), name: name, at: Date.now() };
      post({ action: 'askJoin', form: F.code, id: p.id, ticket: p.ticket, name: name, phone: phone }).then(function (r) {
        btn.disabled = false;
        if (!(r && r.ok)) {
          if (r && /unknown request/i.test(r.error || '')) return showErr('Asking in the app is not switched on yet. The site admin needs to update the Google script. Use "Text the lead" instead.');
          if (r && r.gone) loadEvents();
          return showErr(r && r.offline ? 'No connection. Try again when you have a signal.' : ((r && r.error) || 'Could not send. Please try again.'));
        }
        p.rid = r.rid;
        lsSet(PKEY, JSON.stringify(p)); lsSet('sepaAskName', name);
        waiting(p);
      });
    });
    $q(box, '.ask-cancel').addEventListener('click', function () {
      clearTimeout(timer); lsSet(PKEY, ''); wait.hidden = true; this.textContent = 'Cancel request';
    });
    var p0 = pending();
    if (p0 && p0.id && p0.rid && Date.now() - (p0.at || 0) < 7 * 86400 * 1000) waiting(p0, 'You asked to join earlier. Still waiting for the lead to approve it. Keep this page open.');
  }

  // ---------------------------------------------------------------- "Text the lead" (sends nothing itself)
  function texter(box) {
    var message = 'Hi, this is a responder. When you can, please open the ' + F.name + ' (' + page + '), tap "Add a responder" and text me the join link. Thank you!';
    var phoneLike = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    var fb = $q(box, '.ask-fallback'), t = $q(box, '.ask-text'), copy = $q(box, '.ask-copy');
    function fallback() { fb.hidden = false; t.value = message; t.focus(); t.select(); }
    $q(box, '[data-ask-text]').addEventListener('click', function () {
      if (phoneLike) { location.href = 'sms:?&body=' + encodeURIComponent(message); return; }
      if (navigator.share) { navigator.share({ text: message }).catch(function (e) { if (!e || e.name !== 'AbortError') fallback(); }); return; }
      fallback();
    });
    copy.addEventListener('click', function () {
      var done = function () { copy.textContent = 'Copied'; setTimeout(function () { copy.textContent = 'Copy'; }, 2000); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t.value).then(done, function () { t.select(); });
      else { t.select(); try { document.execCommand('copy'); done(); } catch (e) {} }
    });
  }


  // ---------------------------------------------------------------- ADD A RESPONDER / ADD A LEAD (v0.27.59)
  // Sean, Oct 20: both buttons right under "Who is on this ...", on the worksheet / intake screen AND on the
  // Scene Summary / Summary, so nobody has to switch screens. Everyone on the event sees them. A lead or HQ goes
  // straight through; anyone else gets a pop-up for the lead or HQ log in (coLogin: the same as Join > log in,
  // which makes this phone a lead), or, if they do not know the password, a link to send so the new person can
  // ask to join (the lead or HQ then taps Let in). Most volunteers are 65+: bring things to them.
  // opt: { form: 'esc' | 'rec', id, what: 'worksheet', place(): name, canAdd(): true for a lead or HQ,
  //        joinLink(): the join link ('' if not ready), pick(): opens the Add a lead picker,
  //        becameLead(key): this phone is now a lead (the page shows the lead's buttons), beforeSend(): optional }
  function addBox(host, opt) {
    if (!host) return null;
    host.className = 'add-box'; host.hidden = false;
    host.innerHTML = '<button type="button" class="primary-btn add-resp">+ Add a responder</button>' +
      '<button type="button" class="esc-btn add-lead2">+ Add a lead</button>' +
      '<p class="add-need" hidden>Needs the lead or HQ log in. Don\'t know it? Tap anyway: you can send a link to ask to join.</p>' +
      '<p class="esc-note add-note" role="status" hidden></p>' +
      '<label class="esc-link-box add-linkbox" hidden><span class="add-linklabel">Link</span><input class="add-link" readonly></label>';
    var q = function (c) { return host.querySelector(c); };
    function note(t) { q('.add-note').textContent = t || ''; q('.add-note').hidden = !t; }
    function showLink(url, label) { q('.add-linkbox').hidden = false; q('.add-linklabel').textContent = label; q('.add-link').value = url; }
    function send(url, title, text, label) {
      if (navigator.share) { navigator.share({ title: title, text: text, url: url }).catch(function () {}); return; }
      var hold = function () { showLink(url, label); note('Press and hold the link below to copy it,\nthen paste it into a text or email.'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function () { showLink(url, label); note('The link was copied.\nPaste it into a text or email.'); }, hold);
      else hold();
    }
    function where() { var p = opt.place ? opt.place() : ''; return p ? ' at ' + p : ''; }
    function addResponder() {
      var link = opt.joinLink ? opt.joinLink() : '';
      if (!link) { note('The join link is not ready yet. Try again in a few seconds.'); return; }
      if (opt.beforeSend) opt.beforeSend();
      send(link, opt.form === 'esc' ? 'Join the DAT Large Scene Reporting Tool' : 'Join the reception center',
        (opt.form === 'esc' ? 'Join the DAT Large Scene Reporting Tool worksheet' + where() + '. Open this link to type into the same worksheet.'
                            : 'Join the reception center' + where() + '. Open this link to do intakes.'), 'Join link for a responder');
    }
    function askLink() { return page + '?ask=' + encodeURIComponent(opt.id); }
    function refresh() { q('.add-need').hidden = !!(opt.canAdd && opt.canAdd()); }
    refresh();
    q('.add-resp').addEventListener('click', function () { note(''); if (opt.canAdd()) addResponder(); else login('resp'); });
    q('.add-lead2').addEventListener('click', function () { note(''); if (opt.canAdd()) opt.pick(); else login('lead'); });

    function login(kind) {
      var old = document.getElementById('add-login'); if (old) old.remove();
      var m = document.createElement('div'); m.className = 'f-modal'; m.id = 'add-login';
      var nameNow = lsGet(opt.form === 'esc' ? 'sepaEscName' : 'sepaRecName') || lsGet('sepaAskName') || '';
      m.innerHTML = '<div class="f-modal-box" role="dialog" aria-modal="true" aria-labelledby="add-login-t">' +
        '<button type="button" class="f-modal-x" aria-label="Close">&times;</button>' +
        '<h2 id="add-login-t">' + (kind === 'lead' ? 'Add a lead' : 'Add a responder') + '</h2>' +
        '<p class="f-modal-note">This needs the <strong>lead</strong> or <strong>HQ</strong> user name and password. Logging in makes this phone a lead on this ' + esc(opt.what) + '.</p>' +
        '<label class="field">Your name <input class="al-name" autocomplete="name" maxlength="60" value="' + esc(nameNow) + '"></label>' +
        '<label class="field">User name <input class="al-user" autocomplete="username" autocapitalize="none" spellcheck="false"></label>' +
        '<label class="field">Password <input class="al-pass" type="password" autocomplete="current-password"></label>' +
        '<p class="form-error al-err" hidden></p>' +
        '<button type="button" class="primary-btn al-go">Log in and continue</button>' +
        '<div class="al-ask"><p class="co-j-head">Don\'t know the password?</p>' +
        '<p class="f-modal-note">Send the new person a link. They open it, type their name and tap <strong>Request access</strong>. The lead or HQ lets them in.' +
        (kind === 'lead' ? ' To make someone a lead, ask a lead or HQ.' : '') + '</p>' +
        '<button type="button" class="esc-btn al-send">Send a link to request to join</button>' +
        '<p class="esc-note al-note" role="status" hidden></p>' +
        '<label class="esc-link-box al-linkbox" hidden><span>Link</span><input class="al-link" readonly></label></div></div>';
      document.body.appendChild(m);
      var g = function (c) { return m.querySelector(c); };
      function close() { m.remove(); }
      function err(t) { g('.al-err').textContent = t || ''; g('.al-err').hidden = !t; }
      g('.f-modal-x').onclick = close; m.onclick = function (e) { if (e.target === m) close(); };
      g('.al-send').onclick = function () {
        var url = askLink(), text = (opt.form === 'esc' ? 'Join the DAT Large Scene Reporting Tool worksheet' : 'Join the reception center') + where() +
          '. Open this link, type your name and tap Request access. The lead or HQ will let you in.';
        if (navigator.share) { navigator.share({ title: 'Ask to join', text: text, url: url }).catch(function () {}); return; }
        var shown = function (t) { g('.al-linkbox').hidden = false; g('.al-link').value = url; g('.al-note').textContent = t; g('.al-note').hidden = false; };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function () { shown('The link was copied.\nPaste it into a text or email to the new person.'); }, function () { shown('Press and hold the link below to copy it.'); });
        else shown('Press and hold the link below to copy it.');
      };
      g('.al-go').onclick = function () {
        var b = this, who = g('.al-name').value.trim();
        if (!who) return err('Please type your name.');
        if (!g('.al-user').value.trim() || !g('.al-pass').value) return err('Please type the user name and password.');
        b.disabled = true; err('');
        post({ action: 'coLogin', form: opt.form, id: opt.id, who: who, user: g('.al-user').value, password: g('.al-pass').value, dev: device(opt.form, opt.id) }).then(function (r) {
          b.disabled = false;
          if (!(r && r.ok)) return err(r && r.offline ? 'No connection. Please try again.' : (r && r.error) || 'Could not log in.');
          lsSet('sepaAskName', who);
          close();
          opt.becameLead(r.key, kind);
          refresh();
          if (kind === 'lead') opt.pick();
          else note('You are now a lead. Tap "+ Add a responder" again to send the link.');
        });
      };
      setTimeout(function () { (g('.al-name').value ? g('.al-user') : g('.al-name')).focus(); }, 50);
    }
    return { refresh: refresh, note: note };
  }

  if (F) Array.prototype.forEach.call(document.querySelectorAll('.ask-lead'), function (box) { responder(box); texter(box); });
  return { render: render, roster: roster, leadPicker: leadPicker, device: device, forgetDevice: forgetDevice, addBox: addBox };
})();
