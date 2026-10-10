# Changelog

## v0.16.13
- LAST KNOWN GOOD POINT moved to v0.16.12 (commit 93240ca) at Sean's request, just before this change
- Homepage: the logo red now fills the whole page (it was white, with a red panel down the left).
  Sean chose this from mockups for the more branded look and because the calendar "floats" on the
  red. Claude had recommended keeping white (weaker contrast for the navy sign-up bar, small white text
  on red, a lot of red to look at); Sean preferred the red
- Float: the logo card, the six buttons, the photo and the calendar share one deeper, softer drop
  shadow, so they all look lifted off the red to the same height. Sean asked for more float on the
  left buttons; the logo card, photo and calendar were matched to them. The calendar's grey outline
  is gone (the shadow does that job)
- Changes the red forced: the search hint, the footer line and the "No matches" and calendar
  messages are white; clicking into the search bar shows a white glow, not the old red one
- Phones and tablets: the page is red there too, and the logo now sits on a white card (it would have
  been a bare white rectangle on red). The card makes the top of the page about 16 pixels taller on
  phones and tablets. On computers nothing moved
- Homepage only. The inside pages are unchanged (white, and Contacts red as before). Whether they
  should follow is an open question for Sean
- One switch: the word home-red in the body tag of index.html. Delete it and the homepage is white
  with the red side panel again. The styles are one section of css/style.css, "ALL-RED HOMEPAGE WITH
  FLOATING CARDS"; the amount of float is the --float line there
- Version number bumped to ?v=0.16.13 on every page (footer still reads v0.16)

## v0.16.12
- Quick launch strip: the link words are no longer bold. They are back to the weight they had before
  v0.16.8 (600, a medium-heavy weight; v0.16.8 had made them 700). Sean asked for the bolding dropped
- Nothing else changed. The "Quick launch" label keeps its brighter color
- Version number bumped to ?v=0.16.12 on every page (footer still reads v0.16)

## v0.16.11
- Quick launch bar: back to the traditional strip, navy from edge to edge across the top of the page.
  Sean found the centered bar (v0.16.10) and the arrow end (v0.16.9) too busy. The arrow point, the
  rounded left end and the centering are gone, and the red side panel starts under the strip again
- The strip is flat navy again: Sean had the soft sheen and the shadow under it (both from v0.16.8)
  taken off. The sign-up bar keeps its glossy finish and gleam
- The words are pulled in: on computers 1,280 pixels wide and up, the label and the nine links sit
  together as one group in the middle of the strip instead of spreading from edge to edge. Sean asked
  for this because "Contacts" sat nearly at the right edge of the screen (26 pixels from it on his
  MacBook Air; now about 180). From 1,100 to 1,279 wide there is no spare room and the links still run
  nearly the full width
- Kept: the nine links including RC Reserve; the thinner height Sean
  asked for in v0.16.10 (45 pixels on computers, was 50); the bolder link words and brighter "Quick
  launch" label from v0.16.8 (Claude's assumption that "flat navy" meant the background, told to Sean)
- The stronger search bar from v0.16.9 is unchanged
- Tablets and phones are unchanged
- RC Reserve still has no address and still does nothing when clicked
- Version number bumped to ?v=0.16.11 on every page (footer still reads v0.16)

## v0.16.10
- Quick launch bar, at Sean's request: 10% thinner (45 pixels tall on computers, was 50), and on
  computers 1,280 pixels wide and up it is now centered on the page instead of pinned to the left
  edge. It is only as wide as its nine links need, so there is free space at both ends (about 145
  pixels each side on his MacBook Air). The left end is rounded (Sean chose that over an arrowhead
  shape there); the right end keeps the arrow point
- The red side panel now runs up behind the bar to meet the red line at the top, so the red column
  is one unbroken shape and the navy bar floats across it (Sean picked this over white behind the bar)
- The links sit a little closer together than in v0.16.9
- Everything under the bar moved up 5 pixels on computers. The calendar is 5 pixels closer to fitting
  on 1536x864 laptops (about 7 pixels cut off, was 12)
- Computers narrower than 1,280, tablets and phones keep the plain full-width strip. Computers from
  1,100 to 1,279 wide get the thinner height only. Tablets and phones are unchanged
- RC Reserve still has no address and still does nothing when clicked
- Version number bumped to ?v=0.16.10 on every page (footer still reads v0.16)

## v0.16.9
- Sean found the quick launch strip drowned out the search bar after v0.16.8. He approved a mockup of
  two changes together: a shorter, stylized strip and a stronger search bar
- Quick launch: RC Reserve added as a ninth link, between Volunteer Connect and Practice RC Care (live
  systems first, then the two practice ones, then Contacts; the position is Claude's choice).
  ITS ADDRESS IS NOT FILLED IN YET. Sean has not given it, so the button shows but does nothing when
  clicked. See the note above the strip in index.html for how to fill it in
- Quick launch on computers 1,280 pixels wide and up: the navy strip stops short of the right edge
  (about 110 pixels short on screens 1,440 wide and up, about 36 on narrower ones) and ends in an arrow
  point. The red line above it still runs the full width. The links are closer together: about 28
  pixels apart on Sean's MacBook Air, where they were about 70
- Quick launch on narrower computers, tablets and phones: still the plain full-width strip, now with
  nine links. From 1,100 to 1,279 wide the links have slightly less padding so all nine fit on one line
- Search bar: thicker navy border (3 pixels, was a 2 pixel grey-brown one), darker and heavier
  magnifying glass, larger and darker words, and a glossy navy "Search" button at the right end that
  matches the sign-up bar. The search still works as you type; the button is a visual cue and clicking
  it puts the cursor in the box. No "Search" button on phones, where it would cover the words
- The search bar is the same height as before (1 pixel shorter at some sizes) and the calendar has
  not moved
- Each change is its own labeled section of css/style.css ("QUICK LAUNCH: NINE LINKS AND THE ARROW
  END" and "STRONGER SEARCH BAR") and can be removed separately
- Version number bumped to ?v=0.16.9 on every page (footer still reads v0.16)

## v0.16.8
- The two navy bars on the homepage are more eye-catching (Sean asked; he approved a mockup first)
- "Sign up for DAT Shifts" bar: glossy raised finish (lighter navy at the top, darker at the bottom, a
  thin highlight along the top edge, a soft shadow under it). The words are larger on computers (16
  pixels, was 14) with a faint shadow behind them. A band of light sweeps across the bar once, just
  under a second after the page loads, and again when the mouse moves onto it. It does not repeat on
  its own and is off for people whose computer is set to reduce motion
- The sign-up bar is now a link: clicking anywhere on it opens the shift sign-up page in a new tab.
  It was only a heading before, though it was shaped like a button. It brightens and lifts slightly
  on hover. Clicking a day in the calendar still works as before
- Quick launch strip: bolder link words, a slightly larger and brighter "Quick launch" label, a soft
  top-to-bottom sheen and a shadow under the strip. Nothing on it moves; this is deliberately the
  quieter of the two
- Neither bar is taller than before on computers and tablets, so nothing else moves. On phones the
  sign-up bar is 2 pixels taller
- All of it is one section of css/style.css, "SHINE ON THE TWO NAVY BARS". Deleting that section
  brings back the flat bars (the bar stays a link)
- Version number bumped to ?v=0.16.8 on every page (footer still reads v0.16)

## v0.16.7
- Homepage on computers: the whole page now enlarges to fit the screen, like enlarging a photo. On a
  window wider than 1,540 pixels everything (quick launch strip, buttons, search bar, calendar, text)
  grows in proportion until the page fills the window, up to 25% larger. It looks the same on a
  laptop and a big monitor, only bigger. Sean asked why the site did not "simply resize" like other
  sites, then chose this from three options
- Why it was needed: the red panel runs to the left edge of the screen, so spare room on a wide
  screen showed as a band of empty red beside the buttons (other sites have the same spare room, but
  it is blank on both sides and nobody notices). Making the page wider (v0.16.6, 1,920) fixed the
  red but Sean found the calendar too wide
- Measured: on his MacBook Air (window about 1,670 wide) the page is 8.5% larger with 26 pixels of red
  left of the buttons (it was about 160 before today). On a 1920x1080 screen, the most common, it is
  24% larger with 30 pixels of red (it was 276). The calendar keeps its shape and takes about 73% of
  the window width on both
- It also fits the height: the page never enlarges so far that the bottom of the calendar leaves
  the screen. In a short window it enlarges less and some red returns (about 50 pixels at 800 tall)
- Unchanged: laptops 1,540 wide or less, tablets, phones and the inside pages
- Known costs: on a 1920x1080 screen the footer line is just below the fold. Past 1,920 wide the
  enlarging stops at 25% and the side margins return. The gallery photos are enlarged too. Tested only
  in Chrome; a browser that does not understand the new line shows the page at normal size, centered
- The numbers are at the top of css/style.css (--page-w 1540px, --page-h 760px, --fit-max 1.25) and the
  one working line is under FIT THE SCREEN in the same file. Deleting that line switches it off
- An earlier v0.16.7, never pushed, only set the page cap to 1,540 ("split the difference" between
  1,400 and what Sean saw at 1,920). This version keeps that 1,540 as the design size and adds the
  enlarging on top
- Version number bumped to ?v=0.16.7 on every page (footer still reads v0.16)

## v0.16.6
- Homepage on computers: the page may now be up to 1,920 pixels wide (it was capped at 1,400). Sean
  saw about 160 pixels of empty red to the left of the buttons on his MacBook Air, whose window is about
  1,670 pixels wide. The page was centered with spare room on both sides, and on the left that spare
  room is red because the red panel runs to the screen edge. Now the red left of the buttons is 24
  pixels on any screen up to 1,920 wide, and the quick launch strip, search bar and calendar spread to
  fill the window. The calendar gets wider, not taller, so the page is the same height as before
- Why 1,920: Sean asked that the page be designed for the most common screen, not his. 1920x1080 is the
  most common computer screen by a wide margin (about 27% of US computers, StatCounter, Sept 2026); on
  it the old page showed about 276 pixels of empty red. Screens wider than 1,920 still get margins
- The width is now one number, --page-w, at the top of css/style.css. To go back to the old look,
  change 1920px to 1400px there
- Phones, tablets and the inside pages are unchanged
- ROLLBACK POINT: v0.16.5 is the version to return to if Sean does not like the wider page (see WHERE
  WE LEFT OFF.md)
- Version number bumped to ?v=0.16.6 on every page (footer still reads v0.16)

## v0.16.5
- Contacts page: Irvin Diaz's title now reads "PhilaBucks Chapter Lead" (it said "PhilaBucks Chapter
  Volunteer Lead"). Sean's correction, Oct 10, 2026
- Version number bumped to ?v=0.16.5 on every page (footer still reads v0.16)

## v0.16.4
- Contacts page: red background (the logo red). The logo is centered at the top on a white card and
  larger (140 pixels tall on computers, 110 on phones; it was 72 and 56, top left). The page title, the
  intro line and the three section headings are white. The people cards stay white, now with a soft
  shadow. "Close this tab" is white, top right
- The red background is switched on by the words "page-red" in the body tag of pages/contacts.html.
  Any other inside page can be made red the same way (see "Red page" at the end of css/style.css)
- Sean said look-and-feel changes are done for now after this one
- Version number bumped to ?v=0.16.4 on every page (footer still reads v0.16)

## v0.16.3
- The red accent line above the quick launch strip is twice as thick: 12 pixels, was 6
- Version number bumped to ?v=0.16.3 on every page (footer still reads v0.16)

## v0.16.2
- A thin red line (6 pixels, the logo red) now runs along the top edge of the navy quick launch strip,
  as an accent to help people notice it. On phones the strip sits right under the red panel, so the
  line blends into the red there
- The homepage calendar box has a slight drop shadow, the same soft shadow the search bar has
- Version number bumped to ?v=0.16.2 on every page (footer still reads v0.16)

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
  for phone or email until that is done and the page is updated (a later version)
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
