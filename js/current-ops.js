// SEPA Resource Library - "Current Operations" box (website v0.27.42)
// At the top of the Start screen of the Escalation Form, the Reception Center Form and the Daily Shelter
// Report (Sean: if you open the page, you are probably looking for the one happening right now).
//   - First list: the worksheets / reception centers / shelters THIS PHONE is on that are still open
//     (each is checked with the Google script; cleared or closed ones are left out).
//   - Second list, only on a phone logged in as HQ: every open one (not already in the first list).
//   - Nothing open: the box does not appear.
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
          sub: 'Started ' + clock(it.started) + ' · last change ' + ago((r.now || Date.now()) - (it.ms || 0)) };
      });
    });
  }
  function hqRec() {
    return post({ action: 'recList', token: token() }).then(function (r) {
      if (!(r && r.ok)) return [];
      return r.items.map(function (it) {
        return { id: it.id, href: 'reception.html?view=' + it.id, title: it.center || 'Reception center',
          sub: (it.lead ? 'Lead: ' + it.lead + ' · ' : '') + it.count + (it.count === 1 ? ' intake' : ' intakes') };
      });
    });
  }
  function hqSh() {
    return post({ action: 'shList', token: token() }).then(function (r) {
      if (!(r && r.ok)) return [];
      return r.items.map(function (it) {
        return { id: it.id, href: 'shelter.html?s=' + it.id + (goodKey(lsGet('sepaShKey:' + it.id)) ? '' : '&as=hq'), title: it.name,
          sub: (it.address ? it.address + ' · ' : '') + 'last activity ' + ago((r.now || Date.now()) - (it.ms || 0)) };
      });
    });
  }

  var WORDS = {
    esc: { mine: 'Worksheets this phone is on that are still open.', hq: 'All open worksheets (HQ)', load: [mineEsc, hqEsc] },
    rec: { mine: 'Reception centers this phone is on that are still open.', hq: 'All open reception centers (HQ)', load: [mineRec, hqRec] },
    sh: { mine: 'Shelters this phone has opened or been sent.', hq: 'All open shelters (HQ)', load: [mineSh, hqSh] }
  };
  function item(it, hq) {
    return '<a class="co-item' + (hq ? ' co-hq' : '') + '" href="' + esc(it.href) + '"><span class="co-text"><strong>' + esc(it.title) +
      '</strong><span>' + esc(it.sub) + '</span></span><b>Open</b></a>';
  }
  function show(form, before, orText) {
    var W = WORDS[form]; if (!W || !before || !before.parentNode) return;
    var box = document.createElement('section'); box.className = 'co-box'; box.hidden = true; box.setAttribute('aria-label', 'Current Operations');
    var or = document.createElement('p'); or.className = 'co-or'; or.textContent = orText || 'Or start a new one'; or.hidden = true;
    before.parentNode.insertBefore(box, before); before.parentNode.insertBefore(or, before);
    Promise.all([W.load[0](), token() ? W.load[1]() : Promise.resolve([])]).then(function (res) {
      var mine = (res[0] || []).filter(Boolean), seen = {};
      mine.forEach(function (m) { seen[m.id] = 1; });
      var hq = (res[1] || []).filter(function (h) { return !seen[h.id]; });
      if (!mine.length && !hq.length) return;
      box.innerHTML = '<h2 class="co-h">Current Operations</h2>' +
        (mine.length ? '<p class="co-how">' + esc(W.mine) + '</p>' + mine.map(function (m) { return item(m, false); }).join('') : '') +
        (hq.length ? '<p class="co-sub">' + esc(W.hq) + '</p>' + hq.map(function (h) { return item(h, true); }).join('') : '');
      box.hidden = false; or.hidden = false;
    });
  }
  return { show: show };
})();
