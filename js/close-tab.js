// "Close this tab" links on inside pages.
// Homepage buttons open pages in a new tab, so this closes that tab and the
// homepage tab underneath is still there.
// If the browser won't close the tab (for example the person came from a
// bookmark or a shared link), it goes to the homepage instead.
document.querySelectorAll('.back-link').forEach(function (link) {
  link.addEventListener('click', function (e) {
    if (link.getAttribute('data-leave')) return;     // v0.27.57: "Back to current events" on the Escalation and Reception forms is a plain link
    e.preventDefault();
    var home = link.getAttribute('href');
    window.close();
    setTimeout(function () { window.location.href = home; }, 300);
  });
});
