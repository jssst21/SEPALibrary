// SEPA Resource Library: the documents (v0.27)
//
// The documents are NOT on this website any more. They live in Google Drive, in the folder
// "SEPA Library Files" (sepalibrary Google account). The Google script reads that folder and this file
// asks it for the list, then draws Browse Library, the Mass Care list and the Onboarding cards from it.
//   To add, remove or rename a document: do it in Drive. Nothing here needs changing.
//   Each folder in "SEPA Library Files" is a group on Browse Library; folders inside it are subheadings.
//   The title people see is the file name without .pdf, .docx and so on.
// The list is remembered in the browser for 10 minutes so pages open quickly.
var SEPALib = (function () {
  var KEY = 'sepaLibList1', FRESH_MS = 10 * 60 * 1000;
  var waiting = [], data = null, fetching = false, failed = false;

  function backend() { return (typeof SEPA_BACKEND_URL === 'string' && SEPA_BACKEND_URL) ? SEPA_BACKEND_URL : ''; }

  var TYPES = {
    pdf: ['PDF', 'mc-pdf', 'PDF'], doc: ['Word', 'mc-word', 'Word'], docx: ['Word', 'mc-word', 'Word'],
    ppt: ['Slides', 'mc-ppt', 'PowerPoint'], pptx: ['Slides', 'mc-ppt', 'PowerPoint'],
    xls: ['Excel', 'mc-xls', 'Excel'], xlsx: ['Excel', 'mc-xls', 'Excel'], csv: ['Excel', 'mc-xls', 'Spreadsheet'],
    mp4: ['Video', 'mc-video', 'Video'], mov: ['Video', 'mc-video', 'Video'], m4v: ['Video', 'mc-video', 'Video'],
    png: ['Picture', 'mc-img', 'Picture'], jpg: ['Picture', 'mc-img', 'Picture'], jpeg: ['Picture', 'mc-img', 'Picture'], gif: ['Picture', 'mc-img', 'Picture'],
    document: ['Doc', 'mc-word', 'Google Doc'], spreadsheet: ['Sheet', 'mc-xls', 'Google Sheet'], presentation: ['Slides', 'mc-ppt', 'Google Slides'],
    form: ['Form', 'mc-link', 'Google Form'], drawing: ['Picture', 'mc-img', 'Google Drawing']
  };

  function shape(raw) {
    var files = raw.files.map(function (f) {
      var name = String(f[1]), m = name.match(/\.([A-Za-z0-9]{2,5})$/), ext = f[5] || (m ? m[1].toLowerCase() : '');
      var title = (f[5] || !m ? name : name.slice(0, -m[0].length)).replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
      var path = raw.paths[f[2]] || '';
      return { id: f[0], name: name, title: title, ext: ext, size: +f[3] || 0, modified: f[4] || '', google: !!f[5], link: f[6] || '',
               path: path, group: path.split('/')[0] || '', type: TYPES[ext] || [ext ? ext.toUpperCase().slice(0, 5) : 'File', 'mc-link', ext ? ext.toUpperCase() : 'File'] };
    });
    var byId = {};
    files.forEach(function (f) { byId[f.id] = f; });
    return { at: raw.at, groups: raw.groups || [], files: files, byId: byId };
  }

  function deliver() { var w = waiting.slice(); w.forEach(function (cb) { try { cb(data); } catch (e) { if (window.console) console.error(e); } }); }

  function fetchList() {
    if (fetching || !backend()) return;
    fetching = true;
    fetch(backend() + '?lib=1', { cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (raw) {
        fetching = false;
        if (!raw || !raw.ok || !raw.files) throw new Error((raw && raw.error) || 'no list');
        try { localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), raw: raw })); } catch (e) {}
        data = shape(raw); failed = false; deliver();
      })
      .catch(function () { fetching = false; failed = true; if (!data) deliver(); });
  }

  // Calls back with the list (possibly twice: first the remembered copy, then a fresh one).
  // Calls back with null if the list cannot be had at all.
  function load(cb) {
    waiting.push(cb);
    if (data) { cb(data); return; }
    var saved = null;
    try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {}
    if (saved && saved.raw && saved.raw.files) {
      data = shape(saved.raw);
      cb(data);
      if (Date.now() - (saved.t || 0) < FRESH_MS) return;
    }
    if (!backend()) { failed = true; if (!data) cb(null); return; }
    fetchList();
  }

  function viewUrl(f) { return f.google && f.link ? f.link : 'https://drive.google.com/file/d/' + encodeURIComponent(f.id) + '/view'; }
  function downloadUrl(f) { return f.google ? '' : 'https://drive.google.com/uc?export=download&id=' + encodeURIComponent(f.id); }
  function sizeText(n) {
    if (!n) return '';
    if (n < 1024 * 1024) return Math.max(1, Math.round(n / 1024)) + ' KB';
    var mb = n / 1024 / 1024;
    return (mb < 10 ? mb.toFixed(1) : Math.round(mb)) + ' MB';
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function slug(s) { return String(s).toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function byTitle(a, b) { return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' }); }

  // One row in a list: type badge, title (opens it), size, Download button.
  function itemHtml(f, extra) {
    var dl = downloadUrl(f), meta = f.type[2] + (f.size ? ' &middot; ' + sizeText(f.size) : '');
    return '<li class="mc-item"><span class="mc-type ' + f.type[1] + '">' + esc(f.type[0]) + '</span>' +
      '<a class="mc-title" href="' + esc(viewUrl(f)) + '" target="_blank" rel="noopener">' + esc(f.title) + '</a>' +
      '<span class="mc-meta">' + meta + (extra ? ' &middot; ' + extra : '') + '</span>' +
      (dl ? '<a class="doc-dl" href="' + esc(dl) + '" rel="noopener">Download</a>' : '') + '</li>';
  }

  // Files under one folder path, grouped by sub-path: [{ sub: 'A › B', files: [...] }, ...]
  // The folder's own files come first, then each subfolder (alphabetical).
  function underPath(list, base) {
    var subs = {};
    list.files.forEach(function (f) {
      if (f.path !== base && f.path.indexOf(base + '/') !== 0) return;
      var rest = f.path === base ? '' : f.path.slice(base.length + 1);
      (subs[rest] = subs[rest] || []).push(f);
    });
    return Object.keys(subs).sort(function (a, b) {
      if (!a) return -1; if (!b) return 1;
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    }).map(function (k) { return { sub: k.split('/').join(' › '), files: subs[k].sort(byTitle) }; });
  }

  // Sort names: the ones in "order" first, in that order; any others after, alphabetically.
  function ordered(names, order) {
    var low = order.map(function (o) { return o.toLowerCase(); });
    return names.slice().sort(function (a, b) {
      var ia = low.indexOf(a.toLowerCase()), ib = low.indexOf(b.toLowerCase());
      if (ia < 0) ia = 999; if (ib < 0) ib = 999;
      return ia - ib || a.localeCompare(b);
    });
  }

  function sectionHtml(id, heading, parts) {
    var n = 0, body = '';
    parts.forEach(function (p) {
      n += p.files.length;
      if (p.sub) body += '<h3 class="lib-sub">' + esc(p.sub) + '</h3>';
      body += '<ul class="mc-list">' + p.files.map(function (f) { return itemHtml(f); }).join('') + '</ul>';
    });
    return { n: n, html: '<section class="mc-section"' + (id ? ' id="' + id + '"' : '') + '><h2 class="people-head">' + esc(heading) +
      ' <span class="mc-count">' + n + '</span></h2>' + body + '</section>' };
  }

  function find(list, path) {
    var want = path.toLowerCase().replace(/\s+/g, ' ');
    for (var i = 0; i < list.files.length; i++) {
      var f = list.files[i];
      if ((f.path ? f.path + '/' : '') .toLowerCase() + f.title.toLowerCase() === want) return f;
    }
    return null;
  }

  return { load: load, shape: shape, viewUrl: viewUrl, downloadUrl: downloadUrl, sizeText: sizeText, esc: esc, slug: slug,
           itemHtml: itemHtml, underPath: underPath, ordered: ordered, sectionHtml: sectionHtml, find: find, byTitle: byTitle,
           failed: function () { return failed; } };
})();
