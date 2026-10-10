/**
 * SEPA Resource Library - Google Sheet backend
 * Powers: DAT shift signup calendar + Discussion Forums + Escalation Form (proof of concept)
 *
 * This code lives inside ONE Google Sheet (Extensions > Apps Script).
 * It is NOT part of the website itself. See "Admin Guides" folder, Guide 2.
 *
 * Tabs the admin uses:
 *   Signups   - one-time shift signups (delete a row to cancel it)
 *   Recurring - weekly repeating signups (delete a row, or type YES in "Stopped", to end it)
 *   Settings  - report email(s), how far ahead people can sign up, minimum hours for custom shifts
 *   Members   - forum members (only used if logins are turned on). YES in "Blocked" blocks someone.
 *   Topics    - forum discussions. Type YES in "Hidden" to hide one.
 *   Replies   - forum replies. Type YES in "Hidden" to hide one.
 *   Sessions  - logins, only if turned on (leave alone; delete all rows to log everyone out)
 *   Escalations - one row per Escalation Form worksheet (proof of concept, website v0.17). The tab
 *               appears by itself the first time someone uses the form.
 *   Escalations cleared - worksheets HQ cleared at the end of an event. Kept as a record; delete rows
 *               here to remove them for good.
 *   Settings also holds the HQ user name and password for the Escalation Form live view.
 */

/* The Google Sheet this script saves to (the long code in the Sheet's web address,
   between /d/ and /edit). Leave blank only if the script was opened from the Sheet itself. */
var SHEET_ID = '1Ndx-55A7LBEYv8lrX8lpryu9-iOUL9WXmwiTiM9eF9I';

var DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
var SIGNUP_HEADERS = ['Submitted', 'Shift Date', 'Hours', 'Name', 'Phone', 'Email', 'Notes', 'Start hour (do not edit)', 'Length (do not edit)'];
var RECURRING_HEADERS = ['Submitted', 'Every', 'Hours', 'Name', 'Phone', 'Email', 'Notes', 'Starting', 'Stopped (type YES)', 'Start hour (do not edit)', 'Length (do not edit)'];

/* Forum logins. false = no sign-up: anyone can read and post by typing their name.
   true  = members must join / log in (name + password). */
var FORUM_REQUIRES_LOGIN = false;
var SESSION_DAYS = 180;

var REPORT_HOUR = 7;   // daily signup report goes out at 7 AM
var SETTING_EMAIL_LABEL = 'Admin email(s) for the daily 7 AM signup report (separate several with commas; blank = no report)';
var SETTING_INSTANT_LABEL = 'Also email each signup the moment it happens? (YES or NO)';

/* =========================================================
   ONE-TIME SETUP: run this once from the Apps Script editor
   ========================================================= */
function setup() {
  makeTab_('Signups', SIGNUP_HEADERS);
  makeTab_('Recurring', RECURRING_HEADERS);
  makeTab_('Settings', ['Setting', 'Value'], [
    [SETTING_EMAIL_LABEL, ''],
    ['Days ahead people can sign up', '60'],
    ['Minimum hours for a custom shift', '6'],
    [SETTING_INSTANT_LABEL, 'NO']
  ]);
  makeTab_('Members', ['Name', 'Joined', 'Blocked (type YES)', 'Password check (do not edit)', 'Salt (do not edit)']);
  makeTab_('Topics', ['ID', 'Created', 'Author', 'Title', 'Message', 'Last Activity', 'Replies', 'Hidden (type YES)']);
  makeTab_('Replies', ['ID', 'Topic ID', 'Created', 'Author', 'Message', 'Hidden (type YES)']);
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

// GET = shift calendar data (public: counts only, never names)
function doGet() {
  return json_(shiftData_());
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
      join: FORUM_REQUIRES_LOGIN ? join_ : null,
      login: FORUM_REQUIRES_LOGIN ? login_ : null,
      logout: logout_,
      topics: listTopics_,
      topic: getTopic_,
      newTopic: newTopic_,
      reply: reply_,
      escPing: escPing_,
      escSave: escSave_,
      escLogin: escLogin_,
      escGet: escGet_,
      escList: escList_,
      escClear: escClear_
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
    instant: isYes_(r[4] && r[4][1])
  };
}

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
function shiftData_() {
  var s = readSettings_(), today = today_(), yesterday = addDays_(today, -1);
  var one = [];
  rows_('Signups').forEach(function (r) {
    var date = asDateText_(r[1]), start = parseInt(r[7], 10), hours = parseInt(r[8], 10);
    if (date >= yesterday && start >= 0 && hours > 0) one.push({ date: date, start: start, hours: hours });
  });
  var rec = [];
  rows_('Recurring').forEach(function (r) {
    if (isYes_(r[8])) return;
    var days = String(r[1]).split(',').map(function (x) { return DAY_NAMES.indexOf(x.trim().slice(0, 3)); })
      .filter(function (x) { return x >= 0; });
    var start = parseInt(r[9], 10), hours = parseInt(r[10], 10);
    if (days.length && start >= 0 && hours > 0) rec.push({ days: days, start: start, hours: hours, from: asDateText_(r[7]) });
  });
  return { ok: true, today: today, daysAhead: s.daysAhead, minHours: s.minHours, one: one, rec: rec };
}

/* Shared checks for name/contact/hours. Returns an error object, or null if all good. */
function checkPerson_(d, s) {
  if (!clean_(d.name, 100)) return { ok: false, error: 'Please enter your name.' };
  // No phone or email is required (since Oct 2026). Volunteers are already in the Red Cross system, so
  // the sign-up form asks for a name only. The Phone and Email columns stay in the Sheet and are left blank.
  var start = parseInt(d.start, 10), hours = parseInt(d.hours, 10);
  if (!(start >= 0 && start <= 23)) return { ok: false, error: 'Please choose a start time.' };
  if (!(hours >= s.minHours && hours <= 24)) return { ok: false, error: 'Shifts must be at least ' + s.minHours + ' hours (and no more than 24).' };
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

  tab_('Signups').appendRow([stamp_(), date, when, safe_(name), safe_(phone), safe_(email), safe_(notes), String(start), String(hours)]);
  notify_(s, 'DAT shift signup: ' + name + ', ' + date,
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

  tab_('Recurring').appendRow([stamp_(), every, when, safe_(name), safe_(phone), safe_(email), safe_(notes), from, '', String(start), String(hours)]);
  notify_(s, 'Recurring DAT signup: ' + name + ', every ' + every,
    name + ' signed up for every ' + every + ', ' + when + ' (' + hours + ' hours), starting ' + from + '.\n' +
    'This repeats until it is removed from the Recurring tab.\n\n' +
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

  var one = rows_('Signups').filter(function (r) { return iso_(r[0]) > since && iso_(r[0]) <= now; });
  var rec = rows_('Recurring').filter(function (r) { return iso_(r[0]) > since && iso_(r[0]) <= now; });
  one.sort(function (a, b) { return asDateText_(a[1]) < asDateText_(b[1]) ? -1 : 1; });

  var total = one.length + rec.length;
  var lines = [];
  lines.push(total ? total + ' new signup' + (total === 1 ? '' : 's') + ' since the last report:' : 'No new signups since the last report.');
  if (one.length) {
    lines.push('', 'ONE-TIME SHIFTS');
    one.forEach(function (r) { lines.push('  ' + nice(asDateText_(r[1])) + ', ' + r[2] + '\n      ' + person(r)); });
  }
  if (rec.length) {
    lines.push('', 'RECURRING (every week until stopped)');
    rec.forEach(function (r) { lines.push('  Every ' + r[1] + ', ' + r[2] + ', starting ' + nice(asDateText_(r[7])) + '\n      ' + person(r)); });
  }
  lines.push('', 'Full list: ' + ss_().getUrl());

  MailApp.sendEmail(s.adminEmail,
    'SEPA DAT signups: ' + (total || 'none') + ' new (' + Utilities.formatDate(new Date(), tz_(), 'MMM d') + ')',
    lines.join('\n'));
  props.setProperty('lastReport', now);
}

/* =========================================================
   FORUM: accounts
   ========================================================= */
function hash_(salt, password) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + '|' + password, Utilities.Charset.UTF_8);
  return bytes.map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}

function normName_(n) { return clean_(n, 40).replace(/\s+/g, ' '); }

function findMember_(name) {
  var key = name.toLowerCase();
  var data = rows_('Members');
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim().toLowerCase() === key) {
      return { row: i + 2, name: String(data[i][0]).trim(), blocked: isYes_(data[i][2]), hash: String(data[i][3]), salt: String(data[i][4]) };
    }
  }
  return null;
}

function newSession_(name) {
  var token = Utilities.getUuid() + Utilities.getUuid();
  tab_('Sessions').appendRow([token, safe_(name), stamp_()]);
  return token;
}

/* Returns the member's name for a valid token, or null. */
function who_(token) {
  token = String(token || '');
  if (token.length < 40) return null;
  var data = rows_('Sessions');
  for (var i = data.length - 1; i >= 0; i--) {
    if (data[i][0] === token) {
      if (iso_(data[i][2]) < stamp_(new Date(Date.now() - SESSION_DAYS * 86400000))) return null;
      var m = findMember_(String(data[i][1]).replace(/^'/, ''));
      return m && !m.blocked ? m.name : null;
    }
  }
  return null;
}

function tooManyTries_(name) {
  var c = CacheService.getScriptCache(), k = 'fail_' + name.toLowerCase();
  return (parseInt(c.get(k), 10) || 0) >= 8;
}
function noteFail_(name) {
  var c = CacheService.getScriptCache(), k = 'fail_' + name.toLowerCase();
  c.put(k, String((parseInt(c.get(k), 10) || 0) + 1), 900);
}

function join_(d) {
  var name = normName_(d.name), pw = String(d.password || '');
  if (name.length < 2) return { ok: false, error: 'Please enter your name (at least 2 letters).' };
  if (pw.length < 6) return { ok: false, error: 'Please choose a password with at least 6 characters.' };
  if (findMember_(name)) return { ok: false, error: 'That name is already taken. Try adding a last initial.' };
  var salt = Utilities.getUuid();
  tab_('Members').appendRow([safe_(name), stamp_(), '', hash_(salt, pw), salt]);
  return { ok: true, name: name, token: newSession_(name) };
}

function login_(d) {
  var name = normName_(d.name), pw = String(d.password || '');
  if (tooManyTries_(name)) return { ok: false, error: 'Too many tries. Please wait 15 minutes and try again.' };
  var m = findMember_(name);
  if (!m || hash_(m.salt, pw) !== m.hash) {
    noteFail_(name);
    return { ok: false, error: 'That name and password do not match. Check your spelling and try again.' };
  }
  if (m.blocked) return { ok: false, error: 'This account has been turned off. Please contact the site admin.' };
  return { ok: true, name: m.name, token: newSession_(m.name) };
}

function logout_(d) {
  var data = tab_('Sessions').getDataRange().getValues();
  for (var i = data.length - 1; i >= 1; i--) {
    if (data[i][0] === d.token) tab_('Sessions').deleteRow(i + 1);
  }
  return { ok: true };
}

/* =========================================================
   FORUM: topics and replies (members only)
   ========================================================= */
var NOT_LOGGED_IN = { ok: false, error: 'Please log in again.', loggedOut: true };

/* Who is posting/reading. With logins off, any visitor can read, and the poster's typed name is used. */
function reader_(d) { return FORUM_REQUIRES_LOGIN ? who_(d.token) : 'guest'; }
function poster_(d) {
  if (FORUM_REQUIRES_LOGIN) return who_(d.token);
  if (d.website) return null;   // spam trap
  var n = normName_(d.name);
  return n.length >= 2 ? n : '';
}
function posterError_(d) {
  if (FORUM_REQUIRES_LOGIN) return NOT_LOGGED_IN;
  return { ok: false, error: 'Please enter your name (at least 2 letters).' };
}

function listTopics_(d) {
  if (!reader_(d)) return NOT_LOGGED_IN;
  var list = rows_('Topics').filter(function (r) { return r[0] && !isYes_(r[7]); }).map(function (r) {
    return {
      id: String(r[0]), created: iso_(r[1]), author: String(r[2]).replace(/^'/, ''),
      title: String(r[3]).replace(/^'/, ''), preview: String(r[4]).replace(/^'/, '').slice(0, 160),
      last: iso_(r[5]), replies: parseInt(r[6], 10) || 0
    };
  });
  list.sort(function (a, b) { return a.last < b.last ? 1 : -1; });
  return { ok: true, loginRequired: FORUM_REQUIRES_LOGIN, topics: list.slice(0, 200) };
}

function getTopic_(d) {
  if (!reader_(d)) return NOT_LOGGED_IN;
  var id = String(d.id || '');
  var t = rows_('Topics').filter(function (r) { return String(r[0]) === id && !isYes_(r[7]); })[0];
  if (!t) return { ok: false, error: 'That discussion could not be found. It may have been removed.' };
  var replies = rows_('Replies').filter(function (r) { return String(r[1]) === id && !isYes_(r[5]); }).map(function (r) {
    return { id: String(r[0]), created: iso_(r[2]), author: String(r[3]).replace(/^'/, ''), body: String(r[4]).replace(/^'/, '') };
  });
  replies.sort(function (a, b) { return a.created > b.created ? 1 : -1; });
  return {
    ok: true,
    topic: { id: id, created: iso_(t[1]), author: String(t[2]).replace(/^'/, ''), title: String(t[3]).replace(/^'/, ''), body: String(t[4]).replace(/^'/, '') },
    replies: replies
  };
}

function newTopic_(d) {
  var me = poster_(d);
  if (me === null) return { ok: true, id: '' };
  if (!me) return posterError_(d);
  var title = clean_(d.title, 120), body = clean_(d.body, 5000);
  if (!title) return { ok: false, error: 'Please give your discussion a title.' };
  if (!body) return { ok: false, error: 'Please write a message.' };
  var id = Utilities.getUuid().slice(0, 8), now = stamp_();
  tab_('Topics').appendRow([id, now, safe_(me), safe_(title), safe_(body), now, '0', '']);
  return { ok: true, id: id };
}

function reply_(d) {
  var me = poster_(d);
  if (me === null) return { ok: true };
  if (!me) return posterError_(d);
  var id = String(d.topicId || ''), body = clean_(d.body, 5000);
  if (!body) return { ok: false, error: 'Please write a reply.' };
  var sh = tab_('Topics'), data = sh.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === id && !isYes_(data[i][7])) {
      var now = stamp_();
      tab_('Replies').appendRow([Utilities.getUuid().slice(0, 8), id, now, safe_(me), safe_(body), '']);
      sh.getRange(i + 1, 6, 1, 2).setValues([[now, String((parseInt(data[i][6], 10) || 0) + 1)]]);
      return { ok: true };
    }
  }
  return { ok: false, error: 'That discussion could not be found. It may have been removed.' };
}

/* =========================================================
   ESCALATION FORM (pages/escalation.html) - PROOF OF CONCEPT, added for website v0.17
   The website page sends the whole worksheet here a moment after anything is typed, and the
   "live view" page reads it back every few seconds.
   One row per worksheet in the tab "Escalations" (the tab is made automatically the first time).
   The last column holds the worksheet itself in a coded form: leave it alone.
   WHO CAN DO WHAT:
     - Filling in a worksheet needs no login (the responder on scene must not be slowed down).
     - READING a worksheet (the live view, and the list of recent worksheets) needs the HQ user name
       and password. Those two are NOT in this code, because this code is also kept in the website
       folder, which is public. They live in the Sheet's "Settings" tab, in the two rows whose labels
       start "Escalation Form live view". Type them there. To change the password, change it there:
       everyone who was logged in is logged out. While either row is blank, nobody can read.
     - One shared user name and password for everyone at HQ (Sean's choice for the proof of concept).
     - CLEARING a worksheet at the end of an event (the button in the live view) also needs the HQ
       login. Nothing is destroyed: the row moves to the tab "Escalations cleared", so there is still a
       record. The responder's page notices within about 20 seconds and starts a new blank worksheet.
       To really delete a worksheet, delete its row in "Escalations cleared" (or in "Escalations").
   ========================================================= */
var ESC_HEADERS = ['ID', 'Started', 'Last update', 'Incident address', 'Date/ Time (as typed)', 'Updated ms (do not edit)', 'Worksheet (do not edit)'];
var ESC_MAX_CHARS = 45000;   // a single spreadsheet cell holds 50,000 characters

var ESC_USER_LABEL = 'Escalation Form live view: user name (while blank, the live view is locked to everyone)';
var ESC_PASS_LABEL = 'Escalation Form live view: password';
var ESC_SESSION_DAYS = 30;   // how long an HQ login lasts on one device

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

// Does nothing but answer. The fill-in page uses it to learn that live sharing is switched on.
// If it is told which worksheet is asking, it also says whether HQ has cleared that worksheet.
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
function escText_(v) { return String(v == null ? '' : v).replace(/^'/, ''); }

function escFindRow_(sh, id) {
  var last = sh.getLastRow();
  if (last < 2) return 0;
  var ids = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) if (String(ids[i][0]) === id) return i + 2;
  return 0;
}

// Save (or update) one worksheet. d.data is { boxName: "what was typed", ... }
function escSave_(d) {
  var id = escId_(d.id);
  if (!id) return { ok: false, error: 'This worksheet link is not valid.' };
  if (escIsCleared_(id)) return { ok: true, cleared: true };      // HQ ended this one: do not bring it back
  var data = (d.data && typeof d.data === 'object') ? d.data : {};
  var kept = {};
  Object.keys(data).forEach(function (k) {
    if (!/^[a-z0-9_]{1,60}$/.test(k)) return;
    var v = clean_(data[k], 4000);
    if (v) kept[k] = v;
  });
  var text = JSON.stringify(kept);
  if (text.length > ESC_MAX_CHARS) return { ok: false, error: 'This worksheet is too long to save. Please shorten the notes.' };
  var sh = escTab_(), now = new Date(), nowText = stamp_(now), row = escFindRow_(sh, id);
  var tail = [nowText, safe_(clean_(kept.incident_addresses, 200)), safe_(clean_(kept.date_time, 80)), String(now.getTime()), text];
  if (row) sh.getRange(row, 3, 1, 5).setValues([tail]);
  else sh.appendRow([id, nowText].concat(tail));
  return { ok: true, updated: nowText, ms: now.getTime(), now: now.getTime() };
}

// Read one worksheet back (the live view calls this every few seconds). HQ login needed.
function escGet_(d) {
  var denied = escDenied_(d);
  if (denied) return denied;
  var id = escId_(d.id);
  if (!id) return { ok: false, error: 'This worksheet link is not valid.' };
  var sh = escTab_(), row = escFindRow_(sh, id), now = new Date().getTime();
  if (!row) return { ok: true, found: false, cleared: escIsCleared_(id), now: now };
  var r = sh.getRange(row, 1, 1, ESC_HEADERS.length).getValues()[0], data = {};
  try { data = JSON.parse(escText_(r[6])) || {}; } catch (err) { data = {}; }
  return { ok: true, found: true, id: id, started: iso_(r[1]), updated: iso_(r[2]), ms: Number(escText_(r[5])) || 0, now: now, data: data };
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
