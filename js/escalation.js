// SEPA Resource Library - Escalation Form (pages/escalation.html)
// The DAT Response Lead Incident Reporting Worksheet as a page that works on a phone or a laptop.
//
// PROOF OF CONCEPT (v0.17; shared worksheets since v0.18). What it does:
//   - Fill-in mode (the normal page): everything typed is saved on the device straight away and,
//     a moment later, sent to the Google Sheet (tab "Escalations"). Nothing has to be pressed.
//   - Shared worksheets: "Add a responder" sends a join link, and everyone who opens it types into
//     the same worksheet. See the notes above editMode() further down.
//   - Live view (same page with ?view=CODE on the end): a read-only copy that re-reads the Google
//     Sheet every few seconds, so someone else can watch the worksheet fill in.
//   - ?view=list shows the most recent worksheets.
// Filling in needs no login. READING as HQ (the live view and the list) needs the HQ user name and
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
  // The secret "edit key" of a shared worksheet (see editMode). Longer than the worksheet code.
  function goodKey(v) { return /^[A-Za-z0-9]{16,40}$/.test(v || '') ? v : ''; }
  function newKey() { return newId() + newId(); }
  // A value from the part of the address after the # (that part is never sent to a web server).
  function hashParam(name) {
    var m = new RegExp('[#&]' + name + '=([^&]*)').exec(location.hash || '');
    return m ? decodeURIComponent(m[1]) : '';
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
  // Since v0.18 a worksheet can be SHARED: several phones type into the same one.
  //   - Every worksheet has a code (in the address bar, ?id=CODE) and a second, secret code, its
  //     "edit key". The key is made on the phone that starts the worksheet and kept on that phone.
  //   - "Add a responder" sends a join link: the page address with #k=KEY on the end. A phone that
  //     opens the join link keeps the key too, and from then on types into the same worksheet.
  //   - The address bar never keeps the key, and the live view link never contains it. So a link
  //     copied from the address bar, or a forwarded live view link, lets nobody in.
  //   - Every few seconds this page sends Google the boxes that changed here and gets back the boxes
  //     that changed on the other phones (one call: escSync). Boxes are sent one at a time, so two
  //     people in different boxes never overwrite each other. In the same box the later entry wins.
  //   - What is typed is always kept on this device first. With no connection it waits here and goes
  //     out by itself when the connection is back.
  //   - THE LEAD. The phone that STARTS a worksheet is its lead, and only that phone shows "Add a
  //     responder". Phones that joined see a line saying whose worksheet they are on instead. Sean
  //     asked for this for chain of command clarity, not security: it is decided on the phone, and
  //     someone who was sent the join link could still forward the text message itself.
  function editMode() {
    var urlId = goodId(param('id')), urlKey = goodKey(hashParam('k'));
    var mine = goodId(lsGet('sepaEscCurrent'));
    var joined = false, wrongLink = false;

    // A join link, on a phone that already has a worksheet of its own with entries in it: ask first.
    if (urlId && urlKey && mine && mine !== urlId && hasEntries(mine)) return askJoin(urlId, urlKey, mine);

    var id;
    if (urlId && (urlKey || goodKey(lsGet('sepaEscKey:' + urlId)))) { id = urlId; joined = !!urlKey && mine !== urlId; }
    else if (urlId && urlId !== mine) { id = mine || newId(); wrongLink = true; }   // someone else's link without its key
    else id = mine || newId();
    var hadKey = goodKey(lsGet('sepaEscKey:' + id));
    var key = (id === urlId && urlKey) || hadKey || newKey();
    // No key on this phone and no join link: this phone is starting the worksheet (or carried one over
    // from before v0.18), so it is the lead.
    if (!hadKey && !(id === urlId && urlKey)) lsSet('sepaEscLead:' + id, '1');
    var lead = lsGet('sepaEscLead:' + id) === '1';
    lsSet('sepaEscKey:' + id, key);
    lsSet('sepaEscCurrent', id);
    try { history.replaceState(null, '', pageLink('id=' + id)); } catch (e) {}    // also takes the key out of the address bar
    $('esc-edit-tools').hidden = false; $('esc-bottom').hidden = false;
    draw();

    var saved = null, meta = null;
    try { saved = JSON.parse(lsGet('sepaEsc:' + id) || 'null'); } catch (e) {}
    if (saved) fill(saved);
    // meta.base = each box as Google last had it; meta.rev = how far this phone has caught up.
    try { meta = JSON.parse(lsGet('sepaEscSync:' + id) || 'null'); } catch (e) {}
    if (!meta || typeof meta.base !== 'object' || !meta.base) meta = { rev: 0, base: {} };

    // 'unknown' | 'on' | 'off' (the Google script has not had its update) | 'offline' | 'nokey' (this phone is not allowed into this worksheet)
    var live = 'unknown', problem = '';
    var busy = false, again = false, claim = false, timer = null, lastSent = null, lastActive = Date.now(), ticks = 0;

    function cur(k) { return inputs[k].value.replace(/\s+$/, ''); }
    function changedHere() { return Object.keys(inputs).filter(function (k) { return cur(k) !== (meta.base[k] || ''); }); }
    function store() { lsSet('sepaEsc:' + id, JSON.stringify(read())); lsSet('sepaEscSync:' + id, JSON.stringify(meta)); }
    function setBox(k, v) { var i = inputs[k]; i.value = v; i.classList.remove('esc-flash'); void i.offsetWidth; i.classList.add('esc-flash'); }
    function cleared() {            // HQ ended the event: forget this worksheet and start a blank one
      lsSet('sepaEsc:' + id, ''); lsSet('sepaEscSync:' + id, ''); lsSet('sepaEscKey:' + id, ''); lsSet('sepaEscLead:' + id, '');
      var fresh = newId(); lsSet('sepaEscCurrent', fresh);
      lsSet('sepaEscNote', 'HQ cleared the last worksheet at the end of the event. This is a new blank one.'); lsSet('sepaEscNoteOk', '');
      location.href = pageLink('id=' + fresh);
    }

    function sync() {
      if (busy) { again = true; return; }
      if (live === 'off' || live === 'nokey') return;
      busy = true; again = false; clearTimeout(timer);
      var names = changedHere(), sent = {}, claiming = claim;
      names.forEach(function (k) { sent[k] = cur(k); });
      var req = { action: 'escSync', id: id, key: key, since: meta.rev, changes: sent };
      if (claiming) req.claim = true;
      call(req).then(function (r) {
        busy = false;
        if (r && r.ok && r.cleared) return cleared();
        if (r && r.ok) {
          live = 'on'; problem = '';
          if (claiming) claim = false;
          if ((r.rev || 0) < meta.rev) {
            meta = { rev: 0, base: {} }; again = true;      // Google holds less than this phone thought (a row was removed by hand): send everything again
          } else {
            names.forEach(function (k) { meta.base[k] = sent[k]; });
            var got = r.changed || {}, n = 0;
            Object.keys(got).forEach(function (k) {
              if (!inputs[k] || Object.prototype.hasOwnProperty.call(sent, k)) return;
              var v = String(got[k] == null ? '' : got[k]);
              var typing = cur(k) !== (meta.base[k] || '');   // changed here while this was on its way: keep what is here, it goes out next
              meta.base[k] = v;
              if (!typing && cur(k) !== v) { setBox(k, v); n++; }
            });
            meta.rev = r.rev || 0;
            if (names.length) lastSent = new Date();
            if (names.length || n) lastActive = Date.now();
          }
          store();
        }
        else if (r && r.nokey) live = 'nokey';
        else if (r && r.toolong) { live = 'on'; problem = r.error || 'This worksheet is too long to save.'; }
        else if (r && !r.offline && /unknown request/i.test(r.error || '')) live = 'off';
        else live = 'offline';
        status();
        if (again) queue(200);
        else if (live === 'on' && !problem && changedHere().length) queue(1200);
      });
    }
    function queue(ms) { clearTimeout(timer); timer = setTimeout(sync, ms); }

    function status() {
      var s = $('esc-status'), t;
      s.className = 'esc-status';
      if (problem) { t = 'Saved on this device. ' + problem; s.className += ' esc-warn'; }
      else if (live === 'on') {
        t = lastSent ? 'Shared live. Last sent ' + clock(lastSent) + '.' : 'Live sharing is on. Everything you type is saved and shared by itself.';
        s.className += ' esc-ok';
      }
      else if (live === 'off') t = 'Saved on this device. Live sharing is not switched on yet (the Google script needs its update).';
      else if (live === 'offline') { t = 'Saved on this device. No connection: it will be sent when you are back online.'; s.className += ' esc-warn'; }
      else if (live === 'nokey') { t = 'Saved on this device, but NOT shared: this phone was not added to that worksheet. Ask the person who started it to tap "Add a responder" and send you the link.'; s.className += ' esc-warn'; }
      else t = 'Saved on this device.';
      s.textContent = t;
      whose();
    }
    // Only the lead's phone (the one that started the worksheet) can add responders. A phone that
    // joined is told whose worksheet it is on, using the name in the "ARC DAT Event Lead" box.
    function whose() {
      var name = cur('leaders_arc_lead_1').split('\n')[0];
      $('esc-joined-how').textContent = 'You joined this worksheet' + (name ? '. Lead: ' + name : '') + '. Only the lead, who started it, can add responders.';
    }
    Array.prototype.forEach.call(document.querySelectorAll('[data-esc="add"]'), function (b) { b.hidden = !lead; });
    $('esc-add-how').hidden = !lead; $('esc-joined-how').hidden = lead;

    root.addEventListener('input', function () {
      lsSet('sepaEsc:' + id, JSON.stringify(read()));
      if (!lead) whose();
      lastActive = Date.now();
      if (live !== 'off' && live !== 'nokey') queue(1200);
    });
    window.addEventListener('online', function () { sync(); });
    document.addEventListener('visibilitychange', function () { if (!document.hidden || changedHere().length) sync(); });
    // Check in every 5 seconds while the worksheet is busy, every 15 seconds once it has been quiet for 2 minutes.
    setInterval(function () {
      ticks++;
      if (document.hidden) return;
      if (Date.now() - lastActive < 120000 || ticks % 3 === 0) sync();
    }, 5000);

    var carried = lsGet('sepaEscNote'), cn = $('esc-cleared-note');
    if (wrongLink) { carried = 'That link cannot be used to join a worksheet. Ask the person who started it to tap "Add a responder" and send you the link. This is a separate worksheet of your own.'; }
    else if (joined) { carried = 'You have joined a shared worksheet. What you type goes into the same worksheet as the rest of your team, and their entries appear here.'; lsSet('sepaEscNoteOk', '1'); }
    if (carried) {
      cn.textContent = carried; cn.hidden = false;
      cn.className = 'esc-status esc-cleared-note ' + ((lsGet('sepaEscNoteOk') === '1' && !wrongLink) ? 'esc-ok' : 'esc-warn');
      lsSet('sepaEscNote', ''); lsSet('sepaEscNoteOk', '');
    }
    status();
    sync();

    // ---- sharing: the live view (for HQ) and the join link (for teammates on scene)
    var viewUrl = pageLink('view=' + id);
    function joinUrl() { return pageLink('id=' + id) + '#k=' + key; }
    function note(msg) { var n = $('esc-share-note'); n.textContent = msg; n.hidden = !msg; }
    function showLink(url, label) { var b = $('esc-link-box'); b.hidden = false; $('esc-link-label').textContent = label || 'Live view link'; $('esc-link').value = url || viewUrl; }
    function copy(text, done, url, label) {
      var hold = function () { showLink(url, label); note('Press and hold the link below to copy it.'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, hold);
      else hold();
    }
    function where() { var a = cur('incident_addresses'); return a ? ' for ' + a.split('\n')[0] : ''; }
    function share() {
      if (live === 'off' || !URL) {      // no live view to link to: share the words instead
        var words = asText(read());
        if (navigator.share) navigator.share({ title: 'DAT escalation form', text: words }).catch(function () {});
        else copy(words, function () { note('The worksheet was copied as text. Paste it into a message or email.'); });
        return;
      }
      claim = true; sync();              // make sure Google knows this worksheet before the link goes out
      var msg = { title: 'DAT escalation form (live)', text: 'Live view of the DAT escalation form' + where() + '. It updates as it is filled in.', url: viewUrl };
      if (navigator.share) navigator.share(msg).catch(function () {});
      else copy(viewUrl, function () { showLink(); note('The live view link was copied. Paste it into a message or email.'); });
    }
    function add() {
      if (live === 'off' || !URL) { note('A responder cannot be added yet: live sharing is not switched on.'); return; }
      if (!lead || live === 'nokey') { note('Only the lead, who started this worksheet, can add a responder.'); return; }
      claim = true; sync();
      var link = joinUrl();
      var msg = { title: 'Join the DAT escalation form', text: 'Join the DAT escalation form' + where() + '. Open this link to type into the same worksheet.', url: link };
      if (navigator.share) navigator.share(msg).catch(function () {});
      else copy(link, function () { showLink(link, 'Join link for a responder'); note('The join link was copied. Paste it into a text or email to your teammate.'); }, link, 'Join link for a responder');
    }
    Array.prototype.forEach.call(document.querySelectorAll('[data-esc="share"]'), function (b) { b.addEventListener('click', share); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-esc="add"]'), function (b) { b.addEventListener('click', add); });
    $('esc-copy').addEventListener('click', function () { claim = true; sync(); copy(viewUrl, function () { showLink(); note('Link copied.'); }); });
    $('esc-open-view').href = viewUrl;

    // ---- start a new worksheet (asks first, on the page, no pop-up)
    $('esc-new').addEventListener('click', function () { $('esc-new-ask').hidden = false; $('esc-new').hidden = true; });
    $('esc-new-no').addEventListener('click', function () { $('esc-new-ask').hidden = true; $('esc-new').hidden = false; });
    $('esc-new-yes').addEventListener('click', function () {
      var go = function () { var fresh = newId(); lsSet('sepaEscCurrent', fresh); location.href = pageLink('id=' + fresh); };
      if (!changedHere().length || live !== 'on') return go();
      sync(); setTimeout(go, 1500);      // give the last entries a moment to go out first (they are kept on this device either way)
    });
  }

  // A join link was opened on a phone that already has its own worksheet with entries: ask which to use.
  function hasEntries(id) {
    try { return Object.keys(JSON.parse(lsGet('sepaEsc:' + id) || '{}') || {}).length > 0; } catch (e) { return false; }
  }
  function askJoin(urlId, urlKey, mine) {
    root.hidden = true;
    $('esc-join-ask').hidden = false;
    $('esc-join-yes').addEventListener('click', function () {
      lsSet('sepaEscKey:' + urlId, urlKey); lsSet('sepaEscCurrent', urlId);
      lsSet('sepaEscNote', 'You have joined a shared worksheet. What you type goes into the same worksheet as the rest of your team, and their entries appear here.'); lsSet('sepaEscNoteOk', '1');
      location.replace(pageLink('id=' + urlId));
    });
    $('esc-join-no').addEventListener('click', function () { location.replace(pageLink('id=' + mine)); });
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
