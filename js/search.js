// SEPA Resource Library: the site search (v0.27)
//
// The same search runs in the box on the homepage, Browse Library and Mass Care. It looks in:
//   1. this website's own pages and the Quick launch links (PAGES, below),
//   2. the titles of every document in the Google Drive library (js/library.js),
//   3. the words INSIDE those documents (Google Drive searches them; takes a second or two),
//   4. GAP codes.
// Abbreviations count as the words they stand for, both ways ("DMH" finds "Disaster Mental Health"),
// and form numbers find their forms ("6409" finds F6409, F6409B and "Disaster Requisition").
// That word list is js/search-data.js.
var SEPASearch = (function () {
  var D = window.SEPA_SEARCH_DATA || { syn: {}, topics: {}, forms: {}, gap: [] };

  // This website's pages and the Quick launch links. "k" = extra words that should find it.
  // Paths are from the site's top folder. To add one, copy a line.
  var PAGES = [
    { t: 'Onboarding', u: 'pages/new.html', d: 'New volunteer? Start here.', k: 'new volunteer welcome getting started orientation first time induction join' },
    { t: 'Daily Shelter Report', u: 'pages/shelter.html', d: 'Running daily report and log for an open shelter: supervisors, status check, previous days.', k: 'shelter daily report log supervisor sv status check mass care midnight count mcpc' },
    { t: 'Incorporación (en español)', u: 'pages/new-es.html', d: '¿Voluntario nuevo? Empiece aquí. Onboarding in Spanish.', k: 'español espanol spanish nuevo voluntario bienvenida incorporación incorporacion guías guias' },
    { t: 'Sign up for DAT shifts', u: 'pages/shifts.html', d: 'Field Responder and Duty Officer calendars', k: 'shift shifts signup sign up schedule calendar on call availability duty officer field responder' },
    { t: 'Browse Library', u: 'pages/library.html', d: 'Every guide, form and training file', k: 'library documents files browse all guides forms' },
    { t: 'Mass Care', u: 'pages/masscare.html', d: 'Shelter, feeding and reception resources', k: 'mass care shelter sheltering feeding reception' },
    { t: 'Discussion Forums', u: 'pages/forums.html', d: 'Ask questions, share photos', k: 'forum forums discussion board post question photos' },
    { t: 'Contacts', u: 'pages/contacts.html', d: 'Find someone in the Red Cross', k: 'contacts contact phone email people who directory staff find someone' },
    { t: 'Escalation Form', u: 'pages/escalation.html', d: 'Incident worksheet for response leads', k: 'escalation escalate worksheet incident report response lead' },
    { t: 'Reception Center Form', u: 'pages/reception.html', d: 'One intake per family at a reception center', k: 'reception center intake families evacuation evacuees' },
    { t: 'RED Talks', u: 'pages/redtalks.html', d: 'Talks and recordings', k: 'red talks talk videos recordings' },
    { t: 'Volunteer Connection', u: 'https://volunteerconnection.redcross.org/', d: 'Red Cross login', k: 'vc volunteer connect connection calendar hours profile' },
    { t: 'RC Care', u: 'https://rccare.my.site.com/RCCare/login?ec=302&startURL=%2FRCCare%2Fs%2F', d: 'Red Cross login', k: 'rc care rccare casework case cases intake' },
    { t: 'Noggin', u: 'https://ops-rcview-redcross.nogginapp.io/signin', d: 'Red Cross login', k: 'noggin on call rcview dispatch' },
    { t: 'SCIA', u: 'https://www.redcross.org/scia', d: 'Red Cross login', k: 'scia shelter client information application' },
    { t: 'RC Reserve', u: 'https://auth.agilquest.com/eas-saml/saml/web/auth/americanredcross', d: 'Red Cross login', k: 'rc reserve reservation room rooms car vehicle book' },
    { t: 'Practice RC Care', u: 'https://rccare--training3.sandbox.my.site.com/RCCare/login?ec=302&startURL=%2FRCCare%2Fs%2F', d: 'Training copy, Red Cross login', k: 'practice training sandbox rc care' },
    { t: 'Practice SCIA', u: 'https://www.redcross.org/scia-training', d: 'Training copy, Red Cross login', k: 'practice training scia' },
    { t: 'Register for Classes and Events', u: 'https://volunteerconnection.redcross.org/?nd=gs_registration_v5_view&registration_type_id=12577&group_id=40083', d: 'Red Cross login', k: 'classes class events register training course courses edge' }
  ];

  var STOP = ' a an the to for of and or in on at with how does i me my is are was what where when why which who can could find get need about from by it this that you your we our be want looking look show please there any some ';

  function norm(s) { return String(s).toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9\/]+/g, ' ').replace(/\s+/g, ' ').trim(); }

  // phrase (normalized) -> list of everything that means the same
  var SAME = {};
  function link(list) {
    var all = {};
    list.forEach(function (x) { all[x] = 1; });
    list.forEach(function (x) {
      var k = norm(x); if (!k) return;
      var cur = SAME[k] || [];
      Object.keys(all).forEach(function (y) { if (cur.indexOf(y) < 0) cur.push(y); });
      SAME[k] = cur;
    });
  }
  Object.keys(D.syn).forEach(function (ab) { link([ab].concat(D.syn[ab])); });
  var TOPIC = {};
  Object.keys(D.topics).forEach(function (k) { TOPIC[norm(k)] = D.topics[k]; });
  var MAXLEN = 6;

  function formAlts(pre, num) {
    var f = D.forms[pre + num], alts = [];
    if (pre === 'F') alts = [num, 'F' + num, 'Form ' + num];
    else alts = [pre + '-' + num, pre + ' ' + num, pre + num];
    if (f) f.v.concat(f.n).forEach(function (x) { if (alts.indexOf(x) < 0) alts.push(x); });
    return alts;
  }

  // What someone typed -> a list of "concepts", each a list of words that mean the same thing.
  function parse(q) {
    var raw = String(q || '');
    var words = norm(raw).split(' ').filter(Boolean), out = [], i = 0;
    var upperDO = /\bDO\b/.test(raw);
    while (i < words.length) {
      var w = words[i], nx = words[i + 1] || '', m;
      // course numbers: IS-100, ICS 300
      if ((w === 'is' || w === 'ics') && /^\d{1,4}$/.test(nx)) { out.push({ alts: formAlts(w.toUpperCase(), nx), raw: w + ' ' + nx }); i += 2; continue; }
      if ((m = w.match(/^(is|ics)(\d{1,4})$/))) { out.push({ alts: formAlts(m[1].toUpperCase(), m[2]), raw: w }); i++; continue; }
      // form numbers: 6409, F6409, F6409B, Form 6409
      if (w === 'form' && /^\d{4,5}[a-z]?$/.test(nx)) { w = nx; i++; }
      if ((m = w.match(/^f?(\d{4,5})([a-z])?$/))) { out.push({ alts: formAlts('F', m[1]), raw: w }); i++; continue; }
      // "do" is Duty Officer unless it is plainly the ordinary word ("how do I")
      if (w === 'do' && !upperDO && (/^(how|what|where|why|when|who)$/.test(words[i - 1] || '') || /^(i|you|we|they|not)$/.test(nx) || words.length === 1)) { i++; continue; }
      // the longest run of words that is a known term
      var hit = null;
      for (var j = Math.min(words.length, i + MAXLEN); j > i; j--) {
        var ph = words.slice(i, j).join(' ');
        if (SAME[ph] || TOPIC[ph]) { hit = { ph: ph, end: j }; break; }
      }
      if (hit) {
        var alts = [hit.ph].concat(SAME[hit.ph] || []);
        (TOPIC[hit.ph] || []).forEach(function (t) { alts.push(t); (SAME[norm(t)] || []).forEach(function (x) { alts.push(x); }); });
        out.push({ alts: uniq(alts), raw: hit.ph, known: true });
        i = hit.end; continue;
      }
      if (STOP.indexOf(' ' + w + ' ') >= 0 && words.length > 1) { i++; continue; }
      out.push({ alts: [w], raw: w, prefix: true });
      i++;
    }
    return out;
  }
  function uniq(a) { var s = {}, o = []; a.forEach(function (x) { var k = norm(x); if (k && !s[k]) { s[k] = 1; o.push(x); } }); return o; }

  // Does this concept appear in the text? (text is normalized and padded with spaces)
  function has(text, c) {
    for (var i = 0; i < c.alts.length; i++) {
      var a = norm(c.alts[i]);
      if (a && text.indexOf(' ' + a + ' ') >= 0) return true;
    }
    // a plain word also matches longer words that start with it ("shelter" finds "Sheltering"),
    // and a plural matches the singular ("pets" finds "Pet")
    var r = c.raw;
    if (r.indexOf(' ') < 0 && (c.prefix ? r.length >= 2 : r.length >= 3)) {
      if (text.indexOf(' ' + r) >= 0) return true;
      if (r.length >= 4 && /s$/.test(r) && text.indexOf(' ' + r.slice(0, -1)) >= 0) return true;
    }
    return false;
  }

  function matchFiles(list, cs) {
    var out = [];
    list.files.forEach(function (f) {
      var t = ' ' + norm(f.title) + ' ', p = ' ' + norm(f.path.replace(/\//g, ' ')) + ' ', score = 0;
      for (var i = 0; i < cs.length; i++) {
        if (has(t, cs[i])) score += 2; else if (has(p, cs[i])) score += 1; else return;
      }
      if (t.indexOf(' ' + norm(cs[0].raw)) === 0) score += 1;
      out.push({ f: f, s: score });
    });
    // the same document often sits in two folders: show it once
    var seen = {};
    out.sort(function (a, b) { return b.s - a.s || SEPALib.byTitle(a.f, b.f); });
    return out.filter(function (x) { var k = norm(x.f.title); if (seen[k]) return false; seen[k] = 1; return true; }).map(function (x) { return x.f; });
  }

  function matchPages(cs) {
    return PAGES.filter(function (p) {
      var t = ' ' + norm(p.t + ' ' + p.k + ' ' + p.d) + ' ';
      return cs.every(function (c) { return has(t, c); });
    });
  }

  function matchGap(q, cs) {
    var code = String(q).toUpperCase().replace(/\s+/g, '').match(/^[A-Z]{2,4}\/[A-Z]{2,4}(\/[A-Z]{2,4})?$/);
    if (code) return D.gap.filter(function (g) { return g[0].indexOf(code[0]) === 0; }).slice(0, 8);
    var gapWord = false, rest = cs.filter(function (c) { if (c.raw === 'gap') { gapWord = true; return false; } return true; });
    if (!rest.length) return [];
    var hits = D.gap.filter(function (g) {
      var t = ' ' + norm(g[1] + ' ' + g[2] + ' ' + g[3]) + ' ';
      return rest.every(function (c) { return has(t, c); });
    });
    if (gapWord || (rest.length >= 2 && hits.length <= 8)) return hits.slice(0, 8);
    return [];
  }

  // ---------------------------------------------------------------- inside the documents (Google)
  var memo = {};
  function inside(cs, cb) {
    var groups = cs.map(function (c) {
      return uniq([c.raw].concat(c.alts)).filter(function (a) { return a.length <= 50 && a.replace(/[^A-Za-z0-9]/g, '').length >= 2; }).slice(0, 12);
    }).filter(function (g) { return g.length; }).slice(0, 6);
    if (!groups.length || typeof SEPA_BACKEND_URL !== 'string' || !SEPA_BACKEND_URL) { cb(null); return; }
    var key = JSON.stringify(groups);
    if (memo[key]) { cb(memo[key]); return; }
    fetch(SEPA_BACKEND_URL + '?find=' + encodeURIComponent(key))
      .then(function (r) { return r.json(); })
      .then(function (res) { if (res && res.ok) memo[key] = res; cb(res && res.ok ? res : null); })
      .catch(function () { cb(null); });
  }

  // ---------------------------------------------------------------- drawing the results
  var esc = SEPALib.esc;
  function where(f) { return f.path ? 'in ' + esc(f.path.split('/').join(' › ')) : ''; }
  function docList(files, max, cls) {
    var html = '<ul class="mc-list ' + (cls || '') + '">';
    files.forEach(function (f, i) { html += SEPALib.itemHtml(f, where(f)).replace('<li class="mc-item"', '<li class="mc-item"' + (i >= max ? ' hidden data-more' : '')); });
    html += '</ul>';
    if (files.length > max) html += '<button type="button" class="ss-more" data-more-btn>Show all ' + files.length + '</button>';
    return html;
  }

  // box: the search input. panel: an empty element for the results. hide: elements to hide while searching.
  // base: how to get from this page to the site's top folder ('' on the homepage, '../' inside pages/).
  function attach(box, panel, hide, base) {
    if (!box || !panel) return;
    base = base || '';
    var lib = null, timer = null, seq = 0, last = '';
    SEPALib.load(function (l) { lib = l; if (box.value.trim()) run(true); });

    function show(on) {
      panel.hidden = !on;
      (hide || []).forEach(function (el) {
        if (!el) return;
        if (on && !el.hasAttribute('data-ss-hid')) { el.setAttribute('data-ss-hid', el.hidden ? '1' : '0'); el.hidden = true; }
        if (!on && el.hasAttribute('data-ss-hid')) { el.hidden = el.getAttribute('data-ss-hid') === '1'; el.removeAttribute('data-ss-hid'); }
      });
    }

    function run(soft) {
      var q = box.value.trim();
      if (!q) { show(false); panel.innerHTML = ''; last = ''; return; }
      if (soft && q === last && panel.innerHTML) { draw(q, true); return; }
      last = q;
      draw(q, false);
    }

    function draw(q, keepInside) {
      var cs = parse(q), my = ++seq;
      show(true);
      if (!cs.length) { panel.innerHTML = '<p class="ss-none">Type a few more letters.</p>'; return; }
      var pages = matchPages(cs), gap = matchGap(q, cs), files = lib ? matchFiles(lib, cs) : [];
      var html = '';
      if (pages.length) {
        html += '<section class="ss-sec"><h3 class="ss-h">On this website</h3><ul class="ss-pages">' + pages.map(function (p) {
          var ext = /^https?:/.test(p.u), href = ext ? p.u : base + p.u;
          return '<li><a href="' + esc(href) + '" target="_blank" rel="noopener"><strong>' + esc(p.t) + '</strong><span>' + esc(p.d) + '</span></a></li>';
        }).join('') + '</ul></section>';
      }
      if (gap.length) {
        var gdoc = lib && lib.files.filter(function (f) { return /gap requirements/i.test(f.title); })[0];
        html += '<section class="ss-sec"><h3 class="ss-h">GAP codes</h3><ul class="ss-gap">' + gap.map(function (g) {
          return '<li><code>' + esc(g[0]) + '</code> ' + esc([g[1], g[2], g[3]].filter(Boolean).join(', ')) + '</li>';
        }).join('') + '</ul>' + (gdoc ? '<p class="ss-note">Details: <a href="' + esc(SEPALib.viewUrl(gdoc)) + '" target="_blank" rel="noopener">' + esc(gdoc.title) + '</a></p>' : '') + '</section>';
      }
      html += '<section class="ss-sec"><h3 class="ss-h">Documents' + (files.length ? ' <span class="mc-count">' + files.length + '</span>' : '') + '</h3>';
      if (!lib) html += '<p class="ss-note">' + (SEPALib.failed() ? 'The document list could not be loaded. Check your connection and try again.' : 'Loading the document list&hellip;') + '</p>';
      else if (files.length) html += docList(files, 8);
      else html += '<p class="ss-note">No document titles match. See below for documents that mention it.</p>';
      html += '</section>';
      html += '<section class="ss-sec" data-inside><h3 class="ss-h">Found inside documents</h3><p class="ss-note ss-wait">Searching inside the documents&hellip;</p></section>';
      panel.innerHTML = html;
      wire(panel);
      clearTimeout(timer);
      timer = setTimeout(function () {
        inside(cs, function (res) {
          if (my !== seq) return;
          var box2 = panel.querySelector('[data-inside]');
          if (!box2) return;
          if (!res) { box2.innerHTML = '<h3 class="ss-h">Found inside documents</h3><p class="ss-note">Searching inside documents is not available right now.</p>'; return; }
          if (!lib) return;
          var shown = {};
          files.forEach(function (f) { shown[norm(f.title)] = 1; });
          function pick(ids) {
            var seen = {};
            return ids.map(function (id) { return lib.byId[id]; }).filter(function (f) {
              if (!f) return false;
              var k = norm(f.title); if (seen[k] || shown[k]) return false; seen[k] = 1; return true;
            });
          }
          var all = pick(res.hits || []);
          all.forEach(function (f) { shown[norm(f.title)] = 1; });
          var some = pick(res.some || []);
          var h = '<h3 class="ss-h">Found inside documents' + (all.length ? ' <span class="mc-count">' + all.length + '</span>' : '') + '</h3>';
          if (all.length) h += docList(all, 8);
          else if (!some.length) h += '<p class="ss-note">' + (files.length ? 'No other documents mention it.' : 'No documents mention it. Try fewer or different words.') + '</p>';
          if (some.length) h += '<p class="ss-note">' + (all.length ? 'These mention some of your words:' : 'No document has all of your words. These have some of them:') + '</p>' + docList(some, 5);
          box2.innerHTML = h;
          wire(box2);
        });
      }, keepInside ? 0 : 450);
    }

    function wire(root) {
      Array.prototype.forEach.call(root.querySelectorAll('[data-more-btn]'), function (b) {
        b.addEventListener('click', function () {
          var ul = b.previousElementSibling;
          Array.prototype.forEach.call(ul.querySelectorAll('[data-more]'), function (li) { li.hidden = false; });
          b.remove();
        });
      });
    }

    box.addEventListener('input', function () { run(false); });
    box.addEventListener('keydown', function (e) { if (e.key === 'Escape') { box.value = ''; run(false); } });
    var m = location.search.match(/[?&]q=([^&]*)/);
    if (m && !box.value) { try { box.value = decodeURIComponent(m[1].replace(/\+/g, ' ')); } catch (e) {} }
    if (box.value.trim()) run(false);
  }

  return { attach: attach, parse: parse };
})();
