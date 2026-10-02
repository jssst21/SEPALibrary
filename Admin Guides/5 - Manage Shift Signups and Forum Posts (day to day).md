# Guide 5: Manage Shift Signups and Forum Posts (day to day)

**What this does:** explains how admins see signups, cancel them, change shifts,
and remove forum posts. Everything is done in the Google Sheet **SEPA Library Data**.

Requires Guide 2 to be finished first.

## Shift signups

Volunteers pick a day, then choose one of the 4 standard shifts
(12 AM to 6 AM, 6 AM to 12 PM, 12 PM to 6 PM, 6 PM to 12 AM), **Custom** hours, or **Recurring**.

- **One-time signups:** **Signups** tab. Newest at the bottom.
  To cancel one, delete that row.
- **Recurring signups** (same hours every week on chosen weekdays): **Recurring** tab.
  These repeat until removed. To stop one, type **YES** in "Stopped" (keeps a record) or delete the row.
- **Minimum hours for Custom shifts:** **Settings** tab, "Minimum hours for a custom shift" (currently 6).
- **Daily signup report:** every morning at **7 AM** an email lists everyone who signed up since the
  last report (one-time and recurring, with phone/email and notes). It goes to the address(es) in
  **Settings**, "Admin email(s) for the daily 7 AM signup report" (currently sepalibrary@gmail.com).
  Add more admins by separating emails with commas. Leave it blank to stop the report.
- **Instant email per signup:** off by default. Type **YES** in Settings, "Also email each signup
  the moment it happens?" to turn it on.
- **How far ahead people can sign up:** **Settings** tab, "Days ahead".
- **Changing the 4 standard shift times** requires a small code change. Ask Claude.
- Don't edit the "(do not edit)" columns. The website uses them to show coverage.

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
