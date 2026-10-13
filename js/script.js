// SEPA Resource Library v0.27
// Homepage search box: the full site search (js/search.js). While someone is searching, the results
// take the calendar's place; clearing the box (or pressing Esc) brings the calendar back.
(function () {
  var box = document.getElementById('search');
  if (!box || typeof SEPASearch === 'undefined') return;
  SEPASearch.attach(box, document.getElementById('ss-panel'),
    [document.getElementById('home-cal')], '');
})();
