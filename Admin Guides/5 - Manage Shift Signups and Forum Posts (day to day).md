# Guide 5: Manage Shift Signups and Forum Posts (day to day)

**What this does:** explains how admins see signups, cancel them, change shifts,
and remove forum posts. Everything is done in the Google Sheet **SEPA Library Data**.

Requires Guide 2 to be finished first.

## Shift signups

- **See who signed up:** open the Sheet, **Signups** tab. Newest are at the bottom.
- **Cancel a signup:** delete that row. The spot opens up again on the website.
- **Change shift times or number of spots:** edit the **Shifts** tab.
  In the Days column write **All**, or list days like **Mon,Wed,Sat**.
  The website updates right away.
- **Get an email for each signup:** **Settings** tab, put an email next to "Admin email".
- **How far ahead people can sign up:** **Settings** tab, "Days ahead".

## Forum posts

- **See all posts:** **Topics** tab (each discussion) and **Replies** tab (each reply).
- **Remove a post from the website:** type **YES** in its "Hidden" column.
  Clear the YES to bring it back. Deleting the row also works.
- **Right now anyone can post** by typing a name. No sign-up is required.

## Turning on forum logins (later)

1. In the Sheet: **Extensions > Apps Script**.
2. Near the top of the code, change `var FORUM_REQUIRES_LOGIN = false;` to `true`.
3. Click Save, then **Deploy > Manage deployments >** pencil icon **> Version: New version > Deploy**.
4. Ask Claude to switch the forum page to show the join / log in screens.

Once logins are on, the **Members** tab lists everyone, and typing **YES** in "Blocked"
turns someone off.

## Adding another admin

In the Sheet, click **Share** (top right), type the new admin's own email, set them to
**Editor**, and click **Send**. Don't share the admin Gmail password.

## Privacy

- Shift signups contain names and phone numbers. Only people the Sheet is shared with see them.
- The website only shows how many shift spots are left, never who signed up.
- While forum logins are off, **anyone on the internet can read and post** in the forum.
