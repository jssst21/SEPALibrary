// SEPA Resource Library - the pinned view bar (website v0.27.27)
// Used by the Escalation Form and the Reception Center Form. It sits under the logo and stays at the
// top of the screen while scrolling. Two parts, each shown only when it is useful:
//   - THE SWITCH between the two views of one event, in the same tab:
//       Reception Center: Intake | Summary        Escalation: Worksheet | Scene Summary
//     Shown to leads, and to HQ when the phone is also on that event.
//   - CHANGE CENTER / CHANGE SCENE (HQ only): a pop-up list of the open events; tap one to open it.
//   - v0.27.29, under the switch: a red "Starting a new scene?" / "Starting a new reception center?"
//     button (everyone on the event; asks once, then goes to the Start screen), and beside it
//     "Switch to HQ view" (leads only; opens the HQ list, which asks for the HQ log in if needed).
// The page calls SEPAViewBar.show({...}) once it knows who is looking. Nothing here talks to Google
// itself: the page passes a load() function for the Change list.
var SEPAViewBar = (function () {
  var ICON = {
    form: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1M8.5 10h7M8.5 14h7M8.5 18h4"/></svg>',
    chart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
    chev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>'
  };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var bar = null, opts = null, who = null;
  // v0.27.61 (Sean: he could not tell whether he was logged in as HQ or as Lead). Under the place name:
  // "Logged in as HQ" (yellow) and/or "Logged in as Lead" (navy), each with its own Log out; a responder sees
  // "On this worksheet as a responder". w = { hq, lead, what, onlyLead, onHQOut(), onLeadOut(fail) }.
  function whoHtml() {
    if (!who) return '';
    var h = '';
    if (who.hq) h += '<span class="who-pill who-hq">Logged in as HQ</span>';
    if (who.lead) h += '<span class="who-pill who-lead">' + (who.hq ? 'and as Lead' : 'Logged in as Lead') + '</span>';
    if (!who.hq && !who.lead) h += '<span class="who-pill who-resp">On this ' + esc(who.what || 'event') + ' as a responder</span>';
    if (who.hq) h += '<button type="button" class="link-btn who-out-hq">Log out as HQ</button>';
    if (who.lead) h += '<button type="button" class="link-btn who-out-lead">Log out as Lead</button>';
    return '<div class="who-line">' + h + '</div><div class="who-ask" hidden><b>You are the only lead on this ' + esc(who.what || 'event') + '.</b>' +
      ' Log out as Lead anyway? HQ can still manage it, and you can log in as lead again later.<span class="form-error who-err" hidden></span>' +
      '<div class="vt-new-btns"><button type="button" class="who-yes">Yes, log out as Lead</button><button type="button" class="who-no">Cancel</button></div></div>';     // own classes: .vt-yes belongs to "Starting a new scene?"
  }
  function wireWho() {
    if (!who || !bar) return;
    var line = bar.querySelector('.who-line'), ask = bar.querySelector('.who-ask'), err = bar.querySelector('.who-err');
    function fail(msg) { err.textContent = msg || 'That did not go through. Please try again.'; err.hidden = false; line.hidden = true; ask.hidden = false; bar.querySelector('.who-yes').disabled = false; }
    var oh = bar.querySelector('.who-out-hq'); if (oh) oh.addEventListener('click', function () { this.disabled = true; who.onHQOut(); });
    var ol = bar.querySelector('.who-out-lead'); if (ol) ol.addEventListener('click', function () {
      if (who.onlyLead) { line.hidden = true; ask.hidden = false; err.hidden = true; return; }
      this.disabled = true; who.onLeadOut(function (m) { ol.disabled = false; fail(m); });
    });
    bar.querySelector('.who-no').addEventListener('click', function () { ask.hidden = true; line.hidden = false; });
    bar.querySelector('.who-yes').addEventListener('click', function () { this.disabled = true; who.onLeadOut(fail); });
  }
  function setWho(w) { who = w; if (opts) show(opts); }

  // o = { on: 'a' | 'b',                       which side of the switch this page is
  //       a: { label, href }, b: { label, href, disabled },   the two views (a = Intake / Worksheet, b = Summary);
  //         b.disabled = a short reason: the second side is shown greyed out and cannot be tapped (v0.27.43)
  //       showSwitch: true/false,
  //       name: 'Norristown Rec Center',
  //       change: null, or { label: 'Change center', title, note, load(done), allHref, allLabel },
  //       actions: null, or { newLabel, askTitle, askText, yesLabel, onYes(back), hqHref } }
  //       onYes(back): the page does the leaving; it calls back() if it has to stay (shows the button again).
  //       hqHref: the HQ list, or '' to leave out the Switch to HQ view button.
  // load(done) must call done([{ href, title, sub, current }]) or done(null, 'error message').
  function show(o) {
    opts = o;
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'vt-bar'; bar.id = 'vt-bar';
      var top = document.querySelector('.page-top');
      if (top && top.parentNode) top.parentNode.insertBefore(bar, top.nextSibling); else document.body.insertBefore(bar, document.body.firstChild);
    }
    var sw = o.showSwitch ? '<nav class="vt" aria-label="Switch view">' +
      '<a href="' + esc(o.a.href) + '"' + (o.on === 'a' ? ' class="on" aria-current="page"' : '') + '>' + ICON.form + esc(o.a.label) + '</a>' +
      (o.b.disabled ? '<span class="vt-off" aria-disabled="true" title="' + esc(o.b.disabled) + '">' + ICON.chart + esc(o.b.label) + '</span></nav>'   // greyed out (v0.27.43)
        : '<a href="' + esc(o.b.href) + '"' + (o.on === 'b' ? ' class="on" aria-current="page"' : '') + '>' + ICON.chart + esc(o.b.label) + '</a></nav>') : '';
    var ch = o.change ? '<button type="button" class="vt-change">' + esc(o.change.label) + ' ' + ICON.chev + '</button>' : '';
    var A = o.actions, acts = A ? '<div class="vt-acts"><button type="button" class="vt-new">' + esc(A.newLabel) + '</button>' +
      (A.hqHref ? '<a class="vt-hq" href="' + esc(A.hqHref) + '">Switch to HQ view</a>' : '') + '</div>' +
      '<div class="vt-new-ask" hidden><b>' + esc(A.askTitle) + '</b>' + esc(A.askText) +
      '<div class="vt-new-btns"><button type="button" class="vt-yes">' + esc(A.yesLabel) + '</button><button type="button" class="vt-no">Cancel</button></div></div>' : '';
    if (!sw && !ch && !acts && !who) { bar.hidden = true; return; }
    bar.hidden = false;
    bar.innerHTML = sw + '<div class="vt-center"><b class="vt-name">' + esc(o.name || '') + '</b>' + ch + '</div>' + whoHtml() + acts;
    wireWho();
    if (o.change) bar.querySelector('.vt-change').addEventListener('click', function () { openChange(o.change); });
    if (A) {
      var row = bar.querySelector('.vt-acts'), ask = bar.querySelector('.vt-new-ask');
      var back = function () { ask.hidden = true; row.hidden = false; bar.querySelector('.vt-yes').disabled = false; };
      bar.querySelector('.vt-new').addEventListener('click', function () { row.hidden = true; ask.hidden = false; bar.querySelector('.vt-no').focus(); });
      bar.querySelector('.vt-no').addEventListener('click', back);
      bar.querySelector('.vt-yes').addEventListener('click', function () { this.disabled = true; A.onYes(back); });
    }
  }
  function setName(n) { if (bar) { var b = bar.querySelector('.vt-name'); if (b) b.textContent = n || ''; } }

  function openChange(c) {
    var old = document.getElementById('vt-pick'); if (old) old.remove();
    var m = document.createElement('div'); m.className = 'f-modal'; m.id = 'vt-pick';
    m.innerHTML = '<div class="f-modal-box" role="dialog" aria-modal="true" aria-labelledby="vt-pick-t">' +
      '<button type="button" class="f-modal-x" aria-label="Close">&times;</button><h2 id="vt-pick-t">' + esc(c.title) + '</h2>' +
      '<p class="f-modal-note">' + esc(c.note) + '</p><div class="vt-list"><p class="esc-group-how">Loading&hellip;</p></div>' +
      (c.allHref ? '<p class="esc-group-how"><a href="' + esc(c.allHref) + '">' + esc(c.allLabel) + '</a></p>' : '') + '</div>';
    document.body.appendChild(m);
    function close() { m.remove(); }
    m.querySelector('.f-modal-x').addEventListener('click', close);
    m.addEventListener('click', function (e) { if (e.target === m) close(); });
    document.addEventListener('keydown', function k(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', k); } });
    m.querySelector('.f-modal-x').focus();
    c.load(function (items, err) {
      var box = m.querySelector('.vt-list');
      if (!items) { box.innerHTML = '<p class="form-error">' + esc(err || 'Could not load the list. Please try again.') + '</p>'; return; }
      if (!items.length) { box.innerHTML = '<p class="esc-group-how">Nothing open right now.</p>'; return; }
      box.innerHTML = items.map(function (it) {
        return '<a class="vt-item' + (it.current ? ' on' : '') + '" href="' + esc(it.href) + '"' + (it.current ? ' aria-current="page"' : '') + '><strong>' +
          esc(it.title) + (it.current ? ' (open now)' : '') + '</strong><span>' + esc(it.sub) + '</span></a>';
      }).join('');
    });
  }
  return { show: show, setName: setName, setWho: setWho };
})();
