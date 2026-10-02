# DAT Shift Signup: one-time setup

The signup page on the website (pages/shifts.html) sends every signup to a Google Sheet.
This guide connects the two. It takes about 10 minutes and only has to be done once.

## Part 1: Make the Google Sheet

1. Go to **sheets.google.com** and click **Blank spreadsheet**.
2. Click "Untitled spreadsheet" at the top left and name it **DAT Shift Signups**.

## Part 2: Paste in the script

1. In the Sheet's top menu, click **Extensions**, then **Apps Script**. A new tab opens.
2. Click in the big code box, press **Cmd + A**, then **Delete**, so it's empty.
3. In VS Code, open the **google-apps-script** folder and click **shift-signup.gs**.
   Click in the code, press **Cmd + A**, then **Cmd + C**.
4. Go back to the Apps Script tab, click in the empty code box, and press **Cmd + V**.
5. Click the **Save** icon (the floppy disk) above the code.

## Part 3: Create the tabs

1. Above the code there is a dropdown next to **Run**. Make sure it says **setup**.
2. Click **Run**.
3. Google asks for permission. Click **Review permissions**, pick your Google account.
4. You'll see "Google hasn't verified this app". This is normal for scripts you write yourself.
   Click **Advanced**, then **Go to Untitled project (unsafe)**, then **Allow**.
5. Go back to the Sheet tab. You should now see three tabs at the bottom:
   **Signups**, **Shifts**, and **Settings**.

## Part 4: Fill in your shifts and settings

- **Shifts tab:** one row per shift. Change the names, times and number of spots to match
  your real shifts. In the Days column, write **All**, or list days like **Mon,Wed,Sat**.
- **Settings tab:** put the admin's email next to "Admin email" to get an email for each
  signup. Leave it blank for no emails. "Days ahead" controls how far out people can sign up.

You can change these any time. The website picks up changes right away.

## Part 5: Turn it on

1. In the Apps Script tab, click the blue **Deploy** button (top right), then **New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Set **Execute as: Me** and **Who has access: Anyone**.
4. Click **Deploy**. Copy the **Web app URL** it shows (it starts with https://script.google.com).
5. Send that URL to Claude, who pastes it into the website. Or do it yourself: open
   **js/shifts.js** in VS Code and paste it between the quotes on the line
   `var SIGNUP_URL = '';`, then save and push.

## Day to day

- **See signups:** open the Sheet, **Signups** tab. Newest are at the bottom.
- **Remove a signup** (someone cancels): delete their row. The spot opens up again on the site.
- **Change shifts or spots:** edit the **Shifts** tab. Nothing else needed.
- **If the script code is ever updated:** paste the new code, Save, then **Deploy >
  Manage deployments >** pencil icon **> Version: New version > Deploy**. This keeps the same URL.

## Privacy note

Signups include names and phone numbers. Only people you share the Sheet with can see them.
The website itself only ever shows how many spots are left, never who signed up.
