// SEPA Resource Library - phone number tidying (v0.27.3)
// Any phone box on the page (type="tel" or inputmode="tel") is tidied when the person leaves it:
// 2674323792, (267) 432 3792 or 1-267-432-3792 all become 267-432-3792.
// Anything else (an extension, a short number, words, two numbers) is left exactly as typed.
// Pages that use it: Escalation Form, Reception Center Form, Sign Up for DAT Shifts.
(function () {
  function tidy(v) {
    if (!/^[\d\s().+\-]+$/.test(v)) return v;                 // letters or other text: leave it
    var d = v.replace(/\D/g, '');
    if (d.length === 11 && d.charAt(0) === '1') d = d.slice(1);
    if (d.length !== 10) return v;
    return d.slice(0, 3) + '-' + d.slice(3, 6) + '-' + d.slice(6);
  }
  document.addEventListener('change', function (e) {
    var el = e.target;
    if (!el || el.tagName !== 'INPUT' || !(el.type === 'tel' || el.getAttribute('inputmode') === 'tel')) return;
    var v = el.value.trim(), t = tidy(v);
    if (t === el.value) return;
    el.value = t;
    el.dispatchEvent(new Event('input', { bubbles: true }));   // so the form saves and shares the tidy version
  }, true);
})();
