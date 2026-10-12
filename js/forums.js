// SEPA Resource Library - Discussion Forums (pages/forums.html), rebuilt in v0.23
// A classic message board: six boards -> threads -> posts in order, 20 posts a page.
// Reading needs no account. Starting a thread or replying needs a simple account (email, display
// name, password; any email works). "Forgot your password?" emails a 6-digit code.
// Photos: up to 4 per post. Each is shrunk on this device first (longest side 1600 pixels, saved as a
// JPEG of a few hundred KB) and then sent to the Google script, which keeps it in a Drive folder.
// Moderators (marked YES in the Sheet) see a Hide button on every post. Everyone can edit or delete
// their own posts. The Google connection is set in js/config.js.
(function () {
  var URL = (typeof SEPA_BACKEND_URL === 'string') ? SEPA_BACKEND_URL : '';
  var $ = function (id) { return document.getElementById(id); };
  var main = $('f-main');
  if (!main) return;
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MAX_PHOTOS = 4, PHOTO_SIDE = 1600;
  var PHOTO_RULES = ['No photos of clients’ faces, or anything that could identify a client.',
    'No house numbers, street signs, license plates or other details that show where a client lives.',
    'Nothing taken at a scene without permission.'];

  // ---------------------------------------------------------------- helpers
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) {} }
  function param(name) { var m = new RegExp('[?&]' + name + '=([^&#]*)').exec(location.search); return m ? decodeURIComponent(m[1]) : ''; }
  function link(q) { return 'forums.html' + (q ? '?' + q : ''); }
  function token() { return lsGet('sepaForumToken') || ''; }
  function call(data) {
    if (!URL) return Promise.resolve({ ok: false, error: 'The forums are not connected yet.' });
    data.token = token();
    return fetch(URL, { method: 'POST', body: JSON.stringify(data) })
      .then(function (r) { return r.json(); })
      .catch(function () { return { ok: false, offline: true, error: 'Could not connect. Please check your internet and try again.' }; });
  }
  function oldScript(r) { return r && !r.offline && /unknown request/i.test(r.error || ''); }
  function when(t) {        // "2026-10-12 07:52:00" -> "Today at 7:52 AM" / "Oct 12, 2026"
    var m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(t || '');
    if (!m) return t || '';
    var d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]), now = new Date();
    var time = ((d.getHours() % 12) || 12) + ':' + m[5] + (d.getHours() < 12 ? ' AM' : ' PM');
    var day = new Date(now.getFullYear(), now.getMonth(), now.getDate()), that = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var diff = Math.round((day - that) / 86400000);
    if (diff === 0) return 'Today at ' + time;
    if (diff === 1) return 'Yesterday at ' + time;
    return MONTHS[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }
  function count(n) { return n >= 1000 ? (Math.round(n / 100) / 10) + 'K' : String(n); }
  function notice(msg) { var n = $('f-notice'); n.textContent = msg; n.hidden = !msg; }
  function initial(name) { return (String(name || '?').trim().charAt(0) || '?').toUpperCase(); }
  function avatar(name) {
    var a = el('span', 'f-avatar', initial(name)), h = 0, s = String(name || '');
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
    a.style.background = 'hsl(' + h + ', 45%, 42%)';
    a.setAttribute('aria-hidden', 'true');
    return a;
  }
  // Message text: line breaks kept, web addresses become links, nothing else is treated as code.
  function body(text) {
    var box = el('div', 'f-body'), parts = String(text || '').split(/(https?:\/\/[^\s<>"]+)/g);
    parts.forEach(function (p, i) {
      if (i % 2) { var a = el('a', '', p); a.href = p; a.target = '_blank'; a.rel = 'noopener nofollow'; box.appendChild(a); }
      else if (p) box.appendChild(document.createTextNode(p));
    });
    return box;
  }
  function crumbs(items) {
    var n = $('f-crumbs'); n.innerHTML = ''; n.hidden = !items.length;
    items.forEach(function (it, i) {
      if (i) n.appendChild(el('span', 'f-crumb-sep', '›'));
      if (it[1]) { var a = el('a', '', it[0]); a.href = it[1]; n.appendChild(a); } else n.appendChild(el('span', '', it[0]));
    });
  }
  function pager(page, pages, makeHref) {
    var nav = el('nav', 'f-pager'); nav.setAttribute('aria-label', 'Pages');
    if (pages <= 1) return nav;
    var show = [];
    for (var i = 1; i <= pages; i++) if (i === 1 || i === pages || Math.abs(i - page) <= 2) show.push(i);
    var lastShown = 0;
    if (page > 1) { var pv = el('a', 'f-page', '‹ Prev'); pv.href = makeHref(page - 1); nav.appendChild(pv); }
    show.forEach(function (n) {
      if (n - lastShown > 1) nav.appendChild(el('span', 'f-page-gap', '…'));
      var a = el(n === page ? 'span' : 'a', 'f-page' + (n === page ? ' on' : ''), String(n));
      if (n !== page) a.href = makeHref(n); else a.setAttribute('aria-current', 'page');
      nav.appendChild(a); lastShown = n;
    });
    if (page < pages) { var nx = el('a', 'f-page', 'Next ›'); nx.href = makeHref(page + 1); nav.appendChild(nx); }
    return nav;
  }
  function photoRules(strong) {
    var box = el('div', 'f-rules' + (strong ? ' f-rules-strong' : ''));
    box.appendChild(el('strong', '', strong ? 'Before you share a photo, please read:' : 'Photo rules'));
    var ul = el('ul'); PHOTO_RULES.forEach(function (r) { ul.appendChild(el('li', '', r)); }); box.appendChild(ul);
    box.appendChild(el('p', '', 'Posts that break these rules will be removed.'));
    return box;
  }

  // ---------------------------------------------------------------- the account (top right)
  var me = null, afterLogin = null;
  function showMe() {
    $('f-login-open').hidden = !!me;
    $('f-acct-me').hidden = !me;
    $('f-acct-name').textContent = me ? 'Logged in as ' + me.name + (me.mod ? ' (moderator)' : '') : '';
    $('f-welcome').hidden = !!me;
  }
  function setMe(m, tok) { if (tok) lsSet('sepaForumToken', tok); me = m || null; if (!me && !tok) lsSet('sepaForumToken', ''); showMe(); }
  $('f-logout').addEventListener('click', function () {
    var t = token(); lsSet('sepaForumToken', ''); me = null; showMe();
    fetch(URL, { method: 'POST', body: JSON.stringify({ action: 'logout', token: t }) }).catch(function () {}).then(function () { location.reload(); });
  });

  // The log in / register / forgot box
  var modal = $('f-modal');
  function mode(m) {
    Array.prototype.forEach.call(modal.querySelectorAll('.f-form'), function (f) { f.hidden = f.dataset.form !== m; });
    Array.prototype.forEach.call(modal.querySelectorAll('.cal-tab'), function (b) { b.classList.toggle('on', b.dataset.mode === m); });
    modal.querySelector('.f-modal-tabs').hidden = m === 'forgot';
    $('f-modal-title').textContent = m === 'register' ? 'Create an account' : m === 'forgot' ? 'Reset your password' : 'Log in';
    var f = modal.querySelector('[data-form="' + m + '"]'), first = f.querySelector('input');
    if (first) setTimeout(function () { first.focus(); }, 30);
  }
  function openLogin(m, why, then) {
    afterLogin = then || null;
    var w = $('f-modal-why'); w.textContent = why || ''; w.hidden = !why;
    modal.hidden = false; document.body.classList.add('no-scroll');
    mode(m || 'login');
  }
  function closeLogin() { modal.hidden = true; document.body.classList.remove('no-scroll'); }
  $('f-login-open').addEventListener('click', function () { openLogin('login'); });
  $('f-modal-x').addEventListener('click', closeLogin);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeLogin(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) closeLogin(); });
  Array.prototype.forEach.call(document.querySelectorAll('[data-open="register"]'), function (b) { b.addEventListener('click', function () { openLogin('register'); }); });
  Array.prototype.forEach.call(modal.querySelectorAll('.cal-tab'), function (b) { b.addEventListener('click', function () { mode(b.dataset.mode); }); });
  Array.prototype.forEach.call(modal.querySelectorAll('[data-mode-go]'), function (b) { b.addEventListener('click', function () { mode(b.dataset.modeGo); }); });
  function err(form, msg) { var e = form.querySelector('.form-error'); e.textContent = msg || ''; e.hidden = !msg; }
  function loggedIn(r) {
    setMe(r.me, r.token); closeLogin();
    var then = afterLogin; afterLogin = null;
    if (then) then(); else route();
  }
  function wire(name, build) {
    var f = modal.querySelector('[data-form="' + name + '"]');
    f.addEventListener('submit', function (e) {
      e.preventDefault(); err(f, '');
      var btn = f.querySelector('button[type=submit]'); btn.disabled = true;
      call(build(f.elements)).then(function (r) {
        btn.disabled = false;
        if (name === 'forgot') {
          if (r && r.ok) { f.querySelector('.f-reset2').hidden = false; btn.hidden = true; f.elements.code.focus(); }
          else err(f, (r && r.error) || 'Something went wrong. Please try again.');
          return;
        }
        if (r && r.ok && r.token) loggedIn(r);
        else err(f, oldScript(r) ? 'The new forums are not switched on yet (the Google script needs its update).' : (r && r.error) || 'Something went wrong. Please try again.');
      });
    });
    return f;
  }
  wire('login', function (x) { return { action: 'fLogin', email: x.email.value, password: x.password.value }; });
  wire('register', function (x) { return { action: 'fRegister', email: x.email.value, name: x.name.value, password: x.password.value }; });
  var ff = wire('forgot', function (x) { return { action: 'fResetStart', email: x.email.value }; });
  ff.querySelector('[data-reset-finish]').addEventListener('click', function () {
    var x = ff.elements, b = this; err(ff, ''); b.disabled = true;
    call({ action: 'fResetFinish', email: x.email.value, code: x.code.value, password: x.newpass.value }).then(function (r) {
      b.disabled = false;
      if (r && r.ok && r.token) loggedIn(r); else err(ff, (r && r.error) || 'Something went wrong. Please try again.');
    });
  });

  // ---------------------------------------------------------------- writing a post (new thread or reply)
  // Shrinks one photo on this device: longest side at most 1600 pixels, saved as a JPEG.
  function shrink(file) {
    return new Promise(function (ok, bad) {
      var img = new Image(), u = window.URL.createObjectURL(file);
      img.onload = function () {
        var s = Math.min(1, PHOTO_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
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
  function composer(opts) {
    // opts: { kind: 'thread' | 'reply', board, thread, photosBoard, done(result) }
    var f = el('form', 'f-compose'); f.noValidate = true;
    if (opts.kind === 'thread') {
      var lt = el('label', 'field', 'Title'); var ti = el('input'); ti.name = 'title'; ti.maxLength = 120; lt.appendChild(ti); f.appendChild(lt);
    }
    var lb = el('label', 'field', opts.kind === 'thread' ? 'Your message' : 'Your reply');
    var ta = el('textarea'); ta.name = 'body'; ta.rows = opts.kind === 'thread' ? 7 : 5; ta.maxLength = 8000; lb.appendChild(ta); f.appendChild(lb);
    var trap = el('label', 'trap'); trap.setAttribute('aria-hidden', 'true'); var tr = el('input'); tr.name = 'website'; tr.tabIndex = -1; tr.autocomplete = 'off'; trap.appendChild(tr); f.appendChild(trap);
    // photos
    var photos = [];       // { data (shrunk JPEG), url (preview) }
    var pbox = el('div', 'f-photos');
    var pick = el('input'); pick.type = 'file'; pick.accept = 'image/*'; pick.multiple = true; pick.hidden = true;
    var addBtn = el('button', 'esc-btn f-add-photo', 'Add photos (up to ' + MAX_PHOTOS + ')'); addBtn.type = 'button';
    var plist = el('div', 'f-photo-list');
    // The photo rules sit next to the button. (On the Share your Photos board the big red box above already shows them.)
    if (!opts.photosBoard) pbox.appendChild(photoRules(false));
    pbox.appendChild(addBtn); pbox.appendChild(pick); pbox.appendChild(plist);
    f.appendChild(pbox);
    function drawPhotos() {
      plist.innerHTML = '';
      photos.forEach(function (p, i) {
        var w = el('div', 'f-photo-prev'), im = el('img'); im.src = p.data; im.alt = 'Photo ' + (i + 1);
        var x = el('button', 'f-photo-x', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Remove photo ' + (i + 1));
        x.addEventListener('click', function () { photos.splice(i, 1); drawPhotos(); });
        w.appendChild(im); w.appendChild(x); plist.appendChild(w);
      });
      addBtn.disabled = photos.length >= MAX_PHOTOS;
      addBtn.textContent = photos.length >= MAX_PHOTOS ? MAX_PHOTOS + ' photos added (the most allowed)' : 'Add photos (up to ' + MAX_PHOTOS + ')';
    }
    addBtn.addEventListener('click', function () { pick.click(); });
    pick.addEventListener('change', function () {
      var files = Array.prototype.slice.call(pick.files || []).slice(0, MAX_PHOTOS - photos.length);
      if ((pick.files || []).length > files.length) say('Only ' + MAX_PHOTOS + ' photos can go in one post.');
      pick.value = '';
      files.reduce(function (p, file) {
        return p.then(function () { return shrink(file).then(function (d) { photos.push({ data: d }); drawPhotos(); }, function () { say('One of those files could not be read as a photo.'); }); });
      }, Promise.resolve());
    });
    var e = el('p', 'form-error'); e.hidden = true; f.appendChild(e);
    function say(m) { e.textContent = m || ''; e.hidden = !m; }
    var sub = el('button', 'primary-btn f-submit', opts.kind === 'thread' ? 'Post thread' : 'Post reply'); sub.type = 'submit'; f.appendChild(sub);
    f.addEventListener('submit', function (ev) {
      ev.preventDefault(); say('');
      if (!me) { openLogin('login', 'Log in or register to post. Your writing stays here.', function () { f.requestSubmit ? f.requestSubmit() : sub.click(); }); return; }
      var title = ti ? ti.value.trim() : '', text = ta.value.trim();
      if (ti && !title) return say('Please give your thread a title.');
      if (!text && !photos.length) return say(opts.kind === 'thread' ? 'Please write a message.' : 'Please write a reply.');
      sub.disabled = true;
      var ids = [];
      var up = photos.reduce(function (p, ph, i) {
        return p.then(function () {
          if (ph.id) { ids.push(ph.id); return; }
          sub.textContent = 'Sending photo ' + (i + 1) + ' of ' + photos.length + '...';
          return call({ action: 'fUpload', data: ph.data }).then(function (r) {
            if (!(r && r.ok)) throw new Error((r && r.error) || 'A photo could not be sent.');
            ph.id = r.photo; ids.push(r.photo);
          });
        });
      }, Promise.resolve());
      up.then(function () {
        sub.textContent = 'Posting...';
        var req = opts.kind === 'thread'
          ? { action: 'fNewThread', board: opts.board, title: title, body: text, photos: ids, website: tr.value }
          : { action: 'fReply', thread: opts.thread, body: text, photos: ids, website: tr.value };
        return call(req);
      }).then(function (r) {
        sub.disabled = false; sub.textContent = opts.kind === 'thread' ? 'Post thread' : 'Post reply';
        if (r && r.login) { setMe(null); openLogin('login', 'Please log in again to post. Your writing stays here.', function () { sub.click(); }); return; }
        if (!(r && r.ok)) return say((r && r.error) || 'Something went wrong. Please try again.');
        lsSet(draftKey, '');
        opts.done(r);
      }, function (er) {
        sub.disabled = false; sub.textContent = opts.kind === 'thread' ? 'Post thread' : 'Post reply';
        say(er.message + ' Your writing is still here; please try again.');
      });
    });
    // Keep unsent words if the page is closed or reloaded by accident (this device only).
    var draftKey = 'sepaForumDraft:' + (opts.kind === 'thread' ? 'new:' + opts.board : opts.thread);
    try { var dr = JSON.parse(lsGet(draftKey) || 'null'); if (dr) { if (ti && dr.t) ti.value = dr.t; if (dr.b) ta.value = dr.b; } } catch (x) {}
    f.addEventListener('input', function () { lsSet(draftKey, (ta.value || (ti && ti.value)) ? JSON.stringify({ t: ti ? ti.value : '', b: ta.value }) : ''); });
    return f;
  }

  // ---------------------------------------------------------------- the pages
  function loading() { main.innerHTML = ''; main.appendChild(el('p', 'forum-status', 'Loading...')); }
  function failed(r) {
    main.innerHTML = '';
    main.appendChild(el('p', 'notice', oldScript(r) ? 'The new forums are not switched on yet. The site admin needs to update the Google script.' : (r && r.error) || 'Could not load. Please try again.'));
  }

  function boardsPage() {
    document.title = 'Discussion Forums - SEPA Resource Library';
    $('f-title').textContent = 'Discussion Forums'; crumbs([]);
    loading();
    call({ action: 'fBoards' }).then(function (r) {
      if (!(r && r.ok)) return failed(r);
      setMe(r.me);
      main.innerHTML = '';
      var list = el('div', 'f-boards');
      r.boards.forEach(function (b) {
        var a = el('a', 'f-board' + (b.id === 'photos' ? ' f-board-photos' : '')); a.href = link('b=' + b.id);
        var txt = el('div', 'f-board-text'); txt.appendChild(el('h2', 'f-board-title', b.title)); txt.appendChild(el('p', 'f-board-desc', b.desc));
        a.appendChild(txt);
        var st = el('div', 'f-stats');
        [['Threads', b.threads], ['Messages', b.posts]].forEach(function (s) { var c = el('div', 'f-stat'); c.appendChild(el('span', '', s[0])); c.appendChild(el('strong', '', count(s[1]))); st.appendChild(c); });
        a.appendChild(st);
        var lt = el('div', 'f-latest');
        if (b.latest) { lt.appendChild(el('span', 'f-latest-title', b.latest.title)); lt.appendChild(el('span', 'f-latest-meta', b.latest.by + ' · ' + when(b.latest.at))); }
        else lt.appendChild(el('span', 'f-latest-meta', 'No threads yet'));
        a.appendChild(lt);
        list.appendChild(a);
      });
      main.appendChild(list);
    });
  }

  function boardPage(id, page) {
    loading();
    call({ action: 'fBoard', board: id, page: page }).then(function (r) {
      if (!(r && r.ok)) return failed(r);
      setMe(r.me);
      var b = r.board;
      document.title = b.title + ' - Forums - SEPA Resource Library';
      $('f-title').textContent = b.title;
      crumbs([['Forums', link('')], [b.title.split(':')[0], '']]);
      main.innerHTML = '';
      main.appendChild(el('p', 'page-intro f-board-intro', b.desc));
      if (b.id === 'photos') main.appendChild(photoRules(true));
      var bar = el('div', 'f-bar');
      var start = el('a', 'primary-btn f-start', '+ Start a new thread'); start.href = link('new=' + b.id);
      start.addEventListener('click', function (e) {
        if (me) return;
        e.preventDefault(); openLogin('login', 'Log in or register to start a thread.', function () { location.href = link('new=' + b.id); });
      });
      bar.appendChild(start);
      main.appendChild(bar);
      if (!r.threads.length) { main.appendChild(el('p', 'forum-status', 'No threads yet. Be the first to start one!')); return; }
      var list = el('div', 'f-threads');
      r.threads.forEach(function (t) {
        var row = el('div', 'f-thread');
        row.appendChild(avatar(t.by));
        var mid = el('div', 'f-thread-main');
        var a = el('a', 'f-thread-title', t.title); a.href = link('t=' + t.id); mid.appendChild(a);
        var meta = el('div', 'f-thread-meta'); meta.appendChild(el('span', '', t.by)); meta.appendChild(el('span', 'f-dot', '·')); meta.appendChild(el('span', '', when(t.started)));
        var pages = Math.ceil(t.posts / (r.perPage || 20));
        if (pages > 1) {
          var pg = el('span', 'f-mini-pages'), list2 = [];
          for (var i = Math.max(2, pages - 2); i <= pages; i++) list2.push(i);
          if (list2[0] > 2) list2.unshift(1);
          list2.forEach(function (n) { var x = el('a', '', String(n)); x.href = link('t=' + t.id + '&p=' + n); pg.appendChild(x); });
          meta.appendChild(pg);
        }
        mid.appendChild(meta); row.appendChild(mid);
        var right = el('div', 'f-thread-right');
        right.appendChild(el('span', 'f-replies', (t.posts - 1) + (t.posts - 1 === 1 ? ' reply' : ' replies')));
        var last = el('a', 'f-thread-last', when(t.last) + (t.lastBy ? ' · ' + t.lastBy : '')); last.href = link('t=' + t.id + '&p=last');
        right.appendChild(last);
        row.appendChild(right);
        list.appendChild(row);
      });
      main.appendChild(list);
      main.appendChild(pager(r.page, r.pages, function (n) { return link('b=' + b.id + (n > 1 ? '&p=' + n : '')); }));
    });
  }

  function newThreadPage(boardId) {
    $('f-title').textContent = 'Start a new thread';
    loading();
    call({ action: 'fBoard', board: boardId, page: 1 }).then(function (r) {
      if (!(r && r.ok)) return failed(r);
      setMe(r.me);
      var b = r.board;
      document.title = 'New thread - ' + b.title + ' - SEPA Resource Library';
      crumbs([['Forums', link('')], [b.title.split(':')[0], link('b=' + b.id)], ['New thread', '']]);
      main.innerHTML = '';
      main.appendChild(el('p', 'page-intro', 'In: ' + b.title));
      if (b.id === 'photos') main.appendChild(photoRules(true));
      if (!me) main.appendChild(el('p', 'notice', 'You will be asked to log in or register when you post. What you write here is kept.'));
      main.appendChild(composer({ kind: 'thread', board: b.id, photosBoard: b.id === 'photos', done: function (res) { location.href = link('t=' + res.id); } }));
    });
  }

  function threadPage(id, page) {
    loading();
    call({ action: 'fThread', id: id, page: page }).then(function (r) {
      if (!(r && r.ok)) return failed(r);
      setMe(r.me);
      var t = r.thread, b = r.board;
      document.title = t.title + ' - Forums - SEPA Resource Library';
      $('f-title').textContent = t.title;
      crumbs([['Forums', link('')], [(b.title || 'Board').split(':')[0], link('b=' + b.id)], ['Thread', '']]);
      main.innerHTML = '';
      var sub = el('p', 'f-thread-sub', 'Started by ' + t.by + ' · ' + when(t.started) + ' · ' + (t.posts - 1) + (t.posts - 1 === 1 ? ' reply' : ' replies'));
      main.appendChild(sub);
      var topBar = el('div', 'f-bar');
      var jump = el('button', 'primary-btn f-start', 'Reply'); jump.type = 'button';
      topBar.appendChild(jump);
      topBar.appendChild(pager(r.page, r.pages, function (n) { return link('t=' + t.id + (n > 1 ? '&p=' + n : '')); }));
      main.appendChild(topBar);
      var list = el('div', 'f-posts');
      r.posts.forEach(function (p, i) { list.appendChild(postEl(p, (r.page - 1) * r.perPage + i + 1, p.id === t.firstPost)); });
      main.appendChild(list);
      main.appendChild(pager(r.page, r.pages, function (n) { return link('t=' + t.id + (n > 1 ? '&p=' + n : '')); }));
      // the reply box (only on the last page, so a new reply appears right above it)
      var replyBox = el('section', 'f-reply');
      if (r.page === r.pages) {
        replyBox.appendChild(el('h2', 'f-reply-title', 'Write a reply'));
        if (b.id === 'photos') replyBox.appendChild(photoRules(true));
        replyBox.appendChild(composer({ kind: 'reply', thread: t.id, photosBoard: b.id === 'photos', done: function () { location.href = link('t=' + t.id + '&p=last') + '#latest'; } }));
      }
      main.appendChild(replyBox);
      jump.addEventListener('click', function () {
        var go = function () {
          if (r.page !== r.pages) { location.href = link('t=' + t.id + '&p=last') + '#reply'; return; }
          replyBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
          var ta = replyBox.querySelector('textarea'); if (ta) setTimeout(function () { ta.focus({ preventScroll: true }); }, 400);
        };
        if (!me) openLogin('login', 'Log in or register to reply.', go); else go();
      });
      if (location.hash === '#reply') jump.click();
      if (location.hash === '#latest') { var lastPost = list.lastElementChild; if (lastPost) setTimeout(function () { lastPost.scrollIntoView({ block: 'center' }); lastPost.classList.add('esc-flash'); }, 50); }
    });
  }

  function postEl(p, n, isFirst) {
    var art = el('article', 'f-post' + (isFirst ? ' f-post-first' : '')); art.id = 'post-' + p.id;
    var side = el('div', 'f-post-side'); side.appendChild(avatar(p.by)); art.appendChild(side);
    var mainCol = el('div', 'f-post-main');
    var head = el('div', 'f-post-head');
    head.appendChild(el('strong', 'f-post-by', p.by));
    head.appendChild(el('span', 'f-post-when', when(p.at) + (p.edited ? ' · edited' : '')));
    head.appendChild(el('span', 'f-post-num', '#' + n));
    mainCol.appendChild(head);
    var bd = body(p.body); mainCol.appendChild(bd);
    if (p.photos && p.photos.length) {
      var g = el('div', 'f-post-photos f-n' + p.photos.length);
      p.photos.forEach(function (u, i) {
        var a = el('a'); a.href = u; a.target = '_blank'; a.rel = 'noopener';
        var im = el('img'); im.src = u; im.alt = 'Photo ' + (i + 1) + ' from ' + p.by; im.loading = 'lazy';
        a.appendChild(im); g.appendChild(a);
      });
      mainCol.appendChild(g);
    }
    var tools = el('div', 'f-post-tools');
    if (p.mine) {
      var ed = el('button', 'link-btn', 'Edit'); ed.type = 'button';
      ed.addEventListener('click', function () { editPost(p, bd, tools); });
      tools.appendChild(ed);
    }
    if (p.mine || (me && me.mod)) {
      var rm = el('button', 'link-btn f-danger', p.mine ? (isFirst ? 'Delete thread' : 'Delete') : (isFirst ? 'Hide thread' : 'Hide')); rm.type = 'button';
      var ask = el('span', 'f-ask'); ask.hidden = true;
      ask.appendChild(document.createTextNode(isFirst ? 'This removes the whole thread. Sure? ' : 'Sure? '));
      var yes = el('button', 'link-btn f-danger', 'Yes'); yes.type = 'button';
      var no = el('button', 'link-btn', 'Cancel'); no.type = 'button';
      ask.appendChild(yes); ask.appendChild(document.createTextNode(' ')); ask.appendChild(no);
      rm.addEventListener('click', function () { rm.hidden = true; ask.hidden = false; });
      no.addEventListener('click', function () { rm.hidden = false; ask.hidden = true; });
      yes.addEventListener('click', function () {
        yes.disabled = true;
        call({ action: 'fRemove', post: p.id }).then(function (r) {
          if (r && r.ok && r.threadGone) { location.href = link('b=' + r.board); return; }
          if (r && r.ok) { art.remove(); return; }
          yes.disabled = false; notice((r && r.error) || 'Could not remove it. Please try again.');
        });
      });
      tools.appendChild(rm); tools.appendChild(ask);
    }
    if (tools.childNodes.length) mainCol.appendChild(tools);
    art.appendChild(mainCol);
    return art;
  }
  function editPost(p, bd, tools) {
    var f = el('form', 'f-edit'), ta = el('textarea'); ta.value = p.body; ta.rows = Math.min(14, Math.max(4, p.body.split('\n').length + 1));
    var save = el('button', 'primary-btn', 'Save'); save.type = 'submit';
    var cancel = el('button', 'link-btn', 'Cancel'); cancel.type = 'button';
    var e = el('p', 'form-error'); e.hidden = true;
    f.appendChild(ta); f.appendChild(e); var row = el('div', 'f-edit-row'); row.appendChild(save); row.appendChild(cancel); f.appendChild(row);
    bd.hidden = true; tools.hidden = true; bd.parentNode.insertBefore(f, bd.nextSibling); ta.focus();
    cancel.addEventListener('click', function () { f.remove(); bd.hidden = false; tools.hidden = false; });
    f.addEventListener('submit', function (ev) {
      ev.preventDefault(); save.disabled = true;
      call({ action: 'fEdit', post: p.id, body: ta.value }).then(function (r) {
        save.disabled = false;
        if (!(r && r.ok)) { e.textContent = (r && r.error) || 'Could not save. Please try again.'; e.hidden = false; return; }
        p.body = ta.value.trim();
        var nb = body(p.body); bd.parentNode.replaceChild(nb, bd); bd = nb; f.remove(); tools.hidden = false;
        var w = nb.parentNode.querySelector('.f-post-when'); if (w && w.textContent.indexOf('edited') < 0) w.textContent += ' · edited';
      });
    });
  }

  // ---------------------------------------------------------------- which page?
  function route() {
    notice('');
    var t = param('t'), b = param('b'), nw = param('new'), p = param('p');
    if (t) return threadPage(t, p === 'last' ? 'last' : (parseInt(p, 10) || 1));
    if (nw) return newThreadPage(nw);
    if (b) return boardPage(b, parseInt(p, 10) || 1);
    return boardsPage();
  }
  showMe();
  if (!URL) { failed({ error: 'The forums are not connected yet.' }); return; }
  route();
})();
