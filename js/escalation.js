// SEPA Resource Library - Escalation Form (pages/escalation.html)
// The DAT Response Lead Incident Reporting Worksheet as a page that works on a phone or a laptop.
//
// PROOF OF CONCEPT (v0.17). What it does:
//   - Fill-in mode (the normal page): everything typed is saved on the device straight away and,
//     a moment later, sent to the Google Sheet (tab "Escalations"). Nothing has to be pressed.
//   - Live view (same page with ?view=CODE on the end): a read-only copy that re-reads the Google
//     Sheet every few seconds, so someone else can watch the worksheet fill in.
//   - ?view=list shows the most recent worksheets.
// Filling in needs no login. READING (the live view and the list) needs the HQ user name and
// password, which are checked by the Google script and kept in the Google Sheet's Settings tab.
// They are deliberately not in this file or anywhere else in the website folder, which is public.
// The Google connection is set in js/config.js. The wording below comes from the Word original,
// edition 2026.2.8. To change a label, edit the text between the quotes.
(function () {
  var URL = (typeof SEPA_BACKEND_URL === 'string') ? SEPA_BACKEND_URL : '';
  var root = document.getElementById('esc-form');
  if (!root) return;
  var $ = function (id) { return document.getElementById(id); };

  // ---------------------------------------------------------------- the worksheet, top to bottom
  var NEED = 'ARC Contact Name / Number', SPEC = 'Specific Need (situational Awareness)', TIME = 'Time Requested/ Expected';
  var FORM = [
    { t: 'q', k: 'date_time', label: 'Date/ Time', bold: 1 },
    { t: 'q', k: 'incident_addresses', label: 'Disaster Incident Address(es)', rows: 2 },
    { t: 'q', k: 'impact_description', label: 'High level description of impacted area and disruption of utilities', hint: '(# of bldgs, type of damage)', rows: 3, bold: 1 },
    { t: 'q', k: 'resident_condition', label: 'High Level concern for condition of residents?', hint: '(known Injuries/ fatalities, general location)', rows: 4, bold: 1 },
    { t: 'people', k: 'leaders', head: 'Stakeholders on Scene', cols: ['Name/ Title', 'Phone Number'], rows: [
      ['arc_lead', 'ARC DAT Event Lead'], ['oem', 'OEM/ Emergency'], ['property', 'Property Name/ Mgr.'],
      ['municipality', 'Municipality Rep.'], ['politician', 'Politician/Community'], ['arc_other', 'ARC/ Other']] },
    { t: 'q', k: 'reception_addresses', label: 'Reception Center Address(es)', rows: 3 },
    { t: 'q', k: 'directions', label: 'Directions/ Staging info.', rows: 2 },
    { t: 'q', k: 'manifest_status', label: 'What is status of obtaining property manifest(s)?', hint: 'Address, Unit #, Resident names, Contact #, Animals', rows: 2, bold: 1 },
    { t: 'q', k: 'intake_status', label: 'What is status of collecting resident info on SEPA Reception on-line Intake Form?', rows: 2, bold: 1 },
    { t: 'q', k: 'initial_da_by', label: 'Who provided initial damage assessment? (ARC/ OEM/ Property Mgr.?)' },
    { t: 'q', k: 'dda_done', label: 'Has ARC performed Detailed Damage Assessment for each affected & possibly affected unit?' },
    { t: 'q', k: 'dda_blocked', label: 'Is a situation preventing ARC DDA?' },
    { t: 'q', k: 'dda_by', label: 'Who did DDA?' },
    { t: 'grid', k: 'units', head: 'Initial Estimated # of Affected Units', colcap: 'Location Area', rows: [
      ['destroyed', '# Destroyed'], ['major', '# Major'], ['uninhabitable', '# Uninhabitable'], ['minor', '# Minor'],
      ['affected', '# Affected'], ['unaffected', '# No Visible Damage/ Unaffected'],
      ['total_units', 'Estimate # Total Units (Individual Apt. & SF)', 'bold']] },
    { t: 'q', k: 'units_notes', label: "Add'l Notes", rows: 3, bold: 1 },
    { t: 'grid', k: 'residents', head: 'Initial Estimate # Affected Residents', colcap: '', rows: [
      ['adults', '# Adults'], ['children', '# Children'], ['animals', '# Household Animals'], ['total_residents', '# Total Residents'],
      ['families', '# Families/ Cases (maybe diff. than # units)'], ['signed_in', '# Signed In @ Recpt. Ctr.'],
      ['still_there', '# Still @ Recpt. Ctr. / Still On Scene?'], ['shelter', 'Committed to going to ARC Shelter', 'split']] },
    { t: 'q', k: 'residents_notes', label: "Add'l Notes", rows: 3, bold: 1 },
    { t: 'band', label: 'Response/ Reception Center/ Anticipated Shelter Event Needs' },
    { t: 'h', label: 'Feeding (water, meals, snacks)' },
    { t: 'q', k: 'feed_contact', label: NEED, sub: 1 },
    { t: 'q', k: 'feed_servings', label: 'Estimated # of Servings Needed (consider client work/ school schedule)', sub: 1 },
    { t: 'meals', items: [['feed_breakfast', 'Breakfast'], ['feed_lunch', 'Lunch'], ['feed_dinner', 'Dinner'], ['feed_snacks', 'Snacks']] },
    { t: 'q', k: 'feed_specific', label: 'Specific Need (Adults vs Children vs Babies, Dietary Needs, Cultural Awareness)', rows: 3, sub: 1 },
    { t: 'q', k: 'feed_time', label: TIME, sub: 1 },
    { t: 'q', k: 'feed_delivery', label: 'On Scene Actions: Will food be delivered, or does it need to be pick up?', sub: 1 },
    { t: 'q', k: 'feed_payment', label: 'Payment by whom and how?', sub: 1 },
    { t: 'h', label: 'Individual Disaster Care (IDC) and Translation (DHS, DMH, DSC, ICCT, EMT to be present, Translator)' },
    { t: 'q', k: 'idc_contact', label: NEED, sub: 1 },
    { t: 'q', k: 'idc_specific', label: SPEC, rows: 2, sub: 1 },
    { t: 'q', k: 'idc_time', label: TIME, rows: 2, sub: 1 },
    { t: 'h', label: 'Other Immediate Client Needs (Translator, etc.' },
    { t: 'q', k: 'other_contact', label: NEED, sub: 1 },
    { t: 'q', k: 'other_specific', label: SPEC, rows: 3, sub: 1 },
    { t: 'h', label: 'Logistics: Supplies' },
    { t: 'q', k: 'log_contact', label: NEED, sub: 1 },
    { t: 'q', k: 'log_specific', label: SPEC, rows: 3, sub: 1 },
    { t: 'q', k: 'log_time', label: TIME, sub: 1 },
    { t: 'h', label: 'Pet Liaison' },
    { t: 'q', k: 'pet_contact', label: NEED, sub: 1 },
    { t: 'q', k: 'pet_specific', label: SPEC, rows: 2, sub: 1 },
    { t: 'q', k: 'pet_time', label: TIME, sub: 1 },
    { t: 'q', k: 'additional_notes', label: 'Additional Notes', rows: 6, bold: 1 }
  ];

  // ---------------------------------------------------------------- small helpers
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function param(name) {
    var m = new RegExp('[?&]' + name + '=([^&#]*)').exec(location.search);
    return m ? decodeURIComponent(m[1]) : '';
  }
  function goodId(v) { return /^[A-Za-z0-9]{8,24}$/.test(v || '') ? v : ''; }
  function newId() {
    var abc = 'abcdefghjkmnpqrstuvwxyz23456789', out = '', i, rnd = [];
    try { rnd = crypto.getRandomValues(new Uint8Array(12)); } catch (e) { for (i = 0; i < 12; i++) rnd.push(Math.floor(Math.random() * 256)); }
    for (i = 0; i < 12; i++) out += abc.charAt(rnd[i] % abc.length);
    return out;
  }
  function call(data) {
    if (!URL) return Promise.resolve({ ok: false, error: 'Unknown request.' });
    return fetch(URL, { method: 'POST', body: JSON.stringify(data) })
      .then(function (r) { return r.json(); })
      .catch(function () { return { ok: false, offline: true }; });
  }
  function clock(d) {
    var h = d.getHours(), m = d.getMinutes(), s = d.getSeconds(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return ((h % 12) || 12) + ':' + p(m) + ':' + p(s) + (h < 12 ? ' AM' : ' PM');
  }
  function ago(ms) {
    var s = Math.max(0, Math.round(ms / 1000));
    if (s < 5) return 'just now';
    if (s < 90) return s + ' seconds ago';
    if (s < 5400) return Math.round(s / 60) + ' minutes ago';
    if (s < 129600) return Math.round(s / 3600) + ' hours ago';
    return Math.round(s / 86400) + ' days ago';
  }
  function pageLink(query) { return location.href.split('?')[0].split('#')[0] + (query ? '?' + query : ''); }

  // ---------------------------------------------------------------- drawing the worksheet
  var inputs = {};     // field name -> its box on the page
  var readOnly = false;

  function box(name, label, opts) {
    opts = opts || {};
    var i = el((opts.rows || 1) > 1 ? 'textarea' : 'input', 'esc-in');
    if (i.tagName === 'TEXTAREA') i.rows = opts.rows; else i.type = 'text';
    i.id = 'f_' + name; i.name = name;
    i.setAttribute('aria-label', label);
    i.setAttribute('autocomplete', 'off');
    if (opts.mode) i.setAttribute('inputmode', opts.mode);
    if (opts.ph) i.placeholder = opts.ph;
    if (readOnly) { i.readOnly = true; i.tabIndex = -1; i.placeholder = ''; }
    inputs[name] = i;
    return i;
  }

  function draw() {
    root.innerHTML = ''; inputs = {};
    FORM.forEach(function (it) {
      var w, lab, i;
      if (it.t === 'q') {
        w = el('div', 'esc-q' + (it.sub ? ' esc-sub' : ''));
        lab = el('label', 'esc-label' + (it.bold ? ' esc-bold' : ''), it.label); lab.htmlFor = 'f_' + it.k; w.appendChild(lab);
        if (it.hint) w.appendChild(el('span', 'esc-hint', it.hint));
        w.appendChild(box(it.k, it.label + (it.hint ? ' ' + it.hint : ''), { rows: it.rows }));
      } else if (it.t === 'band') {
        w = el('h2', 'esc-band', it.label);
      } else if (it.t === 'h') {
        w = el('h3', 'esc-h', it.label);
      } else if (it.t === 'meals') {
        w = el('div', 'esc-meals esc-sub');
        it.items.forEach(function (m) {
          var c = el('label', 'esc-meal');
          c.appendChild(box(m[0], '# of servings: ' + m[1], { mode: 'numeric' }));
          c.appendChild(el('span', '', m[1]));
          w.appendChild(c);
        });
      } else if (it.t === 'people') {
        w = el('div', 'esc-people');
        var hd = el('div', 'esc-row esc-row-head');
        hd.appendChild(el('div', 'esc-cell-label', it.head));
        it.cols.forEach(function (c) { hd.appendChild(el('div', 'esc-colhead', c)); });
        w.appendChild(hd);
        it.rows.forEach(function (r) {
          var row = el('div', 'esc-row');
          row.appendChild(el('div', 'esc-cell-label esc-bold', r[1]));
          row.appendChild(box(it.k + '_' + r[0] + '_1', r[1] + ': ' + it.cols[0], { ph: it.cols[0] }));
          row.appendChild(box(it.k + '_' + r[0] + '_2', r[1] + ': ' + it.cols[1], { ph: it.cols[1], mode: 'tel' }));
          w.appendChild(row);
        });
      } else if (it.t === 'grid') {
        w = el('div', 'esc-grid');
        var top = el('div', 'esc-grow esc-grow-head');
        top.appendChild(el('div', 'esc-cell-label esc-bold', it.head));
        for (i = 1; i <= 3; i++) {
          var hc = el('div', 'esc-gcell');
          if (it.colcap) hc.appendChild(el('span', 'esc-cap', it.colcap));
          hc.appendChild(box(it.k + '_head_' + i, (it.colcap || 'Column') + ' ' + i + ' name'));
          top.appendChild(hc);
        }
        w.appendChild(top);
        it.rows.forEach(function (r) {
          var row = el('div', 'esc-grow');
          row.appendChild(el('div', 'esc-cell-label' + (r[2] === 'bold' ? ' esc-bold' : ''), r[1]));
          for (var n = 1; n <= 3; n++) {
            var cell = el('div', 'esc-gcell');
            if (r[2] === 'split') {
              cell.appendChild(el('span', 'esc-cap', '# People'));
              cell.appendChild(box(it.k + '_' + r[0] + '_people_' + n, r[1] + ': # People, column ' + n, { mode: 'numeric' }));
              cell.appendChild(el('span', 'esc-cap', '# Families'));
              cell.appendChild(box(it.k + '_' + r[0] + '_families_' + n, r[1] + ': # Families, column ' + n, { mode: 'numeric' }));
            } else {
              cell.appendChild(box(it.k + '_' + r[0] + '_' + n, r[1] + ', column ' + n, { mode: 'numeric' }));
            }
            row.appendChild(cell);
          }
          w.appendChild(row);
        });
      }
      root.appendChild(w);
    });
  }

  function fill(data, flash) {
    Object.keys(inputs).forEach(function (k) {
      var v = (data && data[k]) || '', i = inputs[k];
      if (i.value === v) return;
      i.value = v;
      if (flash) { i.classList.remove('esc-flash'); void i.offsetWidth; i.classList.add('esc-flash'); }
    });
  }
  function read() {
    var d = {};
    Object.keys(inputs).forEach(function (k) { var v = inputs[k].value.replace(/\s+$/, ''); if (v) d[k] = v; });
    return d;
  }
  function asText(d) {
    var out = ['DAT Response Lead Incident Reporting Worksheet'];
    Object.keys(inputs).forEach(function (k) { if (d[k]) out.push(inputs[k].getAttribute('aria-label') + ': ' + d[k]); });
    return out.join('\n');
  }

  // ---------------------------------------------------------------- which mode are we in?
  var view = param('view');
  if (view === 'list') return listMode();
  if (view) return viewMode(goodId(view));
  editMode();

  // ================================================================ FILL-IN MODE
  function editMode() {
    var id = goodId(param('id')) || goodId(lsGet('sepaEscCurrent')) || newId();
    lsSet('sepaEscCurrent', id);
    try { history.replaceState(null, '', pageLink('id=' + id)); } catch (e) {}
    $('esc-edit-tools').hidden = false; $('esc-bottom').hidden = false;
    draw();

    var live = 'unknown';          // 'unknown' | 'on' | 'off' (the Google script has not had its update) | 'offline'
    var dirty = false, sending = false, timer = null, lastSent = null;
    var saved = null;
    try { saved = JSON.parse(lsGet('sepaEsc:' + id) || 'null'); } catch (e) {}
    if (saved) fill(saved);
    // Ask Google at the start whether live sharing is switched on, and every 20 seconds after that
    // whether HQ has cleared this worksheet. (This page never reads a worksheet back from Google:
    // reading needs the HQ login. What you see comes from this device.)
    function cleared() {            // HQ ended the event: forget this worksheet and start a blank one
      lsSet('sepaEsc:' + id, '');
      var fresh = newId(); lsSet('sepaEscCurrent', fresh); lsSet('sepaEscNote', 'HQ cleared the last worksheet at the end of the event. This is a new blank one.');
      location.href = pageLink('id=' + fresh);
    }
    function ping(first) {
      call({ action: 'escPing', id: id }).then(function (r) {
        if (r && r.ok && r.cleared) return cleared();
        if (!first) { if (r && r.ok && live !== 'on') { live = 'on'; status(); if (dirty) queue(300); } return; }
        if (r && r.ok) { live = 'on'; if (Object.keys(read()).length) { dirty = true; queue(300); } }   // make sure Google has what this device has
        else if (r && r.offline) live = 'offline';
        else live = 'off';
        status();
      });
    }
    ping(true);
    setInterval(function () { if (!document.hidden && live !== 'off') ping(false); }, 20000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden && live !== 'off') ping(false); });
    var carried = lsGet('sepaEscNote');
    if (carried) { lsSet('sepaEscNote', ''); var cn = $('esc-cleared-note'); cn.textContent = carried; cn.hidden = false; }

    function status() {
      var s = $('esc-status'), t;
      s.className = 'esc-status';
      if (live === 'on') {
        t = lastSent ? 'Shared live. Last sent ' + clock(lastSent) + '.' : 'Live sharing is on. Everything you type is saved and shared by itself.';
        s.className += ' esc-ok';
      }
      else if (live === 'off') t = 'Saved on this device. Live sharing is not switched on yet (the Google script needs its update).';
      else if (live === 'offline') { t = 'Saved on this device. No connection: it will be sent when you are back online.'; s.className += ' esc-warn'; }
      else t = 'Saved on this device.';
      s.textContent = t;
    }
    function send() {
      if (sending || !dirty) return;
      sending = true; dirty = false;
      var d = read();
      call({ action: 'escSave', id: id, data: d }).then(function (r) {
        sending = false;
        if (r && r.ok && r.cleared) return cleared();
        if (r && r.ok) { live = 'on'; lastSent = new Date(); }
        else if (r && r.offline) { live = 'offline'; dirty = true; }
        else if (r && /unknown request/i.test(r.error || '')) live = 'off';
        else { live = 'offline'; dirty = true; }
        status();
        if (dirty && live !== 'off') queue(live === 'offline' ? 8000 : 1500);
      });
    }
    function queue(ms) { clearTimeout(timer); timer = setTimeout(send, ms); }
    root.addEventListener('input', function () {
      lsSet('sepaEsc:' + id, JSON.stringify(read()));
      dirty = true;
      if (live !== 'off') queue(1500);
    });
    window.addEventListener('online', function () { if (dirty) queue(300); });
    document.addEventListener('visibilitychange', function () { if (document.hidden && dirty && live !== 'off') { clearTimeout(timer); send(); } });
    status();

    // ---- sharing
    var viewUrl = pageLink('view=' + id);
    function note(msg) { var n = $('esc-share-note'); n.textContent = msg; n.hidden = !msg; }
    function showLink() { var b = $('esc-link-box'); b.hidden = false; $('esc-link').value = viewUrl; }
    function copy(text, done) {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { showLink(); note('Press and hold the link below to copy it.'); });
      else { showLink(); note('Press and hold the link below to copy it.'); }
    }
    function share() {
      var d = read(), where = d.incident_addresses ? ' for ' + d.incident_addresses.split('\n')[0] : '';
      if (live === 'off' || !URL) {      // no live view to link to: share the words instead
        var words = asText(d);
        if (navigator.share) navigator.share({ title: 'DAT escalation form', text: words }).catch(function () {});
        else copy(words, function () { note('The worksheet was copied as text. Paste it into a message or email.'); });
        return;
      }
      if (dirty) { clearTimeout(timer); send(); }
      var msg = { title: 'DAT escalation form (live)', text: 'Live view of the DAT escalation form' + where + '. It updates as it is filled in.', url: viewUrl };
      if (navigator.share) navigator.share(msg).catch(function () {});
      else copy(viewUrl, function () { showLink(); note('The live view link was copied. Paste it into a message or email.'); });
    }
    Array.prototype.forEach.call(document.querySelectorAll('[data-esc="share"]'), function (b) { b.addEventListener('click', share); });
    $('esc-copy').addEventListener('click', function () { copy(viewUrl, function () { showLink(); note('Link copied.'); }); });
    $('esc-open-view').href = viewUrl;

    // ---- start a new worksheet (asks first, on the page, no pop-up)
    $('esc-new').addEventListener('click', function () { $('esc-new-ask').hidden = false; $('esc-new').hidden = true; });
    $('esc-new-no').addEventListener('click', function () { $('esc-new-ask').hidden = true; $('esc-new').hidden = false; });
    $('esc-new-yes').addEventListener('click', function () {
      if (dirty && live !== 'off') { clearTimeout(timer); send(); }
      var fresh = newId(); lsSet('sepaEscCurrent', fresh);
      location.href = pageLink('id=' + fresh);
    });
  }

  // ================================================================ HQ LOGIN (live view and list)
  // The login is checked by the Google script. This page only remembers the pass it hands back.
  function token() { return lsGet('sepaEscHQ') || ''; }
  function needLogin(r, retry) {
    var box = $('esc-login'), err = $('esc-login-error'), form = $('esc-login-form');
    box.hidden = false; root.hidden = true; $('esc-logout').hidden = true;
    err.textContent = (r && r.locked) ? r.error : ''; err.hidden = !err.textContent;
    form.onsubmit = function (e) {
      e.preventDefault();
      var btn = $('esc-login-btn'); btn.disabled = true; err.hidden = true;
      call({ action: 'escLogin', user: $('esc-user').value, password: $('esc-pass').value }).then(function (a) {
        btn.disabled = false;
        if (a && a.ok && a.token) { lsSet('sepaEscHQ', a.token); $('esc-pass').value = ''; box.hidden = true; retry(); }
        else { err.textContent = (a && a.error) || 'Could not connect. Please try again.'; err.hidden = false; }
      });
    };
  }
  function loggedIn(showForm) {
    $('esc-login').hidden = true; if (showForm) root.hidden = false;
    var out = $('esc-logout'); out.hidden = false;
    out.onclick = function () { var t = token(); lsSet('sepaEscHQ', ''); call({ action: 'logout', token: t }).then(function () { location.reload(); }); };
  }

  // ================================================================ LIVE VIEW (read only)
  function viewMode(id) {
    readOnly = true;
    document.body.classList.add('esc-viewing');
    $('esc-view-tools').hidden = false;
    $('esc-title').textContent = 'Escalation Form: live view';
    draw(); root.hidden = true;      // nothing is shown until the HQ login has been checked
    var s = $('esc-view-status'), base = null, at = 0, first = true, lastText = '', waiting = false, done = false;
    function tick() {
      if (base == null) return;
      s.textContent = 'Live. Last change ' + ago(base + (Date.now() - at)) + '.';
    }
    function load() {
      if (!id) { s.textContent = 'This link is not a valid worksheet link.'; s.className = 'esc-status esc-warn'; return; }
      if (waiting || done) return;
      call({ action: 'escGet', id: id, token: token() }).then(function (r) {
        if (r && r.login) { waiting = true; base = null; s.className = 'esc-status'; s.textContent = 'Log in to see this worksheet.'; needLogin(r, function () { waiting = false; load(); }); return; }
        if (r && r.ok) loggedIn(true);
        if (r && r.ok && r.cleared) {
          done = true; base = null; fill({}); root.hidden = true; $('esc-clear-line').hidden = true;
          s.className = 'esc-status'; s.textContent = 'This worksheet was cleared at the end of the event. A copy is kept in the Google Sheet.';
          return;
        }
        if (r && r.ok && r.found) {
          $('esc-clear-line').hidden = false;
          var text = JSON.stringify(r.data);
          fill(r.data, !first && text !== lastText);
          first = false; lastText = text;
          base = Math.max(0, (r.now || 0) - (r.ms || 0)); at = Date.now();
          s.className = 'esc-status esc-ok'; tick();
        } else if (r && r.ok) {
          s.className = 'esc-status'; s.textContent = 'Waiting for the first entry. This page checks every few seconds.';
        } else if (r && /unknown request/i.test(r.error || '')) {
          s.className = 'esc-status esc-warn'; s.textContent = 'The live view is not switched on yet (the Google script needs its update).';
        } else {
          s.className = 'esc-status esc-warn'; s.textContent = 'Could not connect. Trying again in a few seconds.';
        }
      });
    }
    // ---- "Clear this worksheet" (end of the event). Asks first, on the page.
    $('esc-clear').addEventListener('click', function () { $('esc-clear-ask').hidden = false; $('esc-clear').hidden = true; });
    $('esc-clear-no').addEventListener('click', function () { $('esc-clear-ask').hidden = true; $('esc-clear').hidden = false; });
    $('esc-clear-yes').addEventListener('click', function () {
      $('esc-clear-yes').disabled = true;
      call({ action: 'escClear', id: id, token: token() }).then(function (r) {
        $('esc-clear-yes').disabled = false;
        if (r && r.login) { waiting = true; needLogin(r, function () { waiting = false; load(); }); return; }
        if (r && r.ok) { $('esc-clear-ask').hidden = true; $('esc-clear').hidden = false; load(); }
        else { $('esc-clear-error').textContent = 'Could not clear it. Please try again.'; $('esc-clear-error').hidden = false; }
      });
    });
    load();
    setInterval(function () { if (!document.hidden) load(); }, 6000);
    setInterval(tick, 1000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) load(); });
  }

  // ================================================================ LIST OF RECENT WORKSHEETS
  function listMode() {
    document.body.classList.add('esc-viewing');
    $('esc-title').textContent = 'Escalation Forms: recent';
    $('esc-list-tools').hidden = false;
    root.hidden = true; $('esc-foot').hidden = true;
    var box = $('esc-list'), s = $('esc-list-status'), waiting = false;
    function load() {
      if (waiting) return;
      call({ action: 'escList', token: token() }).then(function (r) {
        if (r && r.login) { waiting = true; box.innerHTML = ''; s.textContent = 'Log in to see the worksheets.'; needLogin(r, function () { waiting = false; load(); }); return; }
        if (r && r.ok) loggedIn(false);
        if (!(r && r.ok)) { s.textContent = /unknown request/i.test((r && r.error) || '') ? 'The live view is not switched on yet (the Google script needs its update).' : 'Could not connect. Trying again shortly.'; return; }
        s.textContent = r.items.length ? 'Newest first. This list refreshes by itself.' : 'No worksheets yet.';
        box.innerHTML = '';
        r.items.forEach(function (it) {
          var a = el('a', 'esc-item'); a.href = pageLink('view=' + it.id);
          a.appendChild(el('strong', '', it.address || '(no address typed yet)'));
          a.appendChild(el('span', '', (it.when ? 'Date/ Time: ' + it.when + '   ' : '') + 'Last change ' + ago((r.now || 0) - (it.ms || 0))));
          box.appendChild(a);
        });
      });
    }
    load(); setInterval(function () { if (!document.hidden) load(); }, 15000);
  }
})();
