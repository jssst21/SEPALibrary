// SEPA Resource Library - Offline SCIA (pages/scia.html), website v0.27.48. A BETA / DEMO (Sean, Oct 16, 2026).
// A stop gap for a full mass care response: intake starts before SCIA is unlocked for the operation, and
// everything is typed into SCIA by hand later. It cannot sync with SCIA or any outside system.
//   - HQ (HQ login) names a shelter and assigns ONE lead. The lead (lead login) grants intake workers.
//   - Intake workers tap "Request access", type their name and pick the shelter; once granted (24 hours at
//     most) they fill in the form and SEND it. STRICTLY ONE WAY: after sending, the form is blank and nothing
//     about the client is kept on the phone or can be opened again.
//   - HQ and the lead see the intakes, download them for Excel, and tick "Entered into SCIA", which DELETES
//     that intake (the paper form: "Upon uploading to SCIA, this form must be deleted").
//   - The security notice shows once for each HQ person and each lead (on that phone).
// What this phone keeps (never client details): the HQ login (shared with the other forms), the lead's code for
// their shelter (sepaSciaLead), a worker's access code and own name (sepaSciaW), which notices were seen.
(function () {
  var URL = (typeof SEPA_BACKEND_URL === 'string') ? SEPA_BACKEND_URL : '';
  var $ = function (id) { return document.getElementById(id); };
  if (!$('sc-page')) return;

  // ---------------------------------------------------------------- the paper form, in its order and words
  // t: h = heading, tx = typed answer (area: several lines), house = household members, yn = Yes / No
  // (spec: a "Specify" box; ask: a second Yes / No), cb = tick box, note = a line of text.
  var FORM = [
    ['h', 'Primary client'],
    ['tx', 'pname', 'Primary Client Name'],
    ['tx', 'pphone', 'Primary Phone #', { type: 'tel' }],
    ['tx', 'pemail', 'Primary Email', { type: 'email' }],
    ['tx', 'addr', 'Address'],
    ['tx', 'page', 'Age', { mode: 'numeric', short: 1 }],
    ['tx', 'pcot', 'Assigned Cot #', { short: 1 }],
    ['h', 'Additional household members'],
    ['house'],
    ['h', 'Needs'],
    ['tx', 'med', 'Medication/Durable Equipment Needed? (Specify)', { area: 1 }],
    ['tx', 'idc', 'IDC Referral recommended? (specify DMH, DHS, DSC)', { area: 1 }],
    ['tx', 'infant', 'Infant or Minor needs? (Specify)', { area: 1 }],
    ['tx', 'dis', 'Disability/Accessibility Needs? (power outlet, adapted vehicle, bariatric cot, etc.)', { area: 1 }],
    ['tx', 'other', 'Other important needs or notifications? (Governmental Registrations, weapons on person, etc. and such)', { area: 1 }],
    ['tx', 'allergy', 'Does anyone have a high risk allergy to food or environmental items? (Specify who and to what) (Examples: Nuts, Penicillin, Latex, bee stings, etc.)', { area: 1 }],
    ['tx', 'diet', 'Does anyone have special dietary needs? (Specify who and what)', { area: 1 }],
    ['tx', 'pets', 'Pets? (Kind, Current Location & Condition)', { area: 1 }],
    ['h', 'Consent'],
    ['yn', 'consent', 'Does the client consent for the ARC to share information with partners to aid in their recovery?'],
    ['cb', 'cgov', 'with government agencies'],
    ['cb', 'ccom', 'with community organizations'],
    ['cb', 'cnone', 'Does not consent to share with the above'],
    ['yn', 'creun', 'Does client consent to make their information available to support reunification with individuals seeking to find them?'],
    ['h', 'CMIST'],
    ['yn', 'c1', '1. Does the client require interpretive services or assistive equipment to communicate?', { spec: 'Specify who & what (Braille, Sign Language, etc.)' }],
    ['yn', 'c2', '2. Does anyone require replacement glasses or hearing aids?', { spec: 'Who & what' }],
    ['yn', 'c3', '3. Does the household have any accompanying communications support person?', { ask: 'Do they need one?' }],
    ['yn', 'c4', '4. Any high risk allergies? (asking again for certainty)', { spec: 'Specify' }],
    ['yn', 'c5', '5. Any dietary needs? (asking again for certainty)', { spec: 'Specify' }],
    ['yn', 'c6', '6. Does anyone require medical supplies/equipment for everyday care? (Includes medicine but not mobility aids - CPAP for example)', { spec: 'Specify' }],
    ['yn', 'c7', '7. Does anyone require medical care they usually receive at home?', { spec: 'Specify' }],
    ['yn', 'c8', '8. Pregnancy, nursing, or infant care needs?', { spec: 'Specify' }],
    ['yn', 'c9', '9. Does anyone require a quiet or temperature controlled area?', { spec: 'Specify' }],
    ['yn', 'c10', '10. Has anyone expressed the need for a mental health follow up?', { spec: 'Specify' }],
    ['yn', 'c11', '11. Is any equipment needed to address mobility issues?', { spec: 'Specify' }],
    ['yn', 'c12', '12. Does anyone need a consistent power source?', { spec: 'Specify' }],
    ['yn', 'c13', '13. Does anyone need bariatric accommodation?', { spec: 'Specify' }],
    ['yn', 'c14', '14. Does the client have any service animals?', { spec: 'Specify' }],
    ['yn', 'c15', '15. Does anyone require personal care assistance?', { spec: 'Specify' }],
    ['yn', 'c16', '16. Is the household providing their own personal care worker?', { spec: 'If yes, name and phone of worker' }],
    ['yn', 'c17', '17. Does anyone need transportation for medical or non medical appointments?', { spec: 'Specify' }],
    ['h', 'Additional comments'],
    ['tx', 'comments', 'Additional Comments', { area: 1 }]
  ];
  var NOTICE = ['Intake workers\' data will populate in your dashboard.', 'It will not be saved locally on their phones.',
    'It cannot sync with SCIA or any outside system.', 'This data will have to be manually entered later when SCIA becomes available.'];

  // ---------------------------------------------------------------- helpers
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v === '' || v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function lsJson(k) { try { return JSON.parse(lsGet(k) || 'null'); } catch (e) { return null; } }
  function newId(n) {
    var abc = 'abcdefghjkmnpqrstuvwxyz23456789', out = '', i, rnd = [];
    n = n || 12;
    try { rnd = crypto.getRandomValues(new Uint8Array(n)); } catch (e) { for (i = 0; i < n; i++) rnd.push(Math.floor(Math.random() * 256)); }
    for (i = 0; i < n; i++) out += abc.charAt(rnd[i] % abc.length);
    return out;
  }
  function call(data) {
    if (!URL) return Promise.resolve({ ok: false, error: 'The form is not connected yet.' });
    return fetch(URL, { method: 'POST', body: JSON.stringify(data) })
      .then(function (r) { return r.json(); })
      .catch(function () { return { ok: false, offline: true, error: 'No connection. Please try again.' }; });
  }
  function oldScript(r) { return r && !r.offline && /unknown request/i.test(r.error || ''); }
  var OLD = 'Offline SCIA is not switched on yet. The site admin needs to update the Google script.';
  function errText(r, dflt) { return oldScript(r) ? OLD : (r && r.error) || dflt || 'Could not connect. Please try again.'; }
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function clock(t) { var m = /(\d{1,2}):(\d{2})/.exec((t || '').split(' ')[1] || ''); if (!m) return t || ''; var h = +m[1]; return ((h % 12) || 12) + ':' + m[2] + (h < 12 ? ' AM' : ' PM'); }
  function when(t, today) {
    var d = (t || '').split(' ')[0]; if (!d) return '';
    if (d === today) return clock(t);
    var m = /^\d{4}-(\d{2})-(\d{2})/.exec(d); return (m ? MONTHS[+m[1] - 1] + ' ' + (+m[2]) + ', ' : '') + clock(t);
  }
  function msClock(ms) { var d = new Date(ms), h = d.getHours(); return MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + ((h % 12) || 12) + ':' + String(d.getMinutes()).padStart(2, '0') + (h < 12 ? ' AM' : ' PM'); }
  function notice(msg) { var n = $('sc-notice'); n.textContent = msg || ''; n.hidden = !msg; }
  function main() { var m = $('sc-main'); m.innerHTML = ''; return m; }
  function btn(text, cls, fn) { var b = el('button', cls || 'primary-btn', text); b.type = 'button'; if (fn) b.onclick = fn; return b; }
  function box(parent, title, how) { var b = el('div', 'sr-box'); if (title) b.appendChild(el('h2', 'sr-h', title)); if (how) b.appendChild(el('p', 'esc-how', how)); parent.appendChild(b); return b; }
  function field(parent, label, type) { var l = el('label', 'field'); l.appendChild(document.createTextNode(label)); var i = el('input', 'esc-in sc-in'); i.type = type || 'text'; i.autocomplete = 'off'; l.appendChild(i); parent.appendChild(l); return i; }
  function errLine(parent) { var e = el('p', 'form-error'); e.hidden = true; parent.appendChild(e); return e; }
  function showErr(e, msg) { e.textContent = msg; e.hidden = !msg; }
  function token() { return lsGet('sepaEscHQ') || ''; }
  var timers = [];
  function stopTimers() { timers.forEach(clearInterval); timers = []; }

  // ---------------------------------------------------------------- the pop-up
  function modal(title, fill, closable) {
    var m = $('sc-modal'), body = $('sc-m-body'); body.innerHTML = '';
    if (title) { var h = el('h2', '', title); h.id = 'sc-m-title'; body.appendChild(h); }
    fill(body);
    $('sc-m-x').hidden = closable === false;
    m.hidden = false;
    $('sc-m-x').onclick = shut; m.onclick = function (e) { if (e.target === m && closable !== false) shut(); };
    var f = body.querySelector('input, select, button'); if (f) setTimeout(function () { f.focus(); }, 50);
  }
  function shut() { $('sc-modal').hidden = true; }

  // The security notice, once per HQ person and per lead (on this phone).
  function securityNotice(who, then) {
    if (lsGet('sepaSciaSeen:' + who)) return then();
    modal('Before you continue', function (b) {
      var ul = el('ul', 'sc-sec'); NOTICE.forEach(function (t) { ul.appendChild(el('li', '', t)); }); b.appendChild(ul);
      b.appendChild(btn('Continue', 'primary-btn sr-navy', function () { lsSet('sepaSciaSeen:' + who, '1'); shut(); then(); }));
      b.appendChild(btn('Cancel', 'esc-btn sc-wide', function () { shut(); entry(); }));
    }, false);
  }

  // ================================================================ ENTRY
  function entryChoices(b) {
    b.appendChild(el('p', 'sc-lead-text', 'Access to this tool can only be granted by HQ.'));
    b.appendChild(btn('Log in as HQ', 'primary-btn sr-navy', hqLogin));
    b.appendChild(btn('Log in as lead', 'esc-btn sc-wide sc-ol', leadLogin));
    b.appendChild(btn('Request access', 'primary-btn', requestAccess));
  }
  function entry() {
    stopTimers();
    $('sc-title').textContent = 'Offline SCIA';
    var m = main(), b = box(m, '');
    entryChoices(b);
    b.appendChild(el('p', 'esc-group-how', 'For intake when SCIA is not available yet. Intakes go straight to HQ and the shelter lead, and are typed into SCIA later.'));
    modal('Offline SCIA', function (x) { entryChoices(x); });
  }

  // ---- HQ log in (the HQ login of the other forms)
  function hqLogin() {
    modal('HQ log in', function (b) {
      var u = field(b, 'User name'), p = field(b, 'Password', 'password'); u.autocapitalize = 'none'; u.autocomplete = 'username'; p.autocomplete = 'current-password';
      var e = errLine(b), go = btn('Log in', 'primary-btn sr-navy');
      go.onclick = function () {
        go.disabled = true; showErr(e, '');
        call({ action: 'escLogin', user: u.value, password: p.value }).then(function (r) {
          go.disabled = false;
          if (!(r && r.ok && r.token)) return showErr(e, errText(r));
          lsSet('sepaEscHQ', r.token); shut(); securityNotice('hq', hqHome);
        });
      };
      b.appendChild(go);
      p.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') go.click(); });
    });
  }
  // ---- lead log in (the lead login), then the shelter
  function shelterSelect(parent, label) {
    var l = el('label', 'field'); l.appendChild(document.createTextNode(label)); var s = el('select', 'esc-in sc-in'); l.appendChild(s); parent.appendChild(l);
    s.appendChild(el('option', '', 'Loading…'));
    var p = call({ action: 'sciaShelters' }).then(function (r) {
      s.innerHTML = '';
      if (!(r && r.ok)) { s.appendChild(el('option', '', 'Could not load')); return r; }
      if (!r.items.length) { var o = el('option', '', 'No shelter is open yet'); o.value = ''; s.appendChild(o); return r; }
      var z = el('option', '', 'Pick the shelter'); z.value = ''; s.appendChild(z);
      r.items.forEach(function (it) { var o = el('option', '', it.name + ' (lead: ' + it.lead + ')'); o.value = it.id; o.dataset.name = it.name; o.dataset.lead = it.lead; s.appendChild(o); });
      return r;
    });
    return { sel: s, ready: p };
  }
  function leadLogin() {
    modal('Lead log in', function (b) {
      b.appendChild(el('p', 'f-modal-note', 'HQ assigns the lead for each shelter.'));
      var sh = shelterSelect(b, 'Your shelter');
      var u = field(b, 'User name'), p = field(b, 'Password', 'password'); u.autocapitalize = 'none'; u.autocomplete = 'username'; p.autocomplete = 'current-password';
      var e = errLine(b), go = btn('Log in', 'primary-btn sr-navy');
      go.onclick = function () {
        if (!sh.sel.value) return showErr(e, 'Please pick your shelter.');
        go.disabled = true; showErr(e, '');
        call({ action: 'sciaLeadLogin', id: sh.sel.value, user: u.value, password: p.value }).then(function (r) {
          go.disabled = false;
          if (!(r && r.ok)) return showErr(e, errText(r));
          lsSet('sepaSciaLead', JSON.stringify({ id: r.shelter.id, code: r.lead, name: r.shelter.name }));
          shut(); securityNotice('lead:' + r.lead, function () { dash(leadAuth()); });
        });
      };
      b.appendChild(go);
    });
  }
  function leadAuth() { var l = lsJson('sepaSciaLead'); return l ? { id: l.id, lead: l.code, role: 'lead' } : null; }

  // ================================================================ INTAKE WORKER
  function requestAccess() {
    shut(); stopTimers();
    var m = main(), b = box(m, 'Request access', 'Your shelter lead grants it. This page opens the form by itself once they do.');
    var n = field(b, 'Your name'); n.autocomplete = 'name'; n.value = (lsJson('sepaSciaW') || {}).name || '';
    var sh = shelterSelect(b, 'Shelter');
    var e = errLine(b);
    var go = btn('Send request', 'primary-btn', function () {
      if (!n.value.trim()) return showErr(e, 'Please type your name.');
      if (!sh.sel.value) return showErr(e, 'Please pick the shelter.');
      var w = { id: sh.sel.value, wid: newId(), wkey: newId(24), name: n.value.trim(), shelter: sh.sel.selectedOptions[0].dataset.name };
      go.disabled = true; showErr(e, '');
      call({ action: 'sciaAsk', id: w.id, wid: w.wid, wkey: w.wkey, name: w.name }).then(function (r) {
        go.disabled = false;
        if (!(r && r.ok)) return showErr(e, errText(r));
        lsSet('sepaSciaW', JSON.stringify(w)); worker();
      });
    });
    b.appendChild(go);
    b.appendChild(btn('Back', 'esc-btn sc-wide', entry));
  }
  function worker() {
    stopTimers();
    var w = lsJson('sepaSciaW'); if (!w || !w.wkey) return entry();
    var m = main(), b = box(m, ''), status = el('p', 'esc-status esc-warn', 'Checking…'); b.appendChild(status);
    var again = btn('Cancel my request', 'esc-btn sc-wide', function () { lsSet('sepaSciaW', ''); entry(); }); b.appendChild(again);
    function check() {
      call({ action: 'sciaAskStatus', id: w.id, wid: w.wid, wkey: w.wkey }).then(function (r) {
        if (!(r && r.ok)) { status.textContent = r && r.offline ? 'No connection. Still waiting…' : errText(r); return; }
        if (r.status === 'asked') { status.textContent = 'Waiting for the lead (' + r.lead + ') to grant access…'; return; }
        if (r.status === 'granted') { stopTimers(); intakeForm(w, r); return; }
        stopTimers();
        status.className = 'esc-status esc-bad';
        status.textContent = { denied: 'The lead did not grant access.', revoked: 'Your access was ended by the lead.', expired: 'Your 24 hours of access have ended.', closed: 'This shelter was closed by HQ.', gone: 'That request was not found.' }[r.status] || 'Access ended.';
        again.textContent = 'Request access again';
        again.onclick = function () { var keep = { name: w.name }; lsSet('sepaSciaW', JSON.stringify(keep)); requestAccess(); };
      });
    }
    check(); timers.push(setInterval(function () { if (!document.hidden) check(); }, 5000));
  }

  // ---- THE FORM (kept only on this page; nothing is saved on the phone)
  var dirty = false, sending = false;
  window.addEventListener('beforeunload', function (e) { if (dirty || sending) { e.preventDefault(); e.returnValue = ''; } });
  function intakeForm(w, r) {
    $('sc-title').textContent = 'SCIA Offline Intake';
    var m = main();
    m.appendChild(el('p', 'sc-who', w.name + ' at ' + r.shelter + ' · access until ' + msClock(r.until) + (r.sent ? ' · ' + r.sent + ' sent so far' : '')));
    var b = box(m, '');
    b.appendChild(el('p', 'sc-warn', 'Complete the information below fully and accurately. It WILL be used to populate our system once a connection can be established. Accuracy matters.'));
    var form = el('div', 'sc-form'); b.appendChild(form);
    var get = buildForm(form, true);
    form.addEventListener('input', function () { dirty = true; });
    form.addEventListener('click', function (e) { if (e.target.tagName === 'BUTTON') dirty = true; });
    b.appendChild(el('p', 'sc-auto', 'Intake Worker Name: ' + w.name + ' · Date: ' + new Date().toLocaleDateString()));
    var e = errLine(b);
    var go = btn('Submit intake', 'primary-btn sc-submit'); b.appendChild(go);
    b.appendChild(el('p', 'esc-group-how', 'It goes to HQ and your shelter lead. Nothing is saved on this phone, and you cannot open it again after it is sent.'));
    b.appendChild(el('p', 'sc-confid', 'This information is confidential. Upon uploading to SCIA, this form must be deleted.'));
    var iid = null, retry = null;
    function send() {
      var f = get();
      if (!f.pname) { showErr(e, 'Please type the primary client name.'); return; }
      iid = iid || newId(); sending = true; go.disabled = true; showErr(e, ''); go.textContent = 'Sending…';
      call({ action: 'sciaSubmit', id: w.id, wid: w.wid, wkey: w.wkey, iid: iid, form: f }).then(function (x) {
        go.disabled = false; go.textContent = 'Submit intake';
        if (x && x.ok) { sending = false; dirty = false; iid = null; clearTimeout(retry); sent(w, x.at); return; }
        if (x && x.offline) {        // weak signal: keep it on this page and try again by itself
          showErr(e, 'Not sent yet: no connection. Keep this page open; it will try again by itself.');
          clearTimeout(retry); retry = setTimeout(send, 8000); return;
        }
        sending = false;
        if (x && x.ended) { showErr(e, x.error); if (x.status !== 'expired') dirty = false; return; }
        showErr(e, errText(x));
      });
    }
    go.onclick = send;
    window.scrollTo(0, 0);
  }
  function sent(w, at) {
    var m = main();
    m.appendChild(el('p', 'sc-ok', '✓ Intake sent at ' + clock(at) + '.'));
    m.appendChild(el('p', 'esc-how', 'It went to HQ and your shelter lead. It is not kept on this phone, and you cannot open it again.'));
    m.appendChild(btn('Start the next intake', 'primary-btn', function () { worker(); }));
    window.scrollTo(0, 0);
  }

  // Builds the form. editable false = read only (the dashboard), filled from data. Returns a function that reads it.
  function buildForm(box, editable, data) {
    data = data || {};
    var getters = [];
    FORM.forEach(function (q) {
      var t = q[0];
      if (t === 'h') { box.appendChild(el('h3', 'sc-h', q[1])); return; }
      if (t === 'tx') {
        var o = q[3] || {}, l = el('label', 'field sc-f' + (o.short ? ' sc-short' : ''));
        l.appendChild(document.createTextNode(q[2]));
        var i = o.area ? el('textarea', 'esc-in sc-in') : el('input', 'esc-in sc-in');
        if (o.area) i.rows = 2; else { i.type = o.type || 'text'; if (o.mode) i.inputMode = o.mode; }
        i.autocomplete = 'off'; i.maxLength = 2000; i.readOnly = !editable; i.value = data[q[1]] || '';
        l.appendChild(i); box.appendChild(l);
        getters.push(function (f) { if (i.value.trim()) f[q[1]] = i.value.trim(); });
        return;
      }
      if (t === 'house') {
        var list = el('div', 'sc-house'); box.appendChild(list);
        var rows = [];
        var addRow = function (h) {
          h = h || {};
          var r = el('div', 'sc-hrow'), ins = {};
          [['name', 'Name', 'sc-hn'], ['age', 'Age', 'sc-ha'], ['cot', 'Cot #', 'sc-hc'], ['contact', 'Contact', 'sc-hk']].forEach(function (c) {
            var l = el('label', 'sc-hf ' + c[2]); l.appendChild(el('span', '', c[1]));
            var i = el('input', 'esc-in sc-in'); i.autocomplete = 'off'; i.maxLength = 120; i.readOnly = !editable; i.value = h[c[0]] || '';
            if (c[0] === 'age') i.inputMode = 'numeric';
            l.appendChild(i); r.appendChild(l); ins[c[0]] = i;
          });
          r.dataset.n = rows.length + 1; list.appendChild(r); rows.push(ins);
        };
        var have = data.house || [];
        if (editable) { (have.length ? have : [{}]).forEach(addRow); var a = btn('+ Add a person', 'link-btn sc-add', function () { if (rows.length < 15) { addRow({}); rows[rows.length - 1].name.focus(); } }); box.appendChild(a); }
        else if (have.length) have.forEach(addRow); else list.appendChild(el('p', 'esc-group-how', 'None listed.'));
        getters.push(function (f) {
          var hs = rows.map(function (x) { return { name: x.name.value.trim(), age: x.age.value.trim(), cot: x.cot.value.trim(), contact: x.contact.value.trim() }; })
            .filter(function (x) { return x.name || x.age || x.cot || x.contact; });
          if (hs.length) f.house = hs;
        });
        return;
      }
      if (t === 'cb') {
        var lab = el('label', 'sc-cb'), c = el('input'); c.type = 'checkbox'; c.disabled = !editable; c.checked = !!data[q[1]];
        lab.appendChild(c); lab.appendChild(document.createTextNode(' ' + q[2])); box.appendChild(lab);
        getters.push(function (f) { if (c.checked) f[q[1]] = true; });
        return;
      }
      if (t === 'yn') {
        var w = el('div', 'sc-q'), o2 = q[3] || {};
        w.appendChild(el('p', 'sc-qt', q[2]));
        var g1 = yn(w, data[q[1]] || '', editable);
        var spec = null, g2 = null;
        if (o2.ask) { var p = el('p', 'sc-qt sc-sub', o2.ask); w.appendChild(p); g2 = yn(w, data[q[1] + 'n'] || '', editable); }
        if (o2.spec) {
          var sl = el('label', 'sc-spec'); sl.appendChild(el('span', '', o2.spec));
          spec = el('input', 'esc-in sc-in'); spec.autocomplete = 'off'; spec.maxLength = 2000; spec.readOnly = !editable; spec.value = data[q[1] + 's'] || '';
          sl.appendChild(spec); w.appendChild(sl);
        }
        box.appendChild(w);
        getters.push(function (f) {
          if (g1()) f[q[1]] = g1();
          if (g2 && g2()) f[q[1] + 'n'] = g2();
          if (spec && spec.value.trim()) f[q[1] + 's'] = spec.value.trim();
        });
      }
    });
    return function () { var f = {}; getters.forEach(function (g) { g(f); }); return f; };
  }
  function yn(parent, v, editable) {
    var g = el('div', 'rc-choice sc-yn'), now = v;
    ['Yes', 'No'].forEach(function (x) {
      var b = el('button', x === v ? 'on' : '', x); b.type = 'button'; b.disabled = !editable;
      b.onclick = function () { now = now === x ? '' : x; Array.prototype.forEach.call(g.children, function (y) { y.classList.toggle('on', y.textContent === now); }); };
      g.appendChild(b);
    });
    parent.appendChild(g);
    return function () { return now; };
  }

  // ================================================================ HQ
  function hqHome() {
    stopTimers();
    $('sc-title').textContent = 'Offline SCIA: HQ';
    var m = main();
    var b = box(m, 'Open a shelter', 'Name the shelter and assign its lead. The lead logs in with the lead user name and password and grants intake workers.');
    var n = field(b, 'Shelter name'), l = field(b, 'Lead\'s name');
    var e = errLine(b);
    b.appendChild(btn('Open shelter and assign lead', 'primary-btn sr-navy', function () {
      var go = this;
      if (!n.value.trim()) return showErr(e, 'Please type the shelter name.');
      if (!l.value.trim()) return showErr(e, 'Please type the lead\'s name.');
      go.disabled = true;
      call({ action: 'sciaOpen', token: token(), id: newId(), name: n.value, lead: l.value }).then(function (r) {
        go.disabled = false;
        if (r && r.login) return hqLost();
        if (!(r && r.ok)) return showErr(e, errText(r));
        n.value = l.value = ''; showErr(e, ''); load();
      });
    }));
    var list = box(m, 'Shelters'); var lc = el('div'); list.appendChild(lc);
    var out = el('p', 'esc-logout-line'); out.appendChild(btn('Log out of HQ', 'link-btn', function () { var t = token(); lsSet('sepaEscHQ', ''); call({ action: 'logout', token: t }).then(entry); })); m.appendChild(out);
    function load() {
      call({ action: 'sciaHq', token: token() }).then(function (r) {
        if (r && r.login) return hqLost();
        lc.innerHTML = '';
        if (!(r && r.ok)) { lc.appendChild(el('p', 'form-error', errText(r))); return; }
        if (!r.items.length) { lc.appendChild(el('p', 'esc-group-how', 'No shelters yet.')); return; }
        r.items.forEach(function (it) {
          var c = el('div', 'sc-card' + (it.closed ? ' sc-closed' : ''));
          c.appendChild(el('b', '', it.name + (it.closed ? ' (closed)' : '')));
          c.appendChild(el('small', '', 'Lead: ' + it.lead + ' · ' + it.intakes + (it.intakes === 1 ? ' intake' : ' intakes') + ' · ' + it.workers + ' working' + (it.asking ? ' · ' + it.asking + ' asking' : '') + (it.closed ? ' · erased 7 days after closing' : '')));
          var row = el('div', 'esc-buttons');
          row.appendChild(btn('Open dashboard', 'esc-btn', function () { dash({ id: it.id, role: 'hq' }); }));
          if (!it.closed) {
            row.appendChild(btn('Change lead', 'esc-btn', function () { changeLead(it, load); }));
            row.appendChild(btn('Close shelter', 'esc-btn sc-danger', function () { closeShelter(it, load); }));
          }
          c.appendChild(row); lc.appendChild(c);
        });
      });
    }
    load(); timers.push(setInterval(function () { if (!document.hidden && $('sc-modal').hidden) load(); }, 10000));
  }
  function hqLost() { lsSet('sepaEscHQ', ''); notice('Your HQ login has ended. Please log in again.'); entry(); }
  function changeLead(it, done) {
    modal('Change lead', function (b) {
      b.appendChild(el('p', 'f-modal-note', it.name + '. The current lead (' + it.lead + ') is logged out on their phone.'));
      var l = field(b, 'New lead\'s name'), e = errLine(b);
      b.appendChild(btn('Change lead', 'primary-btn sr-navy', function () {
        if (!l.value.trim()) return showErr(e, 'Please type the lead\'s name.');
        call({ action: 'sciaSetLead', token: token(), id: it.id, lead: l.value }).then(function (r) { if (!(r && r.ok)) return showErr(e, errText(r)); shut(); done(); });
      }));
    });
  }
  function closeShelter(it, done) {
    modal('Close ' + it.name + '?', function (b) {
      b.appendChild(el('p', 'f-modal-note', 'Intake workers lose access now. Intakes not yet entered into SCIA stay on the dashboard for 7 days, then everything is erased.'));
      var e = errLine(b);
      b.appendChild(btn('Close shelter', 'esc-btn rec-close-solid sc-wide', function () {
        call({ action: 'sciaClose', token: token(), id: it.id }).then(function (r) { if (!(r && r.ok)) return showErr(e, errText(r)); shut(); done(); });
      }));
      b.appendChild(btn('Cancel', 'esc-btn sc-wide', shut));
    });
  }

  // ================================================================ DASHBOARD (HQ and the lead)
  function dash(a) {
    stopTimers();
    if (!a) return entry();
    function auth(o) { o.id = a.id; if (a.role === 'hq') o.token = token(); else o.lead = a.lead; return o; }
    var m = main();
    if (a.role === 'hq') { var bk = el('p', 'rq-back'); var ba = el('a', '', '← All shelters'); ba.href = '#'; ba.onclick = function (e) { e.preventDefault(); hqHome(); }; bk.appendChild(ba); m.appendChild(bk); }
    var head = box(m, ''), h2 = el('h2', 'sr-h', ''), sub = el('p', 'esc-how', ''); head.appendChild(h2); head.appendChild(sub);
    var rq = box(m, 'Asking for access'), rqL = el('div'); rq.appendChild(rqL);
    var wk = box(m, 'Intake workers', 'Access lasts 24 hours at most. Revoke it any time.'), wkL = el('div'); wk.appendChild(wkL);
    var ib = box(m, 'Intakes');
    ib.appendChild(el('p', 'sc-warn', '')).innerHTML = '<b>Ticking "Entered into SCIA" deletes that intake.</b> Upon uploading to SCIA, this form must be deleted. Anything not ticked is erased 7 days after the shelter is closed.';
    var dl = btn('Download for Excel (form order)', 'esc-btn sc-wide sc-ol'); ib.appendChild(dl);
    var iL = el('div', 'sc-intakes'); ib.appendChild(iL);
    var out = el('p', 'esc-logout-line');
    if (a.role === 'lead') { out.appendChild(btn('Log out (lead)', 'link-btn', function () { lsSet('sepaSciaLead', ''); entry(); })); m.appendChild(out); }
    dl.onclick = function () { dl.disabled = true; download(auth).then(function () { dl.disabled = false; }); };
    var last = '';
    function load() {
      call(auth({ action: 'sciaDash' })).then(function (r) {
        if (r && (r.login || r.closed || r.gone)) {
          stopTimers();
          if (a.role === 'lead') { lsSet('sepaSciaLead', ''); notice(r.closed ? 'This shelter was closed by HQ.' : 'You are no longer the lead for this shelter, or your log in ended.'); return entry(); }
          return hqLost();
        }
        if (!(r && r.ok)) { sub.textContent = errText(r); return; }
        var sig = JSON.stringify([r.workers, r.intakes, r.shelter]); if (sig === last) return; last = sig;
        $('sc-title').textContent = a.role === 'hq' ? 'Offline SCIA: HQ' : 'Offline SCIA: Lead';
        h2.textContent = r.shelter.name + (r.shelter.closed ? ' (closed)' : '');
        sub.textContent = 'Lead: ' + r.shelter.lead + ' · ' + r.intakes.length + (r.intakes.length === 1 ? ' intake' : ' intakes') + ' waiting to be entered into SCIA';
        var asking = r.workers.filter(function (w) { return w.status === 'asked'; }), active = r.workers.filter(function (w) { return w.status === 'granted'; });
        rq.hidden = r.shelter.closed; wk.hidden = r.shelter.closed;
        rqL.innerHTML = ''; if (!asking.length) rqL.appendChild(el('p', 'esc-group-how', 'Nobody is asking right now.'));
        asking.forEach(function (w) {
          var row = el('div', 'sc-req'), t = el('span'); t.appendChild(document.createTextNode(w.name)); t.appendChild(el('small', '', 'asked ' + when(w.asked, r.today))); row.appendChild(t);
          var bs = el('span', 'sc-req-b');
          bs.appendChild(btn('Grant', 'sc-mini', function () { grant(w, 'grant'); }));
          bs.appendChild(btn('Deny', 'sc-mini sc-no', function () { grant(w, 'deny'); }));
          row.appendChild(bs); rqL.appendChild(row);
        });
        wkL.innerHTML = ''; if (!active.length) wkL.appendChild(el('p', 'esc-group-how', 'No intake workers have access right now.'));
        active.forEach(function (w) {
          var row = el('div', 'sc-req'), t = el('span'); t.appendChild(document.createTextNode(w.name)); t.appendChild(el('small', '', 'until ' + msClock(w.until) + ' · ' + w.sent + ' sent')); row.appendChild(t);
          row.appendChild(btn('Revoke', 'sc-mini sc-no', function () { grant(w, 'revoke'); })); wkL.appendChild(row);
        });
        iL.innerHTML = ''; if (!r.intakes.length) iL.appendChild(el('p', 'esc-group-how', 'No intakes waiting.'));
        r.intakes.forEach(function (x) {
          var c = el('div', 'sc-card');
          c.appendChild(el('b', '', x.client + ', ' + x.people + (x.people === 1 ? ' person' : ' people')));
          c.appendChild(el('small', '', (x.cot ? 'Cot ' + x.cot + ' · ' : '') + 'by ' + x.by + ' ' + when(x.at, r.today)));
          if (x.flags) c.appendChild(el('small', 'sc-flags', 'Needs attention: ' + x.flags));
          var row = el('div', 'sc-card-row');
          row.appendChild(btn('Open', 'link-btn', function () { openIntake(x); }));
          var lab = el('label', 'sc-tick'), cb = el('input'); cb.type = 'checkbox';
          cb.onchange = function () { cb.checked = false; entered(x); };
          lab.appendChild(cb); lab.appendChild(document.createTextNode(' Entered into SCIA')); row.appendChild(lab);
          c.appendChild(row); iL.appendChild(c);
        });
      });
    }
    function grant(w, what) {
      if (what === 'grant' && !lsGet('sepaSciaSeen:' + (a.role === 'hq' ? 'hq' : 'lead:' + a.lead))) return securityNotice(a.role === 'hq' ? 'hq' : 'lead:' + a.lead, function () { grant(w, what); });
      call(auth({ action: 'sciaGrant', wid: w.wid, what: what })).then(function (r) { if (!(r && r.ok)) notice(errText(r)); last = ''; load(); });
    }
    function openIntake(x) {
      modal(x.client, function (b) {
        var hold = el('div', 'sc-form sc-read'); hold.appendChild(el('p', 'esc-group-how', 'Loading…')); b.appendChild(hold);
        call(auth({ action: 'sciaIntake', iid: x.iid })).then(function (r) {
          hold.innerHTML = '';
          if (!(r && r.ok)) { hold.appendChild(el('p', 'form-error', errText(r))); return; }
          hold.appendChild(el('p', 'sc-auto', 'Intake Worker Name: ' + (r.form.worker || '') + ' · Date: ' + (r.form.date || '') + ' · sent ' + clock(r.at)));
          buildForm(hold, false, r.form);
        });
      });
      $('sc-modal').classList.add('sc-wide-modal');
    }
    function entered(x) {
      modal('Entered into SCIA?', function (b) {
        b.appendChild(el('p', 'f-modal-note', x.client + ' (' + x.people + (x.people === 1 ? ' person' : ' people') + '). This DELETES the intake for everyone. It cannot be undone. Only tick it once the intake is in SCIA.'));
        var e = errLine(b);
        b.appendChild(btn('Yes, it is in SCIA. Delete it here.', 'esc-btn rec-close-solid sc-wide', function () {
          call(auth({ action: 'sciaEntered', iid: x.iid })).then(function (r) { if (!(r && r.ok)) return showErr(e, errText(r)); shut(); last = ''; load(); });
        }));
        b.appendChild(btn('Cancel', 'esc-btn sc-wide', shut));
      });
    }
    load(); timers.push(setInterval(function () { if (!document.hidden && $('sc-modal').hidden) load(); }, 8000));
  }

  // ---- Excel (CSV) in the form's order
  function csvCell(v) { v = String(v == null ? '' : v); if (/^[=+\-@]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; }
  function download(auth) {
    return call(auth({ action: 'sciaExport' })).then(function (r) {
      if (!(r && r.ok)) { notice(errText(r)); return; }
      var maxH = r.intakes.reduce(function (m, f) { return Math.max(m, (f.house || []).length); }, 0);
      var head = ['Sent', 'Intake Worker Name', 'Date'], keys = [];
      FORM.forEach(function (q) {
        if (q[0] === 'tx' || q[0] === 'cb') { head.push(q[2]); keys.push([q[1], q[0]]); }
        else if (q[0] === 'house') { for (var i = 1; i <= maxH; i++) { head.push('Household ' + i + ' name', 'Household ' + i + ' age', 'Household ' + i + ' cot #', 'Household ' + i + ' contact'); keys.push(['house', i]); } }
        else if (q[0] === 'yn') {
          head.push(q[2]); keys.push([q[1], 'yn']);
          if ((q[3] || {}).ask) { head.push(q[3].ask); keys.push([q[1] + 'n', 'yn']); }
          if ((q[3] || {}).spec) { head.push(q[2].split(' ')[0] + ' ' + q[3].spec); keys.push([q[1] + 's', 'tx']); }
        }
      });
      var rows = [['SCIA Offline Intake', r.shelter.name], ['Confidential. Upon uploading to SCIA, this form must be deleted.'], [], head];
      r.intakes.forEach(function (f) {
        var row = [f.sent, f.worker, f.date];
        keys.forEach(function (k) {
          if (k[0] === 'house') { var h = (f.house || [])[k[1] - 1] || {}; row.push(h.name || '', h.age || '', h.cot || '', h.contact || ''); }
          else if (k[1] === 'cb') row.push(f[k[0]] ? 'Yes' : '');
          else row.push(f[k[0]] || '');
        });
        rows.push(row);
      });
      var text = '﻿' + rows.map(function (x) { return x.map(csvCell).join(','); }).join('\r\n');
      var U = window.URL || window.webkitURL, el2 = document.createElement('a');
      el2.href = U.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
      el2.download = 'Offline SCIA - ' + r.shelter.name.replace(/[\\\/:*?"<>|]+/g, ' ').slice(0, 60) + '.csv';
      document.body.appendChild(el2); el2.click(); setTimeout(function () { el2.remove(); }, 1000);
    });
  }

  // ================================================================ which screen
  $('sc-modal').addEventListener('transitionend', function () {});
  var obs = new MutationObserver(function () { if ($('sc-modal').hidden) $('sc-modal').classList.remove('sc-wide-modal'); });
  obs.observe($('sc-modal'), { attributes: true, attributeFilter: ['hidden'] });
  if (token()) {
    call({ action: 'sciaHq', token: token() }).then(function (r) {
      if (r && r.ok) return securityNotice('hq', hqHome);
      if (leadAuth()) return dash(leadAuth());
      if (lsJson('sepaSciaW') && lsJson('sepaSciaW').wkey) return worker();
      if (oldScript(r)) notice(OLD);
      entry();
    });
  } else if (leadAuth()) dash(leadAuth());
  else if (lsJson('sepaSciaW') && lsJson('sepaSciaW').wkey) worker();
  else entry();
})();
