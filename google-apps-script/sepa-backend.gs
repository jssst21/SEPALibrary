/**
 * SEPA Resource Library - Google Sheet backend
 * Powers: DAT shift signup calendars (Field Responders and Duty Officers) + Discussion Forums +
 *         Escalation Form (proof of concept) + Reception Center Form +
 *         the list of library documents and the search inside them (website v0.27, from Google Drive)
 *
 * This code lives inside ONE Google Sheet (Extensions > Apps Script).
 * It is NOT part of the website itself. See "Admin Guides" folder, Guide 2.
 *
 * Tabs the admin uses:
 *   Signups   - Field Responder one-time shift signups (delete a row to cancel it)
 *   Recurring - Field Responder weekly repeating signups (delete a row, or type YES in "Stopped", to end it)
 *   DO Signups   - the same, for the Duty Officers calendar (website v0.20). Appears by itself the
 *                  first time anyone opens the Duty Officers tab.
 *   DO Recurring - the same as Recurring, for Duty Officers.
 *   Settings  - report email(s), how far ahead people can sign up, minimum hours for custom shifts
 *               (one row for Field Responders, and since v0.20 one row for Duty Officers, default 4)
 *   Forum Members - forum accounts (website v0.23). YES in "Blocked" blocks someone, YES in
 *               "Moderator" makes someone a moderator. See DISCUSSION FORUMS below.
 *   Forum Threads - one row per thread. YES in "Hidden" hides it.
 *   Forum Posts   - one row per post. YES in "Hidden" hides it.
 *   Forum Photos  - one row per uploaded photo (the photos are in the Drive folder "SEPA Library Forum Photos").
 *   Sessions  - logins (leave alone; delete all rows to log everyone out of the forums and HQ views)
 *   Escalations - one row per Escalation Form worksheet (proof of concept, website v0.17; since
 *               v0.18 several responders can type into one worksheet). The tab appears by itself
 *               the first time someone uses the form.
 *   Escalations cleared - worksheets HQ cleared at the end of an event. Kept as a record; delete rows
 *               here to remove them for good.
 *   Settings also holds the HQ user name and password for the Escalation Form live view.
 *   Reception Centers - one row per reception center (website v0.21). Appears by itself.
 *   Reception Intakes - one row per family or person taken in at a reception center. These hold
 *               client details: they are DELETED (not archived) when HQ clears the center, or
 *               automatically 5 days after its last intake. See RECEPTION CENTER FORM below.
 *   Reception cleared - just the code and time of each center that was cleared (no client details).
 *
 * Since website v0.27 the website's DOCUMENTS are not in the Sheet or on GitHub: they are in the Google
 * Drive folder "SEPA Library Files". See LIBRARY FILES at the end of this script.
 */

/* The Google Sheet this script saves to (the long code in the Sheet's web address,
   between /d/ and /edit). Leave blank only if the script was opened from the Sheet itself. */
var SHEET_ID = '1Ndx-55A7LBEYv8lrX8lpryu9-iOUL9WXmwiTiM9eF9I';

var DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
var SIGNUP_HEADERS = ['Submitted', 'Shift Date', 'Hours', 'Name', 'Phone', 'Email', 'Notes', 'Start hour (do not edit)', 'Length (do not edit)'];
var RECURRING_HEADERS = ['Submitted', 'Every', 'Hours', 'Name', 'Phone', 'Email', 'Notes', 'Starting', 'Stopped (type YES)', 'Start hour (do not edit)', 'Length (do not edit)'];


var REPORT_HOUR = 7;   // daily signup report goes out at 7 AM
var SETTING_EMAIL_LABEL = 'Admin email(s) for the daily 7 AM signup report (separate several with commas; blank = no report)';
var SETTING_INSTANT_LABEL = 'Also email each signup the moment it happens? (YES or NO)';
var SETTING_DO_MIN_LABEL = 'Minimum hours for a custom Duty Officer shift';

/* The two shift calendars (website v0.20). Each has its own pair of tabs in the Sheet.
   "dat" = Field Responders (the original calendar). "do" = Duty Officers. */
var TEAMS = {
  dat: { one: 'Signups', rec: 'Recurring', label: 'DAT', title: 'Field Responder' },
  do: { one: 'DO Signups', rec: 'DO Recurring', label: 'Duty Officer', title: 'Duty Officer' }
};
function team_(t) { return t === 'do' ? 'do' : 'dat'; }
/* The tabs for one team. The Duty Officer tabs are made the first time they are needed. */
function teamTabs_(t) {
  var T = TEAMS[team_(t)];
  makeTab_(T.one, SIGNUP_HEADERS);
  makeTab_(T.rec, RECURRING_HEADERS);
  return T;
}

/* =========================================================
   ONE-TIME SETUP: run this once from the Apps Script editor
   ========================================================= */
function setup() {
  makeTab_('Signups', SIGNUP_HEADERS);
  makeTab_('Recurring', RECURRING_HEADERS);
  makeTab_('DO Signups', SIGNUP_HEADERS);
  makeTab_('DO Recurring', RECURRING_HEADERS);
  makeTab_('Settings', ['Setting', 'Value'], [
    [SETTING_EMAIL_LABEL, ''],
    ['Days ahead people can sign up', '60'],
    ['Minimum hours for a custom shift', '6'],
    [SETTING_INSTANT_LABEL, 'NO']
  ]);
  makeTab_('Forum Members', FORUM_MEMBER_HEADERS);
  makeTab_('Forum Threads', FORUM_THREAD_HEADERS);
  makeTab_('Forum Posts', FORUM_POST_HEADERS);
  makeTab_('Forum Photos', FORUM_PHOTO_HEADERS);
  makeTab_('Sessions', ['Token', 'Name', 'Created']);
  makeTab_('Escalations', ESC_HEADERS);
  makeTab_('Escalations cleared', ESC_HEADERS.concat(['Cleared']));

  var ss = ss_();
  ss.getSheetByName('Settings').setColumnWidth(1, 460);
  var blank = ss.getSheetByName('Sheet1');
  if (blank && blank.getLastRow() === 0) ss.deleteSheet(blank);
}

function makeTab_(name, headers, rows) {
  var ss = ss_();
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);
  if (sh.getLastRow() > 0) return;
  sh.getRange(1, 1, 1000, headers.length).setNumberFormat('@');
  sh.appendRow(headers);
  (rows || []).forEach(function (r) { sh.appendRow(r); });
  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, headers.length).setFontWeight('bold');
}

/* =========================================================
   Helpers
   ========================================================= */
function ss_() { return SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet(); }
function tab_(name) { return ss_().getSheetByName(name); }
function tz_() { return ss_().getSpreadsheetTimeZone(); }
function rows_(name) { return tab_(name).getDataRange().getValues().slice(1); }
function today_() { return Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd'); }
function isYes_(v) { return /^\s*y(es)?\s*$/i.test(String(v)); }

function asDateText_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, tz_(), 'yyyy-MM-dd');
  return String(v).trim();
}
function asText_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, tz_(), 'h:mm a');
  return String(v).trim();
}
/* Timestamps are stored as text like 2026-10-02 17:45:00 (sortable and readable). */
function stamp_(d) { return Utilities.formatDate(d || new Date(), tz_(), 'yyyy-MM-dd HH:mm:ss'); }
function iso_(v) { return v instanceof Date ? stamp_(v) : String(v).replace(/^'/, ''); }

/* Stop text that starts with = + - @ from being treated as a spreadsheet formula. */
function safe_(s) { s = String(s); return /^[=+\-@]/.test(s) ? "'" + s : s; }

function clean_(s, max) { return String(s == null ? '' : s).replace(/\r\n/g, '\n').trim().slice(0, max); }

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* =========================================================
   Web entry points
   ========================================================= */

// GET = shift calendar data (public: counts only, never names).
// ...exec?team=do gives the Duty Officers calendar; anything else gives Field Responders.
// ...exec?lib=1 gives the list of library documents (website v0.27), and ...exec?find=[...] searches
// inside them. See LIBRARY FILES at the end.
function doGet(e) {
  var p = (e && e.parameter) || {};
  try {
    if (p.lib) return json_(libPublic_(libList_(false)));
    if (p.find) return json_(libSearch_(p.find));
  } catch (err) {
    return json_({ ok: false, error: 'The library is not answering right now.' });
  }
  return json_(shiftData_(p.team));
}

// POST = everything else. Body is JSON with an "action".
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    var actions = {
      shiftSignup: shiftSignup_,
      recurringSignup: recurringSignup_,
      logout: logout_,
      fRegister: fRegister_,
      fLogin: fLogin_,
      fMe: fMeCall_,
      fResetStart: fResetStart_,
      fResetFinish: fResetFinish_,
      fBoards: fBoards_,
      fBoard: fBoardCall_,
      fThread: fThreadCall_,
      fUpload: fUpload_,
      fNewThread: fNewThread_,
      fReply: fReply_,
      fEdit: fEdit_,
      fRemove: fRemove_,
      escPing: escPing_,
      escStart: escStart_,
      escSync: escSync_,
      escLogin: escLogin_,
      escGet: escGet_,
      escList: escList_,
      escClear: escClear_,
      recStart: recStart_,
      recPing: recPing_,
      recAdd: recAdd_,
      recGet: recGet_,
      recList: recList_,
      recClear: recClear_
    };
    var fn = actions[d.action || 'shiftSignup'];
    if (!fn) return json_({ ok: false, error: 'Unknown request.' });
    return json_(fn(d));
  } catch (err) {
    return json_({ ok: false, error: 'Something went wrong. Please try again.' });
  } finally {
    lock.releaseLock();
  }
}

/* =========================================================
   SHIFT SIGNUP
   A shift is a start hour (0-23) and a length in hours (1-24).
   It may run past midnight into the next day.
   ========================================================= */
function readSettings_() {
  var r = tab_('Settings').getDataRange().getValues();
  return {
    adminEmail: String(r[1] && r[1][1] || '').trim(),
    daysAhead: parseInt(r[2] && r[2][1], 10) || 60,
    minHours: parseInt(r[3] && r[3][1], 10) || 6,
    doMinHours: doMinHours_(r),
    instant: isYes_(r[4] && r[4][1])
  };
}

/* Minimum hours for a custom Duty Officer shift: its own row in Settings, found by its label.
   The row is added (set to 4) the first time this runs, so the admin can change it later. */
function doMinHours_(rows) {
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === SETTING_DO_MIN_LABEL) return parseInt(rows[i][1], 10) || 4;
  }
  tab_('Settings').appendRow([SETTING_DO_MIN_LABEL, '4']);
  return 4;
}
/* The minimum for the calendar being used. */
function minFor_(s, t) { return team_(t) === 'do' ? s.doMinHours : s.minHours; }

function hourText_(h) {
  h = ((h % 24) + 24) % 24;
  return (h % 12 || 12) + ':00 ' + (h < 12 ? 'AM' : 'PM');
}
function rangeText_(start, hours) {
  var end = start + hours;
  return hourText_(start) + ' to ' + hourText_(end) + (end > 24 ? ' (next day)' : '');
}
function addDays_(dateText, n) {
  var p = dateText.split('-');
  var d = new Date(+p[0], +p[1] - 1, +p[2] + n);
  return Utilities.formatDate(d, tz_(), 'yyyy-MM-dd');
}
function dow_(dateText) {
  var p = dateText.split('-');
  return new Date(+p[0], +p[1] - 1, +p[2]).getDay();
}

/* Public calendar data: times only, never names. */
function shiftData_(team) {
  team = team_(team);
  var T = teamTabs_(team);
  var s = readSettings_(), today = today_(), yesterday = addDays_(today, -1);
  var one = [];
  rows_(T.one).forEach(function (r) {
    var date = asDateText_(r[1]), start = parseInt(r[7], 10), hours = parseInt(r[8], 10);
    if (date >= yesterday && start >= 0 && hours > 0) one.push({ date: date, start: start, hours: hours });
  });
  var rec = [];
  rows_(T.rec).forEach(function (r) {
    if (isYes_(r[8])) return;
    var days = String(r[1]).split(',').map(function (x) { return DAY_NAMES.indexOf(x.trim().slice(0, 3)); })
      .filter(function (x) { return x >= 0; });
    var start = parseInt(r[9], 10), hours = parseInt(r[10], 10);
    if (days.length && start >= 0 && hours > 0) rec.push({ days: days, start: start, hours: hours, from: asDateText_(r[7]) });
  });
  // "team" tells the website which calendar this is. A website page for Duty Officers checks it, so an
  // older copy of this script (which only knew one calendar) is never mistaken for the Duty Officer one.
  return { ok: true, team: team, today: today, daysAhead: s.daysAhead, minHours: minFor_(s, team), one: one, rec: rec };
}

/* Shared checks for name/contact/hours. Returns an error object, or null if all good. */
function checkPerson_(d, s) {
  var min = minFor_(s, d.team);
  if (!clean_(d.name, 100)) return { ok: false, error: 'Please enter your name.' };
  // No phone or email is required (since Oct 2026). Volunteers are already in the Red Cross system, so
  // the sign-up form asks for a name only. The Phone and Email columns stay in the Sheet and are left blank.
  var start = parseInt(d.start, 10), hours = parseInt(d.hours, 10);
  if (!(start >= 0 && start <= 23)) return { ok: false, error: 'Please choose a start time.' };
  if (!(hours >= min && hours <= 24)) return { ok: false, error: 'Shifts must be at least ' + min + ' hours (and no more than 24).' };
  return null;
}

function inWindow_(date, s) {
  var last = Utilities.formatDate(new Date(Date.now() + s.daysAhead * 86400000), tz_(), 'yyyy-MM-dd');
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && date >= today_() && date <= last;
}

/* Instant email for one signup. Only sent if Settings says YES (the daily report covers it otherwise). */
function notify_(s, subject, body) {
  if (s.adminEmail && s.instant) MailApp.sendEmail(s.adminEmail, subject, body + '\n\nAll signups: ' + ss_().getUrl());
}

function shiftSignup_(d) {
  if (d.website) return { ok: true };   // spam trap
  var s = readSettings_(), bad = checkPerson_(d, s);
  if (bad) return bad;
  var date = clean_(d.date, 10);
  if (!inWindow_(date, s)) return { ok: false, error: 'That day is not open for signup.' };
  var start = parseInt(d.start, 10), hours = parseInt(d.hours, 10), when = rangeText_(start, hours);
  var name = clean_(d.name, 100), phone = clean_(d.phone, 40), email = clean_(d.email, 120), notes = clean_(d.notes, 500);

  var T = teamTabs_(d.team);
  tab_(T.one).appendRow([stamp_(), date, when, safe_(name), safe_(phone), safe_(email), safe_(notes), String(start), String(hours)]);
  notify_(s, T.label + ' shift signup: ' + name + ', ' + date,
    name + ' signed up for ' + date + ', ' + when + ' (' + hours + ' hours).\n\n' +
    'Phone: ' + (phone || '-') + '\nEmail: ' + (email || '-') + '\nNotes: ' + (notes || '-'));
  return { ok: true };
}

function recurringSignup_(d) {
  if (d.website) return { ok: true };   // spam trap
  var s = readSettings_(), bad = checkPerson_(d, s);
  if (bad) return bad;
  var from = clean_(d.from, 10);
  if (!inWindow_(from, s)) return { ok: false, error: 'That starting day is not open for signup.' };
  var days = (Array.isArray(d.days) ? d.days : []).map(function (x) { return parseInt(x, 10); })
    .filter(function (x, i, a) { return x >= 0 && x <= 6 && a.indexOf(x) === i; }).sort();
  if (!days.length) return { ok: false, error: 'Please pick at least one day of the week.' };
  var every = days.map(function (x) { return DAY_NAMES[x]; }).join(', ');
  var start = parseInt(d.start, 10), hours = parseInt(d.hours, 10), when = rangeText_(start, hours);
  var name = clean_(d.name, 100), phone = clean_(d.phone, 40), email = clean_(d.email, 120), notes = clean_(d.notes, 500);

  var T = teamTabs_(d.team);
  tab_(T.rec).appendRow([stamp_(), every, when, safe_(name), safe_(phone), safe_(email), safe_(notes), from, '', String(start), String(hours)]);
  notify_(s, 'Recurring ' + T.label + ' signup: ' + name + ', every ' + every,
    name + ' signed up for every ' + every + ', ' + when + ' (' + hours + ' hours), starting ' + from + '.\n' +
    'This repeats until it is removed from the ' + T.rec + ' tab.\n\n' +
    'Phone: ' + (phone || '-') + '\nEmail: ' + (email || '-') + '\nNotes: ' + (notes || '-'));
  return { ok: true };
}

/* =========================================================
   DAILY SIGNUP REPORT (emailed at 7 AM)
   ========================================================= */

/* Run this ONCE from the editor to start the daily 7 AM email. Safe to run again. */
function startDailyReport() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'dailyReport') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('dailyReport').timeBased().everyDays(1).atHour(REPORT_HOUR).inTimezone(tz_()).create();
  Logger.log('Daily report scheduled for ' + REPORT_HOUR + ':00 (' + tz_() + ')');
}

/* RECEPTION CENTER FORM: the 5-day automatic delete, every morning, with NO email (v0.21).
   Run startAutoDelete ONCE from the editor (pick it in the box next to Debug, then Run). Safe to run
   again. This sends nothing to anyone; it only deletes reception centers 5 days after their last
   intake. (The delete also happens whenever anyone uses the form, so this is the backstop for quiet
   weeks.) It is separate from the daily signup report on purpose: Sean wants no reports yet. */
function startAutoDelete() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'autoDelete') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('autoDelete').timeBased().everyDays(1).atHour(3).inTimezone(tz_()).create();
  Logger.log('Automatic delete scheduled for 3:00 AM every day (' + tz_() + '). No emails are sent.');
}
function autoDelete() {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { recPurge_(); } finally { lock.releaseLock(); }
}

/* Emails everything submitted since the last report. Runs automatically each morning. */
function dailyReport() {
  var s = readSettings_();
  if (!s.adminEmail) return;
  var props = PropertiesService.getScriptProperties();
  var since = props.getProperty('lastReport') || stamp_(new Date(Date.now() - 86400000));
  var now = stamp_();
  var person = function (r) {
    var bits = [String(r[3]).replace(/^'/, '')];
    if (r[4]) bits.push(String(r[4]).replace(/^'/, ''));
    if (r[5]) bits.push(String(r[5]).replace(/^'/, ''));
    return bits.join(', ') + (r[6] ? '\n      Notes: ' + String(r[6]).replace(/^'/, '') : '');
  };
  var nice = function (dateText) {
    var p = dateText.split('-');
    return Utilities.formatDate(new Date(+p[0], +p[1] - 1, +p[2]), tz_(), 'EEE, MMM d');
  };

  // Both calendars, Field Responders first, then Duty Officers.
  var isNew = function (r) { return iso_(r[0]) > since && iso_(r[0]) <= now; };
  var total = 0, lines = [], parts = [];
  ['dat', 'do'].forEach(function (t) {
    var T = teamTabs_(t);
    var one = rows_(T.one).filter(isNew), rec = rows_(T.rec).filter(isNew);
    one.sort(function (a, b) { return asDateText_(a[1]) < asDateText_(b[1]) ? -1 : 1; });
    total += one.length + rec.length;
    var head = T.title.toUpperCase() + 'S';
    if (one.length) {
      parts.push('', head + ': ONE-TIME SHIFTS');
      one.forEach(function (r) { parts.push('  ' + nice(asDateText_(r[1])) + ', ' + r[2] + '\n      ' + person(r)); });
    }
    if (rec.length) {
      parts.push('', head + ': RECURRING (every week until stopped)');
      rec.forEach(function (r) { parts.push('  Every ' + r[1] + ', ' + r[2] + ', starting ' + nice(asDateText_(r[7])) + '\n      ' + person(r)); });
    }
  });
  lines.push(total ? total + ' new signup' + (total === 1 ? '' : 's') + ' since the last report:' : 'No new signups since the last report.');
  lines = lines.concat(parts);
  lines.push('', 'Full list: ' + ss_().getUrl());

  MailApp.sendEmail(s.adminEmail,
    'SEPA DAT signups: ' + (total || 'none') + ' new (' + Utilities.formatDate(new Date(), tz_(), 'MMM d') + ')',
    lines.join('\n'));
  props.setProperty('lastReport', now);
}

/* =========================================================
   LOGINS: shared helpers (used by the forums and by the HQ login of the Escalation and Reception forms)
   ========================================================= */
function hash_(salt, password) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + '|' + password, Utilities.Charset.UTF_8);
  return bytes.map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}
function newSession_(name) {
  var token = Utilities.getUuid() + Utilities.getUuid();
  tab_('Sessions').appendRow([token, safe_(name), stamp_()]);
  return token;
}
function tooManyTries_(name) {
  var c = CacheService.getScriptCache(), k = 'fail_' + name.toLowerCase();
  return (parseInt(c.get(k), 10) || 0) >= 8;
}
function noteFail_(name) {
  var c = CacheService.getScriptCache(), k = 'fail_' + name.toLowerCase();
  c.put(k, String((parseInt(c.get(k), 10) || 0) + 1), 900);
}
function logout_(d) {
  var sh = tab_('Sessions'), data = sh.getDataRange().getValues();
  for (var i = data.length - 1; i >= 1; i--) {
    if (data[i][0] === d.token) sh.deleteRow(i + 1);
  }
  return { ok: true };
}

/* =========================================================
   DISCUSSION FORUMS (pages/forums.html), rebuilt for website v0.23
   A classic message board: six boards; inside each board, threads; inside each thread, posts in the
   order they were written, 20 to a page.
   - Anyone can READ without an account.
   - To START a thread or REPLY, people make a simple account: email, display name, password. Any
     email address works (no confirmation). Only the display name is ever shown on the site.
   - "Forgot your password?" emails a 6-digit code from the Google account that owns this script
     (sepalibrary@gmail.com). That is the only email the forums send. No reply notifications.
   - Photos: up to 4 per post, shrunk on the phone first (about 1600 pixels, a few hundred KB each),
     saved in a Drive folder "SEPA Library Forum Photos" and shown on the site.
   - Moderators: type YES in the "Moderator" column of the "Forum Members" tab. They get a Hide button
     on every post. Everyone can edit or delete their own posts.
   - Blocking someone: type YES in "Blocked". They are logged out and can no longer post.
   TABS (made by setupForum, or by themselves the first time someone uses the forums)
     Forum Members - one row per account.
     Forum Threads - one row per thread. YES in "Hidden" hides the whole thread.
     Forum Posts   - one row per post (a thread's first post is its opening message). YES in "Hidden"
                     hides one post. "Removed by" says who hid it.
     Forum Photos  - one row per uploaded photo (the file itself is in the Drive folder).
   RUN setupForum ONCE from the editor after pasting this code (pick it in the box next to Debug,
   then Run). It asks Google for permission to use Drive (photos) and Mail (password reset codes),
   makes the tabs and the Drive folder, and deletes the old forum tabs (Topics, Replies, Members),
   as Sean asked: the new forums start fresh.
   ========================================================= */
var FORUM_BOARDS = [
  { id: 'new', title: 'New to the Red Cross? Ask your questions here', desc: 'No question is too small. Experienced responders are glad to help.' },
  { id: 'general', title: 'General Discussion', desc: 'Anything DAT-related that does not fit one of the other boards.' },
  { id: 'unusual', title: 'Help tackling odd or unusual responses: Did I do this right?', desc: 'Talk through a tricky call and learn from each other. Leave out client names and addresses.' },
  { id: 'photos', title: 'Share your Photos, Stories and Shout Outs to Inspire Others', desc: 'Celebrate your teammates and the work we do.' },
  { id: 'suggestions', title: 'Suggestions', desc: 'Ideas to make our team, our training or this site better.' },
  { id: 'platforms', title: 'RC Platform Help: RC Care, RC Respond/Noggin, Volunteer Connection, SCIA, Sandboxes, etc.', desc: 'Stuck in one of our systems? Ask here.' }
];
var FORUM_MEMBER_HEADERS = ['Display name', 'Email', 'Joined', 'Blocked (type YES)', 'Moderator (type YES)', 'Password check (do not edit)', 'Salt (do not edit)', 'Reset code (do not edit)', 'Reset expires (do not edit)'];
var FORUM_THREAD_HEADERS = ['ID', 'Board', 'Started', 'Title', 'Started by', 'Started by (email)', 'Last post', 'Last post by', 'Posts', 'Hidden (type YES)'];
var FORUM_POST_HEADERS = ['ID', 'Thread ID', 'Posted', 'Author', 'Author (email)', 'Message', 'Photos (do not edit)', 'Edited', 'Hidden (type YES)', 'Removed by'];
var FORUM_PHOTO_HEADERS = ['File ID', 'Uploaded', 'By (email)', 'Used in post'];
var FORUM_PER_PAGE = 20;          // posts per page in a thread
var FORUM_THREADS_PER_PAGE = 25;  // threads per page in a board
var FORUM_MAX_PHOTOS = 4;
var FORUM_PHOTO_MAX_BYTES = 1500000;   // the phone shrinks photos first; this is only a safety net
var FORUM_FOLDER = 'SEPA Library Forum Photos';
var FORUM_SESSION_DAYS = 180;

function fMembers_() { makeTab_('Forum Members', FORUM_MEMBER_HEADERS); return tab_('Forum Members'); }
function fThreads_() { makeTab_('Forum Threads', FORUM_THREAD_HEADERS); return tab_('Forum Threads'); }
function fPosts_() { makeTab_('Forum Posts', FORUM_POST_HEADERS); return tab_('Forum Posts'); }
function fPhotos_() { makeTab_('Forum Photos', FORUM_PHOTO_HEADERS); return tab_('Forum Photos'); }
function fBoard_(id) { for (var i = 0; i < FORUM_BOARDS.length; i++) if (FORUM_BOARDS[i].id === id) return FORUM_BOARDS[i]; return null; }
function fT_(v) { return escText_(v); }
function fEmail_(v) { v = clean_(v, 120).toLowerCase(); return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : ''; }
function fName_(v) { return clean_(v, 40).replace(/\s+/g, ' '); }

/* Run once from the editor. Safe to run again. */
function setupForum() {
  fMembers_(); fThreads_(); fPosts_(); fPhotos_(); fFolder_();
  var ss = ss_(), gone = [];
  ['Topics', 'Replies', 'Members'].forEach(function (n) {
    var sh = ss.getSheetByName(n);
    if (sh) { ss.deleteSheet(sh); gone.push(n); }
  });
  MailApp.getRemainingDailyQuota();   // makes Google ask for permission to send the reset emails
  Logger.log('Forums are set up. ' + (gone.length ? 'Deleted the old tabs: ' + gone.join(', ') + '.' : 'No old forum tabs to delete.'));
}
function fFolder_() {
  var props = PropertiesService.getScriptProperties(), id = props.getProperty('forumFolder');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  var f = DriveApp.createFolder(FORUM_FOLDER);
  props.setProperty('forumFolder', f.getId());
  return f;
}

/* ---------- accounts ---------- */
function fFind_(email) {
  var sh = fMembers_(), last = sh.getLastRow();
  if (last < 2 || !email) return null;
  var data = sh.getRange(2, 1, last - 1, FORUM_MEMBER_HEADERS.length).getValues();
  for (var i = 0; i < data.length; i++) {
    if (fT_(data[i][1]).toLowerCase() === email) {
      return { row: i + 2, name: fT_(data[i][0]), email: email, blocked: isYes_(data[i][3]), mod: isYes_(data[i][4]),
        hash: String(data[i][5]), salt: String(data[i][6]), code: String(data[i][7]), until: Number(data[i][8]) || 0 };
    }
  }
  return null;
}
function fNameTaken_(name, exceptEmail) {
  var sh = fMembers_(), last = sh.getLastRow(), key = name.toLowerCase();
  if (last < 2) return false;
  return sh.getRange(2, 1, last - 1, 2).getValues().some(function (r) { return fT_(r[0]).toLowerCase() === key && fT_(r[1]).toLowerCase() !== exceptEmail; });
}
/* The member behind a login token, or null. */
function fWho_(token) {
  token = String(token || '');
  if (token.length < 40) return null;
  var data = rows_('Sessions'), oldest = stamp_(new Date(Date.now() - FORUM_SESSION_DAYS * 86400000));
  for (var i = data.length - 1; i >= 0; i--) {
    if (data[i][0] === token) {
      var key = fT_(data[i][1]);
      if (key.indexOf('forum:') !== 0 || iso_(data[i][2]) < oldest) return null;
      var m = fFind_(key.slice(6));
      return m && !m.blocked ? m : null;
    }
  }
  return null;
}
var F_LOGIN = { ok: false, login: true, error: 'Please log in to post.' };
function fMe_(m) { return { name: m.name, email: m.email, mod: m.mod }; }

function fRegister_(d) {
  var email = fEmail_(d.email), name = fName_(d.name), pw = String(d.password || '');
  if (!email) return { ok: false, error: 'Please enter a valid email address.' };
  if (name.length < 2) return { ok: false, error: 'Please enter a display name (at least 2 letters).' };
  if (pw.length < 6) return { ok: false, error: 'Please choose a password with at least 6 characters.' };
  if (fFind_(email)) return { ok: false, error: 'There is already an account with that email. Log in instead, or use "Forgot your password?".' };
  if (fNameTaken_(name, '')) return { ok: false, error: 'That display name is taken. Try adding a last initial.' };
  var salt = Utilities.getUuid();
  fMembers_().appendRow([safe_(name), email, stamp_(), '', '', hash_(salt, pw), salt, '', '']);
  return { ok: true, token: newSession_('forum:' + email), me: { name: name, email: email, mod: false } };
}
function fLogin_(d) {
  var email = fEmail_(d.email), pw = String(d.password || '');
  if (!email) return { ok: false, error: 'Please enter your email address.' };
  if (tooManyTries_('f-' + email)) return { ok: false, error: 'Too many tries. Please wait 15 minutes and try again.' };
  var m = fFind_(email);
  if (!m || hash_(m.salt, pw) !== m.hash) { noteFail_('f-' + email); return { ok: false, error: 'That email and password do not match.' }; }
  if (m.blocked) return { ok: false, error: 'This account has been turned off. Please contact the site admin.' };
  return { ok: true, token: newSession_('forum:' + email), me: fMe_(m) };
}
function fMeCall_(d) { var m = fWho_(d.token); return m ? { ok: true, me: fMe_(m) } : { ok: true, me: null }; }

/* Forgot password, step 1: email a 6-digit code (good for 30 minutes). The answer is the same whether
   or not the email has an account, so nobody can use this to find out who is a member. */
function fResetStart_(d) {
  var email = fEmail_(d.email);
  if (!email) return { ok: false, error: 'Please enter a valid email address.' };
  var c = CacheService.getScriptCache(), k = 'reset_' + email;
  if (c.get(k)) return { ok: true };            // one code every 2 minutes at most
  var m = fFind_(email);
  if (m && !m.blocked) {
    var code = String(Math.floor(100000 + Math.random() * 900000)), salt = Utilities.getUuid().slice(0, 8);
    fMembers_().getRange(m.row, 8, 1, 2).setValues([[salt + ':' + hash_(salt, code), String(Date.now() + 30 * 60000)]]);
    MailApp.sendEmail(email, 'Your SEPA Resource Library password reset code',
      'Hi ' + m.name + ',\n\nYour code to reset your SEPA Resource Library forums password is: ' + code +
      '\n\nIt works for 30 minutes. If you did not ask for this, you can ignore this email.\n\nSEPA Resource Library');
    c.put(k, '1', 120);
  }
  return { ok: true };
}
// Forgot password, step 2: the code and a new password.
function fResetFinish_(d) {
  var email = fEmail_(d.email), code = String(d.code || '').replace(/\D/g, ''), pw = String(d.password || '');
  if (!email || code.length !== 6) return { ok: false, error: 'Please enter your email and the 6-digit code.' };
  if (pw.length < 6) return { ok: false, error: 'Please choose a password with at least 6 characters.' };
  if (tooManyTries_('r-' + email)) return { ok: false, error: 'Too many tries. Please wait 15 minutes and ask for a new code.' };
  var m = fFind_(email), parts = m ? m.code.split(':') : [];
  if (!m || parts.length !== 2 || Date.now() > m.until || hash_(parts[0], code) !== parts[1]) {
    noteFail_('r-' + email); return { ok: false, error: 'That code is not right, or it has run out. Ask for a new one.' };
  }
  if (m.blocked) return { ok: false, error: 'This account has been turned off. Please contact the site admin.' };
  var salt = Utilities.getUuid();
  fMembers_().getRange(m.row, 6, 1, 4).setValues([[hash_(salt, pw), salt, '', '']]);
  return { ok: true, token: newSession_('forum:' + email), me: fMe_(m) };
}

/* ---------- reading ---------- */
function fAllThreads_() {
  var sh = fThreads_(), last = sh.getLastRow(), out = [];
  if (last < 2) return out;
  sh.getRange(2, 1, last - 1, FORUM_THREAD_HEADERS.length).getValues().forEach(function (r, i) {
    if (!r[0] || isYes_(r[9])) return;
    out.push({ id: String(r[0]), board: String(r[1]), started: iso_(r[2]), title: fT_(r[3]), by: fT_(r[4]), last: iso_(r[6]), lastBy: fT_(r[7]), posts: parseInt(r[8], 10) || 0, row: i + 2 });
  });
  return out;
}
// The board list with how many threads and posts each has, and its latest post.
function fBoards_(d) {
  var threads = fAllThreads_();
  var boards = FORUM_BOARDS.map(function (b) {
    var mine = threads.filter(function (t) { return t.board === b.id; });
    var latest = mine.reduce(function (a, t) { return !a || t.last > a.last ? t : a; }, null);
    return { id: b.id, title: b.title, desc: b.desc, threads: mine.length,
      posts: mine.reduce(function (n, t) { return n + t.posts; }, 0),
      latest: latest ? { id: latest.id, title: latest.title, by: latest.lastBy, at: latest.last } : null };
  });
  var m = fWho_(d.token);
  return { ok: true, boards: boards, me: m ? fMe_(m) : null, perPage: FORUM_PER_PAGE };
}
// One board: its threads, most recent activity first.
function fBoardCall_(d) {
  var b = fBoard_(String(d.board || ''));
  if (!b) return { ok: false, error: 'That board does not exist.' };
  var list = fAllThreads_().filter(function (t) { return t.board === b.id; });
  list.sort(function (x, y) { return x.last < y.last ? 1 : x.last > y.last ? -1 : y.row - x.row; });
  var pages = Math.max(1, Math.ceil(list.length / FORUM_THREADS_PER_PAGE)), page = Math.min(pages, Math.max(1, parseInt(d.page, 10) || 1));
  list = list.slice((page - 1) * FORUM_THREADS_PER_PAGE, page * FORUM_THREADS_PER_PAGE).map(function (t) { delete t.row; return t; });
  var m = fWho_(d.token);
  return { ok: true, board: { id: b.id, title: b.title, desc: b.desc }, threads: list, page: page, pages: pages, perPage: FORUM_PER_PAGE, me: m ? fMe_(m) : null };
}
function fPhotoUrl_(id) { return 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(id) + '&sz=w1600'; }
// One thread, one page of posts.
function fThreadCall_(d) {
  var id = String(d.id || ''), t = fAllThreads_().filter(function (x) { return x.id === id; })[0];
  if (!t) return { ok: false, error: 'That thread could not be found. It may have been removed.' };
  var b = fBoard_(t.board) || { id: t.board, title: '' };
  var sh = fPosts_(), last = sh.getLastRow(), posts = [], m = fWho_(d.token);
  if (last >= 2) {
    sh.getRange(2, 1, last - 1, FORUM_POST_HEADERS.length).getValues().forEach(function (r) {
      if (String(r[1]) !== id || isYes_(r[8])) return;
      var photos = String(r[6] || '').split(',').filter(String);
      posts.push({ id: String(r[0]), at: iso_(r[2]), by: fT_(r[3]), body: fT_(r[5]), photos: photos.map(fPhotoUrl_),
        edited: r[7] ? iso_(r[7]) : '', mine: !!(m && fT_(r[4]).toLowerCase() === m.email) });
    });
  }
  var pages = Math.max(1, Math.ceil(posts.length / FORUM_PER_PAGE));
  var page = d.page === 'last' ? pages : Math.min(pages, Math.max(1, parseInt(d.page, 10) || 1));
  var first = posts[0] ? posts[0].id : '';
  return { ok: true, thread: { id: t.id, title: t.title, by: t.by, started: t.started, posts: posts.length, firstPost: first },
    board: { id: b.id, title: b.title }, page: page, pages: pages, perPage: FORUM_PER_PAGE,
    posts: posts.slice((page - 1) * FORUM_PER_PAGE, page * FORUM_PER_PAGE), me: m ? fMe_(m) : null };
}

/* ---------- writing ---------- */
// Slows down anyone posting very fast (a stuck button, or a spammer): 12 posts and 20 photos per 10 minutes.
function fTooFast_(kind, email, max) {
  var c = CacheService.getScriptCache(), k = 'rate_' + kind + '_' + email, n = (parseInt(c.get(k), 10) || 0) + 1;
  c.put(k, String(n), 600);
  return n > max;
}
// One photo at a time, as a JPEG the phone already shrank. Gives back its code for the post.
function fUpload_(d) {
  var m = fWho_(d.token);
  if (!m) return F_LOGIN;
  if (fTooFast_('photo', m.email, 20)) return { ok: false, error: 'That is a lot of photos in a short time. Please wait a few minutes.' };
  var data = String(d.data || '').replace(/^data:image\/jpeg;base64,/, '');
  if (!/^[A-Za-z0-9+\/=]+$/.test(data)) return { ok: false, error: 'That photo could not be read.' };
  var bytes = Utilities.base64Decode(data);
  if (bytes.length > FORUM_PHOTO_MAX_BYTES) return { ok: false, error: 'That photo is too large.' };
  var file = fFolder_().createFile(Utilities.newBlob(bytes, 'image/jpeg', 'forum-' + stamp_().replace(/\D/g, '') + '.jpg'));
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  fPhotos_().appendRow([file.getId(), stamp_(), m.email, '']);
  return { ok: true, photo: file.getId(), url: fPhotoUrl_(file.getId()) };
}
// Only photos this member uploaded and has not used yet can go into a post.
function fClaimPhotos_(ids, email, postId) {
  ids = (Array.isArray(ids) ? ids : []).map(String).filter(function (x, i, a) { return /^[A-Za-z0-9_-]{10,80}$/.test(x) && a.indexOf(x) === i; }).slice(0, FORUM_MAX_PHOTOS);
  if (!ids.length) return [];
  var sh = fPhotos_(), last = sh.getLastRow(), ok = [];
  if (last < 2) return [];
  var data = sh.getRange(2, 1, last - 1, 4).getValues();
  data.forEach(function (r, i) {
    var at = ids.indexOf(String(r[0]));
    if (at >= 0 && fT_(r[2]).toLowerCase() === email && !r[3]) { sh.getRange(i + 2, 4).setValue(postId); ok.push(String(r[0])); }
  });
  return ids.filter(function (x) { return ok.indexOf(x) >= 0; });   // keep the order they were added
}
function fNewThread_(d) {
  var m = fWho_(d.token);
  if (!m) return F_LOGIN;
  if (d.website) return { ok: true };
  var b = fBoard_(String(d.board || ''));
  if (!b) return { ok: false, error: 'Please choose a board.' };
  var title = clean_(d.title, 120), body = clean_(d.body, 8000);
  if (!title) return { ok: false, error: 'Please give your thread a title.' };
  if (!body && !(d.photos || []).length) return { ok: false, error: 'Please write a message.' };
  if (fTooFast_('post', m.email, 12)) return { ok: false, error: 'You are posting very quickly. Please wait a few minutes.' };
  var tid = Utilities.getUuid().slice(0, 8), pid = Utilities.getUuid().slice(0, 10), now = stamp_();
  var photos = fClaimPhotos_(d.photos, m.email, pid);
  fThreads_().appendRow([tid, b.id, now, safe_(title), safe_(m.name), m.email, now, safe_(m.name), '1', '']);
  fPosts_().appendRow([pid, tid, now, safe_(m.name), m.email, safe_(body), photos.join(','), '', '', '']);
  return { ok: true, id: tid };
}
function fThreadRow_(id) { var sh = fThreads_(), row = escFindRow_(sh, id); return row ? { sh: sh, row: row, r: sh.getRange(row, 1, 1, FORUM_THREAD_HEADERS.length).getValues()[0] } : null; }
function fReply_(d) {
  var m = fWho_(d.token);
  if (!m) return F_LOGIN;
  if (d.website) return { ok: true };
  var t = fThreadRow_(String(d.thread || ''));
  if (!t || isYes_(t.r[9])) return { ok: false, error: 'That thread could not be found. It may have been removed.' };
  var body = clean_(d.body, 8000);
  if (!body && !(d.photos || []).length) return { ok: false, error: 'Please write a reply.' };
  if (fTooFast_('post', m.email, 12)) return { ok: false, error: 'You are posting very quickly. Please wait a few minutes.' };
  var pid = Utilities.getUuid().slice(0, 10), now = stamp_(), photos = fClaimPhotos_(d.photos, m.email, pid);
  fPosts_().appendRow([pid, String(t.r[0]), now, safe_(m.name), m.email, safe_(body), photos.join(','), '', '', '']);
  t.sh.getRange(t.row, 7, 1, 3).setValues([[now, safe_(m.name), String((parseInt(t.r[8], 10) || 0) + 1)]]);
  return { ok: true };
}
function fPostRow_(id) {
  var sh = fPosts_(), last = sh.getLastRow();
  if (last < 2) return null;
  var ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === id) return { sh: sh, row: i + 2, r: sh.getRange(i + 2, 1, 1, FORUM_POST_HEADERS.length).getValues()[0] };
  return null;
}
// Edit your own post (the message only; photos stay as they are).
function fEdit_(d) {
  var m = fWho_(d.token);
  if (!m) return F_LOGIN;
  var p = fPostRow_(String(d.post || ''));
  if (!p || isYes_(p.r[8])) return { ok: false, error: 'That post could not be found.' };
  if (fT_(p.r[4]).toLowerCase() !== m.email) return { ok: false, error: 'You can only edit your own posts.' };
  var body = clean_(d.body, 8000);
  if (!body && !String(p.r[6] || '')) return { ok: false, error: 'The message cannot be empty.' };
  p.sh.getRange(p.row, 6).setValue(safe_(body));
  p.sh.getRange(p.row, 8).setValue(stamp_());
  return { ok: true };
}
/* Delete your own post, or (moderators) hide anyone's. The row stays in the Sheet, marked Hidden, so
   the admin can bring it back by clearing "Hidden". Removing a thread's first post removes the thread. */
function fRemove_(d) {
  var m = fWho_(d.token);
  if (!m) return F_LOGIN;
  var p = fPostRow_(String(d.post || ''));
  if (!p || isYes_(p.r[8])) return { ok: true };
  var own = fT_(p.r[4]).toLowerCase() === m.email;
  if (!own && !m.mod) return { ok: false, error: 'You can only delete your own posts.' };
  p.sh.getRange(p.row, 9, 1, 2).setValues([['YES', own ? 'Author' : 'Moderator: ' + safe_(m.name)]]);
  var tid = String(p.r[1]), t = fThreadRow_(tid);
  if (!t) return { ok: true };
  var sh = p.sh, last = sh.getLastRow(), left = [];
  sh.getRange(2, 1, last - 1, FORUM_POST_HEADERS.length).getValues().forEach(function (r) { if (String(r[1]) === tid && !isYes_(r[8])) left.push(r); });
  // Was this the opening post? Then the whole thread goes.
  var firstId = '';
  sh.getRange(2, 1, last - 1, 2).getValues().some(function (r) { if (String(r[1]) === tid) { firstId = String(r[0]); return true; } return false; });
  if (firstId === String(p.r[0]) || !left.length) {
    t.sh.getRange(t.row, 10).setValue('YES');
    return { ok: true, threadGone: true, board: String(t.r[1]) };
  }
  var lastPost = left[left.length - 1];
  t.sh.getRange(t.row, 7, 1, 3).setValues([[iso_(lastPost[2]), safe_(fT_(lastPost[3])), String(left.length)]]);
  return { ok: true };
}

/* =========================================================
   ESCALATION FORM (pages/escalation.html) - PROOF OF CONCEPT, added for website v0.17,
   shared worksheets added for v0.18
   The website page sends each box here a moment after it is typed, and the "live view" page reads
   the worksheet back every few seconds.
   One row per worksheet in the tab "Escalations" (the tab is made automatically the first time).
   The last column holds the worksheet itself in a coded form: leave it alone.
   WHO CAN DO WHAT:
     - Filling in a worksheet needs no login (the responder on scene must not be slowed down).
     - SEVERAL RESPONDERS, ONE WORKSHEET (v0.18). The person who starts a worksheet can tap "Add a
       responder", which sends a join link. Everyone who opens that link types into the same
       worksheet and sees the others' entries a few seconds later. The join link carries a long
       random code (the "edit key"). Only a scrambled form of it is kept here, inside the coded
       last column. Whoever has the link can read and change that ONE worksheet and no other, with
       no login. It stops working when HQ clears the worksheet. Boxes are saved one at a time, so two
       people working in different boxes never overwrite each other; in the same box the later
       entry wins.
     - READING a worksheet as HQ (the live view, and the list of recent worksheets) needs the HQ
       user name and password. Those two are NOT in this code, because this code is also kept in the
       website folder, which is public. They live in the Sheet's "Settings" tab, in the two rows
       whose labels start "Escalation Form live view". Type them there. To change the password,
       change it there: everyone who was logged in is logged out. While either row is blank, nobody
       can open the live view. The live view link does NOT contain the edit key, so a forwarded live
       view link lets nobody read or change anything without the HQ login.
     - One shared user name and password for everyone at HQ (Sean's choice for the proof of concept).
     - CLEARING a worksheet at the end of an event (the button in the live view) also needs the HQ
       login. Nothing is destroyed: the row moves to the tab "Escalations cleared", so there is still a
       record. Every responder's page notices within a few seconds and starts a new blank worksheet.
       To really delete a worksheet, delete its row in "Escalations cleared" (or in "Escalations").
   ========================================================= */
var ESC_HEADERS = ['ID', 'Started', 'Last update', 'Incident address', 'Date/ Time (as typed)', 'Updated ms (do not edit)', 'Worksheet (do not edit)'];
var ESC_MAX_CHARS = 45000;   // a single spreadsheet cell holds 50,000 characters

var ESC_USER_LABEL = 'Escalation Form live view: user name (while blank, the live view is locked to everyone)';
var ESC_PASS_LABEL = 'Escalation Form live view: password';
var ESC_SESSION_DAYS = 30;   // how long an HQ login lasts on one device

/* Inside the coded last column, next to the boxes, sits one extra entry under this name. It holds the
   bookkeeping for shared worksheets: r = how many times the worksheet has changed, k = the scrambled
   edit key, f = for each box, the change number at which it last changed. A box name can never be
   "#", so it cannot collide with a real box. */
var ESC_META = '#';

function escTab_() { makeTab_('Escalations', ESC_HEADERS); return tab_('Escalations'); }
function escClearedTab_() { makeTab_('Escalations cleared', ESC_HEADERS.concat(['Cleared'])); return tab_('Escalations cleared'); }
function escIsCleared_(id) { return escFindRow_(escClearedTab_(), id) > 0; }

/* The HQ user name and password, read from the Settings tab. The two rows are added (blank) the first
   time this runs, so the admin only has to type the values in. */
function escLoginSettings_() {
  var sh = tab_('Settings'), data = sh.getDataRange().getValues(), out = { user: '', pass: '' }, seenUser = false, seenPass = false;
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === ESC_USER_LABEL) { seenUser = true; out.user = escText_(data[i][1]).trim(); }
    if (String(data[i][0]).trim() === ESC_PASS_LABEL) { seenPass = true; out.pass = escText_(data[i][1]); }
  }
  if (!seenUser) sh.appendRow([ESC_USER_LABEL, '']);
  if (!seenPass) sh.appendRow([ESC_PASS_LABEL, '']);
  return out;
}
/* A short code that changes whenever the user name or password changes. It is stored with each login,
   so changing the password logs everyone out. */
function escMark_(s) { return 'HQ ' + hash_('esc-live-view', s.user.toLowerCase() + '|' + s.pass).slice(0, 20); }

// Does nothing but answer. If it is told which worksheet is asking, it also says whether HQ has
// cleared that worksheet. (The fill-in page now learns both from escSync; this stays for older pages.)
function escPing_(d) {
  escTab_(); escLoginSettings_();
  var id = escId_(d && d.id);
  return { ok: true, cleared: id ? escIsCleared_(id) : false };
}

function escLogin_(d) {
  var s = escLoginSettings_();
  if (!s.user || !s.pass) return { ok: false, login: true, locked: true, error: 'The live view has not been given a user name and password yet. The site admin sets them in the Google Sheet.' };
  var user = clean_(d.user, 60), pw = String(d.password || '');
  if (tooManyTries_('esc-hq')) return { ok: false, login: true, error: 'Too many tries. Please wait 15 minutes and try again.' };
  if (user.toLowerCase() !== s.user.toLowerCase() || pw !== s.pass) {
    noteFail_('esc-hq');
    return { ok: false, login: true, error: 'That user name and password do not match.' };
  }
  return { ok: true, token: newSession_(escMark_(s)) };
}

/* Is this a current HQ login? Returns null when it is, or the "please log in" answer when it is not. */
function escDenied_(d) {
  var s = escLoginSettings_();
  if (!s.user || !s.pass) return { ok: false, login: true, locked: true, error: 'The live view has not been given a user name and password yet. The site admin sets them in the Google Sheet.' };
  var token = String(d.token || ''), mark = escMark_(s);
  if (token.length >= 40) {
    var data = rows_('Sessions'), oldest = stamp_(new Date(Date.now() - ESC_SESSION_DAYS * 86400000));
    for (var i = data.length - 1; i >= 0; i--) {
      if (data[i][0] === token) {
        if (escText_(data[i][1]) === mark && iso_(data[i][2]) >= oldest) return null;
        break;
      }
    }
  }
  return { ok: false, login: true, error: 'Please log in.' };
}
function escId_(v) { v = String(v || ''); return /^[A-Za-z0-9]{8,24}$/.test(v) ? v : ''; }
function escKey_(v) { v = String(v || ''); return /^[A-Za-z0-9]{16,40}$/.test(v) ? v : ''; }
function escKeyMark_(id, key) { return hash_('esc-edit-key|' + id, key).slice(0, 32); }
function escText_(v) { return String(v == null ? '' : v).replace(/^'/, ''); }

function escFindRow_(sh, id) {
  var last = sh.getLastRow();
  if (last < 2) return 0;
  var ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === id) return i + 2;
  return 0;
}

/* Reads one worksheet's coded cell. Gives back the boxes and the bookkeeping separately.
   A worksheet saved before v0.18 has no bookkeeping yet: every box it holds counts as change 1. */
function escOpen_(cell) {
  var raw = {};
  try { raw = JSON.parse(escText_(cell)) || {}; } catch (err) { raw = {}; }
  if (typeof raw !== 'object') raw = {};
  var meta = raw[ESC_META];
  delete raw[ESC_META];
  if (!meta || typeof meta !== 'object' || typeof meta.f !== 'object' || !meta.f) {
    meta = { r: 0, k: '', f: {} };
    Object.keys(raw).forEach(function (k) { meta.f[k] = 1; meta.r = 1; });
  }
  meta.r = Number(meta.r) || 0;
  meta.k = String(meta.k || '');
  return { data: raw, meta: meta };
}

/* THE ONE CALL THE FILL-IN PAGE MAKES (v0.18). It does three things at once:
     1. saves the boxes this device changed (d.changes = { boxName: "what is in it now" }; "" = emptied),
     2. hands back every box that changed since this device last asked (d.since = the change number it
        already has), so entries typed on other phones show up here,
     3. says whether HQ has cleared the worksheet.
   d.key is the edit key. The first device to save a worksheet sets its key; after that only devices
   with the same key (those sent the join link) get in. No login. */
function escSync_(d) {
  var id = escId_(d.id), key = escKey_(d.key);
  if (!id || !key) return { ok: false, nokey: true, error: 'This link cannot open the worksheet.' };
  if (escIsCleared_(id)) return { ok: true, cleared: true };
  var sh = escTab_(), row = escFindRow_(sh, id), now = new Date();
  var changes = (d.changes && typeof d.changes === 'object') ? d.changes : {};
  var names = Object.keys(changes).filter(function (k) { return /^[a-z0-9_]{1,60}$/.test(k); });
  var since = Math.max(0, parseInt(d.since, 10) || 0);
  // Nothing saved yet and nothing to save: do not make an empty row (keeps HQ's list clean).
  if (!row && !names.length && !d.claim) return { ok: true, rev: 0, changed: {}, now: now.getTime() };
  // Since website v0.27.1 a worksheet must be STARTED first (escStart, HQ user name and password).
  if (!row) return { ok: false, needStart: true, error: 'Starting a worksheet needs the HQ user name and password.' };

  var mark = escKeyMark_(id, key);
  var w = row ? escOpen_(sh.getRange(row, 7, 1, 1).getValues()[0][0]) : { data: {}, meta: { r: 0, k: '', f: {} } };
  var adopt = !w.meta.k;                       // a new worksheet, or one saved before v0.18: this key becomes its key
  if (adopt) w.meta.k = mark;
  else if (w.meta.k !== mark) return { ok: false, nokey: true, error: 'This link cannot open the worksheet.' };

  var touched = false;
  names.forEach(function (k) {
    var v = clean_(changes[k], 4000);
    if ((w.data[k] || '') === v) return;       // already what is saved: not a change
    if (!touched) { touched = true; w.meta.r++; }
    if (v) w.data[k] = v; else delete w.data[k];
    w.meta.f[k] = w.meta.r;
  });

  if (touched || adopt || !row) {
    var store = {};
    Object.keys(w.data).forEach(function (k) { store[k] = w.data[k]; });
    store[ESC_META] = w.meta;
    var text = JSON.stringify(store);
    if (text.length > ESC_MAX_CHARS) return { ok: false, toolong: true, error: 'This worksheet is too long to save. Please shorten the notes.' };
    var nowText = stamp_(now);
    if (!row) escLoginSettings_();             // a first worksheet also makes sure the two HQ login rows exist in Settings
    if (!row) sh.appendRow([id, nowText, nowText, safe_(clean_(w.data.incident_addresses, 200)), safe_(clean_(w.data.date_time, 80)), String(now.getTime()), text]);
    else if (touched) sh.getRange(row, 3, 1, 5).setValues([[nowText, safe_(clean_(w.data.incident_addresses, 200)), safe_(clean_(w.data.date_time, 80)), String(now.getTime()), text]]);
    else sh.getRange(row, 7, 1, 1).setValues([[text]]);
  }

  var out = {};
  Object.keys(w.meta.f).forEach(function (k) { if (w.meta.f[k] > since) out[k] = w.data[k] || ''; });
  return { ok: true, rev: w.meta.r, changed: out, now: now.getTime() };
}

// START a worksheet (website v0.27.1). Only someone with the HQ login can start one and so become its
// lead: a device logged in as HQ, or the HQ user name and password typed into the pop-up (this does NOT
// log the device in as HQ). Makes the worksheet's row with its edit key and nothing typed yet.
function escStart_(d) {
  var id = escId_(d.id), key = escKey_(d.key);
  if (!id || !key) return { ok: false, error: 'This worksheet could not be started.' };
  if (escIsCleared_(id)) return { ok: false, error: 'That worksheet was cleared. Reload the page to start a new one.' };
  var sh = escTab_(), row = escFindRow_(sh, id), mark = escKeyMark_(id, key);
  if (row) {
    var w = escOpen_(sh.getRange(row, 7, 1, 1).getValues()[0][0]);
    return w.meta.k === mark ? { ok: true } : { ok: false, nokey: true, error: 'This worksheet could not be started.' };
  }
  var denied = leadDenied_(d);
  if (denied) return denied;
  var store = {}, now = new Date(), nowText = stamp_(now);
  store[ESC_META] = { r: 0, k: mark, f: {} };
  sh.appendRow([id, nowText, nowText, '', '', String(now.getTime()), JSON.stringify(store)]);
  return { ok: true };
}

// Read one worksheet back (the live view calls this every few seconds). HQ login needed.
function escGet_(d) {
  var denied = escDenied_(d);
  if (denied) return denied;
  var id = escId_(d.id);
  if (!id) return { ok: false, error: 'This worksheet link is not valid.' };
  var sh = escTab_(), row = escFindRow_(sh, id), now = new Date().getTime();
  if (!row) return { ok: true, found: false, cleared: escIsCleared_(id), now: now };
  var r = sh.getRange(row, 1, 1, ESC_HEADERS.length).getValues()[0];
  return { ok: true, found: true, id: id, started: iso_(r[1]), updated: iso_(r[2]), ms: Number(escText_(r[5])) || 0, now: now, data: escOpen_(r[6]).data };
}

// The most recent worksheets, newest first. HQ login needed.
function escList_(d) {
  var denied = escDenied_(d);
  if (denied) return denied;
  var sh = escTab_(), last = sh.getLastRow(), now = new Date().getTime(), items = [];
  if (last >= 2) {
    sh.getRange(2, 1, last - 1, 6).getValues().forEach(function (r, i) {
      if (!r[0]) return;
      items.push({ id: String(r[0]), started: iso_(r[1]), updated: iso_(r[2]), address: escText_(r[3]), when: escText_(r[4]), ms: Number(escText_(r[5])) || 0, row: i });
    });
  }
  // Newest first. Two saved in the very same instant: the one lower down the tab counts as newer.
  items.sort(function (a, b) { return (b.ms - a.ms) || (b.row - a.row); });
  items = items.slice(0, 25);
  items.forEach(function (it) { delete it.row; });
  return { ok: true, now: now, items: items };
}

// End of the event: HQ clears a worksheet. HQ login needed. The row is moved, not destroyed.
function escClear_(d) {
  var denied = escDenied_(d);
  if (denied) return denied;
  var id = escId_(d.id);
  if (!id) return { ok: false, error: 'This worksheet link is not valid.' };
  var sh = escTab_(), row = escFindRow_(sh, id);
  if (!row) return { ok: true, cleared: escIsCleared_(id) };
  var r = sh.getRange(row, 1, 1, ESC_HEADERS.length).getValues()[0].map(function (v) { return v instanceof Date ? stamp_(v) : safe_(escText_(v)); });
  escClearedTab_().appendRow(r.concat([stamp_()]));
  sh.deleteRow(row);
  return { ok: true, cleared: true };
}

/* =========================================================
   RECEPTION CENTER FORM (pages/reception.html), added for website v0.21
   Intake at a reception center: one short form per displaced person or family. Each finished intake
   is sent here as one row, and the form clears itself for the next one.
   HOW IT IS ORGANIZED
     - The responder who STARTS a reception center on their phone is its lead. They type the center's
       name or location and their own name. That makes one row in the tab "Reception Centers".
     - "Add a responder" (lead only) sends a join link. Everyone who opens it does intakes for the same
       center. Their phones do not need to talk to each other: every intake comes straight here.
     - Every intake is one row in the tab "Reception Intakes", tagged with its center.
     - THE SUMMARY (all intakes for one center, with totals) can be seen by two kinds of people only:
       the lead (on the phone that started the center) and HQ (with the same HQ user name and password
       as the Escalation Form live view). Responders who joined see only how many intakes they did.
   TWO CODES PER CENTER. Both are made on the lead's phone and only scrambled forms are kept here.
     - the join key, in the join link: lets a phone ADD intakes to that one center, nothing else.
     - the lead key, which never leaves the lead's phone: lets that phone read the summary.
   CLIENT DETAILS ARE DELETED, NOT ARCHIVED (Sean's decision, Oct 12, 2026).
     - When HQ clears a center at the end of the event, its row and every intake row are deleted for
       good. Only the center's code and the time it was cleared are noted in "Reception cleared" (no
       names or other details), so the responders' phones can tell their center has ended.
     - If nobody clears it, a center and its intakes are deleted automatically 5 days after its last
       intake (or 5 days after it was started, if it never had one). This check runs whenever anyone
       uses the form, and every night at 3 AM once startAutoDelete has been run (no email is sent).
     - The form asks for basic needs only. Do not record diagnoses.
   ========================================================= */
var REC_CENTER_HEADERS = ['ID', 'Started', 'Last intake', 'Center name or location', 'Lead', 'Intakes', 'Last activity ms (do not edit)', 'Join check (do not edit)', 'Lead check (do not edit)'];
var REC_INTAKE_HEADERS = ['Center ID', 'Intake ID', 'Saved', 'Responder', 'Name', 'Address', 'Unit', 'Phone', 'Alternate contact',
  'Adults', 'Children', 'Pets', 'Pets with them', 'Safe place tonight', 'Where', 'Would stay in a shelter', 'Immediate needs', 'Other concerns or needs'];
/* The intake boxes the website sends, in the same order as the columns after "Responder", with the
   longest text each may hold. */
var REC_FIELDS = [['name', 120], ['address', 200], ['unit', 40], ['phone', 60], ['alt', 200], ['adults', 4], ['children', 4],
  ['pets', 200], ['pets_with', 20], ['safe', 20], ['safe_where', 200], ['shelter', 20], ['needs', 1000], ['concerns', 2000]];
var REC_KEEP_DAYS = 5;

function recCenters_() { makeTab_('Reception Centers', REC_CENTER_HEADERS); return tab_('Reception Centers'); }
function recIntakes_() { makeTab_('Reception Intakes', REC_INTAKE_HEADERS); return tab_('Reception Intakes'); }
function recClearedTab_() { makeTab_('Reception cleared', ['ID', 'Cleared', 'How']); return tab_('Reception cleared'); }
function recIsCleared_(id) { return escFindRow_(recClearedTab_(), id) > 0; }
function recMark_(kind, id, key) { return hash_('rec-' + kind + '|' + id, key).slice(0, 32); }
function recNum_(v) { var n = parseInt(v, 10); return n >= 0 && n < 1000 ? n : 0; }

/* Deletes a center and all its intakes, and notes the code in "Reception cleared". */
function recDelete_(id, how) {
  var ish = recIntakes_(), last = ish.getLastRow();
  if (last >= 2) {
    var ids = ish.getRange(2, 1, last - 1, 1).getValues();
    for (var i = ids.length - 1; i >= 0; i--) if (String(ids[i][0]) === id) ish.deleteRow(i + 2);
  }
  var csh = recCenters_(), row = escFindRow_(csh, id);
  if (row) csh.deleteRow(row);
  if (!recIsCleared_(id)) recClearedTab_().appendRow([id, stamp_(), how]);
}

/* The 5-day automatic delete. Also removes intakes whose center is gone (a row deleted by hand). */
function recPurge_() {
  var csh = recCenters_(), last = csh.getLastRow(), cutoff = Date.now() - REC_KEEP_DAYS * 86400000, keep = {}, old = [];
  if (last >= 2) {
    csh.getRange(2, 1, last - 1, 7).getValues().forEach(function (r) {
      if (!r[0]) return;
      var ms = Number(escText_(r[6])) || 0;
      if (ms && ms < cutoff) old.push(String(r[0])); else keep[String(r[0])] = true;
    });
  }
  old.forEach(function (id) { recDelete_(id, 'Deleted automatically ' + REC_KEEP_DAYS + ' days after the last intake'); });
  var ish = recIntakes_(), il = ish.getLastRow();
  if (il >= 2) {
    var ids = ish.getRange(2, 1, il - 1, 1).getValues();
    for (var i = ids.length - 1; i >= 0; i--) if (!keep[String(ids[i][0])]) ish.deleteRow(i + 2);
  }
}

/* Finds a center and checks a code against it. which = 'join' or 'lead'. */
function recCenter_(id, key, which) {
  var csh = recCenters_(), row = escFindRow_(csh, id);
  if (!row) return null;
  var r = csh.getRange(row, 1, 1, REC_CENTER_HEADERS.length).getValues()[0];
  var mark = escText_(which === 'lead' ? r[8] : r[7]);
  return { row: row, r: r, ok: !!key && mark === recMark_(which, id, key) };
}

// The lead starts a reception center (or starts it again: safe to repeat).
function recStart_(d) {
  recPurge_();
  var id = escId_(d.id), key = escKey_(d.key), lead = escKey_(d.leadKey);
  if (!id || !key || !lead) return { ok: false, error: 'This reception center could not be started.' };
  if (recIsCleared_(id)) return { ok: true, cleared: true };
  var c = recCenter_(id, key, 'join');
  if (c) return c.ok ? { ok: true } : { ok: false, nokey: true, error: 'This link cannot open the reception center.' };
  // Only someone with the HQ login can become a lead (website v0.27): either a phone already logged in
  // as HQ, or the HQ user name and password typed into the pop-up when starting. Typing them here does
  // NOT log the phone in as HQ; it only starts this one center.
  var denied = leadDenied_(d);
  if (denied) return denied;
  var now = new Date(), nowText = stamp_(now);
  recCenters_().appendRow([id, nowText, '', safe_(clean_(d.center, 120)), safe_(clean_(d.lead, 100)), '0', String(now.getTime()),
    recMark_('join', id, key), recMark_('lead', id, lead)]);
  return { ok: true };
}

/* Who may become a lead (Reception Center Form and Escalation Form, website v0.27): a device logged in
   as HQ, or someone who types the HQ user name and password. Returns null when allowed. */
function leadDenied_(d) {
  if (d.token && !escDenied_(d)) return null;
  var s = escLoginSettings_();                // also makes sure the HQ login rows exist in Settings
  if (!s.user || !s.pass) return { ok: false, leadLogin: true, locked: true, error: 'The HQ user name and password have not been set yet. The site admin sets them in the Google Sheet.' };
  if (d.user == null && d.password == null) return { ok: false, leadLogin: true, error: '' };
  if (tooManyTries_('esc-hq')) return { ok: false, leadLogin: true, error: 'Too many tries. Please wait 15 minutes and try again.' };
  if (clean_(d.user, 60).toLowerCase() !== s.user.toLowerCase() || String(d.password || '') !== s.pass) {
    noteFail_('esc-hq');
    return { ok: false, leadLogin: true, error: 'That user name and password do not match.' };
  }
  return null;
}

// A phone checks in: is its center still open? (Joined phones ask this now and then.)
function recPing_(d) {
  var id = escId_(d.id), key = escKey_(d.key);
  if (!id) return { ok: false, error: 'Not a valid reception center.' };
  if (recIsCleared_(id)) return { ok: true, cleared: true };
  var c = recCenter_(id, key, 'join');
  if (!c) return { ok: true, found: false };
  if (!c.ok) return { ok: false, nokey: true, error: 'This link cannot open the reception center.' };
  return { ok: true, found: true, center: escText_(c.r[3]), lead: escText_(c.r[4]) };
}

// One finished intake. The same intake sent twice (a phone that lost signal and tried again) is saved once.
function recAdd_(d) {
  var id = escId_(d.id), key = escKey_(d.key), it = (d.intake && typeof d.intake === 'object') ? d.intake : {};
  if (!id || !key) return { ok: false, nokey: true, error: 'This link cannot open the reception center.' };
  if (recIsCleared_(id)) return { ok: true, cleared: true };
  var c = recCenter_(id, key, 'join');
  if (!c) return { ok: false, missing: true, error: 'This reception center was not found.' };
  if (!c.ok) return { ok: false, nokey: true, error: 'This link cannot open the reception center.' };
  var iid = escId_(it.iid);
  if (!iid) return { ok: false, error: 'This intake could not be saved.' };
  if (!clean_(it.name, 120)) return { ok: false, error: 'Please enter a name.' };
  var ish = recIntakes_(), last = ish.getLastRow();
  if (last >= 2) {
    var seen = ish.getRange(2, 1, last - 1, 2).getValues();
    for (var i = 0; i < seen.length; i++) if (String(seen[i][0]) === id && String(seen[i][1]) === iid) return { ok: true, duplicate: true };
  }
  var now = new Date(), nowText = stamp_(now);
  var row = [id, iid, nowText, safe_(clean_(d.by, 100))];
  REC_FIELDS.forEach(function (f) { row.push(safe_(clean_(it[f[0]], f[1]))); });
  ish.appendRow(row);
  var n = (parseInt(escText_(c.r[5]), 10) || 0) + 1;
  recCenters_().getRange(c.row, 3, 1, 5).setValues([[nowText, safe_(escText_(c.r[3])), safe_(escText_(c.r[4])), String(n), String(now.getTime())]]);
  return { ok: true };
}

// The summary of one center: the lead (with the lead key) or HQ (logged in).
function recGet_(d) {
  recPurge_();
  var id = escId_(d.id);
  if (!id) return { ok: false, error: 'This reception center link is not valid.' };
  var c = recCenter_(id, escKey_(d.leadKey), 'lead');
  if (!(c && c.ok)) {
    var denied = escDenied_(d);
    if (denied) return denied;
  }
  var now = new Date().getTime();
  if (!c) return { ok: true, found: false, cleared: recIsCleared_(id), now: now };
  var ish = recIntakes_(), last = ish.getLastRow(), items = [];
  if (last >= 2) {
    ish.getRange(2, 1, last - 1, REC_INTAKE_HEADERS.length).getValues().forEach(function (r) {
      if (String(r[0]) !== id) return;
      var o = { iid: String(r[1]), saved: iso_(r[2]), by: escText_(r[3]) };
      REC_FIELDS.forEach(function (f, j) { o[f[0]] = escText_(r[4 + j]); });
      items.push(o);
    });
  }
  return { ok: true, found: true, id: id, center: escText_(c.r[3]), lead: escText_(c.r[4]), started: iso_(c.r[1]),
    ms: Number(escText_(c.r[6])) || 0, keepDays: REC_KEEP_DAYS, now: now, items: items };
}

// All open reception centers, newest activity first. HQ login needed.
function recList_(d) {
  var denied = escDenied_(d);
  if (denied) return denied;
  recPurge_();
  var csh = recCenters_(), last = csh.getLastRow(), now = new Date().getTime(), items = [];
  if (last >= 2) {
    csh.getRange(2, 1, last - 1, 7).getValues().forEach(function (r, i) {
      if (!r[0]) return;
      items.push({ id: String(r[0]), started: iso_(r[1]), center: escText_(r[3]), lead: escText_(r[4]), count: parseInt(escText_(r[5]), 10) || 0, ms: Number(escText_(r[6])) || 0, row: i });
    });
  }
  items.sort(function (a, b) { return (b.ms - a.ms) || (b.row - a.row); });
  items.forEach(function (it) { delete it.row; });
  return { ok: true, now: now, keepDays: REC_KEEP_DAYS, items: items };
}

// End of the event: HQ clears a center. HQ login needed. Everything about it is deleted for good.
function recClear_(d) {
  var denied = escDenied_(d);
  if (denied) return denied;
  var id = escId_(d.id);
  if (!id) return { ok: false, error: 'This reception center link is not valid.' };
  recDelete_(id, 'Cleared by HQ');
  return { ok: true, cleared: true };
}


/* =========================================================
   LIBRARY FILES (website v0.27)
   The website's documents live in Google Drive, in the folder "SEPA Library Files" (in the
   sepalibrary Google account). The website asks this script what is in that folder and shows it.
   So to ADD a document: drop it into the right folder in Drive. To REMOVE one: delete it in Drive.
   To RENAME one: rename it in Drive (the name, without .pdf etc., is the title people see).
   The website catches up within about 10 minutes.
     - Each folder directly inside "SEPA Library Files" is a group on Browse Library.
     - Folders inside those become subheadings.
     - "Mass Care Resources" is also the list on the Mass Care page.
     - "Getting Started" also feeds the cards on the Onboarding page (matched by file name, so
       keep those names the same, or tell whoever edits the website).
   ONE-TIME SETUP: run setupLibrary once from the editor (pick it in the box next to Debug, then Run).
   It makes the folder viewable by anyone with the link (the website needs that), checks every file,
   and starts the 10-minute refresh. Safe to run again any time.
   ========================================================= */
var LIB_FOLDER_NAMES = ['SEPA Library Files', 'SEPA Library Files - upload to Drive'];
var LIB_SKIP = /(\.tmp\.pdf$)|(^~\$)|(^\.)|(^desktop\.ini$)/i;   // leftovers that never show on the website
var LIB_CACHE_SECS = 21600;        // the refresh rewrites this every 10 minutes anyway
var LIB_SEARCH_SECS = 900;         // a search result is reused for 15 minutes

function libFolder_() {
  var props = PropertiesService.getScriptProperties(), id = props.getProperty('libFolder');
  if (id) { try { var f = DriveApp.getFolderById(id); if (!f.isTrashed()) return f; } catch (e) {} }
  for (var i = 0; i < LIB_FOLDER_NAMES.length; i++) {
    var it = DriveApp.getFoldersByName(LIB_FOLDER_NAMES[i]);
    while (it.hasNext()) {
      var g = it.next();
      if (!g.isTrashed()) { props.setProperty('libFolder', g.getId()); return g; }
    }
  }
  return null;
}

/* Big values are split into pieces, because one cache entry holds at most 100 KB. */
function libCachePut_(key, text, secs) {
  var c = CacheService.getScriptCache(), n = Math.ceil(text.length / 90000) || 1, all = {};
  for (var i = 0; i < n; i++) all[key + ':' + i] = text.slice(i * 90000, (i + 1) * 90000);
  all[key] = String(n);
  c.putAll(all, secs);
}
function libCacheGet_(key) {
  var c = CacheService.getScriptCache(), n = parseInt(c.get(key), 10);
  if (!n) return null;
  var keys = [];
  for (var i = 0; i < n; i++) keys.push(key + ':' + i);
  var got = c.getAll(keys), out = '';
  for (i = 0; i < n; i++) { if (got[keys[i]] == null) return null; out += got[keys[i]]; }
  return out;
}

/* Every file the account can see, in a few quick calls (the Drive web service, using this script's
   own permission). Returns null if that fails, and the slower folder-by-folder walk is used instead. */
function libAllFromApi_() {
  try {
    var token = ScriptApp.getOAuthToken(), out = [], page = '';
    for (var guard = 0; guard < 40; guard++) {
      var url = 'https://www.googleapis.com/drive/v3/files?pageSize=1000&q=' + encodeURIComponent('trashed = false') +
        '&fields=' + encodeURIComponent('nextPageToken,files(id,name,mimeType,size,modifiedTime,parents,permissionIds,webViewLink,shortcutDetails)') +
        (page ? '&pageToken=' + encodeURIComponent(page) : '');
      var res = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true });
      if (res.getResponseCode() !== 200) return null;
      var body = JSON.parse(res.getContentText());
      out = out.concat(body.files || []);
      page = body.nextPageToken;
      if (!page) return out;
    }
    return out;
  } catch (e) { return null; }
}

/* Builds the list the website shows: { paths: ['Getting Started', ...], files: [[id, name, path#, bytes, modified, kind, link, shared]] } */
function libBuild_() {
  var root = libFolder_();
  if (!root) return { ok: false, error: 'The Drive folder "SEPA Library Files" was not found.' };
  var rootId = root.getId(), paths = [], pathIx = {}, files = [], skipped = [];
  function pathNo(p) { if (!(p in pathIx)) { pathIx[p] = paths.length; paths.push(p); } return pathIx[p]; }
  function add(f) {
    if (LIB_SKIP.test(f.name)) { skipped.push((f.path ? f.path + '/' : '') + f.name); return; }
    var mime = f.mime, id = f.id;
    if (mime === 'application/vnd.google-apps.shortcut' && f.target) { id = f.target; mime = f.targetMime || ''; }
    if (mime === 'application/vnd.google-apps.folder') return;
    var kind = /^application\/vnd\.google-apps\./.test(mime) ? mime.split('.').pop() : '';
    files.push([id, f.name, pathNo(f.path), f.size || 0, f.modified || '', kind, kind ? (f.link || '') : '', f.shared ? 1 : 0]);
  }
  var all = libAllFromApi_();
  if (all) {
    var byId = {};
    all.forEach(function (f) { byId[f.id] = f; });
    var folderPath = {};   // folder id -> its path under the root ('' for the root), or false if outside
    folderPath[rootId] = '';
    var where = function (fid, depth) {
      if (fid in folderPath) return folderPath[fid];
      var f = byId[fid];
      if (!f || depth > 12 || !f.parents || !f.parents.length) return (folderPath[fid] = false);
      var up = where(f.parents[0], depth + 1);
      return (folderPath[fid] = up === false ? false : (up ? up + '/' : '') + f.name);
    };
    all.forEach(function (f) {
      if (f.mimeType === 'application/vnd.google-apps.folder' || !f.parents) return;
      var p = where(f.parents[0], 0);
      if (p === false) return;
      add({ id: f.id, name: f.name, path: p, mime: f.mimeType, size: +f.size || 0, modified: String(f.modifiedTime || '').slice(0, 10),
            link: f.webViewLink, shared: (f.permissionIds || []).indexOf('anyoneWithLink') >= 0,
            target: f.shortcutDetails && f.shortcutDetails.targetId, targetMime: f.shortcutDetails && f.shortcutDetails.targetMimeType });
    });
  } else {
    // Slower way: walk the folders one by one.
    var walk = function (folder, path, depth) {
      var it = folder.getFiles();
      while (it.hasNext()) {
        var f = it.next(), mime = f.getMimeType(), target = '', shared = true;
        try { if (mime === 'application/vnd.google-apps.shortcut') target = f.getTargetId(); } catch (e) {}
        try { shared = f.getSharingAccess() === DriveApp.Access.ANYONE_WITH_LINK || f.getSharingAccess() === DriveApp.Access.ANYONE; } catch (e) {}
        add({ id: f.getId(), name: f.getName(), path: path, mime: mime, size: f.getSize(), link: f.getUrl(), shared: shared, target: target,
              modified: Utilities.formatDate(f.getLastUpdated(), tz_(), 'yyyy-MM-dd') });
      }
      if (depth > 10) return;
      var sub = folder.getFolders();
      while (sub.hasNext()) { var s = sub.next(); walk(s, (path ? path + '/' : '') + s.getName(), depth + 1); }
    };
    walk(root, '', 0);
  }
  var groups = {};
  paths.forEach(function (p) { if (p) groups[p.split('/')[0]] = 1; });
  return { ok: true, at: Date.now(), root: rootId, groups: Object.keys(groups).sort(), paths: paths, files: files, skipped: skipped };
}

/* Makes sure the website can open each file: anyone with the link may VIEW (not edit). */
function libShare_(list, max) {
  var fixed = 0;
  list.files.forEach(function (f) {
    if (f[7] || fixed >= max) return;
    try { DriveApp.getFileById(f[0]).setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); f[7] = 1; fixed++; } catch (e) {}
  });
  return fixed;
}

/* The list, from the cache when possible. */
function libList_(fresh) {
  if (!fresh) {
    var hit = libCacheGet_('libList');
    if (hit) return JSON.parse(hit);
  }
  var list = libBuild_();
  if (list.ok) {
    libShare_(list, 25);
    libCachePut_('libList', JSON.stringify(list), LIB_CACHE_SECS);
  }
  return list;
}
function libPublic_(list) {
  if (!list.ok) return list;
  return { ok: true, at: list.at, groups: list.groups, paths: list.paths,
           files: list.files.map(function (f) { return f.slice(0, 7); }) };
}

/* Runs every 10 minutes (setupLibrary starts it): re-reads the folder so additions, removals and
   renames show on the website. */
function refreshLibrary() {
  var list = libBuild_();
  if (!list.ok) return;
  libShare_(list, 200);
  libCachePut_('libList', JSON.stringify(list), LIB_CACHE_SECS);
}

function setupLibrary() {
  var root = libFolder_();
  if (!root) { Logger.log('Could not find a Drive folder named "SEPA Library Files" in this account. Check the name and run this again.'); return; }
  if (root.getName() !== LIB_FOLDER_NAMES[0]) { root.setName(LIB_FOLDER_NAMES[0]); Logger.log('Renamed the folder to "' + LIB_FOLDER_NAMES[0] + '".'); }
  root.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  var list = libBuild_();
  var fixed = libShare_(list, 100000);
  libCachePut_('libList', JSON.stringify(list), LIB_CACHE_SECS);
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'refreshLibrary') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('refreshLibrary').timeBased().everyMinutes(10).create();
  var counts = {};
  list.files.forEach(function (f) { var g = list.paths[f[2]].split('/')[0] || '(loose files at the top)'; counts[g] = (counts[g] || 0) + 1; });
  Logger.log('Library is set up: ' + list.files.length + ' files. Made ' + fixed + ' viewable by link. Refresh every 10 minutes is on.');
  Object.keys(counts).sort().forEach(function (g) { Logger.log('  ' + g + ': ' + counts[g]); });
  if (list.skipped.length) Logger.log('Left off the website (leftover copies you can delete in Drive): ' + list.skipped.join(' | '));
}

/* SEARCH INSIDE THE DOCUMENTS. The website turns what someone typed into groups of words that mean
   the same thing (for example ["mass care", "MC"]) and sends them here. Google Drive searches the text
   inside every file. A file must match one word from EVERY group; if few do, files that match some
   groups come after them. Only files in the library folder are returned. */
function libQuote_(t) {
  t = String(t).replace(/[\\']/g, ' ').replace(/"/g, ' ').replace(/\s+/g, ' ').trim();
  return /[^A-Za-z0-9]/.test(t) ? '"' + t + '"' : t;   // anything with a space or symbol is searched as a phrase
}
function libDriveSearch_(groups, any) {
  var parts = groups.map(function (g) {
    return '(' + g.map(function (t) { return "fullText contains '" + libQuote_(t) + "'"; }).join(' or ') + ')';
  });
  var q = 'trashed = false and (' + parts.join(any ? ' or ' : ' and ') + ')';
  var ids = [], it = DriveApp.searchFiles(q), n = 0;
  while (it.hasNext() && n < 300) { ids.push(it.next().getId()); n++; }
  return ids;
}
function libSearch_(raw) {
  var groups;
  try { groups = JSON.parse(raw); } catch (e) { return { ok: false, error: 'Bad search.' }; }
  if (!Array.isArray(groups)) return { ok: false, error: 'Bad search.' };
  groups = groups.slice(0, 6).map(function (g) {
    return (Array.isArray(g) ? g : [g]).map(function (t) { return clean_(t, 60); })
      .filter(function (t) { return t.replace(/[^A-Za-z0-9]/g, '').length >= 2; }).slice(0, 12);
  }).filter(function (g) { return g.length; });
  if (!groups.length) return { ok: true, hits: [], some: [] };
  var key = 'libq:' + hash_('q', JSON.stringify(groups)).slice(0, 40), c = CacheService.getScriptCache(), hit = c.get(key);
  if (hit) return JSON.parse(hit);
  var list = libList_(false);
  if (!list.ok) return list;
  var inLib = {};
  list.files.forEach(function (f) { inLib[f[0]] = 1; });
  var hits = libDriveSearch_(groups, false).filter(function (id) { return inLib[id]; }), some = [];
  if (hits.length < 5 && groups.length > 1) {
    var seen = {};
    hits.forEach(function (id) { seen[id] = 1; });
    some = libDriveSearch_(groups, true).filter(function (id) { return inLib[id] && !seen[id]; });
  }
  var out = { ok: true, hits: hits.slice(0, 60), some: some.slice(0, 30) };
  try { c.put(key, JSON.stringify(out), LIB_SEARCH_SECS); } catch (e) {}
  return out;
}
