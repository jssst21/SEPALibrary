// SEPA Resource Library - 6409 Disaster Requisition, live (pages/req.html), website v0.27.46. A PROTOTYPE
// that Sean will workshop with the logistics and mass care teams. Follows the paper form F6409 / F6409B.
//   - Each 6409 belongs to one open shelter. Supervisors CURRENTLY on that shelter's list (and HQ) start
//     them, fill in the request, approve someone else's (never their own), confirm delivery and cancel.
//   - "Share with Team member" (supervisors and HQ) sends logistics a link to the shelter's 6409s. Logistics
//     can type the requisition number, set the step and add notes, but cannot change the request; the link
//     never opens the shelter's report or log.
//   - Steps: Draft > Approved > With logistics > Ordered > On the way > Delivered (also Cannot fill, Cancelled).
//   - Everything saves as it is typed; other phones see changes within a few seconds.
// What this phone keeps: the shelter link code and name (from the Daily Shelter Report), the logistics link
// code for each shared shelter (sepaRqL:ID), a logistics person's name (sepaRqLName), the HQ login.
(function () {
  var URL = (typeof SEPA_BACKEND_URL === 'string') ? SEPA_BACKEND_URL : '';
  var $ = function (id) { return document.getElementById(id); };
  if (!$('rq-page')) return;

  var STEPS = ['Draft', 'Approved', 'With logistics', 'Ordered', 'On the way', 'Delivered'];
  var LOG_STEPS = ['With logistics', 'Ordered', 'On the way', 'Cannot fill'];
  var UNITS = [['', '-'], ['EA', 'EA'], ['PK', 'PK'], ['CS', 'CS'], ['BX', 'BX']];      // each, pack, case, box
  var METHODS = ['Donation', 'ReQuest', 'Concur Invoice', 'P-card', 'Transfer', 'Loan', 'Other'];
  // Shortcuts that add an item row (Sean: "build it with your best recommendations"; easy to change).
  var QUICK = ['Cots', 'Blankets', 'Pillows', 'Comfort kits', 'Bottled water (cases)', 'Snacks', 'Hygiene kits', 'Diapers'];

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
  var OLD = 'The 6409 is not switched on yet. The site admin needs to update the Google script.';
  function pageLink(query) { return location.href.split('?')[0].split('#')[0] + (query ? '?' + query : ''); }
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function clock(t) {
    var m = /(\d{1,2}):(\d{2})/.exec((t || '').split(' ')[1] || ''); if (!m) return t || '';
    var h = +m[1]; return ((h % 12) || 12) + ':' + m[2] + (h < 12 ? ' AM' : ' PM');
  }
  function when(t, today) {
    var d = (t || '').split(' ')[0]; if (!d) return '';
    if (d === today) return 'today ' + clock(t);
    var m = /^\d{4}-(\d{2})-(\d{2})/.exec(d);
    return (m ? MONTHS[+m[1] - 1] + ' ' + (+m[2]) + ', ' : '') + clock(t);
  }
  function shortDate(d) { var m = /^\d{4}-(\d{2})-(\d{2})/.exec(d || ''); return m ? MONTHS[+m[1] - 1] + ' ' + (+m[2]) : (d || ''); }
  function notice(msg) { var n = $('rq-notice'); n.textContent = msg || ''; n.hidden = !msg; }
  function loading(on) { $('rq-loading').hidden = !on; }
  function token() { return lsGet('sepaEscHQ') || ''; }
  function slug(s) { return String(s || '').toLowerCase().replace(/[^a-z]+/g, '-'); }

  // ---------------------------------------------------------------- who this phone is, for one shelter
  var sid = goodId(param('s')), rid = goodId(param('r'));
  var linkL = goodKey(hashParam('L'));
  if (sid && linkL) {        // the logistics link: keep its code, then take it out of the address bar
    lsSet('sepaRqL:' + sid, linkL);
    history.replaceState(null, '', pageLink('s=' + sid + (rid ? '&r=' + rid : '')));
  }
  var key = sid ? goodKey(lsGet('sepaShKey:' + sid)) : '';
  var me = sid ? (lsGet('sepaShName:' + sid) || '') : '';
  var lkey = sid ? goodKey(lsGet('sepaRqL:' + sid)) : '';
  function logName() { return lsGet('sepaRqLName') || ''; }
  function auth(o) {
    o.id = sid;
    if (key) { o.key = key; o.me = me; }
    else if (lkey) { o.lkey = lkey; o.me = logName(); }
    if (token()) { o.token = token(); if (!key) o.asHq = true; }
    return o;
  }
  function logShelters() { try { return JSON.parse(lsGet('sepaRqLList') || '[]') || []; } catch (e) { return []; } }
  function rememberLog(id, name) {
    var list = logShelters().filter(function (x) { return x.id !== id; });
    list.unshift({ id: id, name: name || '' }); lsSet('sepaRqLList', JSON.stringify(list.slice(0, 12)));
  }
  function forgetLog(id) { lsSet('sepaRqLList', JSON.stringify(logShelters().filter(function (x) { return x.id !== id; }))); lsSet('sepaRqL:' + id, ''); }

  // Answers that mean this phone cannot use the shelter (any more).
  function gone(r) {
    if (!r) return false;
    if (r.closed) { forgetLog(sid); show('pick'); notice('That shelter has been closed, and its 6409s were erased with it.'); pick(); return true; }
    if (r.removed) { show('pick'); notice('You have been removed from ' + (r.shelter || 'that shelter') + ', so you cannot use its 6409s.'); pick(); return true; }
    if (r.notlisted) { show('pick'); notice(r.error); pick(); return true; }
    if (r.nokey || r.gone) {
      if (r.hqLogin) { show('pick'); notice('Your HQ login has ended. Log in again on the Daily Shelter Report, then come back.'); pick(); return true; }
      if (lkey && !key) forgetLog(sid);
      show('pick'); notice(r.error || 'This link no longer opens these 6409s.'); pick(); return true;
    }
    return false;
  }
  function show(which) {
    ['pick', 'name-ask', 'list-screen', 'one'].forEach(function (w) { $('rq-' + w).hidden = w !== which; });
    loading(false);
  }
  function back(href, label) { $('rq-back').hidden = !href; if (href) { $('rq-back-a').href = href; $('rq-back-a').textContent = '← ' + label; } }

  // ================================================================ PICK A SHELTER
  function pick() {
    $('rq-title').textContent = '6409 Requisitions';
    back('', '');
    var box = $('rq-pick-list'); box.innerHTML = '';
    var seen = {}, n = 0;
    function add(id, title, sub) {
      if (seen[id]) return; seen[id] = 1; n++;
      var a = el('a', 'co-item'); a.href = pageLink('s=' + id);
      var t = el('span', 'co-text'); t.appendChild(el('strong', '', title || 'Shelter')); t.appendChild(el('span', '', sub)); a.appendChild(t); a.appendChild(el('b', '', 'Open'));
      box.appendChild(a); $('rq-pick-none').hidden = true;
    }
    var mine = []; try { mine = JSON.parse(lsGet('sepaShList') || '[]') || []; } catch (e) {}
    mine.forEach(function (x) { if (goodId(x.id) && goodKey(lsGet('sepaShKey:' + x.id))) add(x.id, x.name, 'You are a supervisor here'); });
    logShelters().forEach(function (x) { if (goodKey(lsGet('sepaRqL:' + x.id))) add(x.id, x.name, 'Shared with you for logistics'); });
    $('rq-pick-none').hidden = !!n;
    if (token()) call({ action: 'shList', token: token() }).then(function (r) {
      if (r && r.ok) r.items.forEach(function (it) { add(it.id, it.name, 'HQ' + (it.address ? ' · ' + it.address : '')); });
    });
  }

  // ================================================================ ONE SHELTER'S 6409s
  var L = { ms: 0 };
  function listScreen() {
    back(key ? 'shelter.html?s=' + sid : '', 'Daily Shelter Report');
    function load(first) {
      call(auth({ action: 'rqList' })).then(function (r) {
        if (gone(r)) return;
        if (!(r && r.ok)) { if (first) { show('list-screen'); notice(oldScript(r) ? OLD : (r && r.error) || 'Could not connect. Please check your signal and reload.'); } return; }
        if (first) show('list-screen');
        var top = r.items.reduce(function (m, x) { return Math.max(m, x.ms); }, 0) + ':' + r.items.length;
        if (!first && top === L.ms) return; L.ms = top;
        if (r.role === 'log') rememberLog(sid, r.shelter.name);
        document.title = '6409s - ' + r.shelter.name;
        $('rq-title').textContent = '6409 Requisitions';
        $('rq-intro').textContent = r.shelter.name + (r.shelter.address ? ', ' + r.shelter.address : '');
        $('rq-role').textContent = r.role === 'log' ? 'Logistics view: open a 6409 to type the requisition number, set the step and add notes. The request itself is filled in by the shelter.'
          : r.role === 'hq' ? 'HQ view: you can start, approve, update and cancel any of these 6409s.'
          : 'Start a 6409 for supplies this shelter needs. Another supervisor (or HQ) approves it, then logistics takes it from there.';
        $('rq-new').hidden = !r.can.start; $('rq-share').hidden = !r.can.share;
        var box = $('rq-items'); box.innerHTML = '';
        if (!r.items.length) { var none = el('div', 'sr-box'); none.appendChild(el('p', 'esc-how', r.role === 'log' ? 'No 6409s yet. New ones appear here by themselves.' : 'No 6409s yet for this shelter.')); box.appendChild(none); return; }
        r.items.forEach(function (it) {
          var a = el('a', 'rq-card rq-s-' + slug(it.status)); a.href = pageLink('s=' + sid + '&r=' + it.id);
          var head = el('span', 'rq-card-head'); head.appendChild(el('b', '', '6409 #' + it.no)); head.appendChild(el('span', 'rq-chip rq-s-' + slug(it.status), it.status === 'Draft' ? 'Draft: needs approval' : it.status));
          a.appendChild(head);
          a.appendChild(el('span', 'rq-card-what', it.first ? it.first + (it.count > 1 ? ' and ' + (it.count - 1) + ' more' : '') : 'No items yet'));
          var bits = []; if (it.need) bits.push('Needed ' + shortDate(it.need)); if (it.reqNo) bits.push('Req # ' + it.reqNo); bits.push('Started by ' + it.by + ', ' + when(it.started, r.today));
          a.appendChild(el('span', 'rq-card-sub', bits.join(' · ')));
          box.appendChild(a);
        });
      });
    }
    $('rq-new').onclick = function () {
      var b = this, err = $('rq-new-error'); b.disabled = true; err.hidden = true;
      var nid = newId();
      call(auth({ action: 'rqNew', rid: nid })).then(function (r) {
        b.disabled = false;
        if (gone(r)) return;
        if (!(r && r.ok)) { err.textContent = oldScript(r) ? OLD : (r && r.error) || 'Could not connect. Please try again.'; err.hidden = false; return; }
        location.href = pageLink('s=' + sid + '&r=' + r.id);
      });
    };
    $('rq-share').onclick = openShare;
    load(true);
    setInterval(function () { if (!document.hidden) load(false); }, 8000);
  }

  // ---- Share with Team member
  function openShare() {
    var m = $('rq-share-modal'), err = $('rq-share-error'); err.hidden = true; $('rq-share-hint').textContent = '';
    $('rq-share-link').value = 'Getting the link…'; m.hidden = false;
    function shut() { m.hidden = true; }
    $('rq-share-x').onclick = shut; m.onclick = function (e) { if (e.target === m) shut(); };
    document.addEventListener('keydown', function k(e) { if (e.key === 'Escape') { shut(); document.removeEventListener('keydown', k); } });
    call(auth({ action: 'rqShare' })).then(function (r) {
      if (gone(r)) { shut(); return; }
      if (!(r && r.ok)) { err.textContent = (r && r.error) || 'Could not connect. Please try again.'; err.hidden = false; $('rq-share-link').value = ''; return; }
      var url = pageLink('s=' + sid + (rid ? '&r=' + rid : '')) + '#L=' + r.lkey;
      $('rq-share-link').value = url;
      $('rq-share-send').onclick = function () {
        var text = '6409 requisitions for ' + r.shelter.name + '. Open this link to see them live and update them for logistics:';
        if (navigator.share) { navigator.share({ title: '6409 Requisitions', text: text, url: url }).catch(function () {}); return; }
        var hold = function () { $('rq-share-hint').textContent = 'Press and hold the link above to copy it, then paste it into a text or email.'; };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(function () { $('rq-share-hint').textContent = 'The link was copied. Paste it into a text or email.'; }, hold);
        else hold();
      };
    });
  }

  // ================================================================ ONE 6409
  var Q = { ms: '', today: '', role: '', can: {}, rq: null, me: '' };
  var pending = {}, timers = {}, sending = 0;
  function oneScreen() {
    back(pageLink('s=' + sid), 'All 6409s for this shelter');
    call(auth({ action: 'rqGet', rid: rid })).then(function (r) {
      if (gone(r)) return;
      if (r && r.norq) { location.replace(pageLink('s=' + sid)); return; }
      if (!(r && r.ok)) { show('one'); notice(oldScript(r) ? OLD : (r && r.error) || 'Could not connect. Please check your signal and reload.'); return; }
      show('one');
      if (r.role === 'log') rememberLog(sid, r.shelter.name);
      build(r); apply(r);
      setInterval(function () { if (!document.hidden) poll(false); }, 6000);
      document.addEventListener('visibilitychange', function () { if (!document.hidden) poll(true); });
      window.addEventListener('pagehide', flushAll);
    });
  }
  function poll(force) {
    if (sending || Object.keys(pending).length) return;
    call(auth({ action: 'rqGet', rid: rid, since: force ? '' : Q.ms })).then(function (r) {
      if (gone(r)) return;
      if (r && r.norq) { location.replace(pageLink('s=' + sid)); return; }
      if (!(r && r.ok)) { state(r && r.offline ? 'No connection. Your typing is kept on this page; it will save when the signal is back.' : '', true); return; }
      if (r.same) return;
      apply(r);
    });
  }
  function state(msg, bad) {
    var s = $('rq-state'); if (!s) return;
    if (msg) { s.textContent = msg; s.className = 'sr-state sr-bad'; return; }
    if (bad) return;
    var n = Object.keys(pending).length + sending;
    s.textContent = n ? 'Saving...' : '✓ Saved';
    s.className = 'sr-state' + (n ? '' : ' sr-good');
  }

  // ---- building the form once; apply() fills it in each time something changes
  var F = {};     // field name -> input
  function box(form, title, how) {
    var b = el('div', 'sr-box rq-box'); if (title) b.appendChild(el('h2', 'sr-h', title)); if (how) b.appendChild(el('p', 'esc-how', how));
    form.appendChild(b); return b;
  }
  function field(parent, k, label, opts) {
    opts = opts || {};
    var l = el('label', 'field rq-field' + (opts.half ? ' rq-half' : '') + (opts.third ? ' rq-third' : '')); l.appendChild(document.createTextNode(label));
    var i = opts.area ? el('textarea', 'esc-in') : el('input', 'esc-in');
    if (opts.area) i.rows = 3; else i.type = opts.type || 'text';
    if (opts.max) i.maxLength = opts.max;
    if (opts.ph) i.placeholder = opts.ph;
    if (opts.auto) i.autocomplete = opts.auto;
    if (opts.mode) i.inputMode = opts.mode;
    i.dataset.f = k;
    i.addEventListener('input', function () { queue(k, function () { return i.value; }); });
    i.addEventListener('blur', function () { if (pending[k]) { clearTimeout(timers[k]); save(k, i.value); } });
    l.appendChild(i); parent.appendChild(l); F[k] = i;
    return i;
  }
  function queue(k, get) { pending[k] = 1; state(); clearTimeout(timers[k]); timers[k] = setTimeout(function () { save(k, get()); }, 1000); }
  function save(k, v) {
    delete pending[k]; pending[k] = 1; sending++; state();
    call(auth({ action: 'rqSave', rid: rid, f: k, v: v })).then(function (r) {
      sending--; delete pending[k];
      if (gone(r)) return;
      if (r && r.locked) { notice(r.error + ' Your change was not saved.'); poll(true); return; }
      if (!(r && r.ok)) {
        pending[k] = 1; state('Not saved yet: no connection. It will keep trying.', true);
        clearTimeout(timers[k]); timers[k] = setTimeout(function () { save(k, k === 'items' ? itemsNow() : (F[k] ? F[k].value : v)); }, 5000);
        return;
      }
      Q.ms = r.ms; $('rq-saved').textContent = 'Last change ' + clock(r.at) + ' by ' + r.by;
      state();
    });
  }
  function flushAll() {
    Object.keys(timers).forEach(function (k) { clearTimeout(timers[k]); });
    Object.keys(pending).forEach(function (k) {
      if (!navigator.sendBeacon) return;
      var v = k === 'items' ? itemsNow() : (F[k] ? F[k].value : null); if (v == null) return;
      try { navigator.sendBeacon(URL, JSON.stringify(auth({ action: 'rqSave', rid: rid, f: k, v: v }))); } catch (e) {}
    });
  }
  function act(o, btn, errEl) {
    if (btn) btn.disabled = true; if (errEl) errEl.hidden = true;
    o.rid = rid;
    return call(auth(o)).then(function (r) {
      if (btn) btn.disabled = false;
      if (gone(r)) return null;
      if (!(r && r.ok)) {
        var msg = oldScript(r) ? OLD : (r && r.error) || 'Could not connect. Please try again.';
        if (errEl) { errEl.textContent = msg; errEl.hidden = false; } else notice(msg);
        return null;
      }
      poll(true); return r;
    });
  }

  function build(r) {
    var form = $('rq-form'); form.innerHTML = ''; F = {};
    // status and steps
    var st = box(form, '');
    st.classList.add('rq-top');
    var h = el('div', 'rq-top-head'); h.appendChild(el('h2', 'sr-h', 'Status')); h.appendChild(el('span', 'rq-chip', '')); st.appendChild(h);
    st.appendChild(el('p', 'rq-shelter', r.shelter.name));
    var steps = el('ol', 'rq-steps'); STEPS.forEach(function (s) { steps.appendChild(el('li', '', s)); }); st.appendChild(steps);
    st.appendChild(el('p', 'rq-next'));
    var meta = el('p', 'rq-saved'); meta.id = 'rq-saved'; st.appendChild(meta);
    var ss = el('p', 'sr-state'); ss.id = 'rq-state'; ss.setAttribute('role', 'status'); st.appendChild(ss);
    if (r.can.share) {
      var sb = el('button', 'esc-btn rq-share-btn', 'Share with Team member'); sb.type = 'button'; sb.onclick = openShare;
      var row = el('div', 'esc-buttons'); row.appendChild(sb); st.appendChild(row);
    }
    // request
    var b1 = box(form, 'Request', 'Disaster Requisition, Form 6409. One form per delivery address.');
    var g = el('div', 'rq-grid'); b1.appendChild(g);
    field(g, 'dr', 'DR # (if applicable)', { half: 1, max: 40 }); field(g, 'drName', 'DR name', { half: 1, max: 120 });
    field(g, 'date', 'Date', { half: 1, type: 'date' });
    var rn = el('div', 'field rq-field rq-half rq-ro'); rn.appendChild(document.createTextNode('Requisition #')); rn.appendChild(el('span', 'rq-ro-v')); rn.appendChild(el('small', '', 'Logistics fills this in')); g.appendChild(rn);
    // requester
    var b2 = box(form, 'Requester');
    var g2 = el('div', 'rq-grid'); b2.appendChild(g2);
    var rq = el('div', 'field rq-field rq-ro'); rq.appendChild(document.createTextNode('Requester name')); rq.appendChild(el('span', 'rq-ro-v rq-requester')); g2.appendChild(rq);
    field(g2, 'title', 'Title, or Group / Activity / Position', { max: 80, ph: 'e.g. Shelter Supervisor' });
    field(g2, 'phone', 'Phone', { type: 'tel', max: 30, auto: 'tel' });
    // delivery
    var b3 = box(form, 'Delivery information');
    var g3 = el('div', 'rq-grid'); b3.appendChild(g3);
    field(g3, 'poc', 'Site point of contact (POC)', { max: 60 });
    field(g3, 'pocPhone', 'POC phone', { half: 1, type: 'tel', max: 30 }); field(g3, 'pocEmail', 'POC email', { half: 1, type: 'email', max: 120 });
    field(g3, 'addr', 'Address', { max: 200 });
    field(g3, 'city', 'City', { third: 1, max: 80 }); field(g3, 'state', 'State', { third: 1, max: 20 }); field(g3, 'zip', 'Zip', { third: 1, max: 12, mode: 'numeric' });
    // items
    var b4 = box(form, 'What is needed', 'Quantity, unit (each, pack, case, box), total each, a description, and the date needed. Stock number if you know it.');
    var list = el('div', 'rq-items'); list.id = 'rq-item-list'; b4.appendChild(list);
    var add = el('div', 'rq-add'); add.id = 'rq-add';
    var ab = el('button', 'esc-btn', '+ Add an item'); ab.type = 'button'; ab.onclick = function () { addItem({}); };
    add.appendChild(ab);
    var quick = el('p', 'rq-quick-how', 'Or tap to add:'); add.appendChild(quick);
    var chips = el('div', 'rq-quick');
    QUICK.forEach(function (q) { var c = el('button', 'rq-q', q); c.type = 'button'; c.onclick = function () { addItem({ desc: q }); }; chips.appendChild(c); });
    add.appendChild(chips); b4.appendChild(add);
    field(b4, 'special', 'Special instructions', { area: 1, max: 2000, ph: 'e.g. Call POC 2 hours before delivery. Drop trailer needed. Order only if donated.' });
    // approval
    var b5 = box(form, 'Approval'); b5.id = 'rq-approval';
    b5.appendChild(el('p', 'esc-how', 'Approval includes: verification of need; need consistent with the Service Delivery Plan and budget. The requester and the approver cannot be the same person.'));
    b5.appendChild(el('div', 'rq-ap-body'));
    // procurement (optional)
    var b6 = box(form, ''); b6.id = 'rq-proc';
    var det = el('details', 'rq-det'); var sum = el('summary', '', 'Procurement method (optional)'); det.appendChild(sum); b6.appendChild(det);
    if (r.role !== 'log') field(det, 'acct', 'Account string to charge', { max: 60, ph: '___-_____-__-____-_____-____' });
    var ml = el('p', 'rq-label', 'Procurement tool to use'); det.appendChild(ml);
    var mg = el('div', 'rc-choice rq-method'); mg.setAttribute('role', 'radiogroup');
    METHODS.forEach(function (m) {
      var b = el('button', '', m); b.type = 'button'; b.dataset.v = m; b.setAttribute('role', 'radio');
      b.onclick = function () { if (b.disabled) return; var now = b.classList.contains('on') ? '' : m; setMethod(now); save('method', now); };
      mg.appendChild(b);
    });
    det.appendChild(mg);
    field(det, 'methodOther', 'Other (explain)', { max: 120 });
    // logistics
    var b7 = box(form, 'Logistics'); b7.id = 'rq-log';
    b7.appendChild(el('p', 'esc-how rq-log-how'));
    var g7 = el('div', 'rq-grid'); b7.appendChild(g7);
    field(g7, 'reqNo', 'Requisition #', { max: 40, ph: 'Logistics assigns it for tracking' });
    field(g7, 'logNote', 'Logistics notes', { area: 1, max: 2000, ph: 'e.g. Coming from the Norristown warehouse, ETA 3 PM' });
    var lb = el('div', 'rq-log-steps'); b7.appendChild(lb);
    var le = el('p', 'form-error'); le.hidden = true; le.id = 'rq-log-error'; b7.appendChild(le);
    // receipt
    var b8 = box(form, 'Delivery received (6409-B)'); b8.id = 'rq-rcv';
    b8.appendChild(el('div', 'rq-rcv-body'));
    // history
    var b9 = box(form, 'History'); b9.appendChild(el('ul', 'rq-hist'));
    // cancel
    var b10 = el('div', 'rq-end'); b10.id = 'rq-end';
    var cx = el('button', 'esc-btn rec-close-solid', 'Cancel this 6409'); cx.type = 'button'; cx.id = 'rq-cancel';
    cx.onclick = function () {
      if (!window.confirm || window.confirm('Cancel 6409 #' + Q.rq.no + '? Logistics will see it as cancelled.')) act({ action: 'rqCancel' }, cx);
    };
    b10.appendChild(cx); form.appendChild(b10);
  }
  function setMethod(v) { Array.prototype.forEach.call(document.querySelectorAll('.rq-method button'), function (b) { b.classList.toggle('on', b.dataset.v === v); b.setAttribute('aria-checked', b.dataset.v === v); }); }

  // ---- items
  function itemRow(it, editable) {
    var row = el('div', 'rq-item');
    function inp(k, label, cls, type) {
      var l = el('label', 'rq-i ' + cls); l.appendChild(el('span', '', label));
      var i = el('input', 'esc-in'); i.type = type || 'text'; i.value = it[k] || ''; i.dataset.k = k; i.readOnly = !editable;
      if (k === 'qty' || k === 'total') i.inputMode = 'numeric';
      i.addEventListener('input', function () { if (k === 'qty') autoTotal(row); itemsChanged(); });
      l.appendChild(i); row.appendChild(l); return i;
    }
    inp('desc', 'Description', 'rq-i-desc');
    inp('qty', 'Quantity', 'rq-i-qty');
    var ul = el('label', 'rq-i rq-i-unit'); ul.appendChild(el('span', '', 'Unit')); ul.title = 'EA each, PK pack, CS case, BX box';
    var sel = el('select', 'esc-in'); sel.dataset.k = 'unit'; sel.disabled = !editable;
    UNITS.forEach(function (u) { var o = el('option', '', u[1]); o.value = u[0]; sel.appendChild(o); });
    sel.value = it.unit || ''; sel.addEventListener('change', function () { autoTotal(row); itemsChanged(); });
    ul.appendChild(sel); row.appendChild(ul);
    inp('total', 'Total (each)', 'rq-i-total');
    inp('need', 'Date needed', 'rq-i-need', 'date');
    inp('stock', 'Stock no.', 'rq-i-stock');
    if (editable) {
      var x = el('button', 'link-btn rq-i-x', 'Remove item'); x.type = 'button';
      x.onclick = function () { row.remove(); itemsChanged(); numberItems(); };
      row.appendChild(x);
    }
    return row;
  }
  // With "each" as the unit, the total is the quantity (paper form: quantity x unit = total each).
  function autoTotal(row) {
    var q = row.querySelector('[data-k=qty]'), u = row.querySelector('[data-k=unit]'), t = row.querySelector('[data-k=total]');
    if (u.value === 'EA' && (!t.value || t.dataset.auto === '1')) { t.value = q.value; t.dataset.auto = '1'; }
  }
  function numberItems() { Array.prototype.forEach.call(document.querySelectorAll('.rq-item'), function (r, i) { r.dataset.n = i + 1; }); }
  function itemsNow() {
    return Array.prototype.map.call(document.querySelectorAll('.rq-item'), function (row) {
      var o = {}; Array.prototype.forEach.call(row.querySelectorAll('[data-k]'), function (i) { o[i.dataset.k] = i.value; }); return o;
    });
  }
  function itemsChanged() { queue('items', itemsNow); }
  function addItem(it) {
    // a shortcut fills the first empty row, if there is one; otherwise a new row
    var row = null;
    if (it.desc) Array.prototype.some.call(document.querySelectorAll('.rq-item'), function (r) {
      var d = r.querySelector('[data-k=desc]'), q = r.querySelector('[data-k=qty]');
      if (!d.value.trim() && !q.value.trim()) { d.value = it.desc; row = r; return true; } return false;
    });
    if (!row) { row = itemRow(it, true); $('rq-item-list').appendChild(row); }
    numberItems(); itemsChanged();
    var first = it.desc ? row.querySelector('[data-k=qty]') : row.querySelector('[data-k=desc]'); first.focus();
  }
  function drawItems(items, editable) {
    var list = $('rq-item-list');
    if (editable && list.dataset.editable === '1' && (pending.items || list.contains(document.activeElement))) return;   // someone is typing here
    list.innerHTML = ''; list.dataset.editable = editable ? '1' : '';
    var have = (items || []).filter(function (x) { return editable || (x && (x.desc || x.qty)); });
    if (!have.length && !editable) list.appendChild(el('p', 'esc-group-how', 'No items.'));
    have.forEach(function (it) { list.appendChild(itemRow(it || {}, editable)); });
    numberItems();
    $('rq-add').hidden = !editable;
  }

  // ---- fill everything in
  function apply(r) {
    Q.ms = r.rq.ms; Q.today = r.today; Q.role = r.role; Q.can = r.can; Q.rq = r.rq; Q.me = r.me;
    var rq = r.rq, f = rq.f || {}, status = rq.status, draft = status === 'Draft';
    var closed = status === 'Delivered' || status === 'Cancelled' || status === 'Cannot fill';
    var canReq = r.role !== 'log' && draft, canLog = r.role !== 'sup' && status !== 'Cancelled' && status !== 'Delivered';
    document.title = '6409 #' + rq.no + ' - ' + r.shelter.name;
    $('rq-title').textContent = '6409 #' + rq.no;
    $('rq-intro').textContent = r.shelter.name + (r.shelter.address ? ', ' + r.shelter.address : '');
    // top
    var chip = document.querySelector('.rq-top .rq-chip'); chip.textContent = draft ? 'Draft: needs approval' : status; chip.className = 'rq-chip rq-s-' + slug(status);
    var at = STEPS.indexOf(status);
    Array.prototype.forEach.call(document.querySelectorAll('.rq-steps li'), function (li, i) {
      li.className = (at >= 0 && i < at) ? 'done' : (i === at ? 'now' : '');
      if (status === 'Cancelled' || status === 'Cannot fill') li.className = '';
    });
    var next = document.querySelector('.rq-next');
    next.textContent = status === 'Draft' ? (r.role === 'log' ? 'Not approved yet. You can start on it once it is approved.' : 'Fill it in, then another supervisor (or HQ) approves it below.')
      : status === 'Approved' ? 'Approved. Waiting for logistics to pick it up.'
      : status === 'With logistics' || status === 'Ordered' || status === 'On the way' ? (r.role === 'log' ? 'Update the step below as it moves.' : 'Logistics is working on it. When it arrives, confirm the delivery below.')
      : status === 'Delivered' ? 'Delivered and confirmed by the shelter.'
      : status === 'Cannot fill' ? 'Logistics cannot fill this 6409. See their note below.'
      : 'Cancelled.';
    next.className = 'rq-next' + (status === 'Cannot fill' || status === 'Cancelled' ? ' rq-bad' : '');
    $('rq-saved').textContent = f.saved ? 'Last change ' + when(f.saved.at, r.today) + ' by ' + f.saved.by : 'Started ' + when(rq.started, r.today) + ' by ' + rq.by;
    // fields
    Object.keys(F).forEach(function (k) {
      var i = F[k], v = f[k] == null ? '' : String(f[k]);
      var isLog = k === 'reqNo' || k === 'logNote';
      i.readOnly = isLog ? !canLog : !canReq;
      i.classList.toggle('rq-locked', i.readOnly);
      if (!pending[k] && document.activeElement !== i) i.value = v;
    });
    document.querySelector('.rq-ro-v').textContent = f.reqNo || 'Not assigned yet';
    document.querySelector('.rq-requester').textContent = f.requester || rq.by;
    setMethod(f.method || '');
    Array.prototype.forEach.call(document.querySelectorAll('.rq-method button'), function (b) { b.disabled = !canReq; });
    if ((f.method || f.acct || f.methodOther) && !document.querySelector('.rq-det').open) document.querySelector('.rq-det').open = true;
    $('rq-proc').hidden = r.role === 'log' && !f.method && !f.methodOther;
    drawItems(f.items || [], canReq);
    drawApproval(r, f, draft, closed);
    drawLogistics(r, f, status, canLog);
    drawReceipt(r, f, status);
    var hist = document.querySelector('.rq-hist'); hist.innerHTML = '';
    (f.hist || []).slice().reverse().forEach(function (h) {
      var li = el('li'); li.appendChild(el('b', '', h.what)); li.appendChild(el('small', '', h.by + ' · ' + when(h.at, r.today))); hist.appendChild(li);
    });
    $('rq-end').hidden = r.role === 'log' || status === 'Delivered' || status === 'Cancelled';
    state();
  }
  function drawApproval(r, f, draft, closed) {
    var body = document.querySelector('.rq-ap-body'); body.innerHTML = '';
    if (f.approved) {
      var d = el('dl', 'rq-dl');
      [['Approver', f.approved.by], ['Title', f.approved.title], ['Phone', f.approved.phone], ['Approved', when(f.approved.at, r.today)]].forEach(function (x) { if (!x[1]) return; d.appendChild(el('dt', '', x[0])); d.appendChild(el('dd', '', x[1])); });
      body.appendChild(el('p', 'esc-status esc-ok', '✓ Approved by ' + f.approved.by));
      body.appendChild(d);
      if (r.role === 'hq' && !closed) {
        var u = el('button', 'esc-btn', 'Undo the approval (HQ)'); u.type = 'button';
        u.onclick = function () { act({ action: 'rqUnapprove' }, u); };
        var row = el('div', 'esc-buttons'); row.appendChild(u); body.appendChild(row);
        body.appendChild(el('p', 'esc-group-how', 'Puts it back to Draft so the request can be changed. It then needs approving again.'));
      }
      return;
    }
    if (!draft) { body.appendChild(el('p', 'esc-group-how', 'Not approved.')); return; }
    if (r.role === 'log') { body.appendChild(el('p', 'esc-status esc-warn', 'Waiting for a shelter supervisor or HQ to approve it.')); return; }
    var mine = r.role === 'sup' && (f.requester || '').toLowerCase() === (r.me || '').toLowerCase();
    if (mine) { body.appendChild(el('p', 'esc-status esc-warn', 'You started this 6409, so someone else approves it: another supervisor on this shelter, or HQ. Send them this page\'s link, or they open it from the shelter.')); return; }
    body.appendChild(el('p', 'rq-ap-who', 'Approving as ' + (r.role === 'hq' ? 'HQ' : r.me) + '.'));
    var g = el('div', 'rq-grid');
    var lt = el('label', 'field rq-field rq-half'); lt.appendChild(document.createTextNode('Your title')); var ti = el('input', 'esc-in'); ti.maxLength = 80; ti.value = lsGet('sepaRqTitle') || ''; lt.appendChild(ti); g.appendChild(lt);
    var lp = el('label', 'field rq-field rq-half'); lp.appendChild(document.createTextNode('Your phone')); var pi = el('input', 'esc-in'); pi.type = 'tel'; pi.maxLength = 30; pi.value = lsGet('sepaRqPhone') || ''; lp.appendChild(pi); g.appendChild(lp);
    body.appendChild(g);
    var err = el('p', 'form-error'); err.hidden = true;
    var b = el('button', 'primary-btn rq-approve', 'Approve this 6409'); b.type = 'button';
    b.onclick = function () {
      lsSet('sepaRqTitle', ti.value.trim()); lsSet('sepaRqPhone', pi.value.trim());
      flushNow().then(function () { act({ action: 'rqApprove', title: ti.value, phone: pi.value }, b, err); });
    };
    body.appendChild(b); body.appendChild(err);
    body.appendChild(el('p', 'esc-group-how', 'Your typed name and the time stand in for a signature. Approving locks the request and sends it to logistics.'));
  }
  // Save anything still waiting before approving.
  function flushNow() {
    var ks = Object.keys(timers).filter(function (k) { return pending[k]; });
    ks.forEach(function (k) { clearTimeout(timers[k]); });
    return Promise.all(ks.map(function (k) {
      delete pending[k];
      return call(auth({ action: 'rqSave', rid: rid, f: k, v: k === 'items' ? itemsNow() : (F[k] ? F[k].value : '') }));
    }));
  }
  function drawLogistics(r, f, status, canLog) {
    var how = document.querySelector('.rq-log-how');
    how.textContent = r.role === 'sup' ? 'Filled in by logistics. Updates show here as they happen.'
      : status === 'Draft' ? 'Not approved yet: the steps open once a supervisor or HQ approves it.'
      : 'Type the requisition number, then tap the step as it moves. Add a note for anything the shelter should know.';
    var steps = document.querySelector('.rq-log-steps'); steps.innerHTML = '';
    if (r.role === 'sup' || status === 'Draft' || !canLog) return;
    var note = F.logNote;
    LOG_STEPS.forEach(function (s) {
      var b = el('button', 'esc-btn' + (s === status ? ' on' : '') + (s === 'Cannot fill' ? ' rq-cant' : ''), s); b.type = 'button';
      b.onclick = function () {
        if (s === 'Cannot fill' && !note.value.trim()) { var e = $('rq-log-error'); e.textContent = 'Please type in the notes why it cannot be filled.'; e.hidden = false; note.focus(); return; }
        flushNow().then(function () { act({ action: 'rqStatus', status: s, note: s === 'Cannot fill' ? note.value.trim().slice(0, 300) : '' }, b, $('rq-log-error')); });
      };
      steps.appendChild(b);
    });
  }
  function drawReceipt(r, f, status) {
    var b = $('rq-rcv'), body = b.querySelector('.rq-rcv-body'); body.innerHTML = '';
    if (f.receipt) {
      body.appendChild(el('p', 'esc-status ' + (f.receipt.all ? 'esc-ok' : 'esc-warn'), f.receipt.all ? '✓ Everything arrived' : 'Arrived, with discrepancies'));
      var d = el('dl', 'rq-dl');
      [['Discrepancies', f.receipt.disc], ['Received by', f.receipt.by], ['Group', f.receipt.group], ['Time of arrival', when(f.receipt.at, r.today)]].forEach(function (x) { if (!x[1]) return; d.appendChild(el('dt', '', x[0])); d.appendChild(el('dd', '', x[1])); });
      body.appendChild(d); b.hidden = false; return;
    }
    var open = ['Approved', 'With logistics', 'Ordered', 'On the way'].indexOf(status) >= 0;
    b.hidden = !open;
    if (!open) return;
    if (r.role === 'log') { body.appendChild(el('p', 'esc-group-how', 'The shelter confirms here when it arrives.')); return; }
    body.appendChild(el('p', 'esc-how', 'When it arrives: check it against the list above, then confirm. I certify that I have received the items listed above.'));
    var ch = el('div', 'rc-choice'), all = null;
    var yes = el('button', '', 'Everything arrived'), no = el('button', '', 'Something is missing or wrong');
    [yes, no].forEach(function (x) { x.type = 'button'; ch.appendChild(x); });
    var dl = el('label', 'field rq-field'); dl.appendChild(document.createTextNode('Discrepancies')); var dt = el('textarea', 'esc-in'); dt.rows = 3; dt.maxLength = 2000; dt.placeholder = 'What was missing, short or damaged?'; dl.appendChild(dt); dl.hidden = true;
    var gl = el('label', 'field rq-field'); gl.appendChild(document.createTextNode('Your group / activity (optional)')); var gi = el('input', 'esc-in'); gi.maxLength = 80; gi.value = lsGet('sepaRqGroup') || 'Mass Care - Sheltering'; gl.appendChild(gi);
    var err = el('p', 'form-error'); err.hidden = true;
    var go = el('button', 'primary-btn', 'Confirm delivery'); go.type = 'button'; go.disabled = true;
    function pickAll(v) { all = v; yes.classList.toggle('on', v); no.classList.toggle('on', !v); dl.hidden = v; go.disabled = false; if (!v) dt.focus(); }
    yes.onclick = function () { pickAll(true); }; no.onclick = function () { pickAll(false); };
    go.onclick = function () {
      if (!all && !dt.value.trim()) { err.textContent = 'Please say what was missing or wrong.'; err.hidden = false; return; }
      lsSet('sepaRqGroup', gi.value.trim());
      act({ action: 'rqReceive', all: all, disc: all ? '' : dt.value, group: gi.value }, go, err);
    };
    body.appendChild(ch); body.appendChild(dl); body.appendChild(gl); body.appendChild(go); body.appendChild(err);
    body.appendChild(el('p', 'esc-group-how', 'Received by ' + (r.role === 'hq' ? 'HQ' : r.me) + ', with the time. Your typed name stands in for a signature.'));
  }

  // ================================================================ which screen
  if (!sid) { show('pick'); pick(); return; }
  if (!key && !lkey && !token()) {
    show('pick'); notice('This phone cannot open that shelter\'s 6409s. Ask one of its supervisors to share them with you ("Share with Team member").'); pick(); return;
  }
  if (key && !me) { show('pick'); notice('Open the shelter\'s Daily Shelter Report first and type your name, then come back.'); pick(); return; }
  if (!key && lkey && !token() && !logName()) {
    show('name-ask');
    $('rq-name-form').onsubmit = function (e) {
      e.preventDefault();
      var n = $('rq-my-name').value.trim();
      if (!n) { $('rq-name-error').textContent = 'Please type your name.'; $('rq-name-error').hidden = false; return; }
      lsSet('sepaRqLName', n); location.reload();
    };
    return;
  }
  if (rid) oneScreen(); else listScreen();
})();
