// SEPA Resource Library - Reception Center Form (pages/reception.html), v0.21
// v0.27.3: each phone checks in with its name; the lead and HQ see who is on the center and can Remove
// someone (their intakes stay). See WHO IS ON AN EVENT in the Google script.
//
// One short intake per displaced person or family, done on a phone at a reception center.
//   - The phone that STARTS a reception center is its lead. Since v0.27 starting one needs the HQ user
//     name and password (asked in a pop-up; a phone already logged in as HQ skips it). The pop-up does
//     not log the phone in as HQ. "Add a responder" (lead only) sends a join link; whoever opens it
//     does intakes for the same center.
//   - "Save and start the next intake" sends the intake to the Google Sheet and clears the form.
//     With no signal, finished intakes wait on the phone and go out by themselves later.
//   - Phones do not sync with each other. Every intake goes straight to one list per center.
//   - THE SUMMARY (?view=CODE): every intake with totals, updating by itself. Only the lead's phone
//     (it holds a second secret code, the "lead key") and HQ (logged in) can see it. Responders who
//     joined see only how many intakes they have done.
//   - HQ uses the same user name and password as the Escalation Form live view (kept in the Google
//     Sheet, never in the website files). HQ can clear a center at the end of the event: its intakes
//     are then DELETED for good. If nobody clears it, the Google script deletes it 5 days after the
//     last intake.
// What this phone keeps (on the phone only): which center it is on, the codes for that center, the
// responder's name, how many intakes it has done, and finished intakes that have not been sent yet.
// A sent intake is removed from the phone.
(function () {
  var URL = (typeof SEPA_BACKEND_URL === 'string') ? SEPA_BACKEND_URL : '';
  var $ = function (id) { return document.getElementById(id); };
  if (!$('rec-form')) return;

  // ---------------------------------------------------------------- small helpers
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v === '' || v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function param(name) { var m = new RegExp('[?&]' + name + '=([^&#]*)').exec(location.search); return m ? decodeURIComponent(m[1]) : ''; }
  function hashParam(name) { var m = new RegExp('[#&]' + name + '=([^&]*)').exec(location.hash || ''); return m ? decodeURIComponent(m[1]) : ''; }
  function goodId(v) { return /^[A-Za-z0-9]{8,24}$/.test(v || '') ? v : ''; }
  function goodKey(v) { return /^[A-Za-z0-9]{16,40}$/.test(v || '') ? v : ''; }
  function newId() {
    var abc = 'abcdefghjkmnpqrstuvwxyz23456789', out = '', i, rnd = [];
    try { rnd = crypto.getRandomValues(new Uint8Array(12)); } catch (e) { for (i = 0; i < 12; i++) rnd.push(Math.floor(Math.random() * 256)); }
    for (i = 0; i < 12; i++) out += abc.charAt(rnd[i] % abc.length);
    return out;
  }
  function newKey() { return newId() + newId(); }
  function call(data) {
    if (!URL) return Promise.resolve({ ok: false, error: 'Unknown request.' });
    return fetch(URL, { method: 'POST', body: JSON.stringify(data) })
      .then(function (r) { return r.json(); })
      .catch(function () { return { ok: false, offline: true }; });
  }
  function oldScript(r) { return r && !r.offline && /unknown request/i.test(r.error || ''); }
  function pageLink(query) { return location.href.split('?')[0].split('#')[0] + (query ? '?' + query : ''); }
  function clock(t) {      // "2026-10-12 17:45:00" -> "5:45 PM"
    var m = /(\d{1,2}):(\d{2})/.exec((t || '').split(' ')[1] || '');
    if (!m) return t || '';
    var h = +m[1];
    return ((h % 12) || 12) + ':' + m[2] + (h < 12 ? ' AM' : ' PM');
  }
  function ago(ms) {
    var s = Math.max(0, Math.round(ms / 1000));
    if (s < 5) return 'just now';
    if (s < 90) return s + ' seconds ago';
    if (s < 5400) return Math.round(s / 60) + ' minutes ago';
    if (s < 129600) return Math.round(s / 3600) + ' hours ago';
    return Math.round(s / 86400) + ' days ago';
  }
  function num(v) { var n = parseInt(v, 10); return n > 0 ? n : 0; }
  function notice(msg) { var n = $('rec-notice'); n.textContent = msg; n.hidden = !msg; }

  // The summary's columns (also the Download file's columns).
  var COLS = [['saved', 'Time'], ['by', 'Responder'], ['name', 'Name'], ['address', 'Address'], ['unit', 'Unit'], ['phone', 'Phone'],
    ['alt', 'Alternate contact'], ['adults', 'Adults'], ['children', 'Children'], ['pets', 'Pets'], ['pets_with', 'Pets with them'],
    ['safe', 'Safe place tonight'], ['safe_where', 'Where'], ['shelter', 'Would stay in shelter'], ['needs', 'Immediate needs'], ['concerns', 'Other concerns']];

  // ---------------------------------------------------------------- which mode?
  var view = param('view');
  if (view === 'list') return listMode();
  if (view) return viewMode(goodId(view));
  formMode();

  // ================================================================ THE INTAKE FORM
  function formMode() {
    var urlId = goodId(param('id')), urlKey = goodKey(hashParam('k'));
    var current = goodId(lsGet('sepaRecCurrent'));

    // A join link: this phone joins that center (it is the lead only if it started it).
    if (urlId && urlKey) {
      if (goodKey(lsGet('sepaRecKey:' + urlId)) !== urlKey) { lsSet('sepaRecKey:' + urlId, urlKey); lsSet('sepaRecJoined:' + urlId, '1'); }
      lsSet('sepaRecCurrent', urlId);
      current = urlId;
    }
    try { history.replaceState(null, '', pageLink(current ? 'id=' + current : '')); } catch (e) {}   // the key never stays in the address bar

    if (!current || !goodKey(lsGet('sepaRecKey:' + current))) {
      if (urlId && !urlKey) notice('That link cannot be used to join a reception center. Ask your lead to tap "Add a responder" and send you the link.');
      return startPanel();
    }
    if (!lsGet('sepaRecName')) return namePanel(function () { work(current); });
    work(current);
  }

  // Start a new reception center. This phone becomes its lead.
  function startPanel() {
    $('rec-start').hidden = false;
    var carried = lsGet('sepaRecNote');
    if (carried) { notice(carried + ' Its intakes were deleted.'); lsSet('sepaRecNote', ''); }
    // Removed by the lead or HQ (v0.27.3): say so first, then offer to start a new one.
    var gone = lsGet('sepaRecRemoved');
    if (gone) {
      lsSet('sepaRecRemoved', '');
      $('rec-removed').hidden = false; $('rec-removed-msg').textContent = gone; $('rec-start-body').hidden = true;
      $('rec-removed-yes').onclick = function () { $('rec-removed').hidden = true; $('rec-start-body').hidden = false; $('rec-center').focus(); };
      $('rec-removed-no').onclick = function () { $('rec-removed-done').hidden = false; this.parentNode.hidden = true; this.parentNode.previousElementSibling.hidden = true; };
    }
    var me = lsGet('sepaRecName'); if (me) $('rec-lead-name').value = me;
    $('rec-start-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var center = $('rec-center').value.trim(), name = $('rec-lead-name').value.trim(), err = $('rec-start-error');
      if (!center) { err.textContent = 'Please enter the reception center name or location.'; err.hidden = false; return; }
      if (!name) { err.textContent = 'Please enter your name.'; err.hidden = false; return; }
      err.hidden = true;
      var id = newId(), key = newKey(), lead = newKey(), btn = $('rec-start-btn');
      function begin(extra, done) {
        var data = { action: 'recStart', id: id, key: key, leadKey: lead, center: center, lead: name };
        Object.keys(extra).forEach(function (k) { data[k] = extra[k]; });
        btn.disabled = true; btn.textContent = 'Starting...';
        call(data).then(function (r) {
          btn.disabled = false; btn.textContent = 'Leads: Click Here to Start a Reception Center Intake';
          if (oldScript(r) || !URL) { err.textContent = 'The Reception Center Form is not switched on yet. The site admin needs to update the Google script.'; err.hidden = false; return done && done(); }
          if (r && r.leadLogin) return askLead(r);
          if (!(r && r.ok)) { err.textContent = r && r.offline ? 'No connection. Starting a reception center needs a signal once; after that, intakes can be done offline.' : ((r && r.error) || 'Could not start. Please try again.'); err.hidden = false; return done && done(); }
          $('rec-lead-modal').hidden = true;
          lsSet('sepaRecName', name);
          lsSet('sepaRecKey:' + id, key); lsSet('sepaRecLead:' + id, lead); lsSet('sepaRecCenter:' + id, center);
          lsSet('sepaRecCurrent', id);
          location.replace(pageLink('id=' + id));
        });
      }
      // The pop-up: HQ user name and password. Asked only when the script says they are needed.
      function askLead(r) {
        var m = $('rec-lead-modal'), lerr = $('rec-lead-error'), lbtn = $('rec-lead-btn');
        m.hidden = false; lbtn.disabled = false;
        lerr.textContent = r.error || ''; lerr.hidden = !lerr.textContent;
        if (r.locked) lbtn.disabled = true;
        $('rec-lead-pass').value = '';
        setTimeout(function () { ($('rec-lead-user').value ? $('rec-lead-pass') : $('rec-lead-user')).focus(); }, 50);
        $('rec-lead-x').onclick = function () { m.hidden = true; };
        m.onclick = function (ev) { if (ev.target === m) m.hidden = true; };
        $('rec-lead-form').onsubmit = function (ev) {
          ev.preventDefault();
          var u = $('rec-lead-user').value.trim(), pw = $('rec-lead-pass').value;
          if (!u || !pw) { lerr.textContent = 'Please enter the user name and password.'; lerr.hidden = false; return; }
          lbtn.disabled = true; lerr.hidden = true;
          begin({ user: u, password: pw }, function () { m.hidden = true; });
        };
      }
      begin(token() ? { token: token() } : {});
    });
  }

  function namePanel(then) {
    $('rec-name-ask').hidden = false;
    $('rec-name-form').addEventListener('submit', function (e) {
      e.preventDefault();
      var n = $('rec-my-name').value.trim();
      if (!n) { $('rec-name-error').textContent = 'Please enter your name.'; $('rec-name-error').hidden = false; return; }
      lsSet('sepaRecName', n);
      $('rec-name-ask').hidden = true;
      then();
    });
  }

  function work(id) {
    var key = goodKey(lsGet('sepaRecKey:' + id)), leadKey = goodKey(lsGet('sepaRecLead:' + id));
    var lead = !!leadKey, me = lsGet('sepaRecName') || '';
    var form = $('rec-form');
    $('rec-work').hidden = false;
    $('rec-lead-tools').hidden = !lead;
    $('rec-joined-how').hidden = lead;

    function centerName() { return lsGet('sepaRecCenter:' + id) || 'Reception center'; }
    function count() { return num(lsGet('sepaRecCount:' + id)); }
    function header() {
      $('rec-where-center').textContent = centerName();
      $('rec-where-me').textContent = ' · ' + me + (lead ? ' (lead)' : '') + ' · ' + count() + ' intake' + (count() === 1 ? '' : 's') + ' done on this phone';
    }
    header();
    if (!lead) $('rec-joined-how').textContent = 'You joined this reception center. Your intakes go to your lead and HQ. Only the lead can add responders and see the summary.';

    // ---- the choice buttons (Yes / No ...) and the follow-up boxes they open
    var choices = {};
    function setChoice(name, v) {
      choices[name] = v;
      var g = form.querySelector('.rc-choice[data-name="' + name + '"]');
      Array.prototype.forEach.call(g.querySelectorAll('button'), function (b) {
        var on = b.dataset.v === v;
        b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on));
      });
      Array.prototype.forEach.call(form.querySelectorAll('.rec-more'), function (m) {
        var w = m.dataset.when.split('=');
        m.hidden = choices[w[0]] !== w[1];
      });
    }
    Array.prototype.forEach.call(form.querySelectorAll('.rc-choice'), function (g) {
      Array.prototype.forEach.call(g.querySelectorAll('button'), function (b) {
        b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', 'false');
        b.addEventListener('click', function () { setChoice(g.dataset.name, choices[g.dataset.name] === b.dataset.v ? '' : b.dataset.v); saveDraft(); });
      });
    });
    function total() {
      var a = num($('r_adults').value), c = num($('r_children').value);
      $('rec-total').textContent = (a || c) ? 'Total: ' + (a + c) + ' ' + ((a + c) === 1 ? 'person' : 'people') : '';
    }
    form.addEventListener('input', function () { total(); saveDraft(); });

    // ---- reading and clearing the form
    function val(n) { return (form.elements[n].value || '').trim(); }
    function collect() {
      var pets = choices.has_pets || '';
      if (pets === 'Yes' && val('pets')) pets = 'Yes: ' + val('pets');
      return {
        iid: newId(), name: val('name'), address: val('address'), unit: val('unit'), phone: val('phone'), alt: val('alt'),
        adults: val('adults').replace(/\D/g, ''), children: val('children').replace(/\D/g, ''),
        pets: pets, pets_with: choices.has_pets === 'Yes' ? (choices.pets_with || '') : '',
        safe: choices.safe || '', safe_where: choices.safe === 'Yes' ? val('safe_where') : '',
        shelter: choices.shelter || '', needs: val('needs'), concerns: val('concerns')
      };
    }
    function blank() {
      form.reset(); choices = {};
      ['has_pets', 'pets_with', 'safe', 'shelter'].forEach(function (n) { setChoice(n, ''); });
      total(); lsSet('sepaRecDraft:' + id, '');
    }
    // An unfinished intake is kept on the phone, so a page reload does not lose it.
    function saveDraft() {
      var d = {};
      Array.prototype.forEach.call(form.elements, function (i) { if (i.name && i.value) d[i.name] = i.value; });
      Object.keys(choices).forEach(function (k) { if (choices[k]) d['#' + k] = choices[k]; });
      lsSet('sepaRecDraft:' + id, Object.keys(d).length ? JSON.stringify(d) : '');
    }
    (function loadDraft() {
      var d = null; try { d = JSON.parse(lsGet('sepaRecDraft:' + id) || 'null'); } catch (e) {}
      if (!d) return;
      Object.keys(d).forEach(function (k) {
        if (k.charAt(0) === '#') setChoice(k.slice(1), d[k]);
        else if (form.elements[k]) form.elements[k].value = d[k];
      });
      total();
    })();

    // ---- finished intakes waiting to be sent (kept on the phone until Google has them)
    function queue() { try { return JSON.parse(lsGet('sepaRecQueue') || '[]') || []; } catch (e) { return []; } }
    function setQueue(q) { lsSet('sepaRecQueue', q.length ? JSON.stringify(q) : ''); }
    var state = 'unknown', busy = false;
    function status() {
      var s = $('rec-status'), waiting = queue().filter(function (q) { return q.id === id; }).length;
      s.className = 'esc-status';
      if (state === 'off') { s.textContent = 'The Reception Center Form is not switched on yet (the Google script needs its update). Intakes are kept on this phone.'; s.className += ' esc-warn'; }
      else if (state === 'nokey') { s.textContent = 'This phone is not allowed into that reception center. Ask your lead to tap "Add a responder" and send you the link.'; s.className += ' esc-warn'; }
      else if (waiting) { s.textContent = waiting + ' intake' + (waiting === 1 ? '' : 's') + ' waiting for a signal. They will be sent by themselves.'; s.className += ' esc-warn'; }
      else if (state === 'on') { s.textContent = 'Connected. Every intake is sent as soon as you save it.'; s.className += ' esc-ok'; }
      else if (state === 'offline') { s.textContent = 'No connection right now. You can keep going: intakes wait on this phone.'; s.className += ' esc-warn'; }
      else s.textContent = 'Ready.';
    }
    function closed() {          // HQ cleared this center, or it was deleted after 5 days
      var was = centerName();
      ['sepaRecKey:', 'sepaRecLead:', 'sepaRecCenter:', 'sepaRecCount:', 'sepaRecDraft:', 'sepaRecJoined:'].forEach(function (p) { lsSet(p + id, ''); });
      setQueue(queue().filter(function (q) { return q.id !== id; }));
      lsSet('sepaRecCurrent', '');
      lsSet('sepaRecNote', 'Your last reception center (' + was + ') was closed.');
      location.replace(pageLink(''));
    }
    // The lead or HQ removed this phone (v0.27.3). Intakes it already sent stay with the center. If an
    // intake is half done, it can still be finished and saved first.
    function removed() {
      var was = centerName();
      ['sepaRecKey:', 'sepaRecLead:', 'sepaRecCenter:', 'sepaRecCount:', 'sepaRecDraft:', 'sepaRecJoined:'].forEach(function (p) { lsSet(p + id, ''); });
      if (typeof SEPAAskLead !== 'undefined') SEPAAskLead.forgetDevice('rec', id);
      lsSet('sepaRecCurrent', '');
      lsSet('sepaRecRemoved', 'You have been removed from ' + was + '. Thank you so much for your help!');
      location.replace(pageLink(''));
    }
    function removedSignal() {
      var draft = lsGet('sepaRecDraft:' + id);
      if (draft || queue().some(function (q) { return q.id === id; })) {
        notice('You have been removed from ' + centerName() + '. Finish and save this intake; then this phone leaves the reception center.');
        return;
      }
      removed();
    }
    function dev() { return typeof SEPAAskLead !== 'undefined' ? SEPAAskLead.device('rec', id) : ''; }
    function flush() {
      if (busy || state === 'off' || state === 'nokey') return;
      var q = queue(), item = null;
      for (var i = 0; i < q.length; i++) if (q[i].id === id) { item = q[i]; break; }
      if (!item) {                 // nothing to send: just check the center is still open
        busy = true;
        call({ action: 'recPing', id: id, key: key, dev: dev(), who: lsGet('sepaRecName') || me, leadKey: lead ? leadKey : '' }).then(function (r) {
          busy = false;
          if (r && r.ok && r.cleared) return closed();
          if (r && r.ok && r.removed) return removedSignal();
          if (r && r.ok) {
            state = 'on';
            if (r.center && r.center !== lsGet('sepaRecCenter:' + id)) { lsSet('sepaRecCenter:' + id, r.center); header(); }
            if (!lead && r.lead) $('rec-joined-how').textContent = 'You joined this reception center. Lead: ' + r.lead + '. Your intakes go to your lead and HQ. Only the lead can add responders and see the summary.';
          } else if (r && r.nokey) state = 'nokey';
          else if (oldScript(r)) state = 'off';
          else state = 'offline';
          status();
        });
        return;
      }
      busy = true;
      call({ action: 'recAdd', id: id, key: item.key, by: item.by, intake: item.intake, dev: dev(), who: lsGet('sepaRecName') || me }).then(function (r) {
        busy = false;
        if (r && r.ok && r.cleared) return closed();
        if (r && r.ok) {
          state = 'on';
          setQueue(queue().filter(function (x) { return x.intake.iid !== item.intake.iid; }));
          status();
          if (r.removed && !queue().some(function (q) { return q.id === id; })) return removedSignal();
          return flush();          // send the next one, if any
        }
        if (r && r.nokey) state = 'nokey';
        else if (oldScript(r)) state = 'off';
        else if (r && r.offline) state = 'offline';
        else {                     // Google refused this one (should not happen): keep it, say so
          state = 'on';
          $('rec-form-error').textContent = 'An intake could not be sent: ' + ((r && r.error) || 'unknown problem') + '. It is kept on this phone.';
          $('rec-form-error').hidden = false;
        }
        status();
      });
    }

    // ---- Save and start the next intake
    var savedTimer = null;
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var it = collect(), err = $('rec-form-error');
      if (!it.name) { err.textContent = 'Please enter at least a name (question 1).'; err.hidden = false; $('r_name').focus(); return; }
      err.hidden = true;
      var q = queue(); q.push({ id: id, key: key, by: me, intake: it }); setQueue(q);
      lsSet('sepaRecCount:' + id, String(count() + 1));
      blank(); header(); status();
      var s = $('rec-saved');
      s.textContent = 'Saved: ' + it.name + '. Ready for the next intake.';
      s.hidden = false; s.classList.remove('esc-flash'); void s.offsetWidth; s.classList.add('esc-flash');
      clearTimeout(savedTimer); savedTimer = setTimeout(function () { s.hidden = true; }, 8000);
      window.scrollTo({ top: Math.max(0, s.getBoundingClientRect().top + window.pageYOffset - 12), behavior: 'smooth' });
      setTimeout(function () { $('r_name').focus({ preventScroll: true }); }, 400);
      flush();
    });
    $('rec-blank').addEventListener('click', function () { blank(); $('rec-form-error').hidden = true; });

    // ---- join requests from responders who asked in the app (v0.27.2), checked every 10 seconds
    if (lead && typeof SEPAAskLead !== 'undefined') {
      var showAsks = function (list) {
        SEPAAskLead.render($('rec-asks'), list, function (rid, yes) {
          call({ action: 'askAnswer', form: 'rec', id: id, key: key, leadKey: leadKey, rid: rid, yes: yes }).then(function (r) { if (r && r.ok) showAsks(r.asks || []); });
        });
      };
      var removeOne = function (d, done) {
        call({ action: 'rosterRemove', form: 'rec', id: id, dev: d, leadKey: leadKey }).then(function (r) { done(r && r.ok ? r.roster : null, r && r.error); });
      };
      var pollAsks = function () {
        if (!document.hidden) call({ action: 'recAsks', id: id, leadKey: leadKey }).then(function (r) {
          if (r && r.ok) { showAsks(r.asks || []); SEPAAskLead.roster($('rec-roster'), r.roster || [], removeOne, 'reception center'); }
        });
        setTimeout(pollAsks, 10000);
      };
      pollAsks();
    }

    // ---- lead tools: add a responder, see the summary, send HQ the summary link
    var summaryUrl = pageLink('view=' + id);
    $('rec-open-summary').href = summaryUrl;
    function note(msg) { var n = $('rec-share-note'); n.textContent = msg; n.hidden = !msg; }
    function showLink(url, label) { $('rec-link-box').hidden = false; $('rec-link-label').textContent = label; $('rec-link').value = url; }
    function send(url, title, text, label, copied) {
      if (navigator.share) { navigator.share({ title: title, text: text, url: url }).catch(function () {}); return; }
      var hold = function () { showLink(url, label); note('Press and hold the link below to copy it.'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function () { showLink(url, label); note(copied); }, hold);
      else hold();
    }
    $('rec-add').addEventListener('click', function () {
      send(pageLink('id=' + id) + '#k=' + key, 'Join the reception center',
        'Join the reception center at ' + centerName() + '. Open this link to do intakes.',
        'Join link for a responder', 'The join link was copied. Paste it into a text to your teammate.');
    });
    $('rec-share').addEventListener('click', function () {
      send(summaryUrl, 'Reception center summary',
        'Summary of the reception center at ' + centerName() + '. It updates as intakes come in. HQ log in needed.',
        'Summary link for HQ', 'The summary link was copied. Paste it into a message to HQ. They need the HQ log in to open it.');
    });

    // ---- leave the center on this phone
    $('rec-leave').addEventListener('click', function () { $('rec-leave-ask').hidden = false; $('rec-leave').hidden = true; });
    $('rec-leave-no').addEventListener('click', function () { $('rec-leave-ask').hidden = true; $('rec-leave').hidden = false; });
    $('rec-leave-yes').addEventListener('click', function () {
      if (queue().some(function (q) { return q.id === id; })) {
        $('rec-leave-ask').hidden = true; $('rec-leave').hidden = false;
        $('rec-form-error').textContent = 'Some intakes have not been sent yet. Wait for a signal before leaving, so they are not lost.';
        $('rec-form-error').hidden = false; return;
      }
      lsSet('sepaRecCurrent', ''); location.replace(pageLink(''));
    });

    var carried = lsGet('sepaRecNote');
    if (carried) { notice(carried); lsSet('sepaRecNote', ''); }
    if (lsGet('sepaRecJoined:' + id) === '1' && !lead) { notice('You have joined the reception center. Your intakes go to your lead and HQ.'); lsSet('sepaRecJoined:' + id, ''); }
    status();
    flush();
    window.addEventListener('online', flush);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) flush(); });
    setInterval(function () { if (!document.hidden) flush(); }, 20000);
    setInterval(function () { if (!document.hidden && queue().some(function (q) { return q.id === id; })) flush(); }, 5000);
  }

  // ================================================================ HQ LOGIN (shared with the Escalation Form)
  function token() { return lsGet('sepaEscHQ') || ''; }
  function needLogin(r, retry) {
    var box = $('esc-login'), err = $('esc-login-error'), f = $('esc-login-form');
    box.hidden = false; $('esc-logout').hidden = true;
    err.textContent = (r && r.locked) ? r.error : ''; err.hidden = !err.textContent;
    f.onsubmit = function (e) {
      e.preventDefault();
      var btn = $('esc-login-btn'); btn.disabled = true; err.hidden = true;
      call({ action: 'escLogin', user: $('esc-user').value, password: $('esc-pass').value }).then(function (a) {
        btn.disabled = false;
        if (a && a.ok && a.token) { lsSet('sepaEscHQ', a.token); $('esc-pass').value = ''; box.hidden = true; retry(); }
        else { err.textContent = (a && a.error) || 'Could not connect. Please try again.'; err.hidden = false; }
      });
    };
  }
  function loggedIn() {
    $('esc-login').hidden = true;
    var out = $('esc-logout'); out.hidden = false;
    out.onclick = function () { var t = token(); lsSet('sepaEscHQ', ''); call({ action: 'logout', token: t }).then(function () { location.reload(); }); };
  }

  // ================================================================ SUMMARY (lead or HQ)

  function viewMode(id) {
    document.body.classList.add('esc-viewing', 'rec-viewing');
    $('rec-title').textContent = 'Reception Center: summary';
    $('rec-intro').textContent = 'Every intake for this reception center.';
    $('rec-view-tools').hidden = false;
    var leadKey = goodKey(lsGet('sepaRecLead:' + id));
    var s = $('rec-view-status'), seen = null, waiting = false, done = false, last = null;
    if (!id) { s.textContent = 'This link is not a valid reception center link.'; s.className = 'esc-status esc-warn'; return; }

    function totals(items) {
      var t = { hh: items.length, adults: 0, children: 0, pets: 0, nosafe: 0, shelter: 0, maybe: 0, needs: 0 };
      items.forEach(function (i) {
        t.adults += num(i.adults); t.children += num(i.children);
        if (/^yes/i.test(i.pets)) t.pets++;
        if (i.safe && i.safe !== 'Yes') t.nosafe++;
        if (i.shelter === 'Yes') t.shelter++;
        if (i.shelter === 'Maybe') t.maybe++;
        if (i.needs) t.needs++;
      });
      return t;
    }
    function tile(n, label, hot) { var d = el('div', 'rec-tile' + (hot && n ? ' rec-hot' : '')); d.appendChild(el('strong', '', String(n))); d.appendChild(el('span', '', label)); return d; }
    function draw(r) {
      var items = r.items || [], t = totals(items), box = $('rec-totals'), tb = $('rec-table');
      box.innerHTML = '';
      box.appendChild(tile(t.hh, t.hh === 1 ? 'household' : 'households'));
      box.appendChild(tile(t.adults + t.children, 'people (' + t.adults + ' adults, ' + t.children + ' children)'));
      box.appendChild(tile(t.nosafe, 'no safe place tonight (or not sure)', true));
      box.appendChild(tile(t.shelter, 'would stay in a shelter' + (t.maybe ? ' (+' + t.maybe + ' maybe)' : ''), true));
      box.appendChild(tile(t.pets, 'households with pets'));
      box.appendChild(tile(t.needs, 'with immediate needs', true));
      tb.innerHTML = '';
      var head = el('tr'); COLS.forEach(function (c) { head.appendChild(el('th', '', c[1])); });
      var th = el('thead'); th.appendChild(head); tb.appendChild(th);
      var body = el('tbody');
      items.slice().reverse().forEach(function (i) {        // newest first
        var tr = el('tr');
        if (seen && !seen[i.iid]) tr.className = 'esc-flash';
        COLS.forEach(function (c) { tr.appendChild(el('td', '', c[0] === 'saved' ? clock(i.saved) : (i[c[0]] || ''))); });
        body.appendChild(tr);
      });
      if (!items.length) { var tr = el('tr'), td = el('td', 'rec-empty', 'No intakes yet. This page checks every few seconds.'); td.colSpan = COLS.length; tr.appendChild(td); body.appendChild(tr); }
      tb.appendChild(body);
      seen = {}; items.forEach(function (i) { seen[i.iid] = true; });
      $('rec-summary').hidden = false; $('rec-view-buttons').hidden = false;
    }
    function load() {
      if (waiting || done) return;
      call({ action: 'recGet', id: id, leadKey: leadKey, token: token() }).then(function (r) {
        if (r && r.login) {
          waiting = true; s.className = 'esc-status'; s.textContent = leadKey ? 'Could not open the summary on this phone. HQ can log in below.' : 'Log in to see this reception center.';
          needLogin(r, function () { waiting = false; load(); }); return;
        }
        if (oldScript(r)) { s.className = 'esc-status esc-warn'; s.textContent = 'The Reception Center Form is not switched on yet (the Google script needs its update).'; return; }
        if (!(r && r.ok)) { s.className = 'esc-status esc-warn'; s.textContent = 'Could not connect. Trying again in a few seconds.'; return; }
        if (!leadKey) loggedIn();
        if (!r.found) {
          done = true; $('rec-summary').hidden = true; $('rec-view-buttons').hidden = true; $('rec-clear-line').hidden = true; $('rec-keep').hidden = true;
          s.className = 'esc-status'; s.textContent = r.cleared ? 'This reception center was closed and its intakes were deleted.' : 'This reception center was not found.';
          return;
        }
        last = r;
        if (typeof SEPAAskLead !== 'undefined') SEPAAskLead.roster($('rec-view-roster'), r.roster || [], function (d, cb) {
          call({ action: 'rosterRemove', form: 'rec', id: id, dev: d, leadKey: leadKey, token: token() }).then(function (x) { cb(x && x.ok ? x.roster : null, x && x.error); });
        }, 'reception center');
        $('rec-title').textContent = 'Reception Center: ' + (r.center || 'summary');
        $('rec-intro').textContent = 'Lead: ' + (r.lead || '') + '. Every intake for this reception center.';
        $('rec-clear-line').hidden = !!leadKey && !token();     // HQ only (a lead who is also logged in as HQ sees it too)
        var k = $('rec-keep'); k.hidden = false;
        k.textContent = 'Intakes are deleted when HQ clears this reception center, or automatically ' + (r.keepDays || 5) + ' days after the last intake.';
        draw(r);
        s.className = 'esc-status esc-ok';
        s.textContent = 'Live. ' + r.items.length + ' intake' + (r.items.length === 1 ? '' : 's') + '. Last activity ' + ago((r.now || 0) - (r.ms || 0)) + '.';
      });
    }
    // Download everything as a file that opens in Excel (CSV).
    $('rec-download').addEventListener('click', function () {
      if (!last) return;
      var q = function (v) { v = String(v == null ? '' : v); return /[",\n\r]/.test(v) || /^[=+\-@]/.test(v) ? '"' + (/^[=+\-@]/.test(v) ? "'" : '') + v.replace(/"/g, '""') + '"' : v; };
      var lines = [COLS.map(function (c) { return q(c[1]); }).join(',')];
      last.items.forEach(function (i) { lines.push(COLS.map(function (c) { return q(i[c[0]]); }).join(',')); });
      var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
      var a = document.createElement('a'), d = new Date();
      a.href = window.URL.createObjectURL(blob);
      a.download = 'Reception center ' + (last.center || '').replace(/[\\\/:*?"<>|]+/g, ' ').trim() + ' ' + d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2) + '.csv';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { window.URL.revokeObjectURL(a.href); }, 2000);
    });
    // HQ: clear at the end of the event (asks first, on the page)
    $('rec-clear').addEventListener('click', function () { $('rec-clear-ask').hidden = false; $('rec-clear').hidden = true; });
    $('rec-clear-no').addEventListener('click', function () { $('rec-clear-ask').hidden = true; $('rec-clear').hidden = false; });
    $('rec-clear-yes').addEventListener('click', function () {
      $('rec-clear-yes').disabled = true;
      call({ action: 'recClear', id: id, token: token() }).then(function (r) {
        $('rec-clear-yes').disabled = false;
        if (r && r.login) { waiting = true; needLogin(r, function () { waiting = false; load(); }); return; }
        if (r && r.ok) { $('rec-clear-ask').hidden = true; $('rec-clear').hidden = false; load(); }
        else { $('rec-clear-error').textContent = 'Could not clear it. Please try again.'; $('rec-clear-error').hidden = false; }
      });
    });
    load();
    setInterval(function () { if (!document.hidden) load(); }, 6000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) load(); });
  }

  // ================================================================ HQ: ALL OPEN RECEPTION CENTERS
  function listMode() {
    document.body.classList.add('esc-viewing');
    $('rec-title').textContent = 'Reception Centers';
    $('rec-intro').textContent = 'All open reception centers, most recent activity first.';
    $('rec-list-tools').hidden = false;
    var box = $('rec-list'), s = $('rec-list-status'), waiting = false;
    function load() {
      if (waiting) return;
      call({ action: 'recList', token: token() }).then(function (r) {
        if (r && r.login) { waiting = true; box.innerHTML = ''; s.textContent = 'Log in to see the reception centers.'; needLogin(r, function () { waiting = false; load(); }); return; }
        if (oldScript(r)) { s.textContent = 'The Reception Center Form is not switched on yet (the Google script needs its update).'; return; }
        if (!(r && r.ok)) { s.textContent = 'Could not connect. Trying again shortly.'; return; }
        loggedIn();
        s.textContent = r.items.length ? 'This list refreshes by itself.' : 'No open reception centers.';
        box.innerHTML = '';
        r.items.forEach(function (it) {
          var a = el('a', 'esc-item'); a.href = pageLink('view=' + it.id);
          a.appendChild(el('strong', '', it.center || '(no name)'));
          a.appendChild(el('span', '', 'Lead: ' + (it.lead || '-') + '   ' + it.count + ' intake' + (it.count === 1 ? '' : 's') + '   Last activity ' + ago((r.now || 0) - (it.ms || 0))));
          box.appendChild(a);
        });
      });
    }
    load(); setInterval(function () { if (!document.hidden) load(); }, 15000);
  }
})();
