/* ADD PROPERTY for the Escalation worksheet, Section 3 (website v0.27.73, Sean Oct 24, 2026).
   Replaces the two "Initial Estimated #" grids. Responders log each property as they learn about it:
   Address, Unit, Damage Assessment, and if known Adults, Children, Pets, Notes (was Name of Primary until v0.27.80), Place to go?,
   Would consider a shelter? Nothing is required (information is spotty). "See Summary" opens a dashboard
   built from the entries (totals, units by damage, each entry with who logged it and when).
     - Anyone on the worksheet adds and edits. Only a lead (or added lead) or HQ sees Delete.
     - The same address + unit twice is allowed and marked "Possible duplicate" (so intake keeps going);
       when a lead or HQ deletes one, the mark goes away by itself.
     - A new entry shows at once ("Sending..."), is kept on the phone until the Google script has it, and
       sends by itself when the signal is back (one-time codes stop it saving twice). Edits need a connection.
   The page uses it like this:
     var pa = SEPAProps.mount({ host: element, id: worksheetId, auth: function (o) { add codes; return o; },
       who: function () { return my name; }, canAdd: true or false, open: true to start with the summary open });
     pa.rows() -> the entries (for Download for Excel). SEPAProps.csv(rows, q) -> CSV lines. SEPAProps.forget(id).
   The Google script side is the "ADD PROPERTY" section (paGet, paAdd, paEdit, paDelete). */
var SEPAProps = (function () {
  var URL = (typeof SEPA_BACKEND_URL === 'string') ? SEPA_BACKEND_URL : '';
  var DAMAGE = ['Destroyed', 'Major', 'Uninhabitable', 'Minor', 'Affected', 'No Visible Damage'];
  var HOT = { Destroyed: 1, Major: 1, Uninhabitable: 1 };
  var YNU = ['Yes', 'No', 'Unknown'];
  var FIELDS = ['address', 'unit', 'damage', 'adults', 'children', 'pets', 'primary', 'place', 'shelter'];
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function call(data) {
    if (!URL) return Promise.resolve({ ok: false, error: 'The form is not connected yet.' });
    return fetch(URL, { method: 'POST', body: JSON.stringify(data) })
      .then(function (r) { return r.json(); })
      .catch(function () { return { ok: false, offline: true, error: 'No connection. Please try again.' }; });
  }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) {} }
  function num(v) { var n = parseInt(String(v || '').replace(/[^0-9]/g, ''), 10); return isNaN(n) ? 0 : n; }
  function clock(t) {      // "2026-10-24 10:42:00" -> "10:42 AM"
    var m = /(\d{1,2}):(\d{2})/.exec(String(t || '').split(' ')[1] || '');
    if (!m) return '';
    var h = +m[1]; return ((h % 12) || 12) + ':' + m[2] + (h < 12 ? ' AM' : ' PM');
  }
  function stampNow() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }
  function newPid() {
    var abc = 'abcdefghijklmnopqrstuvwxyz0123456789', s = '';
    for (var i = 0; i < 4; i++) s += abc.charAt(Math.floor(Math.random() * 36));
    return 'P' + Date.now().toString(36) + s;
  }
  function norm(v) { return String(v || '').toLowerCase().replace(/[^a-z0-9]/g, ''); }
  function place(i) { return (i.address || 'No address yet') + (i.unit ? ', Unit ' + i.unit : ''); }
  function people(i) {
    var bits = [];
    if (i.adults !== '' && i.adults != null) bits.push(num(i.adults) + (num(i.adults) === 1 ? ' adult' : ' adults'));
    if (i.children !== '' && i.children != null) bits.push(num(i.children) + (num(i.children) === 1 ? ' child' : ' children'));
    if (i.pets !== '' && i.pets != null) bits.push(num(i.pets) + (num(i.pets) === 1 ? ' pet' : ' pets'));
    return bits.join(', ');
  }
  function qKey(id) { return 'sepaPaQ:' + id; }
  function forget(id) { lsSet(qKey(id), ''); }

  // CSV lines for Download for Excel (q quotes one value)
  function csv(rows, q) {
    var out = ['', q('Properties (Section 3: Add Property)'), ['Logged', 'Logged by', 'Address', 'Unit', 'Damage', 'Adults', 'Children', 'Pets', 'Notes', 'Place to go', 'Would consider shelter', 'Edited', 'Edited by', 'Possible duplicate'].map(q).join(',')];
    var d = dupes(rows);
    rows.forEach(function (i) {
      out.push([i.saved, i.by, i.address, i.unit, i.damage, i.adults, i.children, i.pets, i.primary, i.place, i.shelter, i.edited, i.edited_by, d[i.pid] ? 'Yes' : ''].map(q).join(','));
    });
    if (!rows.length) out.push(q('No properties logged.'));
    return out;
  }
  function dupes(items) {
    var groups = {}, out = {};
    items.forEach(function (i) { var k = norm(i.address); if (!k) return; k += '|' + norm(i.unit); (groups[k] = groups[k] || []).push(i.pid); });
    Object.keys(groups).forEach(function (k) { if (groups[k].length > 1) groups[k].forEach(function (p) { out[p] = 1; }); });
    return out;
  }

  function mount(o) {
    var id = o.id, S = { items: [], rev: '', canDelete: !!o.canDelete, open: !!o.open, showAll: false };
    var pend = []; try { pend = JSON.parse(lsGet(qKey(id)) || '[]') || []; } catch (e) { pend = []; }
    function keep() { lsSet(qKey(id), pend.length ? JSON.stringify(pend) : ''); }
    var host = o.host; host.innerHTML = ''; host.hidden = false;
    var btns = el('div', 'pa-btns' + (o.canAdd === false ? ' pa-btns-one' : ''));
    var add = el('button', 'pa-add', '+ Add Property'); add.type = 'button';
    var see = el('button', 'pa-see'); see.type = 'button';
    if (o.canAdd !== false) btns.appendChild(add);
    btns.appendChild(see);
    var dash = el('div', 'pa-dash'); dash.hidden = true;
    host.appendChild(btns); host.appendChild(dash);

    // ---- the pop-up (Add and Edit)
    var m = el('div', 'f-modal pa-modal'); m.hidden = true;
    m.innerHTML = '<div class="f-modal-box" role="dialog" aria-modal="true" aria-labelledby="pa-t-' + id + '">' +
      '<button type="button" class="f-modal-x" aria-label="Close">&times;</button><h2 id="pa-t-' + id + '">Add Property</h2>' +
      '<div class="pa-form"><p class="pa-note">Fill in what you know. Every field is optional; information may not be available yet.</p>' +
      '<p class="pa-meta" hidden></p>' +
      '<div class="rec-pair rec-pair-wide"><label><span class="esc-cap">Address</span><input class="esc-in" data-f="address" maxlength="200" autocomplete="off"></label>' +
      '<label><span class="esc-cap">Unit</span><input class="esc-in" data-f="unit" maxlength="40" autocomplete="off"></label></div>' +
      '<label class="pa-q"><span class="esc-label">Damage Assessment</span><select class="esc-in" data-f="damage"><option value="">Not assessed yet</option>' +
      DAMAGE.map(function (d) { return '<option>' + d + '</option>'; }).join('') + '</select></label>' +
      '<p class="pa-if">If known</p><div class="pa-row3">' +
      ['adults', 'children', 'pets'].map(function (k) { return '<label><span class="esc-cap">' + k.charAt(0).toUpperCase() + k.slice(1) + '</span><input class="esc-in" data-f="' + k + '" inputmode="numeric" maxlength="4" autocomplete="off"></label>'; }).join('') +
      '</div><label class="pa-q"><span class="esc-label">Notes</span><input class="esc-in" data-f="primary" maxlength="120" autocomplete="off" autocapitalize="sentences"></label>' +     // v0.27.80 (Sean): was "Name of Primary"; same field, so entries already saved show here
      '<div class="pa-q"><span class="esc-label" id="pa-lp-' + id + '">Place to go?</span><div class="rc-choice" role="radiogroup" aria-labelledby="pa-lp-' + id + '" data-f="place">' + YNU.map(function (v) { return '<button type="button" data-v="' + v + '">' + v + '</button>'; }).join('') + '</div></div>' +
      '<div class="pa-q"><span class="esc-label" id="pa-ls-' + id + '">Would consider a shelter?</span><div class="rc-choice" role="radiogroup" aria-labelledby="pa-ls-' + id + '" data-f="shelter">' + YNU.map(function (v) { return '<button type="button" data-v="' + v + '">' + v + '</button>'; }).join('') + '</div></div>' +
      '<p class="form-error pa-err" hidden></p>' +
      '<button type="button" class="primary-btn pa-submit">Submit</button></div>' +
      '<div class="pa-done" hidden><p class="pa-ok"></p><div class="pa-after"><button type="button" class="primary-btn pa-again">Add another property</button>' +
      '<button type="button" class="esc-btn pa-back">Return to the worksheet</button></div></div></div>';
    document.body.appendChild(m);
    var q = function (c) { return m.querySelector(c); }, editing = null;
    Array.prototype.forEach.call(m.querySelectorAll('.rc-choice button'), function (b) {
      b.addEventListener('click', function () {
        var on = b.classList.contains('on');
        Array.prototype.forEach.call(b.parentNode.children, function (x) { x.classList.remove('on'); x.setAttribute('aria-checked', 'false'); });
        if (!on) { b.classList.add('on'); b.setAttribute('aria-checked', 'true'); }     // tap again to unselect
      });
      b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', 'false');
    });
    function readForm() {
      var p = {};
      Array.prototype.forEach.call(m.querySelectorAll('[data-f]'), function (x) {
        var k = x.getAttribute('data-f');
        if (x.classList.contains('rc-choice')) { var on = x.querySelector('.on'); p[k] = on ? on.getAttribute('data-v') : ''; }
        else p[k] = String(x.value || '').trim();
      });
      ['adults', 'children', 'pets'].forEach(function (k) { p[k] = p[k].replace(/[^0-9]/g, '').slice(0, 4); });
      return p;
    }
    function setForm(p) {
      p = p || {};
      Array.prototype.forEach.call(m.querySelectorAll('[data-f]'), function (x) {
        var k = x.getAttribute('data-f'), v = p[k] || '';
        if (x.classList.contains('rc-choice')) Array.prototype.forEach.call(x.children, function (b) { var on = b.getAttribute('data-v') === v; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); });
        else x.value = v;
      });
    }
    function err(t) { q('.pa-err').textContent = t || ''; q('.pa-err').hidden = !t; }
    function openForm(item) {
      editing = item || null; err('');
      q('h2').textContent = item ? 'Edit property' : 'Add Property';
      q('.pa-form').hidden = false; q('.pa-done').hidden = true;
      q('.pa-meta').hidden = !item; q('.pa-meta').textContent = item ? 'Logged by ' + (item.by || 'a responder') + ' ' + clock(item.saved) + (item.edited ? ' · last edited by ' + (item.edited_by || '') + ' ' + clock(item.edited) : '') : '';
      q('.pa-submit').textContent = item ? 'Save changes' : 'Submit';
      setForm(item); m.hidden = false;
      setTimeout(function () { var a = q('[data-f=address]'); if (a && !item) a.focus(); }, 50);
    }
    function close() { m.hidden = true; editing = null; }
    q('.f-modal-x').onclick = close; q('.pa-back').onclick = close;
    m.addEventListener('click', function (e) { if (e.target === m) close(); });
    q('.pa-again').onclick = function () { openForm(null); };
    add.addEventListener('click', function () { openForm(null); });
    q('.pa-submit').onclick = function () {
      var p = readForm(), b = this;
      if (!FIELDS.some(function (k) { return p[k]; })) return err('Nothing filled in yet.');
      if (editing) {
        b.disabled = true; err('');
        var pid = editing.pid;
        call(o.auth({ action: 'paEdit', id: id, pid: pid, p: p, who: o.who ? o.who() : '' })).then(function (r) {
          b.disabled = false;
          if (!(r && r.ok)) return err(r && r.offline ? 'No connection. Your change was not saved. Please try again.' : (r && r.error) || 'Could not save. Please try again.');
          close(); load(true);
        });
        return;
      }
      var x = { pid: newPid(), p: p, at: stampNow(), by: (o.who && o.who()) || 'You', st: 'new' };
      pend.push(x); keep(); render(); sendNext();
      q('.pa-ok').innerHTML = '';
      q('.pa-ok').appendChild(document.createTextNode('✓ Saved: ' + place(p) + (p.damage ? ' (' + p.damage + ')' : '')));
      q('.pa-ok').appendChild(el('span', '', 'Logged by ' + x.by + ' at ' + clock(x.at) + '. It sends by itself, even with a weak signal.'));
      q('.pa-form').hidden = true; q('.pa-done').hidden = false;
    };

    // ---- sending new entries (kept on the phone until the Google script has them)
    var sending = false, retry = null;
    function sendNext() {
      if (sending) return;
      var x = pend.filter(function (y) { return y.st !== 'saved'; })[0];
      if (!x) return;
      sending = true; x.st = 'sending';
      call(o.auth({ action: 'paAdd', id: id, pid: x.pid, p: x.p, who: x.by === 'You' ? '' : x.by })).then(function (r) {
        sending = false;
        if (r && r.cleared) { pend = []; keep(); render(); return; }
        if (r && r.ok) { x.st = 'saved'; keep(); load(true); sendNext(); return; }
        x.st = 'wait'; x.err = r && !r.offline ? (r.error || '') : ''; keep(); render();
        clearTimeout(retry); retry = setTimeout(sendNext, 10000);
      });
    }
    window.addEventListener('online', function () { clearTimeout(retry); sendNext(); });

    // ---- the summary
    function all() {
      var have = {}; S.items.forEach(function (i) { have[i.pid] = 1; });
      pend = pend.filter(function (x) { return !(x.st === 'saved' && have[x.pid]); });
      var mine = pend.filter(function (x) { return !have[x.pid]; }).map(function (x) {
        var i = { pid: x.pid, saved: x.at, by: x.by, pending: x.st === 'wait' ? (x.err ? 'Not saved yet: ' + x.err + ' Trying again...' : 'Not sent yet (no signal). It will send by itself.') : 'Sending...' };
        FIELDS.forEach(function (k) { i[k] = x.p[k] || ''; }); return i;
      });
      return S.items.concat(mine);
    }
    function tile(n, label, hot) { var d = el('div', 'rec-tile' + (hot && n ? ' rec-hot' : '')); d.appendChild(el('strong', '', String(n))); d.appendChild(el('span', '', label)); return d; }
    function render() {
      var items = all(), d = dupes(items), nd = 0, t = { adults: 0, children: 0, pets: 0, noplace: 0, shelter: 0, maybe: 0 }, by = {};
      DAMAGE.concat(['']).forEach(function (k) { by[k] = 0; });
      items.forEach(function (i) {
        t.adults += num(i.adults); t.children += num(i.children); t.pets += num(i.pets);
        if (i.place === 'No') t.noplace++;
        if (i.shelter === 'Yes') t.shelter++; else if (i.shelter === 'Unknown') t.maybe++;
        by[DAMAGE.indexOf(i.damage) >= 0 ? i.damage : '']++;
        if (d[i.pid]) nd++;
      });
      var groups = {}; items.forEach(function (i) { if (d[i.pid]) groups[norm(i.address) + '|' + norm(i.unit)] = 1; });
      var extra = nd - Object.keys(groups).length;
      see.innerHTML = '';
      see.appendChild(document.createTextNode(S.open ? 'Hide Summary' : 'See Summary'));
      see.appendChild(el('small', '', items.length + (items.length === 1 ? ' property' : ' properties')));
      see.classList.toggle('on', S.open);
      see.setAttribute('aria-expanded', String(S.open));
      dash.hidden = !S.open;
      if (!S.open) return;
      dash.innerHTML = '';
      if (!items.length) { dash.appendChild(el('p', 'pa-empty', 'No properties logged yet.' + (o.canAdd === false ? '' : ' Tap "+ Add Property" to log the first one.'))); return; }
      var tiles = el('div', 'rec-totals');
      tiles.appendChild(tile(items.length, items.length === 1 ? 'property logged' : 'properties logged'));
      tiles.appendChild(tile(t.adults + t.children, 'people (' + t.adults + ' adults, ' + t.children + ' children)'));
      tiles.appendChild(tile(t.noplace, 'no place to go', true));
      tiles.appendChild(tile(t.shelter, 'would consider a shelter' + (t.maybe ? ' (+' + t.maybe + ' unknown)' : ''), true));
      tiles.appendChild(tile(t.pets, t.pets === 1 ? 'pet' : 'pets'));
      tiles.appendChild(tile(extra, extra === 1 ? 'possible duplicate' : 'possible duplicates', true));
      dash.appendChild(tiles);
      var bars = el('div', 'pa-dmg'), max = Math.max.apply(null, DAMAGE.concat(['']).map(function (k) { return by[k]; }).concat([1]));
      bars.appendChild(el('h4', '', 'Units by damage'));
      DAMAGE.concat(['']).forEach(function (k) {
        if (k === '' && !by[k]) return;
        var r = el('div', 'pa-bar' + (HOT[k] ? ' hot' : k === '' ? ' none' : ''));
        r.appendChild(el('span', '', k || 'Not assessed yet'));
        var bar = el('i'); bar.style.width = (by[k] ? Math.max(4, Math.round(by[k] / max * 100)) : 0) + '%'; r.appendChild(bar);
        r.appendChild(el('b', '', String(by[k]))); bars.appendChild(r);
      });
      dash.appendChild(bars);
      var list = el('div', 'pa-list'), sorted = items.slice().sort(function (a, b) { return a.saved < b.saved ? 1 : a.saved > b.saved ? -1 : 0; });
      var shown = S.showAll ? sorted : sorted.slice(0, 10);
      shown.forEach(function (i) {
        var c = el('div', 'pa-item' + (d[i.pid] ? ' dupe' : '') + (i.pending ? ' pa-pending' : ''));
        var h = el('h5'); h.appendChild(el('span', '', place(i)));
        h.appendChild(el('span', 'pa-tag' + (HOT[i.damage] ? ' hot' : ''), i.damage || 'Not assessed'));
        c.appendChild(h);
        if (d[i.pid]) c.appendChild(el('span', 'pa-dupe', 'Possible duplicate'));
        if (people(i)) c.appendChild(el('p', '', people(i)));
        if (i.primary) c.appendChild(el('p', '', 'Notes: ' + i.primary));     // v0.27.80: was the name of the primary
        if (i.place || i.shelter) c.appendChild(el('p', '', 'Place to go: ' + (i.place || 'not asked') + ' · Shelter: ' + (i.shelter || 'not asked')));
        c.appendChild(el('small', '', 'Logged by ' + (i.by || 'a responder') + ' ' + clock(i.saved) + (i.edited ? ' · Edited by ' + (i.edited_by || '') + ' ' + clock(i.edited) : '')));
        if (i.pending) c.appendChild(el('small', 'ev-state' + (/^Not/.test(i.pending) ? ' ev-wait' : ''), i.pending));
        else {
          var acts = el('div', 'pa-acts'), eb = el('button', 'esc-btn', 'Edit'); eb.type = 'button';
          eb.setAttribute('aria-label', 'Edit ' + place(i)); eb.addEventListener('click', function () { openForm(i); }); acts.appendChild(eb);
          if (S.canDelete) {
            var db = el('button', 'esc-btn', 'Delete'); db.type = 'button'; db.setAttribute('aria-label', 'Delete ' + place(i));
            var ask = el('p', 'pa-ask'); ask.hidden = true;
            ask.appendChild(document.createTextNode('Delete this entry for good? '));
            var yes = el('button', 'esc-btn esc-danger', 'Yes, delete'), no = el('button', 'link-btn', 'Cancel'); yes.type = no.type = 'button';
            ask.appendChild(yes); ask.appendChild(document.createTextNode(' ')); ask.appendChild(no);
            db.addEventListener('click', function () { ask.hidden = false; acts.hidden = true; busy = true; });
            no.addEventListener('click', function () { ask.hidden = true; acts.hidden = false; busy = false; });
            yes.addEventListener('click', function () {
              yes.disabled = true;
              call(o.auth({ action: 'paDelete', id: id, pid: i.pid })).then(function (r) {
                busy = false;
                if (!(r && r.ok)) { yes.disabled = false; ask.firstChild.textContent = (r && r.offline ? 'No connection. ' : (r && r.error ? r.error + ' ' : '')) + 'Delete this entry for good? '; busy = true; return; }
                load(true);
              });
            });
            acts.appendChild(db); c.appendChild(acts); c.appendChild(ask);
          } else c.appendChild(acts);
        }
        list.appendChild(c);
      });
      if (sorted.length > 10) {
        var more = el('button', 'esc-btn pa-more', S.showAll ? 'Show the 10 newest only' : 'Show all ' + sorted.length + ' properties'); more.type = 'button';
        more.addEventListener('click', function () { S.showAll = !S.showAll; render(); });
        list.appendChild(more);
      }
      dash.appendChild(list);
    }
    see.addEventListener('click', function () { S.open = !S.open; render(); });

    var busy = false, timer = null;
    function load(now) {
      clearTimeout(timer);
      if (!document.hidden || now) call(o.auth({ action: 'paGet', id: id, since: now ? '' : S.rev })).then(function (r) {
        if (r && r.cleared) { pend = []; keep(); }
        if (r && r.ok && !r.same && r.items) { S.items = r.items; S.rev = r.rev || ''; }
        if (r && r.ok && typeof r.canDelete === 'boolean') S.canDelete = r.canDelete || !!o.canDelete;
        if (!busy) render();
      });
      timer = setTimeout(load, 20000);
    }
    render(); load(true); sendNext();
    return { rows: function () { return all().filter(function (i) { return !i.pending; }); }, refresh: function () { load(true); } };
  }
  return { mount: mount, csv: csv, forget: forget };
})();
