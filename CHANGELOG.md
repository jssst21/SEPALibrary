# Changelog

## v0.27.68 (Oct 23, 2026)
- SEPA TOOLS APP: third Sandboxes tile "Practice RC Respond/Noggin" (Sean). Pink, Practice tag, bell icon like the Noggin tile; opens the RC Respond training site https://ops-train-rcview-redcross.nogginapp.io/signin (the real address inside the Outlook safe link Sean sent).
- app/sw.js CACHE is now sepa-tools-34
- Version number is now ?v=0.27.68 on every page and the homepage footer reads v0.27.68

## v0.27.67 (Oct 21, 2026) - Google script only, during the stress test
- "NO CONNECTION" UNDER LOAD FIXED (stress test, Oct 21). Every request waited in one line for the script lock (up to 20 s); with many phones checking in every few seconds the line passed 20 s and requests failed (Executions showed most doPost calls failing at ~20.5 s). Reads and plain check-ins (escGet, escList, recGet, recList, recAsks, recPing, evLogGet, evPhotoGet, coOpen, askList, askStatus, testStatus, testLog, and escSync with nothing typed) no longer wait in the line; saves still do (tryLock 25 s, then "The system is busy. Please try again").

## v0.27.66 (Oct 21, 2026)
- CALMER BUTTONS ON THE THREE EVENT FORMS (Sean: full-width buttons were visual clutter; smaller, centered, still legible). Escalation, Reception Center and Daily Shelter Report: buttons such as + Add a responder, + Add a lead, Add to the log, See all entries, Add photo, Share the Scene Summary and Send HQ the summary link are centered and sized to their words (16px text, at least 44px tall), same colours.
  - Kept full width: buttons inside pop-ups, and Reception's "Save and start the next intake" (the main repeated action).
  - Checked every screen of the three forms at phone width: nothing scrolls sideways, no page errors.
- Website only (css/style.css). app/sw.js CACHE is now sepa-tools-33
- Version number is now ?v=0.27.66 on every page and the homepage footer reads v0.27.66

## v0.27.65 (Oct 21, 2026)
- JOIN POP-UP: REQUEST ACCESS FIRST (Sean: people saw the log in first, did not know Request access was below, and went to find the lead to say they do not know the password, which defeats the remote request). Escalation, Reception Center and Daily Shelter Report (one shared pop-up, js/current-ops.js):
  - Top: "Joining to help? Ask to be let in", Your name, Your phone (optional; not on the Shelter Report), Request access.
  - Below: "or", "Lead or HQ? Log in to open it now", User name, Password, Log in and open. The name typed at the top is used for both.
  - Checked on iPhone SE, iPhone 15, Pixel 7, Galaxy S8, iPad and a laptop (Chrome device emulation): Request access is on screen without scrolling on all of them, it sends, and Log in and open still works.
- No Google script change.
- app/sw.js CACHE is now sepa-tools-32
- Version number is now ?v=0.27.65 on every page and the homepage footer reads v0.27.65

## v0.27.64 (Oct 21, 2026) - Google script only
- HQ AND LEAD LOG IN WORK ON EVERY RECEPTION CENTER AGAIN (Sean: "This center needs one of its phones to check in first" blocked even the HQ log in). Some centers had no join code stored (started before v0.27.49, or all their phones removed), so Join > log in, Let in and the summary's join link had nothing to hand out. The script now makes a join code for such a center the first time it is needed; phones already on the center keep theirs.
- No website change: paste the script and deploy a New version.

## v0.27.63 (Oct 21, 2026)
- WARNING BEFORE HQ REMOVES THE ONLY LEAD (Sean: an event should have a lead, but it does not have to be the original; HQ can always add one). When HQ taps Remove on the last lead: "NAME is the only lead. Remove anyway? You can make someone else a lead, or yourself, any time." With two or more leads the usual question shows. No Google script change.
- app/sw.js CACHE is now sepa-tools-31
- Version number is now ?v=0.27.63 on every page and the homepage footer reads v0.27.63

## v0.27.62 (Oct 21, 2026)
- HQ CAN REMOVE ANY LEAD, THE ONE WHO STARTED IT TOO (Sean: otherwise the original lead keeps getting requests to join for days or weeks). Replaces the Oct 15 rule "the lead who started it can never be removed". NEEDS THE GOOGLE SCRIPT UPDATE (paste and New version).
  - Escalation and Reception, in "Who is on this ..." on any screen where HQ is logged in: Remove now shows on every lead, including the original one. It asks first, as before.
  - The removed phone leaves the event within about a minute (back to Current Operations). What they entered stays. A Reception lead who started the center also loses the lead key's powers on the Google side straight away.
  - Leads still cannot remove other leads.
- app/sw.js CACHE is now sepa-tools-30
- Version number is now ?v=0.27.62 on every page and the homepage footer reads v0.27.62

## v0.27.61 (Oct 21, 2026)
- "LOGGED IN AS HQ / LEAD" WITH LOG OUT (Sean: he could not tell whether he was logged in as HQ or as Lead, and moves between the two). NEEDS THE GOOGLE SCRIPT UPDATE (paste and New version).
  - Escalation and Reception, on both screens: under the place name in the pinned bar, "Logged in as HQ" (yellow) and/or "Logged in as Lead" (navy; "and as Lead" when both), each with its own Log out. A phone that is neither shows "On this worksheet / reception center as a responder".
  - Log out as HQ: takes the HQ log in off this phone (it is one log in for all three forms). Leads stay leads.
  - Log out as Lead (Sean: option A): the phone stays on the event as a responder (keeps typing and the Running log) but loses the lead's buttons. The script marks it a responder so it is not made a lead again by itself. Logging in as lead again (from "+ Add a responder" / "+ Add a lead", or Make me a lead for HQ) makes it a lead again. From a summary it goes to the Worksheet / Intake screen (responders cannot open the summary). If it is the only lead, it asks first.
- "MAKE ME A LEAD" NOW SHOWS FOR ANY PHONE WITH THE HQ LOG IN (Sean did not see it: his phone was on the worksheet as a responder, so "+ Add a lead" asked for the password). That phone also gets the lead's add buttons without a password.
- app/sw.js CACHE is now sepa-tools-29
- Version number is now ?v=0.27.61 on every page and the homepage footer reads v0.27.61

## v0.27.60 (Oct 20, 2026)
- REQUESTS TO JOIN: THE BOX NOW GOES AWAY (Sean: after Let in or No the yellow box would not disappear). NEEDS THE GOOGLE SCRIPT UPDATE (paste and New version).
  - Reception Summary: the lead who started the center could not answer from the Summary (the page did not send the center's join code, so the script refused, and the same request came back every few seconds). Fixed.
  - Daily Shelter Report: requests only refreshed when something else on the report changed, so one could show late or stay after someone else answered. Requests now come and go within seconds.
  - Everywhere: if an answer does not go through, the request says why (no connection, HQ log in run out, ...) and Let in / No work again, instead of quietly coming back.
- HQ ANSWERS REQUESTS FROM EVERY SCREEN (Sean: leads and HQ from both summary and intake). New: HQ on the Escalation worksheet and on a Reception intake screen sees requests and who is on it, and can answer. (Leads already could on both screens; HQ already could on the summaries.)
- "MAKE ME A LEAD" FOR HQ (Sean: as HQ he could not add himself as a lead). In "+ Add a lead", an HQ phone that is not a lead yet gets "Make me a lead" at the top (name, no password again). The phone joins the event as a lead: on the worksheet it switches from HQ view to the lead's worksheet; on the summaries it reloads as a lead.
- app/sw.js CACHE is now sepa-tools-28
- Version number is now ?v=0.27.60 on every page and the homepage footer reads v0.27.60

## v0.27.59 (Oct 20, 2026)
- ADD A RESPONDER / ADD A LEAD WHERE PEOPLE LOOK (Sean: people get confused switching between the worksheet and the Scene Summary, and "Add a lead" seemed to have gone; it had been pushed far down by the Running log). NEEDS THE GOOGLE SCRIPT UPDATE (paste and New version) BEFORE the push.
  - Escalation AND Reception Center, on BOTH screens (Worksheet / Intake and Scene Summary / Summary): "+ Add a responder" with "+ Add a lead" right under it, directly under "Who is on this ...", above the Running log.
  - Every phone on the event sees them. A lead or HQ goes straight through. Anyone else gets a pop-up asking for the lead or HQ user name and password; logging in makes that phone a lead (the same as Join > log in) and carries on.
  - The same pop-up has "Don't know the password?" with "Send a link to request to join" (Sean: most of our people are 65+, bring things to them). The link (form?ask=ID) opens that event's Join pop-up straight away; the new person types their name, taps Request access, and a lead or HQ taps Let in.
  - "Add a lead" still makes someone already on the event a lead (a new person is added as a responder first). A link that makes a stranger a lead would get around the password, so there is none (Sean agreed).
  - HQ typing into a worksheet now gets "Add a lead" too. HQ on either summary can send the join link (the Google script now gives HQ the join code there).
  - The old "For your team on scene" / "For your team" buttons further down, and the extra "Add a responder" at the bottom of the worksheet, are gone (one place for them). "Share the Scene Summary" and "Send HQ the summary link" stay where they were.
  - Request access / Let in for people without a password is unchanged.
- app/sw.js CACHE is now sepa-tools-27
- Version number is now ?v=0.27.59 on every page and the homepage footer reads v0.27.59

## v0.27.58 (Oct 20, 2026) - Google script only
- OLDER ESCALATION WORKSHEETS CAN BE OPENED AGAIN (Sean: worksheets started before Oct 15 could not be opened with any login, so they could not be used as demos or cleared).
  - Cause: worksheets started before v0.27.28 never stored the code that "Join > log in and open" (and HQ letting someone in) hands out, so the script refused every login for them.
  - Fix: the first time someone logs in to one of these (lead or HQ login), or HQ lets someone in, the script makes it a second code. Phones already on the worksheet keep working with their own code.
  - No website change: paste the script and deploy a New version.

## v0.27.57 (Oct 20, 2026)
- ESCALATION AND RECEPTION CENTER FORMS ALWAYS OPEN ON "CURRENT OPERATIONS" (Sean: closing an event and opening the form again went straight back into the last event instead of the "looking for current events" screen).
  - Opening either form plainly (the app, the website, a bookmark) now always lands on the Start screen with Current Operations. The events this phone is on are listed there; tap one to go in.
  - Links that name an event (join links, the Current Operations entries, the Worksheet/Intake and Summary switch) still go straight in.
  - Reception only: if intakes on this phone are still waiting to be sent, it goes back into that center so they get sent.
  - Inside an event (worksheet, intake screen, Scene Summary, Summary) the top-right "× Close this tab" now reads "← Back to current events" and goes back to that screen (Sean: closing the app or leaving the event should land on the select-event screen). Elsewhere it still closes the tab.
  - No script change.
- app/sw.js CACHE is now sepa-tools-26
- Version number is now ?v=0.27.57 on every page and the homepage footer reads v0.27.57

## v0.27.56 (Oct 20, 2026)
- RUNNING LOG AND PHOTOS ON THE ESCALATION AND RECEPTION CENTER FORMS (Sean). NEEDS THE GOOGLE SCRIPT UPDATE (paste and New version) BEFORE the push.
  - Both forms now have the Daily Shelter Report's Running log, same look and same workings: type, "Add to the log", each entry stamped with the time and the person's name; "Flag as an issue" keeps it in red at the top until someone removes the flag; the box shows flagged issues plus the 3 newest, older ones scroll inside it; "See all entries" opens them all; HQ can edit or remove an entry (marked by HQ).
  - Where: Escalation, near the top of the worksheet (under who is on it) and in the Scene Summary; Reception, above the intake form and in the Summary. Anyone on the event can post (responders, leads, HQ). No midnight rollover: one log per event.
  - HQ's Download for Excel now includes the log under the worksheet boxes / intakes.
  - "Add photo" at the very bottom of both forms (and their summaries). Photos never show in the form: once there are any, a "See photos (2)" button opens them in a pop-up. Shrunk on the phone first (1600 px JPEG), at most 30 per event. Saved in a new private Drive folder "SEPA Event Photos" (not shared; the forms fetch them through the script, so only people on the event and HQ see them). HQ can remove a photo.
  - Closing a reception center deletes its log and photos with it (client details are never kept). A cleared escalation worksheet keeps its log and photos, like the copy of the worksheet.
  - New js/event-log.js (shared by both forms); new Sheet tabs "Event Log" and "Event Photos" (made by themselves).
- app/sw.js CACHE is now sepa-tools-25
- Version number is now ?v=0.27.56 on every page and the homepage footer reads v0.27.56

## v0.27.55 (Oct 18, 2026)
- SEPA TOOLS APP: SANDBOXES AND COMMUNITY (Sean).
  - "Practice RC Care" and "Practice SCIA" are now one pink "Sandboxes" tile (Practice tag, new sandbox icon). It opens its own grid (#sandboxes, with Back) holding the two practice tiles, the same way Mass Care works.
  - The free spot is a new "Community" tile (camera icon) that opens the forum's photo board (pages/forums.html?b=photos, "Photos, stories and shout outs").
- app/sw.js CACHE is now sepa-tools-24
- Version number is now ?v=0.27.55 on every page and the homepage footer reads v0.27.55

## v0.27.54 (Oct 18, 2026)
- ONBOARDING PAGE, FOURTH TEAM LEADER CONTACT (Sean). Irvin Diaz (PhilaBucks Chapter Lead, irvin.diaz@redcross.org, photo from the Contacts page) added after Michael Bradley in step 1 "Start with your Team Leader", on the English and Spanish pages.
  - The line above now reads "Email any of these four" / "estas cuatro personas".
  - The four cards sit in a 2x2 grid on wide screens (was three across); phones unchanged (one per row).
- Version number is now ?v=0.27.54 on every page and the homepage footer reads v0.27.54

## v0.27.53 (Oct 17, 2026)
- DAILY SHELTER REPORT, CALMER MAIN SCREEN (Sean: too many buttons and boxes the same size; the carried-over issues and the log input should be the main thing on screen).
  - Under the shelter name there is now a small bar with two pills: "Add/remove supervisor" and "6409 Supplies" (Beta tag, plus a number when 6409s are open).
  - The Supervisors box and the Supplies (6409) box are gone from the main screen. "Add/remove supervisor" opens a pop-up with the list of supervisors, their Remove links and "+ Add supervisor" (same Add and Remove steps as before). "6409 Supplies" opens the shelter's 6409s as before.
  - The Carried-over issues box is about 20% smaller (padding, heading and text), same red border and place.
  - People asking to join still show at the top of the report.
- app/sw.js CACHE is now sepa-tools-23
- Version number is now ?v=0.27.53 on every page and the homepage footer reads v0.27.53

## v0.27.52 (Oct 17, 2026)
- STRESS TEST LOGGING AND SURVEY (Sean's stress test of the Escalation and Reception Center forms). NEEDS THE GOOGLE SCRIPT UPDATE (paste and New version).
  - New js/test-log.js, on the Escalation and Reception Center forms ONLY. It does nothing unless the Google Sheet's Settings tab says "Stress test: OFF, ON or SURVEY" = ON (rows added by themselves; starts OFF), so people trying the forms on other days are not counted. "Stress test: run name" labels the run.
  - While ON it logs to a "Test log" tab, never anything typed: each call to the Google script (action, time, worked or not), page loads, how long "Looking for current events..." took and how many taps happened during it, how long each reception intake took, which way people joined (lead log in / request / let in / no), page errors, and the kind of device (iPhone / Android / computer, app or browser). Each phone has a random test code.
  - SURVEY: the two forms show "The test is over. Thank you! Please take the 3-minute survey." with a button to the new survey page (pages/survey.html, six questions, name optional). Answers go to a "Test survey" tab. The banner goes away on a phone once it has answered.
  - Sean starts and ends it by telling Claude "begin test" / "end test" (see WHERE WE LEFT OFF).
- WEBSITE BETA TESTS (Sean: mirrors the app). On the Mass Care page the 6409 button is now "Beta Tests" (BETA tag); it opens the new pages/beta.html with 6409 Requisition, Feeding and Offline SCIA, each tagged BETA.
- Version number is now ?v=0.27.52 on every page and the homepage footer reads v0.27.52

## v0.27.51 (Oct 17, 2026)
- CURRENT OPERATIONS: ESCALATION WORKSHEETS NAMED BY THEIR ADDRESS, WITHOUT THE HOUSE NUMBER (Sean: they all showed as "Worksheet"). NEEDS THE GOOGLE SCRIPT UPDATE (paste and New version).
  - "99 Johnson" shows as "Johnson"; "99 Johnson Street, Philadelphia, PA 19104" as "Johnson Street, Philadelphia" (no house number, state or zip; at most the first two parts).
  - Nothing typed in the address yet: "Incomplete address".
- Version number is now ?v=0.27.51 on every page and the homepage footer reads v0.27.51

## v0.27.50 (Oct 17, 2026)
- REQUESTS TO JOIN: THE LEAD AND HQ BOTH SEE THEM, AND THEY WAIT UNTIL SOMEONE ANSWERS (Sean: "we often swap between roles or get called away"). NEEDS THE GOOGLE SCRIPT UPDATE (paste and New version; it also carries v0.27.49).
  - Escalation and Reception Center: requests now also show on HQ's Scene Summary / Summary with Let in / No (before, only the lead's phone saw them). The Shelter Report already showed them to every supervisor and HQ.
  - Any lead (including a phone that got in with the lead log in) or HQ can answer; once one does, it disappears from everyone else's screen.
  - Requests are kept in the Google Sheet ("Join requests" tab) until answered (before: the script's memory, gone after 6 hours). Answered ones drop off after 2 days.
  - HQ lists (all worksheets / all centers / all shelters, and Current Operations for HQ) show "1 person asking to join" on the event.
- Version number is now ?v=0.27.50 on every page and the homepage footer reads v0.27.50

## v0.27.49 (Oct 17, 2026)
- CURRENT OPERATIONS ON EVERY DEVICE (Escalation, Reception Center, Daily Shelter Report). NEEDS THE GOOGLE SCRIPT UPDATE (paste and New version).
  - Sean: he started a center on his laptop, opened the app on his phone, and could not find the event he had been working on for an hour. Now every form, on every device, first checks for current events and lists them at the top.
  - The warm sand box with "Looking for current events..." shows EVERY time while it checks (it used to be skipped on a device with nothing to check). Then the list, or "No current events. Start a new one below."
  - Every open event is listed: "Open" if this device is on it, "Join" if not. Names only, never anything typed into a form; escalation worksheets show the TOWN and start time, never the street address.
  - Join: the lead or HQ types their name and the lead (or HQ) user name and password and goes straight in, as a lead (the laptop-to-phone handoff). Anyone else types their name and taps Request access; the lead (Shelter: any current supervisor) or HQ sees "Dana R. is asking to join" with Let in / No, and the requester's page opens the event by itself. Escalation and Reception buttons now also say Let in / No (were Approve / Decline).
  - Shelter: a person let in is added to the supervisors. Reception: the center's join code is now kept so a lead can open it on another device (older centers pick it up when one of their phones checks in).
- AUTO DELETE IS OFF for now (Sean: the demo events must stay for meetings over several days): Escalation, Reception Center, Daily Shelter Report (with its 6409s) and Offline SCIA no longer erase anything by themselves. Manual erasing still works. One switch in the Google script (AUTO_DELETE = false). Turn it back on before going live (see WHERE WE LEFT OFF). The open-events list now goes back 30 days (was 2).
- Version number is now ?v=0.27.49 on every page and the homepage footer reads v0.27.49

## v0.27.48 (Oct 16, 2026)
- OFFLINE SCIA (new pages/scia.html, js/scia.js), a BETA / DEMO, in the SEPA Tools app under Mass Care > Beta Tests. NEEDS THE GOOGLE SCRIPT UPDATE (paste and New version).
  - Why (Sean): in a full mass care response, intake cannot start in SCIA until the operation's DR code unlocks it, and the only fallback is paper, which is far less secure. This lets intake start right away; everything is typed into SCIA by hand later. It cannot sync with SCIA or any outside system. Assumes a cell signal.
  - Follows the paper "SCIA Offline Intake Form" (library: SCIA Offline Intake 20 Cases.pdf), once instead of 20 times, in its order and words: primary client, household members, needs, consent, the 17 CMIST questions, comments. Intake worker name and date fill in by themselves. (Spelling fixed: "Equipment", "accommodation"; "a special dietary needs" became "special dietary needs".)
  - Tapping it: "Access to this tool can only be granted by HQ." with Log in as HQ / Log in as lead / Request access.
  - HQ (the HQ login, admin) names a shelter and assigns its ONE lead; can change the lead (the old lead is logged out) and close the shelter.
  - The lead (the lead login, lead) picks their shelter, then grants, denies or revokes intake workers. Access lasts 24 hours at most.
  - Security notice with Continue ("Intake workers' data will populate in your dashboard..."), once for each HQ person and each lead on their phone.
  - STRICTLY ONE WAY: a worker can only send. After Submit the form is blank ("Intake sent at 3:14 PM"); nothing about the client is kept on the phone or ever sent back to it. With a weak signal the intake waits on the open page and retries by itself.
  - Dashboard (HQ and the lead): each intake with its "Needs attention" flags (allergy, medical, mental health...), Open to read it in full, Download for Excel in form order, and "Entered into SCIA", which DELETES that intake (the paper form: "Upon uploading to SCIA, this form must be deleted"). A closed shelter's intakes are erased 7 days after closing.
  - Demo security (Sean): the same HQ and lead logins as the other forms; to be strengthened if adopted. Google Sheet: new tabs Offline SCIA Shelters / Workers / Intakes (appear by themselves).
- Fix: the BETA tags themselves (6409 button on the Mass Care page, Supplies box on the Shelter Report, 6409 page) had not reached the site in v0.27.46/47; added now.
- SEPA TOOLS APP: buttons always as a grid (Sean, a standing rule). Mass Care now opens its own grid (SCIA, Shelter Log, Beta Tests) in place of the main one, and Beta Tests opens another (6409 Requisition, Feeding, Offline SCIA, each with a yellow BETA badge like the PRACTICE ones). A Back button and the phone's own Back go up one level (#mass-care, #beta). The Announcements bar shows on the main grid only. The v0.27.46 pop-up is gone. "Share SEPA Tools with someone" stays on screen (it moves up on these shorter grids).
- App cache number now sepa-tools-22.
- Version number is now ?v=0.27.48 on every page and the homepage footer reads v0.27.48

## v0.27.47 (Oct 16, 2026)
- SEPA TOOLS APP: second Beta Tests button, "Feeding" (Sean). For now it opens a placeholder page, pages/feeding.html: "This tool will be designed by the feeding team." (marked Beta). App cache number now sepa-tools-21. No Google script change: push only.
- Fix: the BETA tag styling (6409 button on the Mass Care page, Supplies box on the Shelter Report, the 6409 page) was missing from the v0.27.46 push, so "Beta" showed as plain italic text. Now added.
- Version number is now ?v=0.27.47 on every page and the homepage footer reads v0.27.47

## v0.27.46 (Oct 16, 2026)
- 6409 DISASTER REQUISITION, LIVE (new pages/req.html, js/req.js). A PROTOTYPE: Sean will workshop it with the logistics and mass care teams ("build it with your best recommendations"). NEEDS THE GOOGLE SCRIPT UPDATE (paste and New version).
  - Follows the paper form in the library (DCS JT DMWT Disaster Requisition F6409 / F6409B V.2.0): request header, requester, delivery information, items (stock no., quantity, unit EA/PK/CS/BX, total each, description, date needed), special instructions, approval, optional procurement method, and the 6409-B delivery receipt.
  - Each 6409 belongs to one open shelter (one form per delivery address, as the paper form says), numbered 1, 2, 3... Delivery fills in from the shelter. Saves as you type; other phones see changes within seconds.
  - Who does what: supervisors CURRENTLY on the shelter's list (Sean) and HQ start a 6409, fill it in, approve someone else's (the requester can never approve their own, as on the paper form), confirm delivery and cancel. HQ can undo an approval. Typed name plus time stands in for signatures.
  - "Share with Team member" (listed supervisors and HQ): sends logistics a link to the shelter's 6409s. Logistics types their name once, then can enter the requisition number, add notes and set the step. They cannot change the request, do not see the account string, and the link does NOT open the shelter's report or log.
  - Steps: Draft (needs approval) > Approved > With logistics > Ordered > On the way > Delivered; also Cannot fill (logistics, with a note) and Cancelled. Shortcut buttons add common items (cots, blankets, pillows, comfort kits, water, snacks, hygiene kits, diapers).
  - Erased with the shelter (Close shelter, or 14 days with no activity; 6409 activity counts as activity).
  - Where to find it: "Supplies (6409)" box on the Daily Shelter Report, a sixth button on the Mass Care page (six across on a computer), and in the app under Mass Care > Beta Tests. Marked BETA on the website (Sean: it is being tried out).
- DAILY SHELTER REPORT: REMOVE SUPERVISOR. A "Remove" link next to each supervisor; needs the lead user name and password (same as opening and closing) or HQ. The removed person's phone shows "You have been removed from [shelter]" and can no longer open the report or its 6409s; what they typed stays. Adding the same name again brings them back. Google Sheet: new "Removed" column in Shelter Supervisors (added by itself).
- SEPA TOOLS APP: the SCIA button is now "Mass Care" (same spot, same icon; Sean). It opens a panel with SCIA, Shelter Log (the Daily Shelter Report) and Beta Tests; Beta Tests holds the 6409 Requisition, with a Back button. Same number of buttons, so "Share SEPA Tools with someone" stays on screen (checked at iPhone size). Practice SCIA unchanged. App cache number now sepa-tools-20.
- Version number is now ?v=0.27.46 on every page and the homepage footer reads v0.27.46

## v0.27.45 (Oct 16, 2026)
- CURRENT OPERATIONS: LOADING MESSAGE AND NEW COLOUR (Escalation, Reception Center and Daily Shelter Report Start screens). Sean: it takes a moment for the events to load, which confuses people. No Google script change: push only.
  - While it checks, the box shows at once with a spinner: "Looking for active events... This takes a few seconds." Then it fills in with the events, as before.
  - Found nothing: the box stays and says "No active events found. Start a new one below." (it used to never appear).
  - A phone with nothing to check (never on a worksheet / center / shelter, not logged in as HQ) knows at once, so no box at all, as before (no flash).
  - Box colour is now warm sand instead of pale blue (Sean: the field below it is also pale blue).
- Version number is now ?v=0.27.45 on every page and the homepage footer reads v0.27.45

## v0.27.44 (Oct 16, 2026)
- iPHONE INSTALL STEPS: BOTH SAFARI LAYOUTS (from a user's email: newer iOS has no ••• button; the menu is the small icon at the left end of the address bar, two lines with a little square on top; everything from Share on is the same). No Google script change: push only.
  - get-app/iphone.html, step 2: "Open Safari's menu", case A (••• at the bottom right) and case B (the icon at the left of the address bar), each with its own drawing.
  - App install card (app/index.html): one extra line under step 1. App cache number now sepa-tools-19.
- Version number is now ?v=0.27.44 on every page and the homepage footer reads v0.27.44

## v0.27.43 (Oct 16, 2026)
- DAILY SHELTER REPORT: THREE CHANGES. NEEDS THE GOOGLE SCRIPT UPDATE (paste and New version): the script now accepts the explanation answers (q7x, q9x, q10x, q15x).
  - Running log stays a fixed size (Sean: entries were pushing the rest of the form down): flagged issues plus the 3 newest entries show; older ones scroll inside the box (soft shadow at the bottom, "N earlier entries" line). New "See all of today's entries" button opens every entry in one pop-up (read only; flagged first, then newest first). Entries saved in the same second now always sort newest first.
  - "Please explain:" box opens under question 7 on Yes, 9 on No, 10 on Yes and 15 on Yes. Saves as you type with name and time; stays open if something is typed even if the answer changes. Excel: an Explanation column next to each of those four questions.
  - Bug fix (Sean): on a shelter's first day, "Previous days" opened an empty screen. The switch is now greyed out and cannot be tapped until there is an earlier day, and comes alive by itself after midnight (js/view-bar.js: a greyed-out side, used only here).
- Version number is now ?v=0.27.43 on every page and the homepage footer reads v0.27.43

## v0.27.42 (Oct 16, 2026)
- "CURRENT OPERATIONS" AT THE TOP OF THE ESCALATION, RECEPTION CENTER AND DAILY SHELTER REPORT START SCREENS (Sean: if you open the page you are probably looking for the one happening right now; he named the box). No Google script change: push only.
  - New js/current-ops.js. First list: the worksheets / reception centers / shelters this phone is on that are still open (each checked with the Google script; cleared or closed ones drop off). Second list, only on a phone logged in as HQ: every open one. Tap Open to go straight in. Below the box: "Or start a new one" / "Or open a new shelter", then the usual Start screen.
  - Nothing open: no box, the page looks as before. A phone that already has a current worksheet or center still opens it directly, as before.
  - Shelter Report: the old "Your shelters" list is replaced by the box.
- Version number is now ?v=0.27.42 on every page and the homepage footer reads v0.27.42

## v0.27.41 (Oct 16, 2026)
- DAILY SHELTER REPORT: FLAGGED ISSUES, CARRIED-OVER ISSUES, NOTHING REQUIRED. NEEDS THE GOOGLE SCRIPT UPDATE (paste and New version).
  - Running log: "Flag as an issue" tick box when adding an entry, and a "Flag as an issue" / "Remove flag" link on each entry. Flagged entries are red, labelled FLAGGED ISSUE, show who flagged them and when, and sit at the top of the log whatever their time. Anyone on the shelter can flag or unflag today's entries; only HQ can flag an entry on a locked earlier day.
  - Carried-over issues (Sean: in their own box): entries flagged on earlier days and still flagged show in a red box above the Running log until someone taps "Remove flag (dealt with)" (anyone may). The box hides when empty. The entries themselves stay in Previous days.
  - Nothing is required any more (Sean): no red questions, asterisks or "questions not answered" count. Unanswered questions are just blank.
  - Excel download: new Flagged column in the log. Google Sheet: new "Flagged" column in the Shelter Log tab (added by itself).
- SEPA Tools app: a note in app/index.html (no visible change): whenever its buttons change, "Share SEPA Tools with someone" must still show without scrolling.
- Version number is now ?v=0.27.41 on every page and the homepage footer reads v0.27.41

## v0.27.40 (Oct 16, 2026)
- DAILY SHELTER REPORT FIX. NEEDS THE GOOGLE SCRIPT UPDATE (paste and New version). Opening a shelter showed "Something went wrong" (Sean's first real try): the report read the Shelter Log tab before anything had created it. The script now makes all five shelter tabs first (shTabs_). The shelter Sean opened is kept and works once the script is updated.
- DAILY SHELTER REPORT: "Lead user name" now reads just "User name" when opening or closing a shelter (Sean: "lead" there was confusing). The login itself is unchanged (lead / GiftOfLife). Leaving the boxes empty now says "Please type the user name and password." 
- Version number is now ?v=0.27.40 on every page and the homepage footer reads v0.27.40

## v0.27.39 (Oct 16, 2026)
- NEW: DAILY SHELTER REPORT (pages/shelter.html, js/shelter.js). NEEDS THE GOOGLE SCRIPT UPDATE (paste and New version).
  A live report for each open shelter, kept by its shift supervisors, replacing the Red Cross form whose Save draft locked people out.
  - Open a new shelter: shelter name, address, your name, and the LEAD user name and password (the same lead/GiftOfLife as the other two forms; Sean asked that the logins match). The HQ login also works.
  - Add supervisor: type their name, send them the link. They open it and read and type straight away, no password.
  - Today's report: Supervisors; Running log (each entry stamped with the time and the supervisor's name, newest first; supervisors cannot change entries); Status check, the 16 questions from the Red Cross form (Yes/No buttons or typed answers), each showing who answered and when; unanswered ones in red with a count. Saves as people type; other phones see changes within about 6 seconds.
  - At midnight (the Sheet's time zone) the day locks and moves to Previous days; a blank report starts by itself.
  - Previous days: read only for supervisors. "Edit this day (HQ)" asks for the HQ login; HQ can change answers and edit or remove log entries (for example to take out client health details). HQ changes are marked "Edited by HQ" / "Removed by HQ" with the time.
  - HQ (the same Admin login as the Escalation and Reception forms; one HQ login now works on all three): every open shelter (Change shelter, or shelter.html?view=hq), Download for Excel (all days and the full log), close any shelter.
  - Close shelter and erase all data: lead user name and password (or HQ). Erases everything for everyone; other phones are told.
  - A shelter with no activity for 14 days erases itself (SH_KEEP_DAYS in the script), in case nobody closes it.
  - Google Sheet tabs (appear by themselves): Shelters, Shelter Supervisors, Shelter Reports, Shelter Log, Shelters closed. No new Settings rows: it uses the existing lead and HQ logins.
- SEPA TOOLS APP BACK TO ITS LOOK FROM THE START OF OCT 16 (Sean: the look-and-feel changes made it worse). Undoes v0.27.37 and v0.27.38: the plain "SEPA Tools" heading, the original flat buttons and the original red home-screen icon (all five icon files restored from v0.27.35); "tap the red SEPA Tools icon" wording restored. KEPT: the Onboarding button in place of Register for Events. App cache number now sepa-tools-18. (An iPhone that re-added the app to get the glossy icon will keep that icon until it is added again.)
- Mass Care page: fifth big button "Daily Shelter Report" (five across on a computer). Site search finds it ("shelter", "daily report", "supervisor").
- Version number is now ?v=0.27.39 on every page and the homepage footer reads v0.27.39

## v0.27.38 (Oct 16, 2026)
- SEPA TOOLS APP: LOGO MADE SMALL SO "SHARE SEPA TOOLS" IS ON SCREEN AGAIN (Sean: the v0.27.37 logo card pushed the Share button off the bottom; it is crucial people see it). No Google script change: push only.
  - The logo is now a slim white pill (small cross and SEPA TOOLS side by side), no taller than the old "SEPA Tools" heading. The Share button sits where it did before v0.27.37 (checked on 375, 390 and 430 wide phones).
  - Kept: Onboarding button, raised buttons (the shadows take no extra room), glossy home-screen icon.
  - App cache number now sepa-tools-17.
- Version number is now ?v=0.27.38 on every page and the homepage footer reads v0.27.38

## v0.27.37 (Oct 16, 2026)
- SEPA TOOLS APP: NEW LOGO, RAISED BUTTONS, NEW HOME-SCREEN ICON. No Google script change: push only. (v0.27.36 below goes out in the same push.)
  - The "SEPA Tools" heading is now the SEPA Resource Library logo reading SEPA TOOLS, in a white card like the website's (drawn in the page, no new file). "Red Cross SEPA Disaster Action Team" stays under it.
  - Buttons look raised (Sean: like a drop shadow in Word): softer, deeper shadow, slightly darker bottom edge, faint shine on top; a tapped button sinks down a little. No mouse-over effect.
  - New home-screen icon (Sean chose option A, glossy): the logo with SEPA TOOLS on a glossy white background. icon-512, icon-192, apple-touch-icon, icon-512-maskable and favicon-32 replaced. New installs get it at once; Android updates it on its own (usually within a day); an iPhone that already has the app keeps the old icon until the app is deleted and added again.
  - "Then tap the red SEPA Tools icon" now reads "Then tap the SEPA Tools icon" (app, iPhone and Android instruction pages), as the icon is no longer red.
  - App cache number now sepa-tools-16.
- Version number is now ?v=0.27.37 on every page and the homepage footer reads v0.27.37

## v0.27.36 (Oct 16, 2026)
- SEPA TOOLS APP: "Register for Events" is now "Onboarding" (Sean: the Volunteer Connection calendar it opened looks awful). Same spot, graduation-cap picture, opens the site's Onboarding page (pages/new.html). The picture of the app on the Get the App page (get-app/index.html) matches. No Google script change: push only.
  - App cache number now sepa-tools-15 (app/sw.js) so phones pick it up; the app description (manifest) no longer mentions RC Reserve.
  - A seasonal look (colours changing by date) was mocked up and turned down: changing colours would only confuse people.
- Version number is now ?v=0.27.36 on every page and the homepage footer reads v0.27.36

## v0.27.35 (Oct 16, 2026)
- DISCUSSION FORUMS EASIER TO TELL APART (Sean: boards and threads looked too alike). No Google script change: push only.
  - Each board has its own colour and picture: New to the Red Cross teal (question mark), General Discussion navy (speech bubbles), Odd or unusual responses amber (warning sign), Photos and shout outs purple (camera), Suggestions green (light bulb), RC Platform Help blue (computer screen). Set in css/style.css (.fb-<board id>) and js/forums.js (ICONS, SHORT). A board added later gets the navy look until it is added there.
  - Board list: coloured edge, picture tile and coloured title on each board.
  - Inside a board: a header card with the board's picture and description; each thread is its own card with the board's colour down the side, every other one shaded; reply count as a coloured badge; "Active today" tag.
  - Inside a thread: a coloured board label above the title (links back to the board); the first post marked "Original post" and set apart; replies indented with alternating shading; "Started this thread" tag on the starter's replies.
- Version number is now ?v=0.27.35 on every page and the homepage footer reads v0.27.35

## v0.27.34 (Oct 16, 2026)
- Escalation Form, HQ: the "Change worksheet" switch now says "Change scene" (Sean: more intuitive). No Google script change: push only.
- Version number is now ?v=0.27.34 on every page and the homepage footer reads v0.27.34

## v0.27.33 (Oct 15, 2026)
- REFRESH RATES BACK TO WHAT THEY WERE BEFORE v0.27.32 (Sean: back to 5 or 6 seconds). No Google script change: push only.
  - Escalation worksheet: sends 1 second after typing stops, checks every 5 seconds while busy (15 seconds after 2 quiet minutes). Scene Summary and Reception summary every 6 seconds. HQ lists every 15 seconds. Reception check-in every 20 seconds (every 5 while intakes wait for a signal). Lead's join requests every 10 seconds. "Waiting for the lead" every 5 seconds (20 after 10 minutes).
  - Kept from v0.27.32: HQ-only Escalation Excel download, Escalation 5-day auto-clear, and the script's at-most-every-10-minutes auto-delete check.
- Version number is now ?v=0.27.33 on every page and the homepage footer reads v0.27.33

## v0.27.32 (Oct 15, 2026)
- SLOWER SYNCING, ESCALATION EXCEL DOWNLOAD, ESCALATION AUTO-CLEAR. NEEDS THE GOOGLE SCRIPT UPDATE (paste and New version).
  - Once a minute (Sean: quick refreshes were locking things up; losing up to a minute is acceptable): the Escalation worksheet sync (was 5-15 seconds, plus 1 second after typing), Scene Summary and Reception summary (6 seconds), HQ lists (15 seconds), Reception check-in (20 seconds, plus 5 seconds while intakes waited), lead's join-request check (10 seconds), "waiting for the lead" (5-20 seconds).
    Still immediate: saving a Reception intake, and anything typed when the page is closed or put in the background. Typing on the Escalation Form now reaches others within about 1 to 2 minutes.
  - Escalation Scene Summary: "Download for Excel" (HQ only), one row per box, and "Download for Excel first" inside "Clear this worksheet". Leads never see it.
  - Escalation worksheets with no change for 5 days are cleared automatically, the same as HQ pressing Clear (moved to "Escalations cleared", marked automatic; phones on it go back to Start). Reception centers already deleted themselves 5 days after the last intake; that check now also runs when phones check in.
  - Both checks run at most every 10 minutes while the forms are used, and every night at 3 AM if startAutoDelete has been run once in the script editor.
- Version number is now ?v=0.27.32 on every page and the homepage footer reads v0.27.32

## v0.27.31 (Oct 15, 2026)
- SPANISH ONBOARDING (no Google script change). Neutral Spanish; a fluent speaker will review it.
  - New page pages/new-es.html: the whole Onboarding page in Spanish. An "English | Español" switch sits under the logo on both pages (same pill style as the form switches).
  - The 10 Getting Started documents are translated, same layout and screenshots as the current (Oct 12) versions:
    Expectativas para miembros de DAT, Cómo encontrar sus capacitaciones asignadas, Cómo se ve una solicitud en su teléfono,
    Cómo ponerse de guardia con la app Noggin, Cómo ponerse de guardia en el sitio web, Guía de bolsillo del DAT,
    Su primera vez en una escena, Qué información reunir en una escena (picture), Consejos para tratar con los clientes (Word),
    Cómo iniciar sesión en RC Care.
    They are on Sean's Mac in "Library Documents/Español (arrastrar a Getting Started en Drive)" (not on GitHub) and go into Google Drive in a new folder "Español" inside "Getting Started".
  - Until a Spanish file is in Drive, its links on the Spanish page open the English file instead (data-doc-en).
  - The video stays English (marked "video en inglés").
  - Screenshots inside the guides stay English (the apps are English). System names stay English (RC Care, Noggin, Volunteer Connection, EDGE, button names), with a Spanish explanation.
  - Spanish preview pictures in images/onboarding/es.
  - js/library.js: file names with accents now match however the Mac stored them (Unicode NFC).
  - Site search: "español" / "Spanish" finds the Spanish Onboarding page.
  - Pocket Guide page 12 said "see page 6" for Resource and Referral cases; that section is on page 7. The Spanish copy says page 7.
- Version number is now ?v=0.27.31 on every page and the homepage footer reads v0.27.31

## v0.27.30 (Oct 15, 2026)
- HQ LOGIN NOW LASTS 24 HOURS on a device (was 30 days), or until Log out. NEEDS THE GOOGLE SCRIPT UPDATE (paste and New version).
  - After 24 hours, HQ pages (lists, Scene Summary as HQ, Change center/worksheet, Switch to HQ view, HQ typing) ask for Admin / GiftOfLife again.
  - Only the HQ login changed. Forum logins are separate and unchanged. The lead login is asked each time a worksheet or center is started, so it has no timer.
  - Admin Guide 2 updated (24 hours, and a note about the lead login rows).
- Version number is now ?v=0.27.30 on every page and the homepage footer reads v0.27.30

## v0.27.29 (Oct 15, 2026)
- NEW SCENE AND HQ VIEW BUTTONS on both forms (no Google script change: push only).
  - A second pill under the Worksheet | Scene Summary (Intake | Summary) switch, same shape:
    left, in red: "Starting a new scene?" (Escalation) / "Starting a new reception center?" (Reception). Asks once (Yes / Cancel), then goes to the Start screen, which asks for the lead login. The old event stays open for the team and HQ. Reception still will not leave while intakes are waiting for a signal.
    right: "Switch to HQ view" (leads only). Opens the HQ list of worksheets / centers, which asks for the HQ login (Admin). The lead login is refused there.
  - Responders see only the red "Starting a new..." side. HQ does not see the pill (it has Change center / Change worksheet).
  - Removed the old links at the bottom: "Start a new blank worksheet" (Escalation) and "Leave this reception center" (Reception).
- Version number is now ?v=0.27.29 on every page and the homepage footer reads v0.27.29

## v0.27.28 (Oct 15, 2026)
- HQ CAN TYPE INTO AN ESCALATION WORKSHEET AND ADD RESPONDERS. NEEDS THE GOOGLE SCRIPT UPDATE (same paste and New version as v0.27.24-27; one deploy covers all five).
  - In the Scene Summary, HQ now gets the Worksheet side of the switch. It opens the same worksheet, editable (address ends in &as=hq). Example: on a group call, HQ types the notes the lead reads out. Everyone on the worksheet sees it within seconds.
  - HQ typing gets "Add a responder" (sends the normal join link). Not "Add a lead" (HQ does that from the Scene Summary list), not "Start a new blank worksheet", not the name box. HQ is not added to the "Who is on this worksheet" list.
  - HQ still cannot START a worksheet this way. The phone's own worksheet (if any) is untouched.
  - Google script: each worksheet now also keeps its real edit key (inside the coded last column) so the script can give it to an HQ login for the join link. Older worksheets pick it up automatically the next time a team phone on them checks in (every few seconds while open).
  - Same box typed by HQ and someone on scene at the same moment: the later one wins (as between any two phones).
- Version number is now ?v=0.27.28 on every page and the homepage footer reads v0.27.28

## v0.27.27 (Oct 15, 2026)
- VIEW SWITCH AND CHANGE CENTER / WORKSHEET on both forms. NEEDS THE GOOGLE SCRIPT UPDATE (same paste and New version as v0.27.24-26; one deploy covers all four).
  - New pinned bar under the logo (js/view-bar.js), stays on screen while scrolling, switches in the SAME tab:
    Reception Center: Intake | Summary. Escalation Form: Worksheet | Scene Summary.
    Shown to leads, and to HQ when the phone is also on that event. Responders do not see it.
  - HQ only: "Change center" / "Change worksheet" button in the bar. Lists the open events (most recent first); tap one to open it. No logging out.
  - Leads can open the Escalation Scene Summary again (Sean, Oct 15: same features on both forms), with the worksheet's own code, not the HQ login. Clear, Log out and removing a lead stay HQ only.
  - Removed: "See the summary" (Reception) and "Open the Scene Summary" (Escalation) buttons, which opened new tabs; the switch replaces them. "Send HQ the summary link" / "Share the Scene Summary" stay.
  - Escalation Form: the two blank-PDF links at the bottom (Printable PDF / Download the PDF) are removed. The PDF file is still in documents/ but nothing links to it.
- Version number is now ?v=0.27.27 on every page and the homepage footer reads v0.27.27

## v0.27.26 (Oct 15, 2026)
- LEADS NEVER EXPORT DATA (HQ only). NEEDS THE GOOGLE SCRIPT UPDATE (same paste and New version as v0.27.24/25; one deploy covers all three).
  - Reception Center summary: "Download for Excel" now shows only to an HQ login (Admin). Leads still see the table, Edit and DDA. The Google script now tells the page whether the viewer is HQ.
  - Escalation Form: when live sharing is off, "Share the Scene Summary" used to send the whole worksheet as text. It now just says the Scene Summary cannot be sent yet. (The Escalation Form has no other export; the Printable PDF links are the blank form.)
- Version number is now ?v=0.27.26 on every page and the homepage footer reads v0.27.26

## v0.27.25 (Oct 15, 2026)
- SEPARATE LEAD LOGIN. NEEDS THE GOOGLE SCRIPT UPDATE (same paste and New version as v0.27.24; one deploy covers both).
  - Starting an Escalation worksheet or a Reception Center now asks for the LEAD user name and password (Sean: lead / GiftOfLife). The HQ login (Admin / GiftOfLife) still works there too.
  - The lead login does NOT open the Scene Summary, the HQ lists or Clear: those stay HQ only (Admin).
  - Set in the Google Sheet, Settings tab: two new rows "Lead login (starting a worksheet or reception center only): user name" and "Lead login: password" appear after the script update. Until they are filled in, only the HQ login can start.
  - Pop-up and Start screen wording now says "lead user name and password". Escalation "For HQ" note: only HQ opens the Scene Summary (the lead already sees everything on the worksheet).
  - Wrong tries for the lead login are counted separately from the HQ login (8 wrong = 15-minute wait).
- Version number is now ?v=0.27.25 on every page and the homepage footer reads v0.27.25

## v0.27.24 (Oct 15, 2026)
- ADD A LEAD on the Escalation Form and the Reception Center Form. NEEDS THE GOOGLE SCRIPT UPDATE (deploy a New version BEFORE pushing).
  - New "Add a lead" button beside "Add a responder" (lead's phone only). It opens a list of the people already on the worksheet / reception center; tap "Make lead". Their phone gets the lead's buttons within about a minute (Reception reloads the page once; a half-typed intake is kept).
  - Also a "Make lead" button next to each person in the "Who is on this..." list, and on the HQ Scene Summary / reception summary, so HQ can make someone a lead (for example if the lead left without handing over).
  - Nobody stops being a lead: two or more leads can work at once, or the first lead can add a new one and leave.
  - Only HQ can remove an added lead (Remove, from the summary while logged in). The lead who started it still cannot be removed. What a removed lead entered stays.
  - Reception: added leads can see the summary, edit intakes and set DDA (edits are marked with their name). Summary and responders' screens say "Leads: Sean Snyder, Bob Jones" when there is more than one.
  - In the Google Sheet, an added lead shows as "co-lead" in the Role column of the Responders tab.
- Files: google-apps-script/sepa-backend.gs, js/ask-lead.js, js/reception.js, js/escalation.js, pages/reception.html, pages/escalation.html, css/style.css
- Version number is now ?v=0.27.24 on every page and the homepage footer reads v0.27.24

## v0.27.23 (Oct 15, 2026)
- SEPA TOOLS APP: new "Share SEPA Tools with someone" bar under the buttons (Call for Help still alone in its row).
  - Tapping it opens a full screen with a big QR code for sepalibrary.org/app. The other person points their phone's camera at it and lands on the install page.
  - "Send the link" opens the phone's own share menu (text, AirDrop, email, WhatsApp). On a computer it copies the link instead.
  - The QR screen is saved on the phone with the app, so it works with a weak signal.
  - App cache is now sepa-tools-14 so phones pick up the change.
- Version number is now ?v=0.27.23 on every page and the homepage footer reads v0.27.23

## v0.27.22 (Oct 15, 2026)
- SEPA TOOLS APP back to the STANDARD LOOK (v0.27.19): red background, English labels, Announcements bar, Call for Help alone at the bottom, no Volunteer of the Month. The blue / Spanish test (v0.27.20-21) is done.
  - App cache is now sepa-tools-13 so phones pick up the change.
- Version number is now ?v=0.27.22 on every page and the homepage footer reads v0.27.22

## v0.27.21 (Oct 15, 2026)
- FIX for v0.27.20: the app's button screen (app/index.html) did not actually get the blue / Spanish / Volunteer of the Month changes in v0.27.20 (only the version numbers, cache number and phone top-bar color went up). They are in now, exactly as described under v0.27.20.
  - App cache is now sepa-tools-12 so phones pick up the change.
- Version number is now ?v=0.27.21 on every page and the homepage footer reads v0.27.21

## v0.27.20 (Oct 15, 2026)
- SEPA TOOLS APP, TEST (website unchanged): blue background (#1d4f91, phone top bar too), Spanish button labels, and Debbie Tevlin's photo under the buttons with "Volunteer of the Month".
  - Spanish: Inscripción a Turnos, Escalamiento, Centro de Recepción, Práctica RC Care / Práctica SCIA (tag PRÁCTICA), Inscripción a Eventos, Pedir Ayuda, Anuncios. RC Care, Noggin, SCIA unchanged. Title, subtitle, footer and announcement text stay English.
  - "Revert to the standard look" = v0.27.19 (red, English, Announcements bar, nothing under Call for Help).
  - App cache is now sepa-tools-11 so phones pick up the change.
- Version number is now ?v=0.27.20 on every page and the homepage footer reads v0.27.20

## v0.27.19 (Oct 15, 2026)
- SEPA TOOLS APP: ANNOUNCEMENTS BAR above the buttons. Glossy navy with the same one-time gleam as the homepage "Sign up for DAT Shifts" bar. A small red number shows announcements this phone has not opened; nothing pops up. Tapping the bar opens the list; an announcement with a link opens it in Safari (keeps the VC sign-in). With none, the bar stays and the list says "No announcements right now."
  - Leadership posts in the SEPA Library Data Sheet, new "Announcements" tab: Posted, Title, Message, Link, Show until, Hidden. The tab makes itself the first time the app asks, with one row: "Register for the DAT Tabletop", linking to the VC registration page (registration_id=22380983).
  - google-apps-script/sepa-backend.gs: new ...exec?ann=1 (see ANNOUNCEMENTS at the end). Must be pasted into Apps Script and deployed as a new version.
  - The app now loads js/config.js for the backend address. The last announcements are kept on the phone for weak signal.
  - App cache is now sepa-tools-10 so phones pick up the change.
- Version number is now ?v=0.27.19 on every page and the homepage footer reads v0.27.19

## v0.27.18 (Oct 15, 2026)
- SEPA TOOLS APP back to the last known good (v0.27.16): red background, English labels. The green + German test (v0.27.17) worked and is done.
  - Kept from the test: the button grid can no longer be pushed wider than the screen by a long word (minmax). No visible change in English.
  - App cache is now sepa-tools-9 so phones pick up the change.
- Version number is now ?v=0.27.18 on every page and the homepage footer reads v0.27.18

## v0.27.17 (Oct 15, 2026)
- SEPA TOOLS APP, TEST ONLY (website unchanged): green background (#1f6e43, phone top bar too) and German button labels. RC Care, Noggin and SCIA stay as they are. Shift Sign Up = Schichtanmeldung, Escalation = Eskalation, Reception Center = Aufnahmezentrum, Practice RC Care / Practice SCIA = RC Care üben / SCIA üben, PRACTICE tag = ÜBUNG, Register for Events = Kurse & Termine, Call for Help = Hilfe rufen. Title, subtitle, footer and the Call for Help page stay English.
  - Last known good for the app is v0.27.16 (commit 9f54111). To go back: restore the red background and English labels.
  - Kept when going back: the button grid can no longer be pushed wider than the screen by a long word (minmax).
  - App cache is now sepa-tools-8 so phones pick up the change.
- Version number is now ?v=0.27.17 on every page and the homepage footer reads v0.27.17

## v0.27.16 (Oct 15, 2026)
- SEPA TOOLS APP: "Register for Events" now opens in full Safari (or the phone's browser) instead of the app's built-in viewer. In the app's viewer, Volunteer Connection did not keep the sign-in, so it showed "page expired" and then looped back to login. The same link worked in regular Safari (tested by Sean). The other buttons are unchanged.
  - App cache is now sepa-tools-7 so phones pick up the change.
- Version number is now ?v=0.27.16 on every page and the homepage footer reads v0.27.16

## v0.27.15 (Oct 15, 2026)
- REGISTER FOR CLASSES AND EVENTS LINK FIXED. The old address carried a sign-in code from one past login, so after signing in people got "page expired". All four places now use the direct Volunteer Connection Groupshare calendar address Sean sent (DCS: SEPA All Disaster Workforce): https://volunteerconnection.redcross.org/?nd=gs_registration_v5_view&registration_type_id=12577&group_id=40083
  - SEPA Tools app "Register for Events" button, homepage "Register for Classes and Events" button, the link on the New Volunteers page, and site search.
  - App cache is now sepa-tools-6 so phones pick up the new link.
- Version number is now ?v=0.27.15 on every page and the homepage footer reads v0.27.15

## v0.27.14 (Oct 15, 2026)
- SEPA TOOLS APP: the RC Reserve button is replaced by "Register for Events" (calendar-plus icon), which is used far more. It uses the same Volunteer Connection sign-in link as the website's "Register for Classes and Events" button. Call for Help stays alone on the bottom row. The app picture on the Get the App page matches.
  - The website itself is unchanged: RC Reserve stays in the homepage quick launch bar and in search.
  - App cache is now sepa-tools-5 so phones pick up the new button.
- Version number is now ?v=0.27.14 on every page and the homepage footer reads v0.27.14

## v0.27.13 (Oct 15, 2026)
- AMBER back to the original light shade (#fdf3df fill / #ecd3a2 border) on both calendars and both keys. The stronger amber from v0.27.12 was too dark. The darker date text added with it is removed too.
- Version number is now ?v=0.27.13 on every page and the homepage footer reads v0.27.13

## v0.27.12 (Oct 14, 2026)
- SHIFT SIGN-UP CALENDAR (pages/shifts.html, also what the app's Shift Sign Up button opens): upcoming days with no one signed up are now amber, so the gaps are obvious. (A NEED label on those days was tried and removed as too much.) Before, only the homepage calendar showed amber.
  - The date now sits at the top of each day so the green number no longer covers it on phones.
  - A picked day stays solid red even when it is empty.
- AMBER made stronger everywhere (was #fdf3df / #ecd3a2, now #fbe0a6 / #d99a2b), homepage calendar included.
- BOTH CALENDAR KEYS: the green sample is now a plain dot with no number, so it does not suggest 2 is the target. The sign-up page key reads "no one yet, help needed".
- Version number is now ?v=0.27.12 on every page and the homepage footer reads v0.27.12

## v0.27.11 (Oct 15, 2026)
- SEPA TOOLS APP: new "Call for Help" button (centered on its own row below the other buttons). It opens app/help.html, a page of large cards with a photo and name. At the top, an Intake Hotline card (833-583-3115); below it, tapping a card calls that person: Debbie Tevlin, Marty Westermann, Michael Bradley, Sean Snyder, Irvin Diaz. "Back to Tools" returns to the app.
  - App-only: not linked from the website, and marked noindex so search engines skip it.
  - App cache is now sepa-tools-4 so phones pick up the new button; help.html is saved for weak signal.
- Version number is now ?v=0.27.11 on every page and the homepage footer reads v0.27.11

## v0.27.10 (Oct 14, 2026)
- Reception Center Form: the lead's red start button now reads "Start a Reception Center" (was "Leads: Click Here to Start a Reception Center Intake"). It starts the center; intakes are the individual records inside it.
- Version number is now ?v=0.27.10 on every page and the homepage footer reads v0.27.10

## v0.27.9 (Oct 14, 2026)
- RECEPTION CENTER SUMMARY (HQ):
  - "Clear this reception center (end of event)" is now a solid red button reading "Close Reception Center and Erase All Data".
  - Tapping it opens a warning pop-up: "This will remove data from both HQ and Responder Devices. Do you wish to proceed?" with "Yes, close and erase", "Cancel", and a "Download for Excel first" button (saves the file and leaves the pop-up open). It replaces the old on-page confirm.
  - "Download for Excel" is now a solid navy button with white text.
- Version number is now ?v=0.27.9 on every page and the homepage footer reads v0.27.9

## v0.27.8 (Oct 14, 2026)
- RECEPTION CENTER FORM: DDA (Detailed Damage Assessment) BUTTON. On the summary page, each row now has a DDA button beside Edit (lead and HQ only, like Edit).
  - It opens "What is the damage to this home? Tick all that apply." with tick boxes: Destroyed, Major, Uninhabitable, Other. Ticking Other opens a Describe box. Save DDA saves it; unticking everything and saving clears it.
  - The answer shows in a new red DDA column (after Unit), e.g. "Major, Uninhabitable" or "Other: smoke damage". Under the buttons: "DDA [time], [who]".
  - A seventh totals tile counts the homes with a DDA and how many of each (e.g. "2 DDA homes: 1 destroyed, 1 major"). It turns red when any home is destroyed or uninhabitable.
  - The Sheet's "Reception Intakes" tab gets three more columns, "DDA", "DDA set" and "DDA set by" (added by themselves). All three are in the Download for Excel file.
  - Editing an intake does not change its DDA, and setting a DDA does not mark the intake as Edited.
- GOOGLE SCRIPT CHANGED (Sean pastes and deploys it): new action recDda.
- Version number is now ?v=0.27.8 on every page and the homepage footer reads v0.27.8

## v0.27.7 (Oct 14, 2026)
- RECEPTION CENTER FORM: EDIT AND DELETE ONE INTAKE. On the summary page (which only the lead and HQ can open), every row now starts with an Edit button.
  - Edit opens a pop-up with the 9 questions filled in with that intake's answers. "Save changes" writes the corrections to the Google Sheet. The responder's name and the time it was taken stay as they were.
  - An edited intake shows "Edited [time], [who]" under its Edit button ("HQ", or the lead's name with "(lead)"), and the row flashes yellow once. The Sheet's "Reception Intakes" tab gets two new columns, "Last edited" and "Edited by" (added by themselves), and they are in the Download for Excel file too.
  - HQ only (a phone logged in as HQ): "Delete this intake" at the bottom of the pop-up, for a duplicate or a mistake. It asks first, deletes the intake for good, and lowers the center's intake count. The lead does not see Delete, and the Google script refuses it without the HQ log in.
  - If two people edit the same intake at once, the last one to save wins.
  - The pop-up's questions are short versions of the intake form. If a question changes on the intake form, change it in the pop-up too (both are in pages/reception.html).
- GOOGLE SCRIPT CHANGED (Sean pastes and deploys it): new actions recEdit and recDeleteOne.
- Version number is now ?v=0.27.7 on every page and the homepage footer reads v0.27.7

## v0.27.6 (Oct 13, 2026)
- Homepage: the "Get the SEPA Tools App for your phone!" button is now a navy card with a white border, right above the photo gallery, instead of a plain button in the list. It has a small phone picture, a yellow NEW tag and the same one-time gleam as the shift sign-up bar. It opens get-app/.
- To remove the NEW tag later: delete the side-app-new line in index.html.

## v0.27.5 (Oct 13, 2026)
- Homepage: the QR card under the photos is gone. In its place, a new red-panel button right above Browse Library: "Get the SEPA Tools App for your phone!"
- New page get-app/: "Launch any tool from one App", three selling points, a picture of the app on a phone, and two buttons: Install for Android (left) and Install for iPhone (right).
- New pages get-app/iphone.html and get-app/android.html with the install steps. Step 1 is a QR code on computers; on phones it is an "Open SEPA Tools" button instead (you cannot scan your own screen). The iPhone page has pictures for each tap: ••• then Share then View More then Add to Home Screen.
- Styles for these pages live in css/get-app.css.
- App page (app/): iPhone steps updated to the same four taps, with a link to the step-by-step page. App cache bumped to sepa-tools-3 so phones pick up the change.

## v0.27.4
- SEPA TOOLS APP (new folder app/, address sepalibrary.org/app). A one-screen "app" people add to their
  phone's home screen: a red SEPA Tools icon that opens to a grid of nine buttons, in this order:
  RC Care, Noggin, Shift Sign Up (opens only the shift calendar page), SCIA, Escalation, Reception
  Center, Practice RC Care, Practice SCIA, RC Reserve. Each opens that tool's own site; the app logs in
  to nothing and stores nothing. The two practice buttons are marked "Practice".
  - iPhone: open sepalibrary.org/app in Safari > Share > Add to Home Screen. Android: Chrome > menu >
    Add to Home screen / Install app. The page shows these steps until it is installed.
  - Files: index.html (the buttons; edit a line to change one), manifest.webmanifest (name, colors,
    icon), sw.js (keeps the button screen on the phone for weak signal), icons.
  - The app page opens with a bright yellow-topped card, "To put the SEPA Tools App on your phone:",
    with three numbered steps each for iPhone and Android (with small pictures of the buttons to tap).
    It hides once the app is opened from the home screen. On computers it also shows a QR code.
- HOMEPAGE: a "Get the SEPA Tools app for your phone!" card under the photo gallery (which stays, a
  little shorter). Computers: a QR code to scan with a phone. Phones: a "Get the app" button.

## v0.27.3
- REMOVE A RESPONDER (Escalation Form and Reception Center Form). Sean's "three supervisors" case: on a
  big scene, the lead (or HQ) takes one responder off the event so they can go start a second
  reception center or worksheet as its own lead.
  - The lead's form and HQ's summary / live view now show "Who is on this ..." (name, lead marked,
    last seen) with a Remove button that asks first. The lead cannot be removed.
  - What the removed person already entered STAYS in the event. A half-done intake can be finished
    and saved first; their phone then leaves (within about a minute).
  - Their phone shows "You have been removed from [center name]. Thank you so much for your help!"
    (Escalation: "from the worksheet for [address]") and "Do you wish to start a new reception center /
    worksheet?" with a Yes button that opens the normal Start screen (starting still needs the HQ
    user name and password).
  - They can be let back in later with a new join link or Ask to join.
  - Escalation Form: a "Your name" box, so the lead knows who is on the worksheet (the lead's own name
    comes from "ARC DAT Event Lead" if left blank).
- ESCALATION FORM: "live view" is now called the SCENE SUMMARY everywhere on the page (buttons, titles,
  messages). Only the lead and HQ can open it, with the HQ log in.
- ESCALATION FORM: buttons a responder cannot use are hidden on responders' phones: the whole "For HQ"
  group (Share / Copy / Open the Scene Summary), the Share button at the bottom, and "See recent
  worksheets". (The Reception form already hid its lead tools from responders.)
- START SCREENS (both forms): three distinct blocks, same look on both forms.
  1. Leads (pale blue): the red button now reads "Leads: Click Here to Start a Reception Center Intake"
     (Escalation: "Leads: Click Here to Start an Escalation Worksheet").
  2. "Not the lead?" (blue-grey, navy line): "Choose one of the options below or wait for a link from
     the lead", then Ask to join and Text the lead yourself.
  3. HQ (tan, bronze line): "Log in here to view the data summaries for every open ...", with
     "HQ: Log In to View Data Summaries" (opens the HQ list).
  The old HQ lines (inside the responder part, and "HQ: all reception centers" at the bottom of the
  Reception page) are replaced by the HQ block.
- PHONE NUMBERS (js/phone-format.js): phone boxes on the Escalation Form, Reception Center Form and
  shift signup tidy themselves when you leave the box: 2674323792, (267) 432 3792 or 1-267-432-3792
  become 267-432-3792. Anything else (an extension, words, two numbers) is left as typed.
- Google script: new tab "Responders" (one row per phone per event; YES in "Removed" removes someone by
  hand; rows deleted when the event is cleared) and action rosterRemove. Needs the script pasted and
  deployed (no new permissions).

## v0.27.2
- ASK TO JOIN (Escalation Form and Reception Center Form, js/ask-lead.js). On the Start screen a
  responder who is en route, whose lead is busy elsewhere, who does not know who the lead is, or who is
  in a remote training exercise taps "Ask to join", picks the event from a list of open ones (only its
  start time, the lead's name and, for Reception, the center name; no addresses, nothing typed in the
  forms), and enters their name (phone optional). The lead's phone shows "Bob Jones is asking to join"
  (it buzzes on phones that allow it, and the tab title shows the count) with Approve and Decline.
  Approve adds them: the responder's page joins by itself within a few seconds. Decline tells them.
  The request survives closing and reopening the page. Requests last 6 hours, kept in the script's
  short-term memory, not the Sheet.
- "Text the lead yourself" opens a text message with the request already written (for when they know
  the lead). Nothing is sent by the website.
- HQ: a line on the Start screen links to the HQ list, so HQ never has to wait for a lead to send a link.
- Google script: new askList, askJoin, askStatus, askAnswer, recAsks; escSync hands the lead's phone
  its waiting requests. Needs the script pasted and deployed (no new permissions).

## v0.27.1
- ESCALATION FORM: becoming the lead now needs the HQ user name and password, the same as the
  Reception Center Form. Opening the form with no worksheet shows "Start a worksheet"; tapping it opens
  a pop-up asking for the HQ login (a device already logged in as HQ skips it). The pop-up does not log
  the device in as HQ, so only real HQ logins see the live view list and the Clear button. Responders
  still join with the lead's link, no password. The Google script checks this too (new escStart; escSync
  no longer makes a worksheet by itself). Starting needs a signal once; after that typing works offline.
- Fixed: the yellow "That link cannot be used to join a worksheet" warning kept appearing after HQ
  cleared a worksheet (the Back button or an old bookmark still pointed at the cleared one). A phone
  now recognizes a worksheet it once had and skips the warning.
- The lead check is shared by both forms in the script (leadDenied_).

## v0.27
- DOCUMENTS MOVED TO GOOGLE DRIVE. Every document now lives in the Drive folder "SEPA Library Files"
  (sepalibrary account), not on GitHub. documents/library, documents/masscare and documents/onboarding
  were removed from the website folder (the escalation worksheet PDF stays). v0.26's Browse Library was
  never pushed, so its 194 MB never reached GitHub.
- ADMIN-FRIENDLY: Browse Library, the Mass Care list and the Onboarding cards are drawn live from that
  folder (js/library.js). Add, remove or rename a file in Drive and the site catches up within about
  10 minutes. Each folder is a group; folders inside it are subheadings; the title is the file name.
  New folders appear at the end of Browse Library. The Onboarding cards find their files by name
  (data-doc in pages/new.html).
- GOOGLE SCRIPT: new LIBRARY FILES section. ...exec?lib=1 lists the folder, ...exec?find=... searches the
  text inside the documents. setupLibrary (run once) makes the folder viewable by link and starts a
  10-minute refresh. Leftover ".tmp.pdf" copies are ignored.
- SITE SEARCH (js/search.js): one search on the homepage, Browse Library and Mass Care. It shows this
  site's pages and Quick launch links, documents by title, documents that mention the words inside
  them, and GAP codes. Abbreviations work both ways (from Sean's answers, js/search-data.js); form
  numbers find their forms (6409 -> F6409, F6409B, Disaster Requisition); IS-100 style course numbers;
  "pets" finds "Pet"; "shelter" finds "Sheltering". No snippets or page numbers yet (later).
- Homepage: results take the calendar's place while searching; Esc or clearing the box brings it back.
- RECEPTION CENTER FORM: becoming the lead now needs the HQ user name and password (the same login as
  the Escalation Form live view, kept only in the Sheet's Settings tab). Tapping Start opens a pop-up
  asking for them; a phone already logged in as HQ skips it. The pop-up does not log the phone in as
  HQ, so a lead still cannot clear centers or see the HQ list. The Google script checks this too, so it
  cannot be skipped. Responders still join with the lead's link, no password.

## v0.26
- BROWSE LIBRARY FILLED (pages/library.html, the homepage's Browse Library button). It was two
  "coming soon" buttons (FAQs and Common Documents, Training Center; those pages still exist but are
  no longer linked from here). Now a red page with 202 items from Library assets, a search box, and
  jump buttons to each group: Getting started, Response guides and forms, Duty Officer resources,
  Individual Disaster Care (IDC), Mass Care, Volunteer leadership tools, Training presentations,
  DAT Chats and events, Videos. Groups follow Sean's folders for now (Sean: organization comes later);
  sub-folders show as small headings. Every file opens in a new tab and has a Download button
- New files are in documents/library (202 MB). Files already on the site (Onboarding, Mass Care) are
  reused, not copied twice, and exact duplicates are stored once
- HELD BACK (listed with reasons in "Library assets/Held back from the website.xlsx", nothing deleted):
  the 3 "(FOUO)" Philadelphia shelter plans (never public); the Mass Care planning archive (county
  plans, OEM reviews, vendor MOUs and lists, IAPs, surveys, simulation modules); Tools for Instructors
  (instructor manuals and course decks, 576 MB); videos (6.8 GB, too big for the host; planned for
  YouTube); spreadsheets; meeting minutes; the roleplay photo decks; the PA tax-exempt certificate;
  a performance evaluation form; Language Line info and county fire verification numbers; the DHS
  Fundamentals deck (over GitHub's 100 MB limit); Archived, Restricted and Photo Gallery folders
- The homepage search bar is NOT connected to the library yet (it still only filters the homepage
  buttons). The library page has its own search box. One shared site search is the next step
- Version number is now ?v=0.26 on every page and the homepage footer reads v0.26

## v0.25
- MASS CARE PAGE BUILT (pages/masscare.html, the homepage's Mass Care button). It was a "coming
  soon" filler. Now a red page like the others with:
  - Four big buttons across the top: Launch SCIA (navy; the same address as SCIA in the Quick
    launch bar, redcross.org/scia), Escalation Form, Reception Center Form, and "Find someone in
    the Red Cross that you need" (opens Contacts)
  - Every file from Library assets/Mass Care Resources, one line each with its type, size and a
    Download button, in groups: Start here, Important forms, Sheltering, Helping clients with
    disabilities and access needs, Feeding, Military-connected clients, Logistics, Videos. A search
    box filters them as you type
  - Files are in documents/masscare with plain web-safe names; titles were tidied (e.g. "(Master)",
    "Editable" and "- OneSource" dropped, "Ofline" and "Fullfillment" corrected)
- Left out: only the "Restricted" folder (Library Administration and permissions videos; Sean:
  ignore it for now). "Shelter Key Phone Numbers (Dec 2025)" IS included (Sean: those numbers are
  public, most match the Contacts page). Files that sit in more than one of Sean's folders are listed
  in each of those groups on purpose ("so people can find things wherever they end up"); the page
  points them all at one copy of the file. A SCIA group was added for the SCIA Resources folder. The
  Supervisor Shift Change document appears in Start here and Important forms, both using the newer
  (Feb 15) version
- VIDEOS: the two long ones were too big for GitHub (172 MB and 145 MB; the limit is 100 MB per file),
  so they were re-encoded at 720p: Volunteer Training for Family Resource Centers (41 min, 69 MB) and
  Mass Care Feeding Workshop (54 min, 74 MB). Slides stay readable. The originals in Library assets
  are untouched. The Primer on SCIA Interface Changes is the original (28 MB). The "Speciality Driver
  Videos" shortcut is a link to its YouTube playlist
- Version number is now ?v=0.25 on every page and the homepage footer reads v0.25

## v0.24
- FORUMS ON THE RED BACKGROUND, like Contacts and Onboarding (Sean: for consistency). The logo sits
  on a white card in the middle; "Log in / Register" (white) and "Close this tab" are top right.
  Words straight on the red are white; boards, threads and posts stay white cards. On phones the
  board counts sit under the board name
- A client-privacy box right under the "Discussion Forums" title on the forums' front page: never
  post a client's name, address, phone number, case number, health details, or a photo or
  description that could identify them. The photo rules on the Share your Photos board are unchanged
- ONBOARDING PAGE, Sean's wording changes:
  - The welcome is split: "Welcome Aboard!" then, on its own line, "Thank you so much for joining
    us". "an average of" is gone: "helps more than 50 displaced families every month..."
  - Step 1: the three contact cards are smaller (40px photos, smaller type) so they no longer
    dominate; the "Not sure who your Team Leader is?" line is in a yellow box to stand out
  - Step 3: "It can be hard to find these on the Volunteer Connection site, so use How to Find
    Your Assigned Trainings". "Tell your Team Leader when you have finished RC Respond Basics and
    you're ready to go out and observe. You'll be sent a link to set up your account. Then list
    yourself as On Call..." "Take a look at What a Request Looks Like on Your Phone to see exactly
    what will be coming to you and understand each step."
  - Step 5 heading is now "Your first time out – Don't panic!" (removed from the text below)
  - The closing thank-you is now a heading the same size as the steps, with a navy heart badge
- No Google script change
- Version number is now ?v=0.24 on every page and the homepage footer reads v0.24

## v0.23
- DISCUSSION FORUMS REBUILT as a classic message board, from Sean's "Forums" document:
  - Six boards: New to the Red Cross? Ask your questions here / General Discussion / Help tackling
    odd or unusual responses: Did I do this right? / Share your Photos, Stories and Shout Outs to
    Inspire Others / Suggestions / RC Platform Help (RC Care, RC Respond/Noggin, Volunteer
    Connection, SCIA, Sandboxes, etc.). Each shows its thread and message counts and latest post.
    The boards' names and one-line descriptions are in the Google script (FORUM_BOARDS)
  - Click a board: its threads, most recent activity first (25 a page), with page links on long
    threads. Click a thread: posts in the order written, 20 a page (Sean: classic board, not Reddit)
  - Anyone can read without an account. A notice says so on the front page. Posting needs a simple
    account: email, display name, password. Any email works and only the display name is shown.
    "Log in / Register" is at the top right of the Forums page, and Reply / Start a thread open
    the same box for anyone not logged in (what they typed is kept)
  - "Forgot your password?" emails a 6-digit code (good 30 minutes) from the script's Google
    account, sepalibrary@gmail.com. That is the only email the forums send (no reply notifications)
  - Photos: up to 4 per post, shrunk on the device first (longest side 1600 pixels), kept in a
    Drive folder "SEPA Library Forum Photos". The Share your Photos board shows a red box with the
    photo rules (no client faces or anything identifying, no house numbers or other location
    details, nothing from a scene without permission); the other boards show them by the button
  - Everyone can edit or delete their own posts. Moderators (YES in the new "Moderator" column of
    the Forum Members tab) get Hide on every post. Removing a thread's first post removes the
    thread. Removed posts stay in the Sheet marked Hidden, so they can be brought back
  - Unsent writing is kept on the device if the page is closed by accident
- GOOGLE SCRIPT CHANGED (Sean pastes and deploys it, then runs setupForum once). setupForum asks
  Google for Drive and Mail permission, makes the tabs Forum Members / Forum Threads / Forum Posts /
  Forum Photos and the Drive folder, and DELETES the old forum tabs Topics, Replies and Members
  (Sean: start fresh). The old name-only forum code is gone
- Version number is now ?v=0.23 on every page and the homepage footer reads v0.23

## v0.22
- ONBOARDING PAGE, Sean's changes (Oct 12, 2026):
  - The welcome is bigger: "Welcome aboard, and thank you so much for joining us!" as a large
    white heading, with the families-helped line under it in larger type
  - The white box is now five numbered steps, in Sean's words lightly tightened: 1 Start with your
    Team Leader (now three contacts: Debbie Tevlin, Marty Westermann and Michael Bradley, same as
    on the Contacts page), 2 Receive a DAT Induction, 3 Get in the field (EDGE courses, RC Respond
    Basics first, going On Call, requests on your phone), 4 Further course work (DAT Response
    Fundamentals in person every month; "Find it here" opens the same Register for Classes and
    Events link as the homepage button), 5 Your first time out. Then Sean's closing thank-you
  - Guide names in the steps are links that jump down to that guide's card, which flashes yellow
  - The guides are one group, "Resources and guides", with no sub-headings. Order: DAT Member
    Expectations, How to Find Your Assigned Trainings, How to Use Volunteer Connection (video);
    then What a Request Looks Like on Your Phone, How to Go On Call with the Noggin App on Your
    Phone, How to Go On Call Through the Website; then the Pocket Guide, Your First Time to a Scene,
    What Information to Collect at a Scene, Tips When Interacting with Clients, How to Log In to RC
    Care
  - The Norristown map card is removed (its file is still in documents/onboarding, unused)
- "How to Go On Call Through the Website" (renamed from "...on the Volunteer Connection Website"):
  the old steps 1 to 3 (Volunteer Connection, RC View, the RC Respond box) are gone. Step 1 is now
  "Go to Noggin and log in" with the Noggin address from the Quick launch bar. Now 6 steps, 3 pages.
  The Noggin app guide's title now ends "on Your Phone". Both PDFs are also updated in Library
  assets/Onboarding Help (same file names)
- Version number is now ?v=0.22 on every page and the homepage footer reads v0.22

## v0.21
- RECEPTION CENTER FORM (pages/reception.html, new Quick launch link "Reception Center", placed
  after Escalation Form for now; Sean may move it later). Built from Sean's "Reception Center Form"
  Word document: 9 intake questions, one form per displaced person or family
  - Questions as typed boxes and big Yes/No buttons: name; address and unit; phone and an
    alternate contact; adults and children (total shown); pets (what, and are they with you);
    safe place tonight (Yes / No / Not sure, and where); would you stay in a shelter (the
    high-school-gym wording is shown for the responder to read out; Yes / No / Maybe); immediate
    needs, with "Basic needs only. Do not record diagnoses." (Sean: wording may change later);
    other concerns. Only the name is required
  - "Save and start the next intake" sends it and clears the form. No signal: finished intakes
    wait on the phone and go out by themselves. A half-done intake survives a page reload
  - The phone that starts a reception center (center name or location + the lead's name) is its
    lead. "Add a responder" (lead only) sends a join link. Joined phones only send intakes; phones
    do not sync with each other
  - THE SUMMARY (reception.html?view=CODE): totals (households, people, no safe place tonight,
    would stay in a shelter, households with pets, with immediate needs) and a table of every
    intake, newest first, updating every few seconds with new rows flashing yellow. "Download for
    Excel" saves a CSV. ONLY the lead's phone and HQ can open it (Sean's decision). The lead's
    phone holds a second secret code for this; responders see only their own count
  - HQ: same user name and password as the Escalation Form live view. reception.html?view=list
    lists the open reception centers
  - CLIENT DETAILS ARE DELETED, NOT ARCHIVED (Sean's decision). HQ's "Clear this reception center"
    deletes the center and all its intakes for good (it asks first and suggests downloading).
    If nobody clears it, it is deleted automatically 5 days after its last intake. Only the
    center's code and time are noted in the "Reception cleared" tab, so joined phones can tell
    their center has closed
- GOOGLE SCRIPT CHANGED (Sean pastes and deploys it). New tabs appear by themselves: "Reception
  Centers", "Reception Intakes", "Reception cleared". The 5-day delete runs whenever the form is
  used, and every night at 3 AM once startAutoDelete has been run once in the script editor. That
  nightly run sends no email. It is kept apart from the daily signup report on purpose: Sean does
  not want any reports sent yet (Oct 12, 2026). Neither form sends emails
- Quick launch: eleven links now. To keep them on one line the words are a touch smaller and
  closer together between 1,100 and 1,599 pixels wide. Checked every 20 pixels from 1,100 to
  1,920: one line, never wider than the screen
- Version number is now ?v=0.21 on every page and the homepage footer reads v0.21

## v0.20
- TWO SHIFT CALENDARS, ONE SPOT (Sean asked for this). The homepage calendar now has two tabs:
  "Field Responders" and "Duty Officers". Field Responders always shows when the page opens.
  Each tab has its own signups, its own green numbers and its own amber "no one yet" days
- Duty Officers works exactly like Field Responders (one-time, custom and recurring signups,
  same sign-up page, same daily report) except the standard shifts are 4 hours, not 6, starting
  at noon and every 4 hours after: 12 AM-4 AM (Overnight), 4-8 AM (Early morning), 8 AM-12 PM
  (Morning), 12-4 PM (Afternoon), 4-8 PM (Evening), 8 PM-12 AM (Night). They are listed in clock
  order for the day. Custom Duty Officer shifts can be as short as 4 hours (Field Responders stay
  at 6). Recurring opens with Afternoon (noon to 4) already chosen
- Homepage, computers: the tabs sit at the left end of the month line and the month with its
  arrows moved to the right end, so the calendar box is exactly as tall as before (checked at
  1540 and 1920 wide). Phones: the tabs get their own line above the month (the box is 50px taller)
- Clicking a day on the Duty Officers tab, or the navy bar while that tab is showing, opens the
  shift page on the Duty Officers tab (shifts.html?team=do). The shift page has the same two tabs
  above Step One, and also opens on Field Responders unless sent to Duty Officers
- GOOGLE SCRIPT CHANGED (Sean pastes and deploys it). New tabs "DO Signups" and "DO Recurring"
  appear in the Sheet by themselves, with the same columns as Signups and Recurring. A new
  Settings row "Minimum hours for a custom Duty Officer shift" appears set to 4. The 7 AM report
  now lists Field Responders first, then Duty Officers. Instant emails say "Duty Officer shift
  signup" for the new calendar
- Until the new script is deployed, the Duty Officers tab says "not switched on yet" and shows
  nothing, and Field Responders keeps working as before. (The website checks that the script
  answers as the Duty Officer calendar, so Field Responder signups can never show up there.)
- Version number is now ?v=0.20 on every page and the homepage footer reads v0.20

## v0.19
- ONBOARDING PAGE BUILT (pages/new.html, the "Onboarding" button on the homepage). It was a "coming
  soon" filler. Now it has the same red look as Contacts and:
  - A welcome: "Welcome aboard!" and the families-helped line (an average of more than 50 displaced
    families a month across the Philadelphia region; Sean: 50 is an average that goes up and down
    with the season)
  - A white box, "Start with your Team Leader", with Debbie Tevlin and Marty Westermann as the
    people to email if a new volunteer doesn't know who their Team Leader is. Photos, titles and
    clickable emails are the same as on the Contacts page
  - 12 guides as cards in three groups (Getting started / Going on call / On scene and after).
    Each card shows a picture of the first page, the title, one line about it, the file type and
    length, and a Download button. Clicking the picture or the title opens the guide in a new tab
  - Guides: DAT Member Expectations, How to Find Your Assigned Trainings, How to Use Volunteer
    Connection (video), DAT Pocket Guide, Map to Norristown Meetings, How to Go On Call on the
    Volunteer Connection Website, How to Go On Call with the Noggin App, What a Request Looks Like
    on Your Phone, Your First Time to a Scene, What Information to Collect at a Scene, Tips When
    Interacting with Clients (Word), How to Log In to RC Care
  - "How to Reserve a Car" is left out on purpose (Sean: more advanced than new volunteers need)
- The guide files are in documents/onboarding and their pictures in images/onboarding. Eight are
  the versions redesigned on Oct 12, 2026 and dated "Updated October 12, 2026". The Pocket Guide,
  First Time to a Scene and the Norristown map are unchanged originals. The video is the original
  file, rearranged so it starts playing before it has fully loaded (nothing re-encoded)
- DOWNLOADS ACROSS THE SITE (Sean: any document people pull up should be downloadable). Every
  guide has a Download button, which saves the file with a readable name. The Escalation Form's
  printable worksheet now also has a "Download the PDF" link next to "Printable PDF of this
  worksheet". New CSS class doc-dl is the Download button for future pages
- Version number is now ?v=0.19 on every page and the homepage footer reads v0.19

## v0.18.1
- Quick launch: SCIA now opens redcross.org/scia and Practice SCIA opens redcross.org/scia-training.
  These are the short official addresses from the "System Links" table Sean sent on Oct 11, 2026.
  Both were checked and lead to the Red Cross Volunteer Single Sign-On page. They replace the long
  sign-in addresses that had a one-time-looking code in them and might have stopped working
- The other eight Quick launch links are unchanged. Calendar and Volunteer Connect still both use
  the plain Volunteer Connection address (best guess, not yet confirmed)
- Version number is now ?v=0.18.1 on every page. The homepage footer still reads v0.18

## v0.18
- ESCALATION FORM: SEVERAL RESPONDERS, ONE WORKSHEET (Sean asked for this: with four responders on
  scene, v0.17 made four separate worksheets and HQ had to flip between them). Now the person who
  starts a worksheet taps "Add a responder". The phone's share menu opens and sends a join link.
  Whoever opens the link types into the same worksheet: no login, and everything already typed is
  there. Each person's entries reach the others in a few seconds and the box flashes yellow. HQ sees
  one worksheet per event
- THE LEAD: the phone that starts a worksheet is its lead, and only that phone shows "Add a
  responder" (Sean: "isn't so much for security as for chain of command clarity"). Phones that
  joined see "You joined this worksheet. Lead: (name). Only the lead, who started it, can add
  responders." The name comes from the "ARC DAT Event Lead" box. This is decided on the phone, so
  it gives clarity, not a lock: someone sent the link could still forward the text message itself
- Boxes are now saved one at a time, not the whole worksheet at once, so two people working in
  different boxes never overwrite each other. In the same box the later entry wins
- No signal still loses nothing: entries wait on the phone and go out by themselves when service
  returns, and that phone then catches up on what the others typed meanwhile
- When HQ clears the worksheet, every phone that joined goes blank and says why, and the join link
  stops working
- THE JOIN LINK IS THE KEY. It carries a long random code after a # sign. Anyone who has the link
  can read and type in that one worksheet without a login, so it should only go to the team. One
  person cannot be removed again; the worksheet ends for everyone when HQ clears it
- The code is not left in the address bar and is not in the live view link. So a link copied from
  the address bar, or a live view link, lets nobody into a worksheet (in v0.17 a copied address-bar
  link made two phones overwrite each other; that is gone). A phone that opens such a link gets its
  own separate worksheet and a message saying to ask for "Add a responder"
- A phone that already has its own worksheet with entries is asked before it switches to a shared
  one ("Join the shared worksheet" / "Stay on my own worksheet")
- The buttons at the top of the form are now in two groups: "For your team on scene" (Add a
  responder) and "For HQ" (Share the live view, Copy the link, Open the live view)
- The form checks in with Google every 5 seconds while a worksheet is busy and every 15 seconds
  once it has been quiet for 2 minutes
- NEEDS THE GOOGLE SCRIPT UPDATED AGAIN: paste google-apps-script/sepa-backend.gs into the script
  "SEPA Library Backend" at script.google.com and deploy a new version (Admin Guide 2). Do that
  BEFORE pushing this version. Until both are done the form says live sharing is not switched on
  and keeps everything on the device. Worksheets started under v0.17 carry over
- HQ side unchanged: same login, live view, list and clear button
- Changed files: js/escalation.js, pages/escalation.html, css/style.css (Escalation section),
  google-apps-script/sepa-backend.gs (new request "escSync"; the old "escSave" is removed)
- Version number is now ?v=0.18 on every page, and the homepage footer reads v0.18

## v0.17
- NEW, PROOF OF CONCEPT: the Escalation Form (pages/escalation.html). It is the "DAT Response Lead
  Incident Reporting Worksheet" (edition 2026.2.8, from Volunteer Leadership Tools) as a page that can
  be filled in on a phone or a laptop. 102 boxes, the original wording and order, one column, large
  boxes. Sean wants it to show leadership what is possible; he said to ignore security questions for now
- No Save button: everything typed is kept on the device at once and sent to the Google Sheet a
  moment later (new tab "Escalations", one row per worksheet)
- Live view: "Share the live view" sends a link (through the phone's own share sheet, so to anyone
  in the person's contacts; on a laptop it copies the link). Whoever opens the link and logs in sees
  the worksheet read only, refreshing every 6 seconds, and a box flashes yellow when it changes. In
  testing a new entry showed up in the live view 4 to 7 seconds after it was typed
- escalation.html?view=list shows the 25 most recent worksheets (after logging in)
- HQ LOGIN (Sean asked for the HQ side to be gated). Filling in a worksheet needs no login. Reading
  one does: the live view, the shared link and the recent list all show a "HQ log in" box first and
  nothing from the worksheet until the user name and password are right. One shared user name and
  password for everyone at HQ. A login lasts 30 days on a device; "Log out of the live view" ends it.
  Eight wrong tries locks the login for 15 minutes (for everyone)
- The user name and password are NOT in any website file (this folder is public on GitHub). They
  live in the Google Sheet, Settings tab, in two rows whose labels start "Escalation Form live view".
  The rows appear by themselves the first time the form is opened after the script update; Sean
  types the two values in. While either is blank the live view is locked to everyone. Changing the
  password there logs everyone out
- CLEAR AT THE END OF AN EVENT (Sean asked for a reset HQ can use). The live view has a button,
  "Clear this worksheet (end of event)". It asks first. Clearing moves the worksheet's row from the
  "Escalations" tab to a new tab, "Escalations cleared", with the time it was cleared, so there is
  still a record. The worksheet leaves the live view and the recent list, the responder's page
  notices within about 20 seconds, wipes what was typed, starts a new blank worksheet and says why,
  and anything sent late for the cleared worksheet is not saved. Needs the HQ login
- THE LIVE PART NEEDS ONE STEP FROM SEAN: paste the updated google-apps-script/sepa-backend.gs into
  the Google script "SEPA Library Backend" and deploy a new version (Admin Guide 2, "If the script
  code is ever changed"). Until then the form still works and keeps everything on the device, says
  plainly that live sharing is not switched on, and Share sends the worksheet as text instead
- That same script update also carries the earlier change that the shift sign-up no longer requires
  a phone number or email. The current sign-up page keeps working with it
- LIMITS OF THE PROTECTION: it is one shared password, and the fill-in page is open to anyone who
  finds it (they can add a worksheet, not read one). The incident details sit in the sepalibrary
  Gmail account's Sheet. Still test data only until leadership decides
- Quick launch: "Escalation Form" added as a tenth link, before Contacts ("for now", Sean). To fit
  ten links the space around each link is a little smaller, and on computers 1,100 to 1,279 pixels
  wide the words are slightly smaller and the "Quick launch" label is left off
- The fillable PDF of the same worksheet is in documents/ and linked from the bottom of the form
- New files: pages/escalation.html, js/escalation.js, documents/DAT-Response-Lead-Incident-
  Reporting-Worksheet-fillable-2026.2.8.pdf. Styles: the "ESCALATION FORM" section at the end of
  css/style.css
- Version number is now ?v=0.17 on every page, and the homepage footer reads v0.17

## v0.16.15
- Quick launch: the RC Reserve link now works. It opens https://auth.agilquest.com/eas-saml/saml/web/auth/americanredcross
  in a new tab. The address is the "Bookmark Link" printed on the RC Reserve Cheat Sheet in Library
  assets; Sean approved using it. Since v0.16.9 the button had been there but did nothing
- Not tested past the click: the address leads to a Red Cross sign-in, so Sean should click it once
  after the push to confirm it lands on RC Reserve
- Version number bumped to ?v=0.16.15 on every page (footer still reads v0.16)

## v0.16.14
- Homepage calendar key ("volunteers signed up" / "no one yet"): moved back to the bottom of the
  calendar, under the days, and centered. It had been under the month line since v0.15
- The key is a little more eye-catching: larger, bolder words (16 pixels, was 14) and larger samples
  of the green number and the amber box. Sean left the "how" to Claude. No colored chips (he had
  those removed in v0.14.4) and no gleam: the sign-up bar stays the only thing on the page that moves
- The calendar box is exactly as tall as before, so nothing else moved. The day names now sit right
  under the month line
- Phones: the key is under the days there too, kept at the smaller size so it fits on one line
- Version number bumped to ?v=0.16.14 on every page (footer still reads v0.16)

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
