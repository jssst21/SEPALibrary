/* RUNNING LOG for the Escalation and Reception Center forms (website v0.27.57, Sean Oct 20, 2026).
   The same running log as the Daily Shelter Report (js/shelter.js), with the same look (the sr-* styles
   in css/style.css): type what happened, "Add to the log", and the entry is stamped with the time and
   your name. "Flag as an issue" keeps an entry in red at the top until someone removes the flag.
   The box shows the flagged issues plus the 3 newest entries; older ones scroll inside the box, and
   "See all entries" opens them all. HQ can edit or remove an entry (it stays, marked by HQ).
   No midnight rollover here: the log covers the whole event.
   The pages use it like this:
     var log = SEPAEventLog.mount({ host: element, form: 'esc' or 'rec', id: eventId,
       auth: function (o) { add the page's codes to o; return o; },
       who: function () { return this person's name; } });
     log.rows()  -> the entries (for Download for Excel). log.refresh() -> check now.
   PHOTOS (v0.27.57): pass photosHost: element too and it gets "Add photo" and, once there are photos,
   "See photos (2)". The photos never show inside the form; See photos opens them in a pop-up, one at a
   time as they load. Each photo is shrunk on the phone first (longest side 1600 pixels, JPEG).
   The Google script side is the "RUNNING LOG ON THE ESCALATION AND RECEPTION CENTER FORMS" section. */
(function () {
  var URL = (typeof SEPA_BACKEND_URL === 'string') ? SEPA_BACKEND_URL : '';
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function call(data) {
    if (!URL) return Promise.resolve({ ok: false, error: 'The form is not connected yet.' });
    return fetch(URL, { method: 'POST', body: JSON.stringify(data) })
      .then(function (r) { return r.json(); })
      .catch(function () { return { ok: false, offline: true, error: 'Not saved: no connection. Please try again.' }; });
  }
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function clock(t) {      // "2026-10-16 15:25:00" -> "3:25 PM"
    var m = /(\d{1,2}):(\d{2})/.exec((t || '').split(' ')[1] || '');
    if (!m) return t || '';
    var h = +m[1];
    return ((h % 12) || 12) + ':' + m[2] + (h < 12 ? ' AM' : ' PM');
  }
  function when(t) {       // "3:25 PM" today, "Oct 14, 3:25 PM" otherwise
    var d = (t || '').split(' ')[0];
    if (!d || d === today()) return clock(t);
    var m = /^\d{4}-(\d{2})-(\d{2})/.exec(d);
    return (m ? MONTHS[+m[1] - 1].slice(0, 3) + ' ' + (+m[2]) + ', ' : '') + clock(t);
  }
  function stamps(s) { return s.replace(/(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/, function (t) { return when(t); }); }
  function entryMs(e) { return parseInt(String(e.id || '').slice(1, 9), 36) || 0; }   // entry ids start with the exact save time
  var n = 0;
  // Shrinks one photo on this device: longest side at most 1600 pixels, saved as a JPEG (as the forums do).
  function shrink(file) {
    return new Promise(function (ok, bad) {
      var img = new Image(), u = window.URL.createObjectURL(file);
      img.onload = function () {
        var s = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
        var c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.naturalWidth * s)); c.height = Math.max(1, Math.round(img.naturalHeight * s));
        var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        window.URL.revokeObjectURL(u);
        var q = 0.82, data = c.toDataURL('image/jpeg', q);
        while (data.length > 1300000 && q > 0.45) { q -= 0.1; data = c.toDataURL('image/jpeg', q); }
        ok(data);
      };
      img.onerror = function () { window.URL.revokeObjectURL(u); bad(new Error('unreadable')); };
      img.src = u;
    });
  }

  function mount(o) {
    if (!o || !o.host || !o.id) return { rows: function () { return []; }, refresh: function () {} };
    var p = 'evlog' + (++n) + '-', S = { log: [], rev: '', hq: false, gone: false };
    var $ = function (k) { return document.getElementById(p + k); };

    // ---- the box (the same markup as the Daily Shelter Report's Running log)
    var box = el('div', 'sr-box ev-log');
    box.innerHTML =
      '<h2 class="sr-h">Running log</h2>' +
      '<p class="esc-how">What happened, when. Each entry is stamped with the time and your name. Flagged issues stay in red at the top.</p>' +
      '<form id="' + p + 'form" novalidate>' +
        '<label class="visually-hidden" for="' + p + 'in">New log entry</label>' +
        '<textarea class="esc-in" id="' + p + 'in" rows="3" maxlength="3000" placeholder="Type what happened&hellip;"></textarea>' +
        '<button type="button" class="sr-flag-toggle" id="' + p + 'flag" aria-pressed="false"><span class="sr-flag-box" aria-hidden="true"></span>Flag as an issue (shows in red at the top of the log)</button>' +
        '<p class="form-error" id="' + p + 'error" hidden></p>' +
        '<button class="primary-btn" type="submit" id="' + p + 'btn">Add to the log</button>' +
      '</form>' +
      '<div class="sr-log-wrap" id="' + p + 'wrap"><ul class="sr-log" id="' + p + 'list"></ul></div>' +
      '<p class="sr-log-more" id="' + p + 'more" hidden></p>' +
      '<p class="form-error" id="' + p + 'note" hidden></p>' +
      '<button type="button" class="esc-btn sr-log-all" id="' + p + 'all" hidden>See all entries</button>';
    o.host.innerHTML = ''; o.host.appendChild(box); o.host.hidden = false;
    var modal = el('div', 'f-modal sr-all-modal'); modal.hidden = true;
    modal.innerHTML =
      '<div class="f-modal-box" role="dialog" aria-modal="true" aria-labelledby="' + p + 'all-title">' +
        '<button type="button" class="f-modal-x" id="' + p + 'all-x" aria-label="Close">&times;</button>' +
        '<h2 id="' + p + 'all-title">All entries</h2>' +
        '<p class="f-modal-note">Flagged issues first, then newest first.</p>' +
        '<ul class="sr-log" id="' + p + 'all-list"></ul>' +
      '</div>';
    document.body.appendChild(modal);

    function auth(x) { x.form = o.form; x.id = o.id; x = o.auth ? o.auth(x) : x; if (o.who && !x.who) x.who = o.who() || ''; return x; }
    function note(msg) { var e = $('note'); e.textContent = msg || ''; e.hidden = !msg; }

    // ---- add an entry
    function setFlag(on) { var f = $('flag'); f.setAttribute('aria-pressed', on ? 'true' : 'false'); f.classList.toggle('on', on); $('btn').textContent = on ? 'Add flagged issue to the log' : 'Add to the log'; }
    $('flag').onclick = function () { setFlag(this.getAttribute('aria-pressed') !== 'true'); };
    $('form').onsubmit = function (e) {
      e.preventDefault();
      var t = $('in').value.trim(), err = $('error'), btn = $('btn');
      err.hidden = true; if (!t) return;
      btn.disabled = true;
      call(auth({ action: 'evLog', text: t, flag: $('flag').getAttribute('aria-pressed') === 'true' })).then(function (x) {
        btn.disabled = false;
        if (!(x && x.ok)) { err.textContent = (x && x.error) || 'Not saved: no connection. Please try again.'; err.hidden = false; return; }
        $('in').value = ''; setFlag(false); load(true);
      });
    };

    // ---- the list
    function draw(ul, tools) {
      ul.innerHTML = '';
      var list = S.log;
      if (!list.length) { ul.appendChild(el('li', 'sr-log-none', 'No entries yet.')); return; }
      list.slice().sort(function (x, y) { return (!!y.flag - !!x.flag) || (x.at < y.at ? 1 : x.at > y.at ? -1 : 0) || (entryMs(y) - entryMs(x)); }).forEach(function (e) {
        var li = el('li', e.flag ? 'sr-flagged' : ''), head = el('small');
        if (e.flag) li.appendChild(el('span', 'sr-flag-label', 'Flagged issue'));
        head.appendChild(el('b', '', e.by)); head.appendChild(document.createTextNode(' · ' + when(e.at)));
        li.appendChild(head);
        if (e.text) li.appendChild(el('span', 'sr-log-text', e.text));
        else li.appendChild(el('span', 'sr-log-gone', 'This entry was removed by HQ.'));
        if (e.edited) li.appendChild(el('small', 'sr-edited', stamps(e.edited)));
        if (e.flag) li.appendChild(el('small', 'sr-flag-by', stamps(e.flag)));
        if (tools) {
          var t = el('span', 'sr-log-tools');
          var fb = el('button', 'link-btn sr-flag-btn', e.flag ? 'Remove flag' : 'Flag as an issue'); fb.type = 'button';
          fb.addEventListener('click', function () { flagEntry(e, !e.flag, fb); });
          t.appendChild(fb);
          if (S.hq) {
            var ed = el('button', 'link-btn', 'Edit (HQ)'); ed.type = 'button';
            ed.addEventListener('click', function () { editEntry(li, e); });
            t.appendChild(ed);
          }
          li.appendChild(t);
        }
        ul.appendChild(li);
      });
    }
    // The box shows the flagged issues and the 3 newest entries; older ones scroll inside the box.
    function fit() {
      var wrap = $('wrap'), ul = $('list'), lis = ul.children, more = $('more');
      var show = ul.querySelectorAll('li.sr-flagged').length + 3;
      $('all').hidden = !S.log.length;
      if (lis.length <= show) { wrap.style.maxHeight = ''; wrap.classList.remove('sr-scrolls'); more.hidden = true; return; }
      var last = lis[show - 1];
      wrap.style.maxHeight = (last.offsetTop + last.offsetHeight + 2) + 'px';
      wrap.classList.add('sr-scrolls');
      var rest = lis.length - show;
      more.textContent = rest + (rest === 1 ? ' earlier entry' : ' earlier entries') + ': scroll inside the box, or see them all below.';
      more.hidden = false;
    }
    function render() {
      if (box.querySelector('.sr-log-edit')) return;      // HQ is editing an entry: do not redraw under them
      var wrap = $('wrap'), keep = wrap.scrollTop;
      draw($('list'), true); fit(); wrap.scrollTop = keep;
      if (!modal.hidden) drawAll();
    }
    function drawAll() { draw($('all-list'), false); $('all-title').textContent = 'All entries (' + S.log.length + ')'; }
    $('all').onclick = function () {
      drawAll(); modal.hidden = false;
      function shut() { modal.hidden = true; }
      $('all-x').onclick = shut; modal.onclick = function (e) { if (e.target === modal) shut(); };
      document.addEventListener('keydown', function k(e) { if (e.key === 'Escape') { shut(); document.removeEventListener('keydown', k); } });
      $('all-x').focus();
    };
    window.addEventListener('resize', fit);

    function flagEntry(e, on, btn) {
      btn.disabled = true;
      call(auth({ action: 'evLogFlag', entry: e.id, flag: on })).then(function (r) {
        btn.disabled = false;
        if (!(r && r.ok)) { note((r && r.error) || 'Not saved: no connection. Please try again.'); return; }
        note(''); load(true);
      });
    }
    function editEntry(li, e) {
      if (li.querySelector('.sr-log-edit')) return;
      var f = el('div', 'sr-log-edit'), t = el('textarea', 'esc-in'); t.rows = 3; t.value = e.text; t.maxLength = 3000;
      var row = el('div', 'esc-buttons'), sv = el('button', 'primary-btn', 'Save change'), rm = el('button', 'esc-btn esc-danger', 'Remove entry'), cc = el('button', 'esc-btn', 'Cancel');
      [sv, rm, cc].forEach(function (b) { b.type = 'button'; row.appendChild(b); });
      var err = el('p', 'form-error'); err.hidden = true;
      f.appendChild(el('p', 'esc-group-how', 'HQ only. The entry stays in the log, marked as edited (or removed) by HQ.'));
      f.appendChild(t); f.appendChild(row); f.appendChild(err); li.appendChild(f); t.focus();
      function go(text) {
        sv.disabled = rm.disabled = true;
        call(auth({ action: 'evLogEdit', entry: e.id, text: text, asHq: true })).then(function (r) {
          sv.disabled = rm.disabled = false;
          if (!(r && r.ok)) { err.textContent = (r && r.login) ? 'Your HQ login has ended. Log in as HQ again to edit the log.' : ((r && r.error) || 'Not saved: no connection.'); err.hidden = false; return; }
          f.remove(); load(true);
        });
      }
      sv.addEventListener('click', function () { if (t.value.trim()) go(t.value); });
      rm.addEventListener('click', function () { go(''); });
      cc.addEventListener('click', function () { f.remove(); render(); });
    }

    // ---- checking for new entries (every 8 seconds while the page is in front)
    var busy = false;
    function load(force) {
      if (S.gone || busy) return;
      busy = true;
      call(auth({ action: 'evLogGet', since: force ? '' : S.rev })).then(function (r) {
        busy = false;
        if (!(r && r.ok)) {
          if (r && /unknown request/i.test(r.error || '')) { S.gone = true; o.host.hidden = true; if (o.photosHost) o.photosHost.hidden = true; }     // the Google script is not updated yet: hide the box
          return;
        }
        if (r.cleared) { S.gone = true; o.host.hidden = true; if (ph) ph.hidden = true; return; }
        S.hq = !!r.hq;
        if (r.same) return;
        S.rev = r.rev || ''; S.log = r.log || []; S.photos = r.photos || [];
        render(); showPhotos();
      });
    }
    render(); load(true);
    setInterval(function () { if (!document.hidden) load(false); }, 8000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) load(false); });
    // ---- PHOTOS (v0.27.57)
    S.photos = [];
    var ph = o.photosHost, pm = null, cache = {};
    if (ph) {
      ph.innerHTML =
        '<div class="ev-photos">' +
          '<input type="file" accept="image/*" id="' + p + 'pfile" hidden>' +
          '<div class="esc-buttons">' +
            '<button type="button" class="esc-btn ev-photo-add" id="' + p + 'padd">Add photo</button>' +
            '<button type="button" class="esc-btn ev-photo-see" id="' + p + 'psee" hidden>See photos</button>' +
          '</div>' +
          '<p class="esc-status" id="' + p + 'pmsg" role="status" hidden></p>' +
        '</div>';
      ph.hidden = false;
      pm = el('div', 'f-modal ev-photo-modal'); pm.hidden = true;
      pm.innerHTML =
        '<div class="f-modal-box" role="dialog" aria-modal="true" aria-labelledby="' + p + 'ptitle">' +
          '<button type="button" class="f-modal-x" id="' + p + 'px" aria-label="Close">&times;</button>' +
          '<h2 id="' + p + 'ptitle">Photos</h2>' +
          '<p class="f-modal-note">Newest first. Only people on this event and HQ can see them.</p>' +
          '<div id="' + p + 'plist"></div>' +
        '</div>';
      document.body.appendChild(pm);
      var pmsg = function (t, bad) { var m = $('pmsg'); m.textContent = t || ''; m.hidden = !t; m.className = 'esc-status' + (bad ? ' esc-warn' : (t ? ' esc-ok' : '')); };
      $('padd').onclick = function () { $('pfile').click(); };
      $('pfile').onchange = function () {
        var f = this.files && this.files[0]; this.value = '';
        if (!f) return;
        var btn = $('padd'); btn.disabled = true; pmsg('Sending the photo...');
        shrink(f).then(function (data) {
          return call(auth({ action: 'evPhotoAdd', data: data }));
        }, function () { return { ok: false, error: 'That photo could not be read. Please try another.' }; }).then(function (r) {
          btn.disabled = false;
          if (!(r && r.ok)) { pmsg((r && r.error) || 'Not sent: no connection. Please try again.', true); return; }
          pmsg('Photo added.'); setTimeout(function () { pmsg(''); }, 5000); load(true);
        });
      };
      $('psee').onclick = function () {
        drawPhotos(); pm.hidden = false;
        function shut() { pm.hidden = true; }
        $('px').onclick = shut; pm.onclick = function (e) { if (e.target === pm) shut(); };
        document.addEventListener('keydown', function k(e) { if (e.key === 'Escape') { shut(); document.removeEventListener('keydown', k); } });
        $('px').focus();
      };
    }
    function showPhotos() {
      if (!ph) return;
      var n = S.photos.length, b = $('psee');
      b.hidden = !n; b.textContent = 'See photos (' + n + ')';
      if (pm && !pm.hidden) drawPhotos();
    }
    function drawPhotos() {
      var box = $('plist'); box.innerHTML = '';
      $('ptitle').textContent = 'Photos (' + S.photos.length + ')';
      if (!S.photos.length) { box.appendChild(el('p', 'f-modal-note', 'No photos.')); return; }
      S.photos.slice().sort(function (x, y) { return x.at < y.at ? 1 : -1; }).forEach(function (x) {
        var fig = el('figure', 'ev-photo'), cap = el('figcaption');
        var img = el('img'); img.alt = 'Photo added by ' + x.by + ' at ' + when(x.at);
        var wait = el('p', 'ev-photo-wait', 'Loading the photo...');
        fig.appendChild(wait); fig.appendChild(img); img.hidden = true;
        cap.appendChild(el('b', '', x.by)); cap.appendChild(document.createTextNode(' · ' + when(x.at)));
        if (S.hq) {
          var rm = el('button', 'link-btn ev-photo-rm', 'Remove photo (HQ)'); rm.type = 'button';
          rm.addEventListener('click', function () {
            if (!window.confirm('Remove this photo for everyone?')) return;
            rm.disabled = true;
            call(auth({ action: 'evPhotoRemove', photo: x.id, asHq: true })).then(function (r) {
              rm.disabled = false;
              if (!(r && r.ok)) { wait.hidden = false; wait.textContent = (r && r.error) || 'Not removed: no connection.'; return; }
              load(true);
            });
          });
          cap.appendChild(rm);
        }
        fig.appendChild(cap); box.appendChild(fig);
        function put(src) { img.src = src; img.hidden = false; wait.hidden = true; }
        if (cache[x.id]) put(cache[x.id]);
        else call(auth({ action: 'evPhotoGet', photo: x.id })).then(function (r) {
          if (r && r.ok && r.src) { cache[x.id] = r.src; put(r.src); }
          else wait.textContent = (r && r.error) || 'Could not load the photo. Close and open again to retry.';
        });
      });
    }

    return { rows: function () { return S.log.slice(); }, refresh: function () { load(true); } };
  }

  // For Download for Excel: the log as CSV lines (q = the page's own cell quoting).
  function csv(list, q) {
    var out = ['', q('Running log'), 'Time,By,Entry,Flagged,Edited'];
    list.slice().sort(function (x, y) { return x.at < y.at ? -1 : x.at > y.at ? 1 : entryMs(x) - entryMs(y); }).forEach(function (e) {
      out.push([e.at, e.by, e.text || '(removed by HQ)', e.flag, e.edited].map(q).join(','));
    });
    return out;
  }

  window.SEPAEventLog = { mount: mount, csv: csv };
})();
