// "Close this tab" links on inside pages.
// Homepage buttons open pages in a new tab, so this closes that tab and the
// homepage tab underneath is still there.
// If the browser won't close the tab (for example the person came from a
// bookmark or a shared link), it goes to the homepage instead.
document.querySelectorAll('.back-link').forEach(function (link) {
  link.addEventListener('click', function (e) {
    e.preventDefault();
    var home = link.getAttribute('href');
    window.close();
    setTimeout(function () { window.location.href = home; }, 300);
  });
});
