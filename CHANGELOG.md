# Changelog

## v0.13.1
- Quick launch bar reordered: Calendar, RC Care, Noggin, SCIA, Volunteer Connect, Practice Sandboxes,
  Contacts, RC Reserve (links are still placeholders)
- Quick launch bar is now navy (#1f3556) with white buttons (was soft blue-gray)
- On computers the six picture buttons now start level with the top of the calendar box, not with the
  "DAT Shift Calendar" heading. This leaves an open space above the buttons, left of the heading
- "DAT Shift Calendar" heading is centered over the calendar: larger, logo red, a short line on each
  side, and "Click a day to sign up." in a soft amber pill
- Slightly less space above the search bar on computers so the whole calendar still fits on screen
- Version number bumped to ?v=0.13.1 (footer still reads v0.13)

## v0.13
- New Quick launch bar above the search bar (soft blue-gray): RC Care, Noggin, SCIA, Volunteer Connect,
  Practice Sandboxes, RC Reserve, Calendar, Contacts. THE EIGHT LINKS ARE PLACEHOLDERS (href="#") until
  Sean supplies the addresses; see the note above the bar in index.html
- Homepage buttons are now six picture buttons, two across: Onboarding, Register for Classes and Events,
  Discussion Forums, Browse Library, Mass Care, RED Talks. Design rule: keep buttons small and two across
  so the calendar stays the main thing on the page
- The six pictures are PLACEHOLDERS made from the three photos already on the site
  (images/onboarding.jpg, register-classes-events.jpg, discussion-forums.jpg, browse-library.jpg,
  mass-care.jpg, red-talks.jpg). Final photos still to be chosen
- "Volunteer Actions" and "Resources" headings removed
- Buttons removed from the homepage: Sign Up for DAT Shifts (the calendar does the same job),
  Practice RC Care and SCIA Here (now Practice Sandboxes in the Quick launch bar),
  FAQs and Common Documents and Training Center (both now inside Browse Library)
- Browse Library page is back (pages/library.html) with FAQs and Common Documents and Training Center
- "Are You New?" is now "Onboarding". It still opens pages/new.html, a "coming soon" page, until the
  real Onboarding page is built
- If the homepage calendar cannot load, its message now links to the shift sign-up page
  (it used to point to the removed Sign Up for DAT Shifts button) (js/home-calendar.js)
- tools/make_button.py has five new icons: person-check, chat, book, home, play
- Old picture-button images (are-you-new, classes-events-calendar, sign-up-shifts) stay in the images
  folder, unused
- Still to do: phone layout review (Quick launch bar is tall on phones); on phones the green signup count
  overlaps the day number in the calendar
- Footer now reads v0.13; version number bumped to ?v=0.13.0

## v0.12
- Homepage search bar and its hint now run across the full width, above both the buttons and the
  DAT shift calendar (computers only; phones are unchanged)
- Footer now reads v0.12; version number bumped to ?v=0.12.0
- Note on numbering: v0.10.1, v0.10.2 and v0.11 (the four-button homepage and the Browse the Library
  page, saved in GitHub as "v 0.10.2" and "Version 12") were rolled back on Oct 6, 2026 and are not live.
  They remain in the GitHub history. Changes are now being re-applied one step at a time from v0.10

## v0.10
- Homepage shows the DAT shift calendar: buttons on the left third, calendar on the right two-thirds
  (on phones the calendar sits under Volunteer Actions). Green number = volunteers signed up that day;
  upcoming days with no one signed up are light amber. Clicking a day opens the shift page on that day
  (js/home-calendar.js; shift page reads ?date= from the link)
- Calendar hides while someone types in the search box
- Small italic hint under the search box: Site search example (6409)
- All reds now match the logo red #ae273a (was #651317): buttons, links, calendar, picture-button banners,
  error messages. tools/make_button.py uses the logo red for future buttons
- Search bar stands out more: darker outline, soft shadow, magnifying-glass icon
- Picture-button links carry ?v=0.10.0 so browsers show the recolored pictures
- Footer now reads v0.10; version number bumped to ?v=0.10.0

## v0.9.1
- Inside pages: "Back to home" link is now "Close this tab" (homepage buttons open new tabs).
  If the browser won't close the tab (bookmark or shared link), it goes to the homepage instead (js/close-tab.js)
- Thank You pop-up on the shift page uses the same "Close this tab" link
- Version number bumped to ?v=0.9.1

## v0.9
- Daily 7 AM email report of new shift signups (one-time + recurring) to the Settings admin email(s)
- Instant per-signup emails now off by default (Settings switch: YES/NO)
- Backend redeployed as version 3 (same URL); 7 AM schedule turned on (Eastern time)

## v0.8
- Shift page headings: Step One: Choose a Day / Step Two: Choose a Shift / Step Three: Your Information
- "Thank You!" pop-up after signing up
- Shift page opens with today already selected, so the shift buttons show right away
- Shift signup reworked: 4 standard shifts (12-6 AM, 6 AM-12 PM, 12-6 PM, 6 PM-12 AM) with no limit,
  plus Custom (start/end sliders, 6-hour minimum, overnight allowed) and Recurring
  (pick weekdays, repeats every week until an admin stops it)
- Calendar shows how many volunteers are signed up each day; each shift shows how many cover it (no names)
- Google Sheet: new Recurring tab, Signups tab rebuilt with new columns, old Shifts tab removed,
  "Minimum hours for a custom shift" added to Settings. Backend redeployed as version 2 (same URL).

## v0.7
- Connected to Google: Sheet "SEPA Library Data" in sepalibrary@gmail.com (js/config.js has the link)
- Shift signup calendar and forums are LIVE (no more preview mode)
- "Sign Up for DAT Shifts" button now opens the new calendar instead of the weekly Microsoft Form
- Signup alert emails go to sepalibrary@gmail.com (Settings tab)

## v0.6
- Discussion Forums page built (pages/forums.html, js/forums.js). For now no sign-up:
  people type their name to post. Member logins are built in but switched off.
- Shift calendar and forums now share ONE Google Sheet and one setup (Admin Guides, Guide 2,
  google-apps-script/sepa-backend.gs). The connection URL lives in js/config.js.
- Both pages run in preview mode until the Google Sheet is connected.
- New "Admin Guides" folder with numbered step-by-step guides (start with "README - Start Here").

## v0.5
- "DAT & Client Care Libraries" button renamed "FAQs and Common Documents"
- "Mass Care Libraries" renamed "Mass Care Resources"
- Stylesheet links carry a version number (?v=0.5.1) so browsers load fresh styles after updates. Bump it each release.
- All homepage buttons open in a new tab
- "Sign Up for DAT Shifts" button uses a picture (images/sign-up-shifts.jpg)
- "Classes and Events Calendar" button uses a real class photo with the matching red banner (images/classes-events-calendar.jpg)
- tools/make_button.py builds the matching red-banner button pictures
- "Are You New?" button now uses the volunteer group photo with a matching red banner (images/are-you-new.jpg)
- All inside pages now match the homepage look (logo, "Back to home" link) and their titles match the buttons

## v0.4
- Photo gallery removed for now
- Logo centered at top on a white background
- Navigation shown as button cards (Volunteer Actions and Resources)
- "Are You New?" button uses a picture (images/are-you-new.png)
- Practice button renamed "Practice RC Care and SCIA Here"
- New DAT shift signup calendar (pages/shifts.html), not yet linked from homepage. Signups go to a Google Sheet.
  Shifts, spots and admin email are edited in that Sheet. Setup: Admin Guides, Guide 2
- Old weekly Microsoft Form link (for reference): https://forms.cloud.microsoft/pages/responsepage.aspx?id=Ql1b3dPA0kq18WDts68nceEMzpJPqCZKouSpVwwiJZtUNlo3WVYzT1kyOTlRSVZMTUdBRjhVS05QWC4u&route=shorturl

## v0.3
- Homepage rebuilt to approved design: left third navigation, right two-thirds photo gallery
- Real SEPA logo (images/logo.png)
- Brand color #651317
- Sign Up for DAT Shifts and Classes & Events buttons now link to the real pages
- Search box filters the buttons as you type
- Photo gallery: drop photo-1.jpg to photo-6.jpg into images/gallery and they appear automatically
- Unpushed July 29 draft saved in archive/july29-draft (not used by the site)

## v0.2
- New launchpad homepage
- Volunteer Actions section
- Resources section
- Placeholder pages
- New project structure
