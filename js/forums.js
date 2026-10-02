// SEPA Resource Library - Discussion Forums
// The Google connection is set in js/config.js
(function () {
  var URL = (typeof SEPA_BACKEND_URL === 'string') ? SEPA_BACKEND_URL : '';
  var preview = !URL;
  var $ = function (id) { return document.getElementById(id); };
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // ---------- remember the visitor's name on this device (convenience only) ----------
  function savedName() { try { return localStorage.getItem('sepaName') || ''; } catch (e) { return ''; } }
  function saveName(n) { try { localStorage.setItem('sepaName', n); } catch (e) {} }

  // ---------- talking to the Google Sheet ----------
  function call(data) {
    if (preview) return Promise.resolve(fake(data));
    return fetch(URL, { method: 'POST', body: JSON.stringify(data) })
      .then(function (r) { return r.json(); })
      .catch(function () { return { ok: false, error: 'Could not connect. Please check your internet and try again.' }; });
  }

  // ---------- preview mode: pretend data, nothing saved ----------
  var demo = {
    topics: [
      { id: 'd1', created: ago(50), author: 'Linda M.', title: 'Tips for your first DAT call?',
        body: 'I am going on my first DAT response next week. Anything you wish you had known before your first call?' },
      { id: 'd2', created: ago(30), author: 'Frank R.', title: 'Where do I find the client assistance forms?',
        body: 'Looking for the latest version of the client assistance card paperwork. Is it in the FAQs section?' }
    ],
    replies: [
      { id: 'r1', topicId: 'd1', created: ago(40), author: 'Sean S.',
        body: 'Bring water, a phone charger, and a clipboard. Your team lead will walk you through the rest. You will do great!' }
    ]
  };
  function ago(h) { return stamp(new Date(Date.now() - h * 3600000)); }
  function stamp(d) {
    var p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':00';
  }
  function fake(d) {
    var R = function (id) { return demo.replies.filter(function (r) { return r.topicId === id; }); };
    if (d.action === 'topics') {
      var list = demo.topics.map(function (t) {
        var rs = R(t.id), last = rs.length ? rs[rs.length - 1].created : t.created;
        return { id: t.id, created: t.created, author: t.author, title: t.title, preview: t.body.slice(0, 160), last: last, replies: rs.length };
      }).sort(function (a, b) { return a.last < b.last ? 1 : -1; });
      return { ok: true, topics: list };
    }
    if (d.action === 'topic') {
      var t = demo.topics.filter(function (x) { return x.id === d.id; })[0];
      return t ? { ok: true, topic: t, replies: R(t.id) } : { ok: false, error: 'That discussion could not be found.' };
    }
    if (d.action === 'newTopic') {
      var id = 'd' + Date.now();
      demo.topics.push({ id: id, created: stamp(new Date()), author: d.name, title: d.title, body: d.body });
      return { ok: true, id: id };
    }
    if (d.action === 'reply') {
      demo.replies.push({ id: 'r' + Date.now(), topicId: d.topicId, created: stamp(new Date()), author: d.name, body: d.body });
      return { ok: true };
    }
    return { ok: false, error: 'Unknown request.' };
  }

  // ---------- display helpers ----------
  function nice(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(s || '');
    if (!m) return '';
    var h = +m[4], ap = h < 12 ? 'AM' : 'PM';
    h = h % 12 || 12;
    return MONTHS[+m[2] - 1] + ' ' + (+m[3]) + ', ' + m[1] + ' at ' + h + ':' + m[5] + ' ' + ap;
  }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function show(view) {
    ['view-list', 'view-topic', 'view-new'].forEach(function (v) { $(v).hidden = v !== view; });
    window.scrollTo(0, 0);
  }
  function formError(form, msg) {
    var p = form.querySelector('.form-error');
    p.textContent = msg || '';
    p.hidden = !msg;
  }

  // ---------- views ----------
  function showList() {
    show('view-list');
    $('list-status').textContent = 'Loading discussions...';
    $('topics').innerHTML = '';
    call({ action: 'topics' }).then(function (res) {
      if (!res.ok) { $('list-status').textContent = res.error; return; }
      $('list-status').textContent = res.topics.length ? '' : 'No discussions yet. Be the first to start one!';
      res.topics.forEach(function (t) {
        var a = el('a', 'topic-card');
        a.href = '#t=' + encodeURIComponent(t.id);
        a.appendChild(el('strong', 'topic-title', t.title));
        a.appendChild(el('span', 'topic-preview', t.preview));
        a.appendChild(el('span', 'topic-meta', 'Started by ' + t.author + ' · ' + nice(t.created)));
        a.appendChild(el('span', 'topic-count', t.replies + (t.replies === 1 ? ' reply' : ' replies')));
        $('topics').appendChild(a);
      });
    });
  }

  var currentTopic = null;
  function showTopic(id) {
    currentTopic = id;
    show('view-topic');
    $('t-title').textContent = 'Loading...';
    $('t-meta').textContent = ''; $('t-body').textContent = '';
    $('replies').innerHTML = ''; $('replies-head').textContent = '';
    formError($('reply-form'), '');
    call({ action: 'topic', id: id }).then(function (res) {
      if (!res.ok) { $('t-title').textContent = res.error; return; }
      $('t-title').textContent = res.topic.title;
      $('t-meta').textContent = 'Started by ' + res.topic.author + ' · ' + nice(res.topic.created);
      $('t-body').textContent = res.topic.body;
      $('replies-head').textContent = res.replies.length ? res.replies.length + (res.replies.length === 1 ? ' reply' : ' replies') : 'No replies yet';
      res.replies.forEach(function (r) {
        var box = el('article', 'post');
        box.appendChild(el('p', 'post-meta', r.author + ' · ' + nice(r.created)));
        box.appendChild(el('div', 'post-body', r.body));
        $('replies').appendChild(box);
      });
    });
  }

  function showNew() {
    show('view-new');
    formError($('new-form'), '');
    var f = $('new-form').elements;
    if (!f.name.value) f.name.value = savedName();
    (f.name.value ? f.title : f.name).focus();
  }

  // ---------- posting ----------
  function submitForm(form, data, done) {
    var btn = form.querySelector('button[type=submit]'), label = btn.textContent;
    btn.disabled = true; btn.textContent = 'Posting...';
    call(data).then(function (res) {
      btn.disabled = false; btn.textContent = label;
      if (!res.ok) return formError(form, res.error);
      saveName(data.name);
      done(res);
    });
  }

  $('new-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target.elements;
    var data = { action: 'newTopic', name: f.name.value.trim(), title: f.title.value.trim(), body: f.body.value.trim(), website: f.website.value };
    if (data.name.length < 2) return formError(e.target, 'Please enter your name.');
    if (!data.title) return formError(e.target, 'Please give your discussion a title.');
    if (!data.body) return formError(e.target, 'Please write a message.');
    submitForm(e.target, data, function (res) {
      f.title.value = ''; f.body.value = '';
      location.hash = res.id ? 't=' + encodeURIComponent(res.id) : '';
    });
  });

  $('reply-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = e.target.elements;
    var data = { action: 'reply', topicId: currentTopic, name: f.name.value.trim(), body: f.body.value.trim(), website: f.website.value };
    if (data.name.length < 2) return formError(e.target, 'Please enter your name.');
    if (!data.body) return formError(e.target, 'Please write a reply.');
    submitForm(e.target, data, function () {
      f.body.value = '';
      showTopic(currentTopic);
    });
  });

  $('start-btn').addEventListener('click', function () { location.hash = 'new'; });
  document.querySelectorAll('[data-go=list]').forEach(function (b) {
    b.addEventListener('click', function () { location.hash = ''; });
  });

  // ---------- simple page navigation using the address bar (#new, #t=ID) ----------
  function route() {
    var h = location.hash.replace(/^#/, '');
    if (h === 'new') return showNew();
    var m = /^t=(.+)$/.exec(h);
    if (m) return showTopic(decodeURIComponent(m[1]));
    showList();
  }
  window.addEventListener('hashchange', route);

  $('reply-form').elements.name.value = savedName();
  if (preview) {
    var n = $('notice');
    n.textContent = 'Preview mode: the forum is not connected yet. You can try it out, but nothing is saved.';
    n.hidden = false;
  }
  route();
})();
