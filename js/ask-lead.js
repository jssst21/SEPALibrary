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
    escalation: { code: 'esc', name: 'Escalation Form' },
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
          '<button type="button" class="esc-btn" data-no>No</button></div></div>';      // v0.27.49 (were Approve / Decline)
      }).join('') + '<p class="esc-group-how">Let in adds them to this ' + (formName === 'reception' ? 'reception center' : 'worksheet') + ' straight away. Only let in people you expect.</p>';
    Array.prototype.forEach.call(box.querySelectorAll('.ask-req'), function (row) {
      var rid = row.getAttribute('data-rid');
      Array.prototype.forEach.call(row.querySelectorAll('button'), function (b) {
        b.addEventListener('click', function () {
          Array.prototype.forEach.call(row.querySelectorAll('button'), function (x) { x.disabled = true; });
          answer(rid, b.hasAttribute('data-yes'));
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
  var lastList = [], lastOpt = null, lastWhat = '';
  function isLead(x) { return x.role === 'lead' || x.role === 'co-lead'; }
  function roster(box, list, remove, what, opt) {
    if (!box) return;
    list = list || []; opt = opt || {};
    lastList = list; lastOpt = opt; lastWhat = what;
    if (box.querySelector('.rost-confirm:not([hidden])') || box.getAttribute('data-busy')) return;   // do not redraw under someone's finger
    if (!list.length) { box.hidden = true; box.innerHTML = ''; return; }
    box.hidden = false;
    box.innerHTML = '<p class="rost-head">Who is on this ' + what + ' (' + list.length + ')</p>' + list.map(function (x) {
      var nm = x.name || 'Name not given', canRm = !isLead(x) || (x.role === 'co-lead' && opt.hq), canLead = !isLead(x) && opt.makeLead;
      return '<div class="rost-row" data-dev="' + esc(x.dev) + '"><p class="rost-who"><strong>' + esc(nm) + '</strong>' + (isLead(x) ? ' (lead)' : '') +
        (x.lastMs ? ' <span class="ask-req-when">seen ' + ago(x.lastMs) + '</span>' : '') + '</p>' +
        ((canLead || canRm) ? '<span class="rost-acts">' + (canLead ? '<button type="button" class="esc-btn rost-rm rost-mk">Make lead</button>' : '') +
          (canRm ? '<button type="button" class="esc-btn rost-rm rost-rmv">Remove</button>' : '') + '</span>' : '') +
        (canLead ? '<p class="rost-confirm rost-confirm-lead" hidden>Make ' + esc(nm) + ' a lead? They get the lead\'s buttons on their phone. ' +
          '<button type="button" class="esc-btn rost-lead-yes">Yes, make lead</button> <button type="button" class="link-btn rost-no">Cancel</button></p>' : '') +
        (canRm ? '<p class="rost-confirm rost-confirm-rm" hidden>Remove ' + esc(nm) + (isLead(x) ? ' (a lead)' : '') + '? What they entered stays here. ' +
          '<button type="button" class="esc-btn esc-danger rost-yes">Yes, remove</button> <button type="button" class="link-btn rost-no">Cancel</button></p>' : '') + '</div>';
    }).join('') + '<p class="rost-err form-error" hidden></p><p class="esc-group-how">' +
      (opt.makeLead ? 'Make lead gives someone the lead\'s buttons too, for example when you are leaving the scene. Nobody stops being a lead. ' : '') +
      'Remove takes someone off this ' + what + ', for example to free them to start a second one. What they already entered stays here. Their phone leaves within about a minute.' +
      (opt.hq ? '' : ' Only HQ can remove a lead.') + '</p>';
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
  function leadPicker(makeLead, onDone) {
    var what = lastWhat || (formName === 'reception' ? 'reception center' : 'worksheet');
    var old = document.getElementById('ask-lead-pick'); if (old) old.remove();
    var m = document.createElement('div'); m.className = 'f-modal'; m.id = 'ask-lead-pick';
    var people = lastList.filter(function (x) { return !isLead(x); });
    var leads = lastList.filter(isLead).map(function (x) { return x.name || 'Name not given'; });
    m.innerHTML = '<div class="f-modal-box" role="dialog" aria-modal="true" aria-labelledby="ask-lead-pick-t">' +
      '<button type="button" class="f-modal-x" aria-label="Close">&times;</button><h2 id="ask-lead-pick-t">Add a lead</h2>' +
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
          if (age < 6 * 3600 * 1000) timer = setTimeout(check, age < 10 * 60 * 1000 ? 5000 : 20000);
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
    if (p0 && p0.id && p0.rid && Date.now() - (p0.at || 0) < 6 * 3600 * 1000) waiting(p0, 'You asked to join earlier. Still waiting for the lead to approve it. Keep this page open.');
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

  if (F) Array.prototype.forEach.call(document.querySelectorAll('.ask-lead'), function (box) { responder(box); texter(box); });
  return { render: render, roster: roster, leadPicker: leadPicker, device: device, forgetDevice: forgetDevice };
})();
