// SEPA Resource Library v0.3
// Search box: as you type, only the matching buttons stay visible.
(function () {
  var box = document.getElementById('search');
  if (!box) return;
  var buttons = document.querySelectorAll('.nav-btn');
  var labels = document.querySelectorAll('.nav-label');
  var none = document.querySelector('.no-results');

  box.addEventListener('input', function () {
    var q = box.value.trim().toLowerCase();
    var shown = 0;
    buttons.forEach(function (b) {
      var match = b.textContent.toLowerCase().indexOf(q) !== -1;
      b.style.display = match ? '' : 'none';
      if (match) shown++;
    });
    labels.forEach(function (l) { l.style.display = q ? 'none' : ''; });
    if (none) none.hidden = shown !== 0;
  });
})();
