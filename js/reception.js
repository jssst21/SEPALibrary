// SEPA Resource Library - Reception Center Form (pages/reception.html), v0.21
// v0.27.3: each phone checks in with its name; the lead and HQ see who is on the center and can Remove
// someone (their intakes stay). See WHO IS ON AN EVENT in the Google script.
// v0.27.7: on the summary, the lead and HQ can Edit any intake (pop-up); HQ can also Delete one. Edited
// intakes show "Edited [time], [who]". See EDIT ONE INTAKE in the Google script.
// v0.27.8: a DDA button (Detailed Damage Assessment) beside Edit, for the lead and HQ: tick all that apply
// (Destroyed, Major, Uninhabitable, Other + describe). Shown in the DDA column and a DDA totals tile.
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
  // "Major, Uninhabitable, Other: smoke damage" -> { picks: ['Major', 'Uninhabitable', 'Other'], other: 'smoke damage' }
  function ddaParse(text) {
    text = String(text || ''); var picks = [], other = '';
    var m = /(?:^|,\s*)Other(?::\s*([\s\S]*))?$/.exec(text);
    if (m) { other = (m[1] || '').trim(); text = text.slice(0, m.index); }
    ['Destroyed', 'Major', 'Uninhabitable'].forEach(function (k) { if (text.split(/,\s*/).indexOf(k) >= 0) picks.push(k); });
    if (m) picks.push('Other');
    return { picks: picks, other: other };
  }
  function notice(msg) { var n = $('rec-notice'); n.textContent = msg; n.hidden = !msg; }

  // The summary's columns (also the Download file's columns).
  var COLS = [['saved', 'Time'], ['by', 'Responder'], ['name', 'Name'], ['address', 'Address'], ['unit', 'Unit'], ['dda', 'DDA'], ['phone', 'Phone'],
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
    // v0.27.27: the Intake | Summary switch links to ?id=CODE. If this phone is on that center, open it.
    else if (urlId && goodKey(lsGet('sepaRecKey:' + urlId))) { lsSet('sepaRecCurrent', urlId); current = urlId; }
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
    // v0.27.42: open reception centers first ("Current Operations", js/current-ops.js), then starting a new one
    if (typeof SEPACurrentOps !== 'undefined') SEPACurrentOps.show('rec', $('rec-start'), 'Or start a new one');
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
          btn.disabled = false; btn.textContent = 'Start a Reception Center';
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
    // v0.27.24: a phone made a lead with "Add a lead" (a co-lead) has no lead key; it proves itself with
    // the join key plus its own phone code (see recLeadAuth_ in the Google script).
    var coLead = !leadKey && lsGet('sepaRecCoLead:' + id) === '1';
    var lead = !!leadKey || coLead, me = lsGet('sepaRecName') || '';
    function auth(o) { o.leadKey = leadKey; o.key = key; o.me = dev(); return o; }
    var form = $('rec-form');
    $('rec-work').hidden = false;
    $('rec-lead-tools').hidden = !lead;
    $('rec-joined-how').hidden = lead;

    function centerName() { return lsGet('sepaRecCenter:' + id) || 'Reception center'; }
    function count() { return num(lsGet('sepaRecCount:' + id)); }
    function header() {
      if (typeof SEPAViewBar !== 'undefined') SEPAViewBar.setName(centerName());
      $('rec-where-center').textContent = centerName();
      $('rec-where-me').textContent = ' · ' + me + (lead ? ' (lead)' : '') + ' · ' + count() + ' intake' + (count() === 1 ? '' : 's') + ' done on this phone';
    }
    // The pinned Intake | Summary switch (v0.27.27): for leads, and for HQ whose phone is on this center.
    if (typeof SEPAViewBar !== 'undefined') SEPAViewBar.show({ on: 'a', showSwitch: lead || !!token(), name: centerName(),
      a: { label: 'Intake', href: pageLink('id=' + id) }, b: { label: 'Summary', href: pageLink('view=' + id) },
      actions: newCenter(lead, function (back) {
        // Intakes still waiting for a signal must not be lost: stay until they are sent.
        if (queue().some(function (q) { return q.id === id; })) {
          back();
          $('rec-form-error').textContent = 'Some intakes have not been sent yet. Wait for a signal before leaving, so they are not lost.';
          $('rec-form-error').hidden = false; return;
        }
        goNewCenter();
      }) });
    header();
    if (!lead) $('rec-joined-how').textContent = 'You joined this reception center. Your intakes go to your lead and HQ. Only a lead can add responders and see the summary.';
    if (coLead) $('rec-lead-how').textContent = 'You are a lead on this reception center. Add a responder sends a link for doing intakes. Add a lead gives someone already here the lead\'s buttons, for example if you are leaving the scene.';
    function leadsLine(names) { return (names.indexOf(',') >= 0 ? 'Leads: ' : 'Lead: ') + names; }

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
      ['sepaRecKey:', 'sepaRecLead:', 'sepaRecCoLead:', 'sepaRecCenter:', 'sepaRecCount:', 'sepaRecDraft:', 'sepaRecJoined:'].forEach(function (p) { lsSet(p + id, ''); });
      setQueue(queue().filter(function (q) { return q.id !== id; }));
      lsSet('sepaRecCurrent', '');
      lsSet('sepaRecNote', 'Your last reception center (' + was + ') was closed.');
      location.replace(pageLink(''));
    }
    // The lead or HQ removed this phone (v0.27.3). Intakes it already sent stay with the center. If an
    // intake is half done, it can still be finished and saved first.
    function removed() {
      var was = centerName();
      ['sepaRecKey:', 'sepaRecLead:', 'sepaRecCoLead:', 'sepaRecCenter:', 'sepaRecCount:', 'sepaRecDraft:', 'sepaRecJoined:'].forEach(function (p) { lsSet(p + id, ''); });
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
          // Made a lead by a lead or HQ (v0.27.24): this phone gets the lead's buttons. The page reloads
          // to show them; an intake being typed is kept (it is saved as a draft on the phone).
          if (r && r.ok && r.coLead && !lead) {
            lsSet('sepaRecCoLead:' + id, '1');
            lsSet('sepaRecNote', 'You are now a lead on this reception center. You can add responders and leads, and see the summary.');
            return location.reload();
          }
          if (r && r.ok) {
            state = 'on';
            if (r.center && r.center !== lsGet('sepaRecCenter:' + id)) { lsSet('sepaRecCenter:' + id, r.center); header(); }
            if (!lead && r.lead) $('rec-joined-how').textContent = 'You joined this reception center. ' + leadsLine(r.lead) + '. Your intakes go to your lead and HQ. Only a lead can add responders and see the summary.';
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
          call(auth({ action: 'askAnswer', form: 'rec', id: id, rid: rid, yes: yes })).then(function (r) { if (r && r.ok) showAsks(r.asks || []); });
        });
      };
      var removeOne = function (d, done) {
        call(auth({ action: 'rosterRemove', form: 'rec', id: id, dev: d })).then(function (r) { done(r && r.ok ? r.roster : null, r && r.error); });
      };
      var makeLead = function (d, done) {     // v0.27.24
        call(auth({ action: 'makeLead', form: 'rec', id: id, dev: d })).then(function (r) { done(r && r.ok ? r.roster : null, r && r.error); });
      };
      var drawRoster = function (list) { SEPAAskLead.roster($('rec-roster'), list, removeOne, 'reception center', { makeLead: makeLead }); };
      $('rec-add-lead').addEventListener('click', function () { SEPAAskLead.leadPicker(makeLead, drawRoster); });
      var pollAsks = function () {
        if (!document.hidden) call(auth({ action: 'recAsks', id: id })).then(function (r) {
          if (r && r.ok) { showAsks(r.asks || []); drawRoster(r.roster || []); }
        });
        setTimeout(pollAsks, 10000);
      };
      pollAsks();
    }

    // ---- lead tools: add a responder, see the summary, send HQ the summary link
    var summaryUrl = pageLink('view=' + id);
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

    // ---- leaving the center: the red "Starting a new reception center?" button in the bar (v0.27.29, see newCenter)

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

  // The red "Starting a new reception center?" button and, for leads, "Switch to HQ view" (v0.27.29).
  // Leaving opens the Start screen (lead log in). The center stays open for the team and HQ.
  function goNewCenter() { lsSet('sepaRecCurrent', ''); location.href = pageLink(''); }
  function newCenter(isLead, yes) {
    return { newLabel: 'Starting a new reception center?', askTitle: 'Start a new reception center?', yesLabel: 'Yes, new center',
      askText: isLead ? 'This reception center stays open for your team and HQ. You will go to the Start screen and log in as lead for the new one.'
                      : 'This reception center stays open for your team. You will go to the Start screen, where you can start a new one or ask to join another.',
      onYes: yes, hqHref: isLead ? pageLink('view=list') : '' };
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
    // v0.27.24: an added lead (co-lead) opens the summary with the join key plus this phone's code.
    var coKey = !leadKey && lsGet('sepaRecCoLead:' + id) === '1' ? goodKey(lsGet('sepaRecKey:' + id)) : '';
    var asLead = !!(leadKey || coKey);
    function auth(o) { o.leadKey = leadKey; o.key = coKey; o.me = coKey && typeof SEPAAskLead !== 'undefined' ? SEPAAskLead.device('rec', id) : ''; o.token = token(); return o; }
    var barShown = false;
    function changeCenter() {        // HQ: every open reception center, to jump between them (v0.27.27)
      return { label: 'Change center', title: 'Change center', note: 'Open reception centers, most recent activity first.',
        allHref: pageLink('view=list'), allLabel: 'See all centers on one page',
        load: function (done) {
          call({ action: 'recList', token: token() }).then(function (r) {
            if (!(r && r.ok)) return done(null, r && r.login ? 'Please log in again as HQ.' : 'Could not load the centers. Please try again.');
            done(r.items.map(function (it) {
              return { href: pageLink('view=' + it.id), title: it.center || '(no name)', current: it.id === id,
                sub: 'Lead: ' + (it.lead || '-') + ' · ' + it.count + ' intake' + (it.count === 1 ? '' : 's') + ' · last activity ' + ago((r.now || 0) - (it.ms || 0)) };
            }));
          });
        } };
    }
    var s = $('rec-view-status'), seen = null, waiting = false, done = false, last = null, justEdited = '';
    if (!id) { s.textContent = 'This link is not a valid reception center link.'; s.className = 'esc-status esc-warn'; return; }

    function totals(items) {
      var t = { hh: items.length, adults: 0, children: 0, pets: 0, nosafe: 0, shelter: 0, maybe: 0, needs: 0, dda: 0, Destroyed: 0, Major: 0, Uninhabitable: 0, Other: 0 };
      items.forEach(function (i) {
        t.adults += num(i.adults); t.children += num(i.children);
        if (/^yes/i.test(i.pets)) t.pets++;
        if (i.safe && i.safe !== 'Yes') t.nosafe++;
        if (i.shelter === 'Yes') t.shelter++;
        if (i.shelter === 'Maybe') t.maybe++;
        if (i.needs) t.needs++;
        var d = ddaParse(i.dda);
        if (d.picks.length) { t.dda++; d.picks.forEach(function (p) { t[p]++; }); }
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
      var dd = ['Destroyed', 'Major', 'Uninhabitable', 'Other'].filter(function (k) { return t[k]; }).map(function (k) { return t[k] + ' ' + k.toLowerCase(); });
      box.appendChild(tile(t.dda, 'DDA ' + (t.dda === 1 ? 'home' : 'homes') + (dd.length ? ': ' + dd.join(', ') : ' assessed'), t.Destroyed || t.Uninhabitable));
      tb.innerHTML = '';
      var head = el('tr'); head.appendChild(el('th', '', ''));
      COLS.forEach(function (c) { head.appendChild(el('th', '', c[1])); });
      var th = el('thead'); th.appendChild(head); tb.appendChild(th);
      var body = el('tbody');
      items.slice().reverse().forEach(function (i) {        // newest first
        var tr = el('tr');
        if ((seen && !seen[i.iid]) || i.iid === justEdited) tr.className = 'esc-flash';
        var ec = el('td', 'rec-edit-cell'), eb = el('button', 'esc-btn rec-edit-btn', 'Edit');
        eb.type = 'button'; eb.setAttribute('aria-label', 'Edit the intake for ' + (i.name || 'this person'));
        eb.addEventListener('click', function () { openEdit(i); });
        ec.appendChild(eb);
        var db = el('button', 'esc-btn rec-edit-btn', 'DDA');
        db.type = 'button'; db.setAttribute('aria-label', 'Damage assessment for the home of ' + (i.name || 'this person'));
        db.addEventListener('click', function () { openDda(i); });
        ec.appendChild(db);
        if (i.dda_set) ec.appendChild(el('span', 'rec-edited', 'DDA ' + clock(i.dda_set) + (i.dda_by ? ', ' + i.dda_by : '')));
        if (i.edited) ec.appendChild(el('span', 'rec-edited', 'Edited ' + clock(i.edited) + (i.edited_by ? ', ' + i.edited_by : '')));
        tr.appendChild(ec);
        COLS.forEach(function (c) { tr.appendChild(el('td', c[0] === 'dda' ? 'rec-dda-tag' : '', c[0] === 'saved' ? clock(i.saved) : (i[c[0]] || ''))); });
        body.appendChild(tr);
      });
      if (!items.length) { var tr = el('tr'), td = el('td', 'rec-empty', 'No intakes yet. This page checks every few seconds.'); td.colSpan = COLS.length + 1; tr.appendChild(td); body.appendChild(tr); }
      tb.appendChild(body);
      seen = {}; items.forEach(function (i) { seen[i.iid] = true; });
      justEdited = '';
      $('rec-summary').hidden = false; $('rec-view-buttons').hidden = false;
    }
    function load() {
      if (waiting || done) return;
      call(auth({ action: 'recGet', id: id })).then(function (r) {
        if (r && r.login) {
          waiting = true; s.className = 'esc-status'; s.textContent = asLead ? 'Could not open the summary on this phone. HQ can log in below.' : 'Log in to see this reception center.';
          needLogin(r, function () { waiting = false; load(); }); return;
        }
        if (oldScript(r)) { s.className = 'esc-status esc-warn'; s.textContent = 'The Reception Center Form is not switched on yet (the Google script needs its update).'; return; }
        if (!(r && r.ok)) { s.className = 'esc-status esc-warn'; s.textContent = 'Could not connect. Trying again in a few seconds.'; return; }
        if (!asLead) loggedIn();
        if (!r.found) {
          done = true; $('rec-summary').hidden = true; $('rec-view-buttons').hidden = true; $('rec-clear-line').hidden = true; $('rec-keep').hidden = true;
          s.className = 'esc-status'; s.textContent = r.cleared ? 'This reception center was closed and its intakes were deleted.' : 'This reception center was not found.';
          return;
        }
        last = r;
        if (typeof SEPAAskLead !== 'undefined') {
          var vRemove = function (d, cb) {
            call(auth({ action: 'rosterRemove', form: 'rec', id: id, dev: d })).then(function (x) { cb(x && x.ok ? x.roster : null, x && x.error); });
          };
          var vMake = function (d, cb) {     // v0.27.24: HQ (or a lead) can make someone a lead from here
            call(auth({ action: 'makeLead', form: 'rec', id: id, dev: d })).then(function (x) { cb(x && x.ok ? x.roster : null, x && x.error); });
          };
          SEPAAskLead.roster($('rec-view-roster'), r.roster || [], vRemove, 'reception center', { makeLead: vMake, hq: !!token() });
          // v0.27.50: requests to join show here too, for HQ and leads (Sean: roles swap, people get called away)
          (function showViewAsks(list) {
            SEPAAskLead.render($('rec-view-asks'), list, function (rid, yes) {
              call(auth({ action: 'askAnswer', form: 'rec', id: id, rid: rid, yes: yes })).then(function (x) { if (x && x.ok) showViewAsks(x.asks || []); else load(); });
            });
          })(r.asks || []);
        }
        $('rec-title').textContent = 'Reception Center: ' + (r.center || 'summary');
        $('rec-intro').textContent = ((r.lead || '').indexOf(',') >= 0 ? 'Leads: ' : 'Lead: ') + (r.lead || '') + '. Every intake for this reception center.';
        // HQ only (v0.27.26): leads never export, and only HQ clears. r.hq comes from the Google script;
        // an older script does not send it, so then "not a lead and allowed in" counts as HQ.
        var isHQ = r.hq === true || (r.hq === undefined && !asLead);
        $('rec-clear-line').hidden = !isHQ;     // HQ only (a lead who is also logged in as HQ sees it too)
        var k = $('rec-keep'); k.hidden = false;
        k.textContent = 'Intakes are deleted when HQ clears this reception center, or automatically ' + (r.keepDays || 5) + ' days after the last intake.';
        draw(r);
        $('rec-download').hidden = !isHQ;
        if (!barShown && typeof SEPAViewBar !== 'undefined') {     // v0.27.27: the pinned switch, and Change center for HQ
          barShown = true;
          SEPAViewBar.show({ on: 'b', showSwitch: !!goodKey(lsGet('sepaRecKey:' + id)), name: r.center || 'Reception center',
            a: { label: 'Intake', href: pageLink('id=' + id) }, b: { label: 'Summary', href: pageLink('view=' + id) },
            change: isHQ ? changeCenter() : null,
            actions: asLead && !isHQ ? newCenter(true, function (back) {      // v0.27.29
              var waitingHere = false;
              try { waitingHere = (JSON.parse(lsGet('sepaRecQueue') || '[]') || []).some(function (q) { return q.id === id; }); } catch (e) {}
              if (waitingHere) { back(); s.className = 'esc-status esc-warn'; s.textContent = 'Some intakes on this phone have not been sent yet. Open Intake and wait for a signal before starting a new center.'; return; }
              goNewCenter();
            }) : null });
        } else if (typeof SEPAViewBar !== 'undefined') SEPAViewBar.setName(r.center || 'Reception center');
        s.className = 'esc-status esc-ok';
        s.textContent = 'Live. ' + r.items.length + ' intake' + (r.items.length === 1 ? '' : 's') + '. Last activity ' + ago((r.now || 0) - (r.ms || 0)) + '.';
      });
    }
    // ---- EDIT ONE INTAKE (v0.27.7): the lead or HQ. Delete is HQ only (the Google script checks too).
    var ef = $('rec-edit-form'), em = $('rec-edit-modal'), editing = null, eChoices = {};
    function eSet(name, v) {
      eChoices[name] = v;
      var g = ef.querySelector('.rc-choice[data-name="' + name + '"]');
      Array.prototype.forEach.call(g.querySelectorAll('button'), function (b) {
        var on = b.dataset.v === v;
        b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on));
      });
      Array.prototype.forEach.call(ef.querySelectorAll('.rec-more'), function (m) {
        var w = m.dataset.when.split('=');
        m.hidden = eChoices[w[0]] !== w[1];
      });
    }
    Array.prototype.forEach.call(ef.querySelectorAll('.rc-choice'), function (g) {
      Array.prototype.forEach.call(g.querySelectorAll('button'), function (b) {
        b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', 'false');
        b.addEventListener('click', function () { eSet(g.dataset.name, eChoices[g.dataset.name] === b.dataset.v ? '' : b.dataset.v); });
      });
    });
    function eTotal() {
      var a = num(ef.elements.adults.value), c = num(ef.elements.children.value);
      $('rec-edit-total').textContent = (a || c) ? 'Total: ' + (a + c) + ' ' + ((a + c) === 1 ? 'person' : 'people') : '';
    }
    ef.addEventListener('input', eTotal);
    function eErr(msg) { $('rec-edit-error').textContent = msg; $('rec-edit-error').hidden = !msg; }
    function closeEdit() { em.hidden = true; editing = null; }
    function openEdit(i) {
      editing = i;
      ef.reset(); eChoices = {}; eErr('');
      ['name', 'address', 'unit', 'phone', 'alt', 'adults', 'children', 'safe_where', 'needs', 'concerns'].forEach(function (n) { ef.elements[n].value = i[n] || ''; });
      // Pets is kept as "Yes: 2 dogs", "Yes" or "No"
      var pm = /^(yes|no)\s*:?\s*([\s\S]*)$/i.exec(i.pets || '');
      eSet('has_pets', pm ? (pm[1].toLowerCase() === 'yes' ? 'Yes' : 'No') : '');
      ef.elements.pets.value = pm ? pm[2] : (i.pets || '');
      eSet('pets_with', i.pets_with || ''); eSet('safe', i.safe || ''); eSet('shelter', i.shelter || '');
      eTotal();
      $('rec-edit-meta').textContent = 'Taken by ' + (i.by || 'unknown') + ' at ' + clock(i.saved) + '.' +
        (i.edited ? ' Last edited ' + clock(i.edited) + (i.edited_by ? ' by ' + i.edited_by : '') + '.' : '');
      $('rec-del-line').hidden = !token(); $('rec-del-ask').hidden = true; $('rec-del').hidden = false;
      $('rec-edit-save').disabled = false;
      em.hidden = false; em.scrollTop = 0;
      setTimeout(function () { ef.elements.name.focus({ preventScroll: true }); }, 50);
    }
    function eVal(n) { return (ef.elements[n].value || '').trim(); }
    $('rec-edit-x').onclick = closeEdit; $('rec-edit-cancel').onclick = closeEdit;
    em.addEventListener('click', function (ev) { if (ev.target === em) closeEdit(); });
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && !em.hidden) closeEdit(); });
    function afterChange(r, btn, iid) {
      btn.disabled = false;
      if (r && r.login) { closeEdit(); waiting = true; needLogin(r, function () { waiting = false; load(); }); return; }
      if (r && r.ok) { closeEdit(); justEdited = iid; load(); return; }
      if (r && r.offline) return eErr('No connection. Your changes are still here; try Save again when you have a signal.');
      if (oldScript(r)) return eErr('Editing is not switched on yet. The site admin needs to update the Google script.');
      eErr((r && r.error) || 'Could not save. Please try again.');
      if (r && r.gone) load();
    }
    ef.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!editing) return;
      if (!eVal('name')) { eErr('Please enter at least a name (question 1).'); ef.elements.name.focus(); return; }
      var pets = eChoices.has_pets || '';
      if (pets === 'Yes' && eVal('pets')) pets = 'Yes: ' + eVal('pets');
      var it = {
        name: eVal('name'), address: eVal('address'), unit: eVal('unit'), phone: eVal('phone'), alt: eVal('alt'),
        adults: eVal('adults').replace(/\D/g, ''), children: eVal('children').replace(/\D/g, ''),
        pets: pets, pets_with: eChoices.has_pets === 'Yes' ? (eChoices.pets_with || '') : '',
        safe: eChoices.safe || '', safe_where: eChoices.safe === 'Yes' ? eVal('safe_where') : '',
        shelter: eChoices.shelter || '', needs: eVal('needs'), concerns: eVal('concerns')
      };
      var btn = $('rec-edit-save'), iid = editing.iid; btn.disabled = true; eErr('');
      call(auth({ action: 'recEdit', id: id, iid: iid, intake: it })).then(function (r) { afterChange(r, btn, iid); });
    });
    $('rec-del').onclick = function () { $('rec-del-ask').hidden = false; this.hidden = true; };
    $('rec-del-no').onclick = function () { $('rec-del-ask').hidden = true; $('rec-del').hidden = false; };
    $('rec-del-yes').onclick = function () {
      if (!editing) return;
      var btn = this; btn.disabled = true; eErr('');
      call({ action: 'recDeleteOne', id: id, iid: editing.iid, token: token() }).then(function (r) { afterChange(r, btn, ''); });
    };

    // ---- DDA FOR ONE INTAKE (v0.27.8): the lead or HQ. Tick all that apply; Other opens a Describe box.
    var dm = $('rec-dda-modal'), df = $('rec-dda-form'), ddaFor = null;
    var ddaBoxes = Array.prototype.slice.call(df.querySelectorAll('input[name=dda]'));
    function ddaShow() {
      ddaBoxes.forEach(function (b) { b.parentNode.classList.toggle('on', b.checked); });
      var other = ddaBoxes[3].checked;
      $('rec-dda-other-box').hidden = !other;
      return other;
    }
    df.addEventListener('change', function (ev) { if (ddaShow() && ev.target === ddaBoxes[3]) $('rec-dda-other').focus(); });
    function dErr(msg) { $('rec-dda-error').textContent = msg; $('rec-dda-error').hidden = !msg; }
    function closeDda() { dm.hidden = true; ddaFor = null; }
    function openDda(i) {
      ddaFor = i; dErr('');
      var d = ddaParse(i.dda);
      ddaBoxes.forEach(function (b) { b.checked = d.picks.indexOf(b.value) >= 0; });
      $('rec-dda-other').value = d.other;
      ddaShow();
      $('rec-dda-meta').textContent = (i.name || 'No name') + (i.address ? ', ' + i.address + (i.unit ? ' ' + i.unit : '') : '') + '.' +
        (i.dda_set ? ' Last set ' + clock(i.dda_set) + (i.dda_by ? ' by ' + i.dda_by : '') + '.' : '');
      $('rec-dda-save').disabled = false;
      dm.hidden = false; dm.scrollTop = 0;
    }
    $('rec-dda-x').onclick = closeDda; $('rec-dda-cancel').onclick = closeDda;
    dm.addEventListener('click', function (ev) { if (ev.target === dm) closeDda(); });
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && !dm.hidden) closeDda(); });
    df.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!ddaFor) return;
      var picks = ddaBoxes.filter(function (b) { return b.checked; }).map(function (b) { return b.value; });
      var btn = $('rec-dda-save'), iid = ddaFor.iid; btn.disabled = true; dErr('');
      call(auth({ action: 'recDda', id: id, iid: iid, picks: picks, other: picks.indexOf('Other') >= 0 ? $('rec-dda-other').value.trim() : '' })).then(function (r) {
        btn.disabled = false;
        if (r && r.login) { closeDda(); waiting = true; needLogin(r, function () { waiting = false; load(); }); return; }
        if (r && r.ok) { closeDda(); justEdited = iid; load(); return; }
        if (r && r.offline) return dErr('No connection. Your ticks are still here; try Save again when you have a signal.');
        if (oldScript(r)) return dErr('DDA is not switched on yet. The site admin needs to update the Google script.');
        dErr((r && r.error) || 'Could not save. Please try again.');
        if (r && r.gone) load();
      });
    });

    // Download everything as a file that opens in Excel (CSV).
    $('rec-download').addEventListener('click', function () {
      if (!last) return;
      var q = function (v) { v = String(v == null ? '' : v); return /[",\n\r]/.test(v) || /^[=+\-@]/.test(v) ? '"' + (/^[=+\-@]/.test(v) ? "'" : '') + v.replace(/"/g, '""') + '"' : v; };
      var cols = COLS.concat([['edited', 'Last edited'], ['edited_by', 'Edited by'], ['dda_set', 'DDA set'], ['dda_by', 'DDA set by']]);
      var lines = [cols.map(function (c) { return q(c[1]); }).join(',')];
      last.items.forEach(function (i) { lines.push(cols.map(function (c) { return q(i[c[0]]); }).join(',')); });
      var blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
      var a = document.createElement('a'), d = new Date();
      a.href = window.URL.createObjectURL(blob);
      a.download = 'Reception center ' + (last.center || '').replace(/[\\\/:*?"<>|]+/g, ' ').trim() + ' ' + d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2) + '.csv';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { window.URL.revokeObjectURL(a.href); }, 2000);
    });
    // HQ: close the center at the end of the event (v0.27.9: asks in a warning pop-up, with a
    // "Download for Excel first" button in it)
    var cm = $('rec-clear-modal');
    function closeClear() { cm.hidden = true; }
    $('rec-clear').addEventListener('click', function () { $('rec-clear-error').hidden = true; $('rec-clear-yes').disabled = false; cm.hidden = false; });
    $('rec-clear-no').addEventListener('click', closeClear); $('rec-clear-x').addEventListener('click', closeClear);
    cm.addEventListener('click', function (ev) { if (ev.target === cm) closeClear(); });
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && !cm.hidden) closeClear(); });
    $('rec-clear-dl').addEventListener('click', function () { $('rec-download').click(); });
    $('rec-clear-yes').addEventListener('click', function () {
      $('rec-clear-yes').disabled = true;
      call({ action: 'recClear', id: id, token: token() }).then(function (r) {
        $('rec-clear-yes').disabled = false;
        if (r && r.login) { closeClear(); waiting = true; needLogin(r, function () { waiting = false; load(); }); return; }
        if (r && r.ok) { closeClear(); load(); }
        else { $('rec-clear-error').textContent = r && r.offline ? 'No connection. Nothing was erased. Try again when you have a signal.' : 'Could not close it. Nothing was erased. Please try again.'; $('rec-clear-error').hidden = false; }
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
          a.appendChild(el('span', '', 'Lead: ' + (it.lead || '-') + '   ' + it.count + ' intake' + (it.count === 1 ? '' : 's') + '   Last activity ' + ago((r.now || 0) - (it.ms || 0)) + (it.asking ? ' · ' + it.asking + (it.asking === 1 ? ' person' : ' people') + ' asking to join' : '')));
          box.appendChild(a);
        });
      });
    }
    load(); setInterval(function () { if (!document.hidden) load(); }, 15000);
  }
})();
