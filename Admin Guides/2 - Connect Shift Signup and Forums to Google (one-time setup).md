# Guide 2: Connect Shift Signup and Forums to Google (one-time setup)

**What this does:** turns on the shift signup calendar and the discussion forums so that
what volunteers enter is actually saved. Until this is done, both pages show "Preview mode".

**Status: DONE on October 2, 2026.** The Sheet "SEPA Library Data" and the script
"SEPA Library Backend" are in sepalibrary@gmail.com, and the website is connected.
Keep this guide in case it ever has to be redone (for example, moving to a new account).

**Before you start:** do Guide 1 (create the SEPA admin Gmail account) first.

The **shift signup calendar** and the **discussion forums** both save to one Google Sheet.
This guide connects them. It takes about 10 minutes and only has to be done once.

**Do this while logged into the shared SEPA admin Gmail account**, not a personal one,
so the Sheet and the script belong to SEPA and can be handed to future admins.

## Part 1: Make the Google Sheet

1. Go to **sheets.google.com** (logged in as the SEPA admin account) and click **Blank spreadsheet**.
2. Click "Untitled spreadsheet" at the top left and name it **SEPA Library Data**.

## Part 2: Paste in the script

1. In the Sheet's top menu, click **Extensions**, then **Apps Script**. A new tab opens.
2. Click in the big code box, press **Cmd + A**, then **Delete**, so it's empty.
3. In VS Code, open the **google-apps-script** folder and click **sepa-backend.gs**.
   Click in the code, press **Cmd + A**, then **Cmd + C**.
4. Go back to the Apps Script tab, click in the empty code box, and press **Cmd + V**.
5. Near the top of the code, find `var SHEET_ID = '...';` and replace the code between the
   quotes with your own Sheet's ID: the long code in the Sheet's web address, between
   `/d/` and `/edit`.
6. Click the **Save** icon (the floppy disk) above the code.

## Part 3: Create the tabs

1. Above the code there is a dropdown next to **Run**. Make sure it says **setup**.
2. Click **Run**.
3. Google asks for permission. Click **Review permissions** and pick the SEPA admin account.
4. You'll see "Google hasn't verified this app". This is normal for scripts you write yourself.
   Click **Advanced**, then **Go to Untitled project (unsafe)**, then **Allow**.
5. Go back to the Sheet tab. You should now see these tabs at the bottom:
   **Signups, Shifts, Settings, Members, Topics, Replies, Sessions**.

## Part 4: Fill in your shifts and settings

- **Shifts tab:** one row per shift. Change the names, times and number of spots to match
  your real shifts. In the Days column, write **All**, or list days like **Mon,Wed,Sat**.
- **Settings tab:** put an email next to "Admin email" to get an email for each shift
  signup. Leave it blank for no emails. "Days ahead" controls how far out people can sign up.

## Part 5: Turn it on

1. In the Apps Script tab, click the blue **Deploy** button (top right), then **New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Set **Execute as: Me** and **Who has access: Anyone**.
4. Click **Deploy**. Copy the **Web app URL** it shows (it starts with https://script.google.com).
5. Send that URL to Claude, who pastes it into the website. Or do it yourself: open
   **js/config.js** in VS Code, paste it between the quotes on the line
   `var SEPA_BACKEND_URL = '';`, then save and push.

## After setup

For managing signups and forum posts day to day, see
**"5 - Manage Shift Signups and Forum Posts (day to day).md"**.

## If the script code is ever changed

Paste the new code, click Save, then **Deploy > Manage deployments >** pencil icon
**> Version: New version > Deploy**. This keeps the same Web app URL, so the website needs no change.

## Adding other admins

Don't share the Gmail password. Instead, in the Sheet click **Share** and add the other
admin's own email as an **Editor**. They can then manage signups and posts.

## Privacy note

Shift signups include names and phone numbers. Only people the Sheet is shared with can see them.
The website only ever shows how many shift spots are left, never who signed up.
While forum logins are off, **anyone on the internet can read and post** in the forum.
