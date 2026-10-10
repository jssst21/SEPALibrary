# Changelog

## v0.16.1
- Phones and tablets: new scroll order. Logo, search bar, calendar, the red panel (buttons, then photo
  gallery), then the quick launch block, then the footer line. The quick launch links used to be at
  the very top. Sean accepted that they are now about a screen and a half down on a phone
- The logo is back on the homepage. On computers it sits on a white card at the top of the red side
  panel, in the space beside the search bar. The card is exactly as tall as the search bar plus its
  hint line, so the page is no taller than v0.16. The logo is small there (67 pixels tall). On phones
  and tablets it is centered at the very top (84 pixels tall)
- On computers the search bar is shorter: it now lines up with the navy "Sign up for DAT Shifts" bar
  and the calendar under it, and no longer crosses the red panel
- google-apps-script/sepa-backend.gs: the sign-up check no longer requires a phone number or email.
  IMPORTANT: this file is only a copy. The change does nothing until it is pasted into the Google script
  and redeployed (Admin Guide 2, "If the script code is ever changed"). The sign-up page still asks
  for phone or email until that is done and the page is updated (planned as v0.16.2)
- Version number bumped to ?v=0.16.1 on every page (footer still reads v0.16)

## v0.16
- The Contacts page (pages/contacts.html) is built. It was a "coming soon" page. The Contacts link in
  the quick launch strip already points to it
- 35 people in three sections: Leadership (8), Department Leaders (17), Team Leaders (10). Each person
  shows a round photo or initials, name, title and a clickable email address
- Built from Sean's directions document and three screenshots of the old SharePoint page: names turned
  around to first-then-last, "Disaster Action Team" shortened to DAT, the listed title changes made,
  Irvin Diaz moved to Leadership in place of Isaiah Gammache, Kristen Carmean replaced by Roy Landes,
  Larrye Loss moved to Department Leaders, Sean moved to Team Leaders, Rahel Pachter listed once (as
  Pet Liaison), everyone else under Team Leaders titled Volunteer Leader
- Emails follow the rule firstname.lastname@redcross.org. They were NOT checked against a directory.
  Two are guesses the rule does not settle: maureen.smithstreeter@ and ellen.oneill@
- Photos (26, in images/people) are cropped from the screenshots, so they are small. The nine people
  with no photo show a navy circle with their initials. Sean decided to publish the photos
- The page is public, like the rest of the site: names, titles, emails and photos are visible to anyone
- How to edit the page is explained in a note near the top of pages/contacts.html
- Homepage: the logo is gone, to get more of the page on screen without scrolling. The search bar now
  sits directly under the quick launch strip, and everything below moved up about 135 pixels. On a
  1,440-wide screen the whole calendar now fits in a window 750 pixels tall (it needed about 890)
- Quick launch strip on wide computers (1,100 pixels and up): 50 pixels tall (was 42), 16-pixel words
  (was 14), and the links are spread evenly from the left edge of the search bar to its right edge.
  Narrower computers and tablets: 15-pixel words, centered. Phones: unchanged
- With the logo gone, the homepage no longer shows the site's name anywhere except the small footer
  line. The inside pages still show the logo. To bring the homepage logo back, see the v0.15 version
  of index.html and css/style.css in the GitHub history
- Version number bumped to ?v=0.16 on every page; footer reads v0.16

## v0.15.1
- Bug fix: the inside pages (shift sign-up, forums, Browse Library and the "coming soon" pages) had been
  coming out narrower than intended on computers since v0.14, because of a change made for the homepage.
  The shift sign-up page was 524 pixels wide when it should be 760. They are back to full width and
  match v0.13.2 exactly. Phones were not affected. One line in css/style.css (.page-wrap)
- Version number bumped to ?v=0.15.1 on every page (footer still reads v0.15)

## v0.15
- LAST KNOWN GOOD POINT before this change: v0.14.5 (commit c54130c, Oct 9, 2026). To go back: GitHub
  Desktop, History tab, right-click the v0.15 commit, Revert Changes in Commit, then Push
- New homepage layout from Sean's "Ideas" slide. A red panel runs down the left side of the page, from
  the quick launch strip to just past the calendar. The search bar crosses in front of it
- In the red panel: six plain white text buttons (Onboarding, Register for Classes and Events,
  Discussion Forums, Browse Library, Mass Care, RED Talks), same links as before, each opening in a new
  tab. Hovering over a button slides it to the right, lifts it, turns the words red and shows a small
  arrow. Under the buttons is a small photo gallery that fades between three pictures
- The six picture buttons and the navy "Explore the Site" bar are gone from the homepage. The old
  button pictures are still in the images folder, unused
- The left column is narrower (330 pixels on a wide screen, was about 440), so the calendar is wider
- The logo is centered over the white area to the right of the red panel
- The calendar's key ("volunteers signed up" / "no one yet") moved from the bottom left corner of the
  calendar to just under the month line, centered. Still bold
- Phones and tablets: the scroll order is now quick launch strip, logo, search bar, calendar, then the
  red panel with the buttons and gallery as a full-width band. (The buttons used to come before the
  calendar.) While someone is typing in the search box the calendar hides, so matching buttons show
  right under the search bar
- The gallery pictures are stand-ins cropped from the old button pictures: images/gallery/photo-1.jpg,
  photo-2.jpg and photo-3.jpg. Replace those three files with real photos of the same names
- The red is the logo red (--red in css/style.css), not the brighter red on the slide
- Behind the scenes: index.html has a new "home-stage" wrapper and a "side" block; the styles are in
  the RED SIDE PANEL section at the end of css/style.css. The panel's width is one setting, --side-w
- Version number bumped to ?v=0.15 on every page; footer reads v0.15

## v0.14.5
- The key under the homepage calendar is back in the bottom left corner of the calendar box, at its
  original size and without the colored chips from v0.14.4. The one thing kept from v0.14.4 is the
  bolding: the key's text is bold and dark (it was regular weight and gray before v0.14.4)
- The calendar box is back to its v0.14.3 height
- The two navy bars around the homepage calendar are now one bar above it, reading "Sign up for DAT
  Shifts - Pick any day or time and we'll do the rest" (on the page the dash is an en dash). The bar
  under the calendar is gone. On phones the two parts stack on separate lines with no dash
- Version number bumped to ?v=0.14.5 on every page (footer still reads v0.14)

## v0.14.4
- The key under the homepage calendar is easier to notice. It is now two labeled chips, centered under
  the dates: "volunteers signed up" in light green with the green number badge, and "no one yet" in the
  same amber as the empty days. Text is larger, dark and bold (was small gray text in the bottom left
  corner). The wording did not change
- The calendar box is about 19 pixels taller to fit the chips. On phones the two chips stack
- Version number bumped to ?v=0.14.4 on every page (footer still reads v0.14)

## v0.14.3
- Two matching navy bars now frame the homepage calendar. Above it: "Sign up for DAT Shifts". Under it:
  "Pick any day or time and we'll do the rest". Both wordings are Sean's. They replace the plain heading
  "Sign up for Shifts Using the Above Calendar" and its second line, which sat under the calendar
- On computers the bar above the calendar is level with "Explore the Site", and the calendar box starts
  level with the first row of picture buttons
- All three navy bars are 42 pixels tall, the same as the quick launch strip (they were 44)
- The calendar is the same size as in v0.14.2. Sean does not want it smaller. Because it is now taller
  than the six buttons beside it, the gaps between the button rows are wider (about 43 pixels on a wide
  screen, was 12) so the last row still ends level with the bottom of the calendar. Sean accepted this
  for now because the buttons are likely to change
- Version number bumped to ?v=0.14.3 on every page (footer still reads v0.14)

## v0.14.2
- LAST KNOWN GOOD POINT before this change: v0.14.1 (commit 3201e43, Oct 9, 2026). Sean asked for that
  to be noted. To go back: GitHub Desktop, History tab, right-click the v0.14.2 commit, Revert Changes
  in Commit, then Push
- The homepage is wider on computers: the page width cap went from 1,200 to 1,400 pixels, so the side
  margins are much smaller (about 45 pixels a side on a 1,440-wide screen, was about 145). The picture
  buttons, calendar and search bar all get wider with it
- Calendar day boxes on the homepage grow with the screen, from 58 up to 70 pixels tall, so the bottom
  of the calendar stays level with the last row of picture buttons
- The page is about 60 pixels taller on a wide screen. Screens narrower than about 1,200 pixels,
  including phones and tablets, look the same as before
- The heading under the homepage calendar now reads "Sign up for Shifts Using the Above Calendar"
  (was "DAT Shift Calendar"), and the line under it reads "Pick any day or time and we will do the rest"
  (was "Click a day to sign up."). Wording is Sean's
- Because the heading says "above calendar", it now sits under the calendar on phones and tablets too
  (in v0.14.1 it was under the calendar on computers only)
- Version number bumped to ?v=0.14.2 on every page (footer still reads v0.14)

## v0.14.1
- Quick launch strip is about 10 percent thicker: 42 pixels tall on computers (was 38). On phones each
  line of words is 40 pixels tall (was 36). Text size is unchanged
- On computers the "DAT Shift Calendar" heading and "Click a day to sign up." moved from above the
  calendar to under it. The calendar box and the navy "Explore the Site" bar now start right under the
  search bar, with their tops still level. On phones and tablets the heading stays above the calendar,
  because there the calendar comes after the buttons
- Version number bumped to ?v=0.14.1 on every page (footer still reads v0.14)

## v0.14
- Quick launch bar is now a thin, solid navy strip with plain white words, like the navigation strip at
  the top of most websites. It runs edge to edge across the very top of the page, above the logo.
  It used to be a rounded navy block with white pill buttons sitting between the logo and the search bar
- Same eight links in the same order, still opening in new tabs. The small "Quick launch" label stays
- The search bar now sits directly below the logo
- The strip is about a third shorter than the old bar on computers (38 vs 60 pixels tall) and about half
  as tall on phones, where the words wrap onto three short lines
- Behind the scenes: the strip moved outside the centered page box in index.html so it can reach the
  screen edges (.quick-bar and .quick-inner in css/style.css). The page still fits the screen height the
  same way as before
- Version number bumped to ?v=0.14 on every page; footer reads v0.14

## v0.13.2
- Quick launch bar now has real links, all opening in a new tab. Eight buttons: Calendar, RC Care,
  Noggin, SCIA, Volunteer Connect, Practice RC Care, Practice SCIA, Contacts.
  "Practice Sandboxes" was split into Practice RC Care and Practice SCIA. RC Reserve was removed
- Link notes: Calendar and Volunteer Connect both go to the plain Volunteer Connection address
  (https://volunteerconnection.redcross.org/) as a best guess. SCIA and Practice SCIA use sign-in
  addresses that contain a one-time-looking code and may stop working; if so, replace them with the
  address shown in the browser after signing in. See the note above the bar in index.html
- Idea behind the bar: everything in Quick launch needs a Red Cross login; everything else on this site
  opens with no login
- New Contacts page (pages/contacts.html), a "coming soon" page until it is built
- New navy "Explore the Site" bar above the six picture buttons. On computers its top is level with the
  top of the calendar box, and the gaps between the button rows flex so the last row ends level with the
  bottom of the calendar (wider gaps in months that need six rows of days)
- "DAT Shift Calendar" heading is back to its plain style (no red, lines, or amber pill), now centered
  over the calendar
- The navy color is now one setting, --navy, at the top of css/style.css
- Version number bumped to ?v=0.13.2 (footer still reads v0.13)

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
