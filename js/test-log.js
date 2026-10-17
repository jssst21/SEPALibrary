// SEPA Resource Library - stress test logging (website v0.27.52, Sean Oct 17, 2026). Only on the Escalation and
// Reception Center forms, and only while the Google Sheet's Settings tab says "Stress test: ON" (so people trying
// the forms on other days are not counted). Load it right after config.js, before the form's own script.
//   ON:     logs what happens, never what is typed: each call to the Google script (which action, how long it
//           took, whether it worked), page loads, how long "Looking for current events..." took and how many
//           taps happened during it, how long each reception intake took, and errors. Sent every 20 seconds.
//   SURVEY: shows "The test is over. Thank you!" with a link to the survey (pages/survey.html).
//   OFF:    does nothing.
// Each phone gets a random test code (sepaTestDev); no names.
(function () {
  var URL = (typeof SEPA_BACKEND_URL === 'string') ? SEPA_BACKEND_URL : '';
  if (!URL || !window.fetch) return;
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  var dev = lsGet('sepaTestDev');
  if (!/^[a-z0-9]{12}$/.test(dev || '')) { dev = Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-6); dev = (dev + 'xxxxxxxxxxxx').slice(0, 12); lsSet('sepaTestDev', dev); }
  var form = ({ escalation: 'esc', reception: 'rec' })[document.body.getAttribute('data-ask-form')] || 'other';
  var ua = navigator.userAgent, app = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone;
  var plat = (/iPhone|iPad|iPod/.test(ua) ? 'iPhone' : /Android/.test(ua) ? 'Android' : 'Computer') + (app ? ' app' : ' browser');
  var mode = '', buf = [], t0 = (window.performance && performance.timing && performance.timing.navigationStart) || Date.now();
  function ev(name, detail, ms) { if (mode === 'OFF') return; buf.push([Date.now(), form, name, String(detail == null ? '' : detail).slice(0, 120), Math.round(ms || 0)]); if (buf.length > 400) buf.shift(); }
  var realFetch = window.fetch.bind(window);
  function send(beacon) {
    if (mode !== 'ON' || !buf.length) return;
    var body = JSON.stringify({ action: 'testLog', dev: dev, plat: plat, ev: buf.splice(0, 200) });
    if (beacon && navigator.sendBeacon) { try { navigator.sendBeacon(URL, body); return; } catch (e) {} }
    realFetch(URL, { method: 'POST', body: body }).catch(function () {});
  }
  // ---- every call to the Google script: action, time, result (nothing that was sent or received)
  window.fetch = function (url, opt) {
    if (String(url).indexOf(URL) !== 0 || !opt || !opt.body) return realFetch(url, opt);
    var action = ''; try { action = String(JSON.parse(opt.body).action || ''); } catch (e) {}
    if (/^test/.test(action)) return realFetch(url, opt);
    var start = Date.now();
    var p = realFetch(url, opt);
    p.then(function (r) { return r.clone().json(); }).then(function (j) {
      ev('req', action + (j && j.ok === false ? ':' + (j.login ? 'login' : j.nokey ? 'nokey' : j.removed ? 'removed' : 'refused') : ''), Date.now() - start);
    }, function () { ev('req', action + ':offline', Date.now() - start); });
    return p;
  };
  // ---- the page, errors, the loading box, reception intakes
  var where = /[?&]view=list/.test(location.search) ? 'hq-list' : /[?&]view=/.test(location.search) ? 'summary' : /[?&]id=/.test(location.search) ? 'event' : 'start';
  window.addEventListener('load', function () { ev('page', where, Date.now() - t0); });
  window.addEventListener('error', function (e) { ev('jserr', (e && e.message) || 'error'); });
  var taps = 0, boxSeen = false, boxDone = false;
  document.addEventListener('pointerdown', function () { if (document.querySelector('.co-load')) taps++; }, true);     // pointerdown: a tap on a label is one tap, not two
  var obs = new MutationObserver(function () {
    var loading = document.querySelector('.co-load');
    if (loading) boxSeen = true;
    if (boxSeen && !loading && !boxDone) {
      boxDone = true;
      var box = document.querySelector('.co-box'), n = box ? box.querySelectorAll('.co-item').length : 0;
      ev('loadingBox', 'events:' + n + ' taps:' + taps, Date.now() - t0);
    }
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });
  var intakeStart = 0;
  document.addEventListener('input', function (e) { if (!intakeStart && e.target.closest && e.target.closest('#rec-form')) intakeStart = Date.now(); }, true);
  document.addEventListener('submit', function (e) { if (e.target.id === 'rec-form' && intakeStart) { ev('intake', 'saved', Date.now() - intakeStart); intakeStart = 0; } }, true);
  document.addEventListener('click', function (e) {     // which way people joined (the pop-up buttons)
    var b = e.target.closest && e.target.closest('.co-j-login, .co-j-ask, [data-join], [data-yes], [data-no]');
    if (b) ev('tap', b.className.indexOf('co-j-login') >= 0 ? 'join:lead-login' : b.className.indexOf('co-j-ask') >= 0 ? 'join:request' : b.hasAttribute('data-join') ? 'join:open-popup' : b.hasAttribute('data-yes') ? 'let-in' : 'say-no');
  }, true);
  // ---- the switch in the Sheet
  function banner(run) {
    if (document.getElementById('test-banner') || lsGet('sepaSurveyDone:' + run)) return;
    var wrap = document.querySelector('.page-wrap'); if (!wrap) return;
    var b = document.createElement('div'); b.id = 'test-banner'; b.className = 'test-banner';
    b.innerHTML = '<span><b>The test is over. Thank you!</b><small>Please take the 3-minute survey.</small></span><a href="survey.html">Take the survey</a>';
    wrap.insertBefore(b, wrap.firstChild.nextSibling);
  }
  function check() {
    realFetch(URL, { method: 'POST', body: JSON.stringify({ action: 'testStatus' }) }).then(function (r) { return r.json(); }).then(function (j) {
      if (!(j && j.ok)) { if (!mode) { mode = 'OFF'; buf = []; } return; }
      var was = mode; mode = j.mode;
      if (mode === 'OFF') buf = [];
      if (mode === 'ON' && was !== 'ON') ev('start', where);
      if (mode === 'SURVEY') banner(j.run);
    }).catch(function () {});
  }
  check();
  setInterval(function () { if (!document.hidden) check(); }, 60000);
  setInterval(function () { send(false); }, 20000);
  window.addEventListener('pagehide', function () { send(true); });
  document.addEventListener('visibilitychange', function () { if (document.hidden) send(true); });
})();
