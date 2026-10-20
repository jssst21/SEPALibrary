/**
 * SEPA Resource Library - Google Sheet backend
 * Powers: DAT shift signup calendars (Field Responders and Duty Officers) + Discussion Forums +
 *         Escalation Form (proof of concept) + Reception Center Form + Daily Shelter Report +
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
 *   Announcements - messages shown on the SEPA Tools app's Announcements bar (website v0.27.19).
 *               One row per announcement. See ANNOUNCEMENTS at the end. Appears by itself.
 *   Responders - who is on each worksheet and reception center (website v0.27.3). YES in "Removed"
 *               removes someone. See WHO IS ON AN EVENT at the end.
 *   Shelters, Shelter Supervisors, Shelter Reports, Shelter Log, Shelters closed - the Daily Shelter
 *               Report (website v0.27.39). Appear by themselves. See DAILY SHELTER REPORT at the end.
 *               It uses the same lead and HQ logins as the Escalation and Reception Center forms.
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
// ...exec?ann=1 gives the SEPA Tools app's announcements (website v0.27.19). See ANNOUNCEMENTS at the end.
// ...exec?lib=1 gives the list of library documents (website v0.27), and ...exec?find=[...] searches
// inside them. See LIBRARY FILES at the end.
function doGet(e) {
  var p = (e && e.parameter) || {};
  try {
    if (p.ann) return json_(annList_());
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
      askList: askList_,
      askJoin: askJoin_,
      askStatus: askStatus_,
      askAnswer: askAnswer_,
      recAsks: recAsks_,
      rosterRemove: rosterRemove_,
      makeLead: makeLead_,
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
      recClear: recClear_,
      recEdit: recEdit_,
      recDeleteOne: recDeleteOne_,
      recDda: recDda_,
      shPing: shPing_,
      shOpen: shOpen_,
      shGet: shGet_,
      shDay: shDay_,
      shSave: shSave_,
      shLog: shLog_,
      shLogEdit: shLogEdit_,
      shLogFlag: shLogFlag_,
      evLog: evLog_,           // v0.27.56: Running log on the Escalation and Reception Center forms
      evLogGet: evLogGet_,
      evLogFlag: evLogFlag_,
      evLogEdit: evLogEdit_,
      evPhotoAdd: evPhotoAdd_,     // v0.27.56: Add photo / See photos on the same two forms
      evPhotoGet: evPhotoGet_,
      evPhotoRemove: evPhotoRemove_,
      shAddSup: shAddSup_,
      shList: shList_,
      shExport: shExport_,
      shClose: shClose_,
      shRemoveSup: shRemoveSup_,
      rqList: rqList_,
      rqNew: rqNew_,
      rqGet: rqGet_,
      rqSave: rqSave_,
      rqApprove: rqApprove_,
      rqUnapprove: rqUnapprove_,
      rqStatus: rqStatus_,
      rqReceive: rqReceive_,
      rqCancel: rqCancel_,
      rqShare: rqShare_,
      sciaShelters: sciaShelters_,
      sciaOpen: sciaOpen_,
      sciaHq: sciaHq_,
      sciaSetLead: sciaSetLead_,
      sciaClose: sciaClose_,
      sciaLeadLogin: sciaLeadLogin_,
      sciaAsk: sciaAsk_,
      sciaAskStatus: sciaAskStatus_,
      sciaDash: sciaDash_,
      sciaGrant: sciaGrant_,
      sciaIntake: sciaIntake_,
      sciaEntered: sciaEntered_,
      sciaExport: sciaExport_,
      sciaSubmit: sciaSubmit_,
      coOpen: coOpen_,
      coLogin: coLogin_,
      testStatus: testStatus_,
      testLog: testLog_,
      testSurvey: testSurvey_
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
   intake, (since website v0.27.32) clears Escalation worksheets with no change for 5 days, and (since
   v0.27.39) erases Daily Shelter Reports with no activity for 14 days. (This also
   happens whenever anyone uses the forms, so this is the backstop for quiet weeks.) It is separate from the daily signup report on purpose: Sean wants no reports yet. */
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
  try { recPurge_(true); escPurge_(true); shPurge_(true); sciaPurge_(true); } finally { lock.releaseLock(); }     // escalation worksheets too since v0.27.32
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
       record. Every responder's page notices within a minute and starts a new blank worksheet.
       A worksheet with no change for 5 days is cleared the same way automatically (escPurge_, v0.27.32).
       To really delete a worksheet, delete its row in "Escalations cleared" (or in "Escalations").
   ========================================================= */
var ESC_HEADERS = ['ID', 'Started', 'Last update', 'Incident address', 'Date/ Time (as typed)', 'Updated ms (do not edit)', 'Worksheet (do not edit)'];
var ESC_MAX_CHARS = 45000;   // a single spreadsheet cell holds 50,000 characters

var ESC_USER_LABEL = 'Escalation Form live view: user name (while blank, the live view is locked to everyone)';
var ESC_PASS_LABEL = 'Escalation Form live view: password';
var ESC_SESSION_DAYS = 1;    // how long an HQ login lasts on one device: 24 hours (Sean, Oct 15, website v0.27.30; was 30 days)
/* LEAD LOGIN (website v0.27.25). A second user name and password, ONLY for starting an Escalation worksheet or a
   Reception Center (becoming its lead). It does not open the Scene Summary, the HQ lists or Clear: those
   stay with the HQ login above. The HQ login also still works to start one. Typed into the Settings tab
   like the HQ pair (rows added blank the first time this runs). While they are blank, only HQ can start. */
var LEAD_USER_LABEL = 'Lead login (starting a worksheet or reception center only): user name';
var LEAD_PASS_LABEL = 'Lead login: password';   // how long an HQ login lasts on one device

/* Inside the coded last column, next to the boxes, sits one extra entry under this name. It holds the
   bookkeeping for shared worksheets: r = how many times the worksheet has changed, k = the scrambled
   edit key, f = for each box, the change number at which it last changed. A box name can never be
   "#", so it cannot collide with a real box. */
var ESC_META = '#';
/* AUTO DELETE SWITCH (website v0.27.49, Sean Oct 17, 2026): OFF while the forms are being shown in meetings
   over several days, so the demo events stay. Nothing is erased by itself (Escalation, Reception Center,
   Daily Shelter Report with its 6409s, Offline SCIA) until this is true again. Manual erasing still works
   (Clear, Close shelter, "Entered into SCIA"). Turn back on before the forms go live (see WHERE WE LEFT OFF). */
var AUTO_DELETE = false;

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
  escTab_(); escLoginSettings_(); leadLoginSettings_();
  var id = escId_(d && d.id);
  return { ok: true, cleared: id ? escIsCleared_(id) : false };
}

function escLogin_(d) {
  var s = escLoginSettings_();
  if (!s.user || !s.pass) return { ok: false, login: true, locked: true, error: 'The HQ user name and password have not been set yet. The site admin sets them in the Google Sheet.' };
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
  if (!s.user || !s.pass) return { ok: false, login: true, locked: true, error: 'The HQ user name and password have not been set yet. The site admin sets them in the Google Sheet.' };
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
/* v0.27.58: does this edit key open this worksheet? Its own key (meta.k) or the second key (meta.k2) that
   escShareKey_ makes for a worksheet started before v0.27.28. */
function escKeyOk_(meta, id, key) { if (!key || !meta) return false; var m = escKeyMark_(id, key); return meta.k === m || (!!meta.k2 && meta.k2 === m); }
/* THE KEY HANDED TO A LEAD / HQ LOGIN ON ANOTHER DEVICE, or to someone HQ lets in (v0.27.58, Sean Oct 20: the
   older worksheets could not be opened with any login). Worksheets started before v0.27.28 never kept their
   real key (meta.e), so this makes a second key for them, once. Phones already on the worksheet keep theirs. */
function escShareKey_(sh, row, id) {
  var cell = sh.getRange(row, 7, 1, 1), w = escOpen_(cell.getValues()[0][0]), key = escKey_(w.meta.e);
  if (key) return key;
  key = Utilities.getUuid().replace(/-/g, '').slice(0, 24);
  w.meta.e = key; w.meta.k2 = escKeyMark_(id, key);
  var store = {};
  Object.keys(w.data).forEach(function (k) { store[k] = w.data[k]; });
  store[ESC_META] = w.meta;
  cell.setValues([[JSON.stringify(store)]]);
  return key;
}
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
  escPurge_();
  var id = escId_(d.id), key = escKey_(d.key);
  // HQ TYPING INTO A WORKSHEET (website v0.27.28): no edit key, but the HQ login. For example HQ on a
  // group call types the notes the lead reads out. HQ cannot start a worksheet this way, and is not
  // added to the "Who is on this worksheet" list.
  var hq = !key && !!d.token && !escDenied_(d);
  if (!id || (!key && !hq)) return { ok: false, nokey: true, hqLogin: !key && !!d.token, error: 'This link cannot open the worksheet.' };
  if (escIsCleared_(id)) return { ok: true, cleared: true };
  var sh = escTab_(), row = escFindRow_(sh, id), now = new Date();
  var changes = (d.changes && typeof d.changes === 'object') ? d.changes : {};
  var names = Object.keys(changes).filter(function (k) { return /^[a-z0-9_]{1,60}$/.test(k); });
  var since = Math.max(0, parseInt(d.since, 10) || 0);
  // Nothing saved yet and nothing to save: do not make an empty row (keeps HQ's list clean).
  if (!row && !names.length && !d.claim) return { ok: true, rev: 0, changed: {}, now: now.getTime() };
  // Since website v0.27.1 a worksheet must be STARTED first (escStart, HQ user name and password).
  if (!row) return hq ? { ok: false, error: 'That worksheet was not found.' } : { ok: false, needStart: true, error: 'Starting a worksheet needs the HQ user name and password.' };

  var w = row ? escOpen_(sh.getRange(row, 7, 1, 1).getValues()[0][0]) : { data: {}, meta: { r: 0, k: '', f: {} } };
  var adopt = !hq && !w.meta.k;                // a new worksheet, or one saved before v0.18: this key becomes its key
  if (adopt) w.meta.k = escKeyMark_(id, key);
  else if (!hq && !escKeyOk_(w.meta, id, key)) return { ok: false, nokey: true, error: 'This link cannot open the worksheet.' };

  // v0.27.28: keep the real edit key too (meta.e), so HQ can send a join link ("Add a responder" while
  // typing as HQ). Only an HQ login is ever given it back. Older worksheets pick it up on a team phone's next sync.
  var keyNew = !hq && w.meta.e !== key;
  if (keyNew) w.meta.e = key;
  var touched = false;
  names.forEach(function (k) {
    var v = clean_(changes[k], 4000);
    if ((w.data[k] || '') === v) return;       // already what is saved: not a change
    if (!touched) { touched = true; w.meta.r++; }
    if (v) w.data[k] = v; else delete w.data[k];
    w.meta.f[k] = w.meta.r;
  });

  if (touched || adopt || keyNew || !row) {
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
  var res = { ok: true, rev: w.meta.r, changed: out, now: now.getTime() };
  // Who is on this worksheet (website v0.27.3). What this phone typed was saved above even if it was removed.
  if (hq) { res.hq = true; res.joinKey = escKey_(w.meta.e) || escShareKey_(sh, row, id); return res; }     // v0.27.58: older worksheets too
  var me = rosterCheckIn_('esc', id, d, d.lead ? 'lead' : '');
  if (me && !me.removed && me.role === 'co-lead') res.coLead = true;     // made a lead by a lead or HQ (website v0.27.24)
  if (me && me.removed) { res.removed = true; res.where = clean_(String(w.data.incident_addresses || '').split('\n')[0], 80); }
  if (d.asks) { res.asks = askWaiting_('esc', id); res.roster = rosterPublic_('esc', id); }
  return res;
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
  store[ESC_META] = { r: 0, k: mark, f: {}, e: key };
  sh.appendRow([id, nowText, nowText, '', '', String(now.getTime()), JSON.stringify(store)]);
  return { ok: true };
}

// Read one worksheet back (the Scene Summary calls this every few seconds). HQ login, or since website
// v0.27.27 a LEAD of that worksheet (escLeadAuth_), so both forms work the same way for leads.
// hq in the answer tells the page whether to show the HQ-only parts (Clear, removing a lead).
function escGet_(d) {
  escPurge_();
  var id = escId_(d.id), hq = !!d.token && !escDenied_(d);
  if (!hq && !(id && escLeadAuth_(id, d))) {
    var denied = escDenied_(d);
    if (denied) return denied;
  }
  if (!id) return { ok: false, error: 'This worksheet link is not valid.' };
  var sh = escTab_(), row = escFindRow_(sh, id), now = new Date().getTime();
  if (!row) return { ok: true, found: false, cleared: escIsCleared_(id), now: now };
  var r = sh.getRange(row, 1, 1, ESC_HEADERS.length).getValues()[0], w = escOpen_(r[6]);
  var res = { ok: true, found: true, hq: hq, id: id, started: iso_(r[1]), updated: iso_(r[2]), ms: Number(escText_(r[5])) || 0, now: now, data: w.data,
    roster: rosterPublic_('esc', id), asks: askWaiting_('esc', id) };
  // v0.27.59: HQ can send the join link from the Scene Summary ("+ Add a responder"), as it already can from the worksheet
  if (hq) res.joinKey = escKey_(w.meta.e) || escShareKey_(sh, row, id);
  return res;
}
/* IS THIS PHONE A LEAD of this worksheet? (website v0.27.27) The worksheet's edit key (d.key, which every
   phone on it has) plus the phone's own code (d.me), marked "lead" or "co-lead" in the Responders tab. */
function escLeadAuth_(id, d) {
  var key = escKey_(d.key), dev = rosterDev_(d.me);
  if (!key || !dev) return false;
  var sh = escTab_(), row = escFindRow_(sh, id);
  if (!row || !escKeyOk_(escOpen_(sh.getRange(row, 7, 1, 1).getValues()[0][0]).meta, id, key)) return false;
  return rosterGet_('esc', id).some(function (x) { return x.dev === dev && !x.removed && (x.role === 'lead' || x.role === 'co-lead'); });
}

// The most recent worksheets, newest first. HQ login needed.
function escList_(d) {
  var denied = escDenied_(d);
  if (denied) return denied;
  escPurge_();
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
  var ac = askCounts_('esc'); items.forEach(function (it) { it.asking = ac[it.id] || 0; });     // v0.27.50
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
  escClearRow_(sh, row, id, stamp_());
  return { ok: true, cleared: true };
}
// Moves one worksheet to "Escalations cleared" (how = what goes in the Cleared column).
function escClearRow_(sh, row, id, how) {
  var r = sh.getRange(row, 1, 1, ESC_HEADERS.length).getValues()[0].map(function (v) { return v instanceof Date ? stamp_(v) : safe_(escText_(v)); });
  escClearedTab_().appendRow(r.concat([how]));
  sh.deleteRow(row);
  rosterDelete_('esc', id);
}

/* AUTOMATIC CLEAR AFTER 5 DAYS (website v0.27.32, Sean: in case HQ forgets). A worksheet with no change
   for ESC_KEEP_DAYS days is cleared exactly as if HQ had pressed Clear: it moves to "Escalations
   cleared", marked "automatic", and the phones on it go back to the Start screen. Runs at most once
   every 10 minutes, when someone opens a worksheet, the Scene Summary or the list. */
var ESC_KEEP_DAYS = 5;
function escPurge_(force) {
  if (!AUTO_DELETE) return;     // v0.27.49: off for the demos
  var cache = CacheService.getScriptCache();
  if (!force && cache.get('escPurged')) return;
  cache.put('escPurged', '1', 600);
  var sh = escTab_(), last = sh.getLastRow(), cutoff = Date.now() - ESC_KEEP_DAYS * 86400000;
  if (last < 2) return;
  var v = sh.getRange(2, 1, last - 1, 6).getValues();
  for (var i = v.length - 1; i >= 0; i--) {
    var id = escId_(v[i][0]), ms = Number(escText_(v[i][5])) || 0;
    if (id && ms && ms < cutoff) escClearRow_(sh, i + 2, id, stamp_() + ' (automatic, no changes for ' + ESC_KEEP_DAYS + ' days)');
  }
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
var REC_CENTER_HEADERS = ['ID', 'Started', 'Last intake', 'Center name or location', 'Lead', 'Intakes', 'Last activity ms (do not edit)', 'Join check (do not edit)', 'Lead check (do not edit)', 'Join code (do not edit)'];   // Join code since v0.27.49
var REC_INTAKE_HEADERS = ['Center ID', 'Intake ID', 'Saved', 'Responder', 'Name', 'Address', 'Unit', 'Phone', 'Alternate contact',
  'Adults', 'Children', 'Pets', 'Pets with them', 'Safe place tonight', 'Where', 'Would stay in a shelter', 'Immediate needs', 'Other concerns or needs',
  'Last edited', 'Edited by',       // added in website v0.27.7 (Edit button)
  'DDA', 'DDA set', 'DDA set by'];   // added in website v0.27.8 (DDA button)
var REC_DDA_OPTIONS = ['Destroyed', 'Major', 'Uninhabitable'];   // plus "Other", which can have a description
/* The intake boxes the website sends, in the same order as the columns after "Responder", with the
   longest text each may hold. */
var REC_FIELDS = [['name', 120], ['address', 200], ['unit', 40], ['phone', 60], ['alt', 200], ['adults', 4], ['children', 4],
  ['pets', 200], ['pets_with', 20], ['safe', 20], ['safe_where', 200], ['shelter', 20], ['needs', 1000], ['concerns', 2000]];
var REC_KEEP_DAYS = 5;

function recCenters_() { makeTab_('Reception Centers', REC_CENTER_HEADERS); return tab_('Reception Centers'); }
function recIntakes_() {
  makeTab_('Reception Intakes', REC_INTAKE_HEADERS);
  var sh = tab_('Reception Intakes'), n = REC_INTAKE_HEADERS.length;
  // A tab made before v0.27.7 / v0.27.8 is missing the newer columns at the end: add their headings.
  if (sh.getLastColumn() < n) {
    var have = sh.getLastColumn();
    sh.getRange(1, have + 1, 1, n - have).setValues([REC_INTAKE_HEADERS.slice(have)]).setFontWeight('bold');
    sh.getRange(1, have + 1, 1000, n - have).setNumberFormat('@');
  }
  return sh;
}
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
  rosterDelete_('rec', id);
  evLogDelete_('rec', id);     // v0.27.56: the center's running log goes with it
}

/* The 5-day automatic delete. Also removes intakes whose center is gone (a row deleted by hand). */
function recPurge_(force) {
  if (!AUTO_DELETE) return;     // v0.27.49: off for the demos
  // v0.27.32: at most once every 10 minutes (it is now also run when phones check in); the nightly run always goes
  var cache = CacheService.getScriptCache();
  if (!force && cache.get('recPurged')) return;
  cache.put('recPurged', '1', 600);
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

/* IS THIS PHONE A LEAD of this center? (website v0.27.24) Either the phone that started it (it holds the
   lead key, d.leadKey) or a phone a lead or HQ made a lead with "Add a lead": it proves itself with the
   join key (d.key) plus its own phone code (d.me), which the Responders tab marks "co-lead".
   Returns null when the center is not there, otherwise { c: the center, ok: true/false, who: name }. */
function recLeadAuth_(id, d) {
  var c = recCenter_(id, escKey_(d.leadKey), 'lead');
  if (!c) return null;
  if (c.ok) return { c: c, ok: true, who: escText_(c.r[4]) };
  var dev = rosterDev_(d.me), key = escKey_(d.key);
  if (dev && key && escText_(c.r[7]) === recMark_('join', id, key)) {
    var me = rosterGet_('rec', id).filter(function (x) { return x.dev === dev && !x.removed && x.role === 'co-lead'; })[0];
    if (me) return { c: c, ok: true, who: me.name || 'Lead' };
  }
  return { c: c, ok: false };
}
// The names of everyone leading a center: the one who started it, then any added leads.
function recLeadNames_(id, c) {
  var names = [escText_(c.r[4])].filter(String);
  rosterPublic_('rec', id).forEach(function (x) { if (x.role === 'co-lead' && x.name && names.indexOf(x.name) < 0) names.push(x.name); });
  return names.join(', ');
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
    recMark_('join', id, key), recMark_('lead', id, lead), key]);
  return { ok: true };
}

/* Who may become a lead (Reception Center Form and Escalation Form, website v0.27): a device logged in
   as HQ, or someone who types the HQ user name and password. Returns null when allowed. */
function leadDenied_(d) {
  if (d.token && !escDenied_(d)) return null;
  var s = escLoginSettings_(), l = leadLoginSettings_();    // also make sure the login rows exist in Settings
  var hqSet = !!(s.user && s.pass), leadSet = !!(l.user && l.pass);
  if (!hqSet && !leadSet) return { ok: false, leadLogin: true, locked: true, error: 'The lead user name and password have not been set yet. The site admin sets them in the Google Sheet.' };
  if (d.user == null && d.password == null) return { ok: false, leadLogin: true, error: '' };
  if (tooManyTries_('lead-start')) return { ok: false, leadLogin: true, error: 'Too many tries. Please wait 15 minutes and try again.' };
  var user = clean_(d.user, 60).toLowerCase(), pw = String(d.password || '');
  // The lead login, or (as before) the HQ login.
  if (leadSet && user === l.user.toLowerCase() && pw === l.pass) return null;
  if (hqSet && user === s.user.toLowerCase() && pw === s.pass) return null;
  noteFail_('lead-start');
  return { ok: false, leadLogin: true, error: 'That user name and password do not match.' };
}
/* The lead user name and password from the Settings tab (rows added blank the first time). */
function leadLoginSettings_() {
  var sh = tab_('Settings'), data = sh.getDataRange().getValues(), out = { user: '', pass: '' }, seenUser = false, seenPass = false;
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === LEAD_USER_LABEL) { seenUser = true; out.user = escText_(data[i][1]).trim(); }
    if (String(data[i][0]).trim() === LEAD_PASS_LABEL) { seenPass = true; out.pass = escText_(data[i][1]); }
  }
  if (!seenUser) sh.appendRow([LEAD_USER_LABEL, '']);
  if (!seenPass) sh.appendRow([LEAD_PASS_LABEL, '']);
  return out;
}

// A phone checks in: is its center still open? (Joined phones ask this now and then.)
function recPing_(d) {
  recPurge_();
  var id = escId_(d.id), key = escKey_(d.key);
  if (!id) return { ok: false, error: 'Not a valid reception center.' };
  if (recIsCleared_(id)) return { ok: true, cleared: true };
  var c = recCenter_(id, key, 'join');
  if (!c) return { ok: true, found: false };
  if (!c.ok) return { ok: false, nokey: true, error: 'This link cannot open the reception center.' };
  if (!escText_(c.r[9])) recCenters_().getRange(c.row, 10, 1, 1).setValues([[key]]);     // v0.27.49: centers started before then
  var lc = d.leadKey ? recCenter_(id, escKey_(d.leadKey), 'lead') : null;
  var me = rosterCheckIn_('rec', id, d, lc && lc.ok ? 'lead' : '');
  return { ok: true, found: true, center: escText_(c.r[3]), lead: recLeadNames_(id, c), removed: !!(me && me.removed),
    coLead: !!(me && !me.removed && me.role === 'co-lead') };
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
  var me = rosterCheckIn_('rec', id, d, '');      // a removed phone's last intakes are still kept (website v0.27.3)
  return { ok: true, removed: !!(me && me.removed) };
}

// The summary of one center: the lead (with the lead key) or HQ (logged in).
function recGet_(d) {
  recPurge_();
  var id = escId_(d.id);
  if (!id) return { ok: false, error: 'This reception center link is not valid.' };
  var a = recLeadAuth_(id, d), c = a && a.c;
  // hq: is this an HQ login? The page shows Download for Excel only to HQ (website v0.27.26: leads never export).
  var hq = !!d.token && !escDenied_(d);
  if (!(a && a.ok) && !hq) {
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
      o.edited = r[4 + REC_FIELDS.length] ? iso_(r[4 + REC_FIELDS.length]) : '';
      o.edited_by = escText_(r[5 + REC_FIELDS.length]);
      o.dda = escText_(r[6 + REC_FIELDS.length]);
      o.dda_set = r[7 + REC_FIELDS.length] ? iso_(r[7 + REC_FIELDS.length]) : '';
      o.dda_by = escText_(r[8 + REC_FIELDS.length]);
      items.push(o);
    });
  }
  var res = { ok: true, found: true, hq: hq, id: id, center: escText_(c.r[3]), lead: recLeadNames_(id, c), started: iso_(c.r[1]),
    ms: Number(escText_(c.r[6])) || 0, keepDays: REC_KEEP_DAYS, now: now, items: items, roster: rosterPublic_('rec', id), asks: askWaiting_('rec', id) };
  if (hq) res.joinKey = escKey_(c.r[9]);     // v0.27.59: HQ can send the join link from the Summary ("+ Add a responder")
  return res;
}

/* EDIT ONE INTAKE (website v0.27.7). The lead (with the lead key) or HQ (logged in) corrects an intake
   from the summary page. The responder's name and the time it was saved stay as they were; the row is
   marked "Last edited" and "Edited by" (the lead's name, or HQ). Last save wins if two people edit
   the same intake at once. */
function recEdit_(d) {
  var id = escId_(d.id), iid = escId_(d.iid), it = (d.intake && typeof d.intake === 'object') ? d.intake : {};
  if (!id || !iid) return { ok: false, error: 'This intake could not be found.' };
  var a = recLeadAuth_(id, d), c = a && a.c, who;
  if (a && a.ok) who = a.who + ' (lead)';
  else {
    var denied = escDenied_(d);
    if (denied) return denied;
    who = 'HQ';
  }
  if (!c) return { ok: false, gone: true, error: 'This reception center was closed.' };
  if (!clean_(it.name, 120)) return { ok: false, error: 'Please enter a name.' };
  var row = recIntakeRow_(id, iid);
  if (!row) return { ok: false, gone: true, error: 'This intake is no longer there (it may have been deleted).' };
  var vals = REC_FIELDS.map(function (f) { return safe_(clean_(it[f[0]], f[1])); });
  vals.push(stamp_(new Date()), who);
  recIntakes_().getRange(row, 5, 1, vals.length).setValues([vals]);
  return { ok: true };
}

/* DDA FOR ONE INTAKE (website v0.27.8). Detailed Damage Assessment of the client's home, set by the lead
   (with the lead key) or HQ (logged in) from the summary page. Tick all that apply: Destroyed, Major,
   Uninhabitable, Other (with an optional description). Saved as one line of text in the "DDA" column,
   always in that order, e.g. "Major, Uninhabitable" or "Other: smoke damage". Ticking nothing clears it. */
function recDda_(d) {
  var id = escId_(d.id), iid = escId_(d.iid);
  if (!id || !iid) return { ok: false, error: 'This intake could not be found.' };
  var a = recLeadAuth_(id, d), c = a && a.c, who;
  if (a && a.ok) who = a.who + ' (lead)';
  else {
    var denied = escDenied_(d);
    if (denied) return denied;
    who = 'HQ';
  }
  if (!c) return { ok: false, gone: true, error: 'This reception center was closed.' };
  var picks = Array.isArray(d.picks) ? d.picks.map(String) : [], parts = [];
  REC_DDA_OPTIONS.forEach(function (o) { if (picks.indexOf(o) >= 0) parts.push(o); });
  if (picks.indexOf('Other') >= 0) {
    var other = clean_(d.other, 200).replace(/\s+/g, ' ');
    parts.push(other ? 'Other: ' + other : 'Other');
  }
  var row = recIntakeRow_(id, iid);
  if (!row) return { ok: false, gone: true, error: 'This intake is no longer there (it may have been deleted).' };
  var text = parts.join(', ');
  recIntakes_().getRange(row, 7 + REC_FIELDS.length, 1, 3).setValues([[safe_(text), text ? stamp_(new Date()) : '', text ? who : '']]);
  return { ok: true };
}

/* DELETE ONE INTAKE (website v0.27.7). HQ only (logged in), e.g. the same family taken in twice. It is
   deleted for good, like a cleared center, and the center's intake count goes down by one. */
function recDeleteOne_(d) {
  var denied = escDenied_(d);
  if (denied) return denied;
  var id = escId_(d.id), iid = escId_(d.iid);
  if (!id || !iid) return { ok: false, error: 'This intake could not be found.' };
  var row = recIntakeRow_(id, iid);
  if (!row) return { ok: true, gone: true };
  recIntakes_().deleteRow(row);
  var csh = recCenters_(), cr = escFindRow_(csh, id);
  if (cr) {
    var cell = csh.getRange(cr, 6), n = (parseInt(escText_(cell.getValue()), 10) || 0) - 1;
    cell.setValue(String(Math.max(0, n)));
  }
  return { ok: true };
}

// The Sheet row of one intake (0 if it is not there).
function recIntakeRow_(id, iid) {
  var ish = recIntakes_(), last = ish.getLastRow();
  if (last < 2) return 0;
  var v = ish.getRange(2, 1, last - 1, 2).getValues();
  for (var i = 0; i < v.length; i++) if (String(v[i][0]) === id && String(v[i][1]) === iid) return i + 2;
  return 0;
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
  var ac = askCounts_('rec'); items.forEach(function (it) { it.asking = ac[it.id] || 0; });     // v0.27.50
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


/* =========================================================
   ASK TO JOIN (website v0.27.2): Escalation Form and Reception Center Form
   A responder who does not know who the lead is (or whose lead is busy, or a training exercise run
   remotely) picks the event from a list of open ones and asks to join. The lead's phone shows
   "Bob Jones is asking to join" with Approve and Decline. Approve hands the join link to the
   responder's page, which joins by itself. Nobody sees anything inside an event until approved.
   The list of open events shows only when it started, the lead's name and (Reception) the center
   name: never addresses or anything typed into the forms.
   Requests are kept for 6 hours in the script's short-term memory (not in the Sheet), then vanish.
   ========================================================= */
var ASK_SECS = 21600, ASK_MAX = 30, ASK_OPEN_DAYS = 30;     // v0.27.49: 30 days (was 2), so demo events stay listed
function askForm_(f) { return f === 'esc' || f === 'rec' || f === 'sh' ? f : ''; }     // 'sh' (shelters) since v0.27.49
function askCacheKey_(form, id) { return 'ask:' + form + ':' + id; }
// v0.27.50 (Sean: requests sit on the lead's and HQ's phones until someone deals with them): kept in the
// Sheet's "Join requests" tab instead of the script's 6-hour memory. Answered requests are dropped after 2 days.
function askTab_() { makeTab_('Join requests', ['Form', 'Event ID', 'Requests (do not edit)']); return tab_('Join requests'); }
function askRow_(form, id) {
  var sh = askTab_(), last = sh.getLastRow();
  if (last < 2) return 0;
  var v = sh.getRange(2, 1, last - 1, 2).getValues();
  for (var i = 0; i < v.length; i++) if (String(v[i][0]) === form && String(v[i][1]) === id) return i + 2;
  return 0;
}
function askGet_(form, id) {
  var row = askRow_(form, id); if (!row) return [];
  try { return JSON.parse(escText_(askTab_().getRange(row, 3, 1, 1).getValues()[0][0]) || '[]') || []; } catch (e) { return []; }
}
function askPut_(form, id, list) {
  var cut = Date.now() - 2 * 86400000;
  list = list.filter(function (a) { return a.status === 'waiting' || (a.done || a.at) > cut; });
  var sh = askTab_(), row = askRow_(form, id), text = JSON.stringify(list);
  if (row) sh.getRange(row, 3, 1, 1).setValues([[text]]); else sh.appendRow([form, id, text]);
}
// How many are waiting, for every event of one form (for the HQ lists).
function askCounts_(form) {
  var out = {}, sh = askTab_(), last = sh.getLastRow();
  if (last < 2) return out;
  sh.getRange(2, 1, last - 1, 3).getValues().forEach(function (r) {
    if (String(r[0]) !== form) return;
    try { out[String(r[1])] = (JSON.parse(escText_(r[2]) || '[]') || []).filter(function (a) { return a.status === 'waiting'; }).length; } catch (e) {}
  });
  return out;
}
// What the lead's phone sees: requests still waiting (no tickets, no keys).
function askWaiting_(form, id) {
  return askGet_(form, id).filter(function (a) { return a.status === 'waiting'; })
    .map(function (a) { return { rid: a.rid, name: a.name, phone: a.phone, at: a.at }; });
}

// PUBLIC: the open events a responder can ask to join.
function askList_(d) {
  var form = askForm_(d.form), cutoff = Date.now() - ASK_OPEN_DAYS * 86400000, out = [];
  if (form === 'esc') {
    var sh = escTab_(), last = sh.getLastRow();
    if (last >= 2) sh.getRange(2, 1, last - 1, 7).getValues().forEach(function (r) {
      var id = escId_(r[0]), ms = Number(escText_(r[5])) || 0;
      if (!id || ms < cutoff) return;
      var w = escOpen_(r[6]);
      if (!w.meta.k) return;
      out.push({ id: id, started: iso_(r[1]), lead: clean_(String(w.data.leaders_arc_lead_1 || '').split('\n')[0], 60), ms: ms });
    });
  } else if (form === 'rec') {
    recPurge_();
    var csh = recCenters_(), lastc = csh.getLastRow();
    if (lastc >= 2) csh.getRange(2, 1, lastc - 1, 7).getValues().forEach(function (r) {
      var id = escId_(r[0]), ms = Number(escText_(r[6])) || 0;
      if (!id || ms < cutoff) return;
      out.push({ id: id, started: iso_(r[1]), lead: escText_(r[4]), center: escText_(r[3]), ms: ms });
    });
  } else return { ok: false, error: 'Unknown form.' };
  out.sort(function (a, b) { return b.ms - a.ms; });
  out.forEach(function (o) { delete o.ms; });
  return { ok: true, items: out.slice(0, 25) };
}

// PUBLIC: a responder asks to join. d.ticket is a secret their own page made, used to collect the answer.
function askJoin_(d) {
  var form = askForm_(d.form), id = escId_(d.id), ticket = escKey_(d.ticket);
  var name = clean_(d.name, 60).replace(/\s+/g, ' '), phone = clean_(d.phone, 30);
  if (!form || !id || !ticket) return { ok: false, error: 'This request could not be sent.' };
  if (!name) return { ok: false, error: 'Please enter your name.' };
  var open = form === 'esc' ? escFindRow_(escTab_(), id) && !escIsCleared_(id) : form === 'rec' ? escFindRow_(recCenters_(), id) && !recIsCleared_(id)
    : escFindRow_(shTab_(), id) && !shIsClosed_(id);
  if (!open) return { ok: false, gone: true, error: 'That event is no longer open. Pick another, or ask your lead for the link.' };
  var list = askGet_(form, id);
  if (list.filter(function (a) { return a.status === 'waiting'; }).length >= ASK_MAX) return { ok: false, error: 'Too many requests are waiting. Please ask your lead directly.' };
  var rid = Utilities.getUuid().replace(/-/g, '').slice(0, 12);
  list.push({ rid: rid, ticket: hash_('ask', ticket), name: safe_(name), phone: safe_(phone), at: Date.now(), status: 'waiting', key: '' });
  askPut_(form, id, list);
  return { ok: true, rid: rid };
}

// PUBLIC (with the ticket): has the lead answered?
function askStatus_(d) {
  var form = askForm_(d.form), id = escId_(d.id), ticket = escKey_(d.ticket), rid = String(d.rid || '');
  if (!form || !id || !ticket) return { ok: false, error: 'Bad request.' };
  var a = askGet_(form, id).filter(function (x) { return x.rid === rid && x.ticket === hash_('ask', ticket); })[0];
  if (!a) return { ok: true, status: 'gone' };
  return a.status === 'approved' ? { ok: true, status: 'approved', key: a.key } : { ok: true, status: a.status };
}

// THE LEAD answers: d.yes true = approve (hands over the join key), false = decline.
// Escalation: proven with the worksheet's edit key. Reception: proven with the lead key, plus the join key to hand over.
function askAnswer_(d) {
  var form = askForm_(d.form), id = escId_(d.id), rid = String(d.rid || ''), give = '';
  var hqAns = !!d.token && !escDenied_(d);      // v0.27.50: HQ can let people in too (Sean: roles swap, people get called away)
  if (form === 'esc') {
    var key = escKey_(d.key), sh = escTab_(), row = escFindRow_(sh, id);
    if (!row || (!key && !hqAns)) return { ok: false, error: 'Not allowed.' };
    var w = escOpen_(sh.getRange(row, 7, 1, 1).getValues()[0][0]);
    if (hqAns && !escKeyOk_(w.meta, id, key)) key = escShareKey_(sh, row, id);     // v0.27.58: older worksheets too
    else if (!escKeyOk_(w.meta, id, key)) return { ok: false, error: 'Not allowed.' };
    give = key;
  } else if (form === 'rec') {
    if (hqAns) {
      var csh = recCenters_(), crow = escFindRow_(csh, id);
      give = crow ? escKey_(csh.getRange(crow, 10, 1, 1).getValues()[0][0]) : '';
      if (!give) return { ok: false, error: 'This center needs one of its phones to check in first.' };
    } else {
      var lead = recLeadAuth_(id, d), join = recCenter_(id, escKey_(d.key), 'join');
      if (!lead || !lead.ok || !join || !join.ok) return { ok: false, error: 'Only the lead or HQ can answer requests.' };
      give = escKey_(d.key);
    }
  } else if (form === 'sh') {
    // v0.27.49: any CURRENT supervisor of the shelter (its link code + a listed name) or HQ lets people in.
    var a = shAccess_(d);
    if (a.err || !(a.hq || shListed_(a.id, d.me))) return { ok: false, error: 'Only the shelter\'s supervisors or HQ can let people in.' };
    give = escText_(a.r[7]);
    if (d.yes) askGet_('sh', id).forEach(function (x) {
      if (x.rid === rid && x.status === 'waiting') shAddSup_({ id: id, key: give, me: d.me, token: d.token, name: escText_(x.name), self: false });
    });
  } else return { ok: false, error: 'Unknown form.' };
  var list = askGet_(form, id), found = false;
  list.forEach(function (a) { if (a.rid === rid && a.status === 'waiting') { found = true; a.status = d.yes ? 'approved' : 'declined'; a.key = d.yes ? give : ''; a.done = Date.now(); } });
  askPut_(form, id, list);
  return { ok: true, found: found, asks: askWaiting_(form, id) };
}

// Reception lead's phone checks for requests (proven with the lead key).
function recAsks_(d) {
  var id = escId_(d.id), c = recLeadAuth_(id, d);
  if (!c || !c.ok) return { ok: false, error: 'Only the lead can see requests.' };
  return { ok: true, asks: askWaiting_('rec', id), roster: rosterPublic_('rec', id) };
}


/* =========================================================
   WHO IS ON AN EVENT, AND REMOVING A RESPONDER (website v0.27.3)
   Both forms. Every phone on a worksheet or reception center checks in with a name now and then,
   so the lead and HQ see who is on it and can REMOVE someone: for example, on a big scene, to free a
   supervisor to go start a second reception center. What the removed person already entered STAYS.
   Their phone finishes sending anything it was holding, then says "You have been removed from ..."
   and offers to start a new one. They can be let back in later (a new join link, or Ask to join).
   Tab "Responders": one row per phone per event. Typing YES in "Removed" removes someone by hand.
   Rows are deleted when the event is cleared.
   ========================================================= */
var ROSTER_HEADERS = ['Form', 'Event ID', 'Device (do not edit)', 'Name', 'Role', 'First seen', 'Last seen', 'Removed (type YES)', 'Removed by'];
var ROSTER_CACHE_SECS = 60;     // hand edits in the tab show within a minute
var ROSTER_SEEN_SECS = 120;     // "last seen" is written at most every 2 minutes per phone
/* =========================================================
   RUNNING LOG ON THE ESCALATION AND RECEPTION CENTER FORMS (website v0.27.56, Sean Oct 20, 2026)
   The same running log as the Daily Shelter Report: type what happened, Add to the log, and the entry
   is stamped with the time and the person's name. Entries can be flagged (red, at the top until someone
   removes the flag). HQ can edit or remove an entry (it stays, marked as edited or removed by HQ).
   No midnight rollover: the log covers the whole event.
   WHO MAY USE IT: anyone on the event (any phone with the worksheet's or center's link code, the lead,
   added leads) and HQ (logged in).
   Every entry is one row in the tab "Event Log". When HQ closes a reception center its log is deleted
   with it (client details are never kept). A cleared escalation worksheet keeps its log, like the
   copy of the worksheet itself in "Escalations cleared".
   ========================================================= */
var EV_LOG_HEADERS = ['Form', 'Event ID', 'Entry ID', 'Saved', 'By', 'Entry', 'Edited', 'Flagged'];
function evLogTab_() { makeTab_('Event Log', EV_LOG_HEADERS); return tab_('Event Log'); }
function evForm_(f) { return f === 'esc' || f === 'rec' ? f : ''; }
function evRevKey_(form, id) { return 'evlog:' + form + ':' + id; }
// A number that changes whenever the event's log changes, so phones checking every few seconds get "same" cheaply.
function evRev_(form, id) {
  var c = CacheService.getScriptCache(), k = evRevKey_(form, id), v = c.get(k);
  if (!v) { v = String(Date.now()); c.put(k, v, 21600); }
  return v;
}
function evTouch_(form, id) { var v = String(Date.now()); CacheService.getScriptCache().put(evRevKey_(form, id), v, 21600); return v; }

/* May this request use this event's log? Returns { form, id, hq, key } or { err }. */
function evAccess_(d) {
  var form = evForm_(d.form), id = escId_(d.id);
  if (!form || !id) return { err: { ok: false, error: 'This log cannot be opened.' } };
  var hq = !!d.token && !escDenied_(d);
  if (form === 'esc') {
    if (escIsCleared_(id)) return { err: { ok: true, cleared: true } };
    var sh = escTab_(), row = escFindRow_(sh, id);
    if (!row) return { err: { ok: false, gone: true, error: 'That worksheet was not found.' } };
    var key = escKey_(d.key);
    var keyOk = escKeyOk_(escOpen_(sh.getRange(row, 7, 1, 1).getValues()[0][0]).meta, id, key);
    if (!keyOk && !hq) return { err: { ok: false, nokey: true, login: !!d.token, error: 'This link cannot open the log.' } };
    return { form: form, id: id, hq: hq, key: keyOk };
  }
  if (recIsCleared_(id)) return { err: { ok: true, cleared: true } };
  var j = recCenter_(id, escKey_(d.key), 'join');
  if (!j) return { err: { ok: false, gone: true, error: 'That reception center was not found.' } };
  var l = recCenter_(id, escKey_(d.leadKey), 'lead');
  var ok = j.ok || (l && l.ok);
  if (!ok && !hq) return { err: { ok: false, nokey: true, login: !!d.token, error: 'This link cannot open the log.' } };
  return { form: form, id: id, hq: hq, key: ok };
}
// The name an entry is marked with: HQ when HQ is using it as HQ, otherwise the person's name.
function evWho_(a, d) {
  if (a.hq && (d.asHq || !a.key)) return 'HQ';
  var name = clean_(d.who, 60).replace(/\s+/g, ' ');
  if (name) return name;
  var dev = rosterDev_(d.me || d.dev);
  if (dev) { var me = rosterGet_(a.form, a.id).filter(function (x) { return x.dev === dev; })[0]; if (me && me.name) return me.name; }
  return 'A responder';
}
function evLogFor_(form, id) {
  var sh = evLogTab_(), last = sh.getLastRow(), out = [];
  if (last >= 2) sh.getRange(2, 1, last - 1, EV_LOG_HEADERS.length).getValues().forEach(function (r) {
    if (String(r[0]) !== form || String(r[1]) !== id) return;
    out.push({ id: String(r[2]), at: iso_(r[3]), by: escText_(r[4]), text: escText_(r[5]), edited: escText_(r[6]), flag: escText_(r[7]) });
  });
  return out;
}
function evFindRow_(form, id, eid) {
  var sh = evLogTab_(), last = sh.getLastRow();
  if (last < 2) return 0;
  var v = sh.getRange(2, 1, last - 1, 3).getValues();
  for (var i = 0; i < v.length; i++) if (String(v[i][0]) === form && String(v[i][1]) === id && String(v[i][2]) === eid) return i + 2;
  return 0;
}

// THE CALL THE PAGE MAKES EVERY FEW SECONDS. d.since = the rev the page already has.
function evLogGet_(d) {
  var a = evAccess_(d); if (a.err) return a.err;
  var rev = evRev_(a.form, a.id);
  if (d.since && String(d.since) === rev) return { ok: true, same: true, rev: rev, hq: a.hq };
  return { ok: true, rev: rev, hq: a.hq, log: evLogFor_(a.form, a.id), photos: evPhotosFor_(a.form, a.id) };
}
// Add an entry.
function evLog_(d) {
  var a = evAccess_(d); if (a.err) return a.err;
  var text = clean_(d.text, 3000);
  if (!text) return { ok: false, error: 'Please type something first.' };
  var now = new Date(), who = evWho_(a, d), eid = 'L' + now.getTime().toString(36) + Math.floor(Math.random() * 1296).toString(36);
  var flag = d.flag ? safe_('Flagged by ' + who + ' ' + stamp_(now)) : '';
  evLogTab_().appendRow([a.form, a.id, eid, stamp_(now), safe_(who), safe_(text), '', flag]);
  return { ok: true, rev: evTouch_(a.form, a.id) };
}
// Flag or unflag an entry. Anyone on the event may.
function evLogFlag_(d) {
  var a = evAccess_(d); if (a.err) return a.err;
  var row = evFindRow_(a.form, a.id, String(d.entry || ''));
  if (!row) return { ok: false, error: 'That entry was not found.' };
  evLogTab_().getRange(row, 8, 1, 1).setValues([[d.flag ? safe_('Flagged by ' + evWho_(a, d) + ' ' + stamp_()) : '']]);
  return { ok: true, rev: evTouch_(a.form, a.id) };
}
// HQ only: change or remove (empty text) an entry. It stays, marked as edited or removed by HQ.
function evLogEdit_(d) {
  var a = evAccess_(d); if (a.err) return a.err;
  if (!a.hq) return { ok: false, login: true, error: 'Only HQ can edit the log. Please log in as HQ.' };
  var row = evFindRow_(a.form, a.id, String(d.entry || ''));
  if (!row) return { ok: false, error: 'That entry was not found.' };
  var text = clean_(d.text, 3000);
  evLogTab_().getRange(row, 6, 1, 2).setValues([[safe_(text), (text ? 'Edited by HQ ' : 'Removed by HQ ') + stamp_()]]);
  return { ok: true, rev: evTouch_(a.form, a.id) };
}
// Deletes one event's whole log (a reception center closed by HQ or deleted automatically).
function evLogDelete_(form, id) {
  var sh = tab_('Event Log');
  if (!sh) return;
  var last = sh.getLastRow();
  if (last < 2) return;
  var v = sh.getRange(2, 1, last - 1, 2).getValues();
  for (var i = v.length - 1; i >= 0; i--) if (String(v[i][0]) === form && String(v[i][1]) === id) sh.deleteRow(i + 2);
  evPhotosDelete_(form, id);
  evTouch_(form, id);
}

/* PHOTOS (website v0.27.56, Sean Oct 20, 2026). "Add photo" at the bottom of the Escalation and Reception
   Center forms; the photos never show inside the form, only a "See photos (2)" button that opens them.
   Same people as the running log. The phone shrinks each photo first (longest side 1600 pixels, JPEG).
   Each photo is a file in the Drive folder "SEPA Event Photos" (sepalibrary account), NOT shared with
   anyone: the forms fetch it through this script, so only people on the event and HQ can see it.
   One row per photo in the tab "Event Photos". HQ can remove a photo (the file goes to the Drive trash).
   Closing a reception center deletes its photos too; a cleared escalation worksheet keeps them. */
var EV_PHOTO_HEADERS = ['Form', 'Event ID', 'Photo ID', 'Saved', 'By', 'Drive file (do not edit)', 'Removed'];
var EV_PHOTO_FOLDER = 'SEPA Event Photos';
var EV_PHOTO_MAX = 30;      // per event
function evPhotoTab_() { makeTab_('Event Photos', EV_PHOTO_HEADERS); return tab_('Event Photos'); }
function evPhotoFolder_() {
  var props = PropertiesService.getScriptProperties(), id = props.getProperty('eventPhotoFolder');
  if (id) { try { var f = DriveApp.getFolderById(id); if (!f.isTrashed()) return f; } catch (e) {} }
  var f2 = DriveApp.createFolder(EV_PHOTO_FOLDER);
  props.setProperty('eventPhotoFolder', f2.getId());
  return f2;
}
function evPhotoRows_(form, id) {
  var sh = evPhotoTab_(), last = sh.getLastRow(), out = [];
  if (last >= 2) sh.getRange(2, 1, last - 1, EV_PHOTO_HEADERS.length).getValues().forEach(function (r, i) {
    if (String(r[0]) === form && String(r[1]) === id && !escText_(r[6])) out.push({ row: i + 2, id: String(r[2]), at: iso_(r[3]), by: escText_(r[4]), file: String(r[5]) });
  });
  return out;
}
function evPhotosFor_(form, id) {
  if (!tab_('Event Photos')) return [];
  return evPhotoRows_(form, id).map(function (x) { return { id: x.id, at: x.at, by: x.by }; });
}
// One photo, as a JPEG the phone already shrank.
function evPhotoAdd_(d) {
  var a = evAccess_(d); if (a.err) return a.err;
  if (evPhotoRows_(a.form, a.id).length >= EV_PHOTO_MAX) return { ok: false, error: 'This event already has ' + EV_PHOTO_MAX + ' photos, the most it can hold.' };
  var data = String(d.data || '').replace(/^data:image\/jpeg;base64,/, '');
  if (!/^[A-Za-z0-9+\/=]+$/.test(data)) return { ok: false, error: 'That photo could not be read.' };
  var bytes = Utilities.base64Decode(data);
  if (bytes.length > FORUM_PHOTO_MAX_BYTES) return { ok: false, error: 'That photo is too large.' };
  var now = new Date(), who = evWho_(a, d), pid = 'P' + now.getTime().toString(36) + Math.floor(Math.random() * 1296).toString(36);
  var file = evPhotoFolder_().createFile(Utilities.newBlob(bytes, 'image/jpeg', a.form + '-' + a.id + '-' + stamp_(now).replace(/\D/g, '') + '.jpg'));
  evPhotoTab_().appendRow([a.form, a.id, pid, stamp_(now), safe_(who), file.getId(), '']);
  return { ok: true, rev: evTouch_(a.form, a.id), photo: pid };
}
// Hands one photo back to a phone on the event (or HQ), as a data address the page can show.
function evPhotoGet_(d) {
  var a = evAccess_(d); if (a.err) return a.err;
  var x = evPhotoRows_(a.form, a.id).filter(function (p) { return p.id === String(d.photo || ''); })[0];
  if (!x) return { ok: false, error: 'That photo was not found.' };
  try { return { ok: true, src: 'data:image/jpeg;base64,' + Utilities.base64Encode(DriveApp.getFileById(x.file).getBlob().getBytes()) }; }
  catch (e) { return { ok: false, error: 'That photo could not be opened.' }; }
}
// HQ only: remove a photo. The row stays, marked removed; the file goes to the Drive trash.
function evPhotoRemove_(d) {
  var a = evAccess_(d); if (a.err) return a.err;
  if (!a.hq) return { ok: false, login: true, error: 'Only HQ can remove a photo. Please log in as HQ.' };
  var x = evPhotoRows_(a.form, a.id).filter(function (p) { return p.id === String(d.photo || ''); })[0];
  if (!x) return { ok: false, error: 'That photo was not found.' };
  try { DriveApp.getFileById(x.file).setTrashed(true); } catch (e) {}
  evPhotoTab_().getRange(x.row, 7, 1, 1).setValues([['Removed by HQ ' + stamp_()]]);
  return { ok: true, rev: evTouch_(a.form, a.id) };
}
// A reception center closed: its photos are deleted (files to the Drive trash, rows removed).
function evPhotosDelete_(form, id) {
  var sh = tab_('Event Photos');
  if (!sh) return;
  var last = sh.getLastRow();
  if (last < 2) return;
  var v = sh.getRange(2, 1, last - 1, 6).getValues();
  for (var i = v.length - 1; i >= 0; i--) {
    if (String(v[i][0]) !== form || String(v[i][1]) !== id) continue;
    try { DriveApp.getFileById(String(v[i][5])).setTrashed(true); } catch (e) {}
    sh.deleteRow(i + 2);
  }
}

function rosterTab_() { makeTab_('Responders', ROSTER_HEADERS); return tab_('Responders'); }
function rosterDev_(v) { v = String(v || ''); return /^[A-Za-z0-9]{12,40}$/.test(v) ? v : ''; }
function rosterMs_(v) {
  if (v instanceof Date) return v.getTime();
  var m = /^(\d{4})-(\d\d)-(\d\d)[ T](\d\d):(\d\d):?(\d\d)?/.exec(String(v || ''));
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +(m[6] || 0)).getTime() : 0;
}
function rosterRows_(form, id) {
  var sh = rosterTab_(), last = sh.getLastRow(), out = [];
  if (last >= 2) sh.getRange(2, 1, last - 1, ROSTER_HEADERS.length).getValues().forEach(function (r, i) {
    if (String(r[0]) !== form || String(r[1]) !== id) return;
    out.push({ row: i + 2, dev: String(r[2]), name: escText_(r[3]), role: escText_(r[4]), lastMs: rosterMs_(r[6]), removed: isYes_(r[7]) });
  });
  return out;
}
function rosterKey_(form, id) { return 'ros:' + form + ':' + id; }
function rosterGet_(form, id) {
  var c = CacheService.getScriptCache(), hit = c.get(rosterKey_(form, id));
  if (hit) { try { return JSON.parse(hit); } catch (e) {} }
  var list = rosterRows_(form, id);
  try { c.put(rosterKey_(form, id), JSON.stringify(list), ROSTER_CACHE_SECS); } catch (e) {}
  return list;
}
function rosterForget_(form, id) { CacheService.getScriptCache().remove(rosterKey_(form, id)); }
// A phone checks in. d.dev = its code for this event, d.who = its person's name. Returns that person's
// entry (with .removed), or null when the phone sent no code (an older page).
function rosterCheckIn_(form, id, d, role) {
  var dev = rosterDev_(d.dev);
  if (!dev) return null;
  var list = rosterGet_(form, id), me = null, name = clean_(d.who, 60).replace(/\s+/g, ' ');
  list.forEach(function (x) { if (x.dev === dev) me = x; });
  if (me && me.removed) return me;
  if (me && me.role === 'co-lead') role = 'co-lead';     // an added lead stays one (website v0.27.24)
  var cache = CacheService.getScriptCache(), seenKey = 'seen:' + form + ':' + dev, nowText = stamp_();
  if (!me) {
    rosterTab_().appendRow([form, id, dev, safe_(name), role || '', nowText, nowText, '', '']);
    rosterForget_(form, id);
    cache.put(seenKey, '1', ROSTER_SEEN_SECS);
    return { dev: dev, name: name, role: role || '', removed: false };
  }
  if (!cache.get(seenKey) || (name && name !== me.name) || (role && role !== me.role)) {
    var sh = rosterTab_();
    if (String(sh.getRange(me.row, 3).getValue()) === dev) {
      sh.getRange(me.row, 4, 1, 4).setValues([[safe_(name || me.name), role || me.role, sh.getRange(me.row, 6).getValue(), nowText]]);
    }
    rosterForget_(form, id);
    cache.put(seenKey, '1', ROSTER_SEEN_SECS);
  }
  return me;
}
// What the lead and HQ see: everyone not removed, lead first, then by name.
function rosterPublic_(form, id) {
  return rosterGet_(form, id).filter(function (x) { return !x.removed; })
    .sort(function (a, b) { return rosterRank_(a.role) - rosterRank_(b.role) || a.name.localeCompare(b.name); })
    .map(function (x) { return { dev: x.dev, name: x.name, role: x.role, lastMs: x.lastMs }; });
}
function rosterRank_(role) { return role === 'lead' ? 0 : role === 'co-lead' ? 1 : 2; }
// Remove a responder. The lead (Escalation: the worksheet's edit key; Reception: the lead key) or HQ (logged in).
function rosterRemove_(d) {
  var form = askForm_(d.form), id = escId_(d.id), dev = rosterDev_(d.dev), by = '';
  if (!form || !id || !dev) return { ok: false, error: 'Bad request.' };
  if (form === 'esc') {
    var key = escKey_(d.key), sh = escTab_(), row = escFindRow_(sh, id);
    if (row && key && escKeyOk_(escOpen_(sh.getRange(row, 7, 1, 1).getValues()[0][0]).meta, id, key)) by = 'Lead';
  } else {
    var lc = recLeadAuth_(id, d);
    if (lc && lc.ok) by = 'Lead';
  }
  if (d.token && !escDenied_(d)) by = 'HQ';      // HQ wins: only HQ may remove an added lead
  if (!by) return { ok: false, login: true, error: 'Only the lead or HQ can remove a responder.' };
  var me = null;
  rosterRows_(form, id).forEach(function (x) { if (x.dev === dev) me = x; });
  if (!me) return { ok: false, error: 'That person is not on this event any more.' };
  if (me.role === 'lead') return { ok: false, error: 'The lead who started this cannot be removed.' };
  if (me.role === 'co-lead' && by !== 'HQ') return { ok: false, error: 'Only HQ can remove a lead.' };
  rosterTab_().getRange(me.row, 8, 1, 2).setValues([['YES', by + ' ' + stamp_()]]);
  rosterForget_(form, id);
  return { ok: true, roster: rosterPublic_(form, id) };
}
/* ADD A LEAD (website v0.27.24). A lead or HQ makes someone already on the event a lead too ("co-lead"
   in the Role column). Their phone gets the lead's buttons the next time it checks in. Nobody stops
   being a lead: two or more can work at once, or the first lead can hand over and leave the scene.
   Only HQ can take an added lead off (Remove); the lead who started the event cannot be removed.
   d.dev = the person being made a lead. Who is asking: Escalation, the worksheet's edit key plus the
   asking phone's code (d.me), which must be a lead; Reception, see recLeadAuth_. Or HQ, logged in. */
function makeLead_(d) {
  var form = askForm_(d.form), id = escId_(d.id), dev = rosterDev_(d.dev), by = '';
  if (!form || !id || !dev) return { ok: false, error: 'Bad request.' };
  if (form === 'esc') {
    var key = escKey_(d.key), sh = escTab_(), row = escFindRow_(sh, id), asker = rosterDev_(d.me);
    if (row && key && asker && escKeyOk_(escOpen_(sh.getRange(row, 7, 1, 1).getValues()[0][0]).meta, id, key) &&
        rosterGet_('esc', id).some(function (x) { return x.dev === asker && !x.removed && (x.role === 'lead' || x.role === 'co-lead'); })) by = 'Lead';
  } else {
    var lc = recLeadAuth_(id, d);
    if (lc && lc.ok) by = 'Lead';
  }
  if (!by && d.token && !escDenied_(d)) by = 'HQ';
  if (!by) return { ok: false, login: true, error: 'Only a lead or HQ can add a lead.' };
  var me = null;
  rosterRows_(form, id).forEach(function (x) { if (x.dev === dev) me = x; });
  if (!me || me.removed) return { ok: false, error: 'That person is not on this event any more.' };
  if (me.role !== 'lead' && me.role !== 'co-lead') rosterTab_().getRange(me.row, 5).setValue('co-lead');
  rosterForget_(form, id);
  return { ok: true, roster: rosterPublic_(form, id) };
}
function rosterDelete_(form, id) {
  var sh = rosterTab_(), last = sh.getLastRow();
  if (last >= 2) {
    var v = sh.getRange(2, 1, last - 1, 2).getValues();
    for (var i = v.length - 1; i >= 0; i--) if (String(v[i][0]) === form && String(v[i][1]) === id) sh.deleteRow(i + 2);
  }
  rosterForget_(form, id);
}

/* =========================================================
   ANNOUNCEMENTS (website v0.27.19)
   The SEPA Tools app shows an "Announcements" bar above its buttons. Leadership posts by adding a
   row to the Announcements tab in this Sheet:
     Posted       - the date, like 2026-10-15 (newest shows first)
     Title        - one short line, shown in bold
     Message      - optional, a sentence or two
     Link         - optional. If filled in (must start with https://), tapping the announcement opens it.
     Show until   - optional date. After that day it disappears by itself. Blank = until removed.
     Hidden       - type YES to take it down without deleting the row.
   Phones show a small number on the bar for announcements that person has not opened yet. Nothing
   pops up. Changing an announcement's Title makes it count as new again.
   The tab is made the first time the app asks for announcements, with one example row in it.
   ========================================================= */
var ANN_HEADERS = ['Posted (date)', 'Title', 'Message (optional)', 'Link (optional, https://...)', 'Show until (date, optional)', 'Hidden (type YES)'];

function annList_() {
  makeTab_('Announcements', ANN_HEADERS, [[today_(), 'Register for the DAT Tabletop', 'Sign up in Volunteer Connection.',
    'https://volunteerconnection.redcross.org/?nd=vms_registration_event_detail&registration_id=22380983', '', '']]);
  var today = today_(), out = [];
  rows_('Announcements').forEach(function (r) {
    var title = clean_(r[1], 120);
    if (!title || isYes_(r[5])) return;
    var until = asDateText_(r[4]);
    if (until && until < today) return;
    var link = clean_(r[3], 600);
    out.push({ d: asDateText_(r[0]), t: title, m: clean_(r[2], 600), u: /^https:\/\//i.test(link) ? link : '' });
  });
  out.sort(function (a, b) { return a.d < b.d ? 1 : a.d > b.d ? -1 : 0; });
  return { ok: true, items: out.slice(0, 20) };
}


/* =========================================================
   DAILY SHELTER REPORT (pages/shelter.html, js/shelter.js), website v0.27.39
   A running report for each open shelter, kept by its shift supervisors, one report per day.
   - OPENING a shelter needs the LEAD user name and password (the same pair as the Escalation and
     Reception Center forms, Settings tab; the HQ pair works too). The same pair CLOSES it, which erases
     all its data. (Sean, Oct 16: the logins match across the three forms.)
   - Supervisors need no password: whoever opens the shelter's link (sent with "Add supervisor") can
     read and type. The link holds the shelter's code (the "Link code" column).
   - Each day has its own report: the 16 status questions (each answer keeps who gave it and when) and
     the running log (each entry stamped with the time and the supervisor's name). At midnight (the
     Sheet's time zone) the day's report LOCKS and a blank one starts by itself. Supervisors can read
     locked days but not change them.
   - HQ (the same HQ login as the other two forms; one login works on all three) can see every open shelter, edit any day including
     locked ones (for example to take out something that breaks client privacy), edit or remove log
     entries, download for Excel, and close a shelter. Every HQ change is marked as made by HQ.
   - A shelter with no activity for 14 days is erased by itself (SH_KEEP_DAYS), in case nobody closes it.
   Tabs (appear by themselves the first time the form is used):
     Shelters             one row per open shelter
     Shelter Supervisors  who has been added to each shelter
     Shelter Reports      one row per shelter per day: the 16 answers (coded, do not edit)
     Shelter Log          one row per log entry
     Shelters closed      just the code and time of each closed shelter (nothing else is kept)
   ========================================================= */
var SH_HEADERS = ['ID', 'Opened', 'Shelter name', 'Address', 'Opened by', 'Last activity', 'Last activity ms (do not edit)', 'Link code (do not edit)'];
var SH_SUP_HEADERS = ['Shelter ID', 'Name', 'Added', 'Added by', 'Removed'];   // Removed since v0.27.46
var SH_DAY_HEADERS = ['Shelter ID', 'Day', 'Last saved', 'Last saved by', 'Answers (do not edit)'];
var SH_LOG_HEADERS = ['Shelter ID', 'Entry ID', 'Day', 'Time', 'Supervisor', 'Entry', 'Edited', 'Flagged'];   // Flagged since v0.27.41
var SH_KEEP_DAYS = 14;
var SH_QUESTIONS = 16;

function shTab_() { makeTab_('Shelters', SH_HEADERS); return tab_('Shelters'); }
/* Makes sure all the shelter tabs exist before anything reads them (v0.27.41: the first report after
   opening a shelter failed because the Shelter Log tab did not exist yet). */
function shTabs_() { shTab_(); shSupTab_(); shDayTab_(); shLogTab_(); shClosedTab_(); rqTab_(); rqLinkTab_(); askTab_(); }
function shSupTab_() {
  makeTab_('Shelter Supervisors', SH_SUP_HEADERS);
  var sh = tab_('Shelter Supervisors');
  if (sh.getLastColumn() < SH_SUP_HEADERS.length) sh.getRange(1, 5, 1, 1).setValues([['Removed']]).setFontWeight('bold');   // a tab made before v0.27.46
  return sh;
}
function shDayTab_() { makeTab_('Shelter Reports', SH_DAY_HEADERS); return tab_('Shelter Reports'); }
function shLogTab_() {
  makeTab_('Shelter Log', SH_LOG_HEADERS);
  var sh = tab_('Shelter Log');
  if (sh.getLastColumn() < SH_LOG_HEADERS.length) sh.getRange(1, 8, 1, 1).setValues([['Flagged']]).setFontWeight('bold');   // a tab made before v0.27.41
  return sh;
}
function shClosedTab_() { makeTab_('Shelters closed', ['ID', 'Closed', 'How']); return tab_('Shelters closed'); }

/* Is this a current HQ login (the HQ login of the Escalation and Reception Center forms)? */
function shIsHq_(d) { return !!d.token && !escDenied_(d); }
function shName_(v) { return clean_(v, 40).replace(/\s+/g, ' '); }
function shIsClosed_(id) { return escFindRow_(shClosedTab_(), id) > 0; }

/* The shelter's row, if this request may use it: the right link code, or an HQ login. */
function shAccess_(d) {
  shTabs_();
  var id = escId_(d.id);
  if (!id) return { err: { ok: false, error: 'This link cannot open the shelter report.' } };
  if (shIsClosed_(id)) return { err: { ok: true, closed: true } };
  var sh = shTab_(), row = escFindRow_(sh, id);
  if (!row) return { err: { ok: false, gone: true, error: 'That shelter was not found. It may have been closed.' } };
  var r = sh.getRange(row, 1, 1, SH_HEADERS.length).getValues()[0];
  var hq = shIsHq_(d), key = escKey_(d.key);
  if (!hq && (!key || key !== escText_(r[7]))) return { err: { ok: false, nokey: true, hqLogin: !!d.token, error: 'This link cannot open the shelter report.' } };
  // v0.27.46: a supervisor taken off the list (Remove supervisor) can no longer use the shelter from that phone.
  if (!hq && shName_(d.me) && shRemoved_(id, d.me)) return { err: { ok: false, removed: true, shelter: escText_(r[2]), error: 'You have been removed from ' + escText_(r[2]) + '.' } };
  return { id: id, sh: sh, row: row, r: r, hq: hq };
}
function shTouch_(a, now) {
  a.sh.getRange(a.row, 6, 1, 2).setValues([[stamp_(now), String(now.getTime())]]);
  return now.getTime();
}
function shWho_(a, d) { return a.hq && (d.asHq || !escKey_(d.key)) ? 'HQ' : (shName_(d.me) || 'A supervisor'); }

function shPing_(d) {
  shTab_(); shSupTab_(); shDayTab_(); shLogTab_(); shClosedTab_();
  escLoginSettings_(); leadLoginSettings_();
  return { ok: true };
}

// OPEN a shelter: needs the lead user name and password (or HQ). The opener becomes its first supervisor.
function shOpen_(d) {
  var bad = leadDenied_({ user: d.user || '', password: d.password || '', token: d.token });
  if (bad) return { ok: false, error: bad.error || 'Please type the lead user name and password.' };
  var name = clean_(d.shelter, 120), addr = clean_(d.address, 200), me = shName_(d.me);
  if (!name) return { ok: false, error: 'Please type the shelter name.' };
  if (!me) return { ok: false, error: 'Please type your name.' };
  var id = escId_(d.id), key = escKey_(d.key);
  if (!id || !key) return { ok: false, error: 'The shelter could not be opened. Please reload the page and try again.' };
  var sh = shTab_();
  if (escFindRow_(sh, id)) return { ok: false, error: 'Please reload the page and try again.' };
  var now = new Date(), t = stamp_(now);
  sh.appendRow([id, t, safe_(name), safe_(addr), safe_(me), t, String(now.getTime()), key]);
  shSupTab_().appendRow([id, safe_(me), t, 'Opened the shelter']);
  return { ok: true, id: id };
}

function shAnswers_(cell) { try { var a = JSON.parse(escText_(cell)); return a && typeof a === 'object' ? a : {}; } catch (e) { return {}; } }
function shDayRow_(id, day) {
  var sh = shDayTab_(), data = sh.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) if (String(data[i][0]) === id && asDateText_(data[i][1]) === day) return { sh: sh, row: i + 1, r: data[i] };
  return null;
}
function shLogFor_(id, day) {
  return rows_('Shelter Log').filter(function (r) { return String(r[0]) === id && (!day || asDateText_(r[2]) === day); })
    .map(function (r) { return { id: String(r[1]), day: asDateText_(r[2]), at: iso_(r[3]), by: escText_(r[4]), text: escText_(r[5]), edited: escText_(r[6]), flag: escText_(r[7]) }; });
}
function shReport_(id, day) {
  var dr = shDayRow_(id, day);
  return { day: day, answers: dr ? shAnswers_(dr.r[4]) : {}, saved: dr ? iso_(dr.r[2]) : '', savedBy: dr ? escText_(dr.r[3]) : '', log: shLogFor_(id, day) };
}
function shSups_(id) {      // the CURRENT supervisors (v0.27.46: removed ones are left out)
  return rows_('Shelter Supervisors').filter(function (r) { return String(r[0]) === id && !escText_(r[4]); })
    .map(function (r) { return { name: escText_(r[1]), added: iso_(r[2]), by: escText_(r[3]) }; });
}
function shRemoved_(id, name) {
  var n = shName_(name).toLowerCase(), out = false;
  rows_('Shelter Supervisors').forEach(function (r) { if (String(r[0]) === id && escText_(r[1]).toLowerCase() === n) out = !!escText_(r[4]); });
  return out;
}
function shListed_(id, name) {
  var n = shName_(name).toLowerCase();
  return !!n && shSups_(id).some(function (s) { return s.name.toLowerCase() === n; });
}
function shDays_(id, today) {      // earlier days that have anything saved, newest first
  var seen = {};
  rows_('Shelter Reports').forEach(function (r) {
    if (String(r[0]) !== id) return;
    var dd = asDateText_(r[1]); if (dd >= today) return;
    var ans = shAnswers_(r[4]);
    seen[dd] = seen[dd] || { answered: 0, entries: 0 };
    seen[dd].answered = Object.keys(ans).filter(function (k) { return ans[k] && ans[k].v; }).length;
  });
  rows_('Shelter Log').forEach(function (r) { if (String(r[0]) === id) { var dd = asDateText_(r[2]); if (dd < today) { seen[dd] = seen[dd] || { answered: 0, entries: 0 }; seen[dd].entries++; } } });
  return Object.keys(seen).sort().reverse().map(function (dd) { return { day: dd, answered: seen[dd].answered, entries: seen[dd].entries }; });
}

/* THE CALL THE PAGE MAKES EVERY FEW SECONDS. d.since = the "last activity" number the page already has:
   when nothing changed it only answers "same". */
function shGet_(d) {
  shPurge_();
  var a = shAccess_(d); if (a.err) return a.err;
  var today = today_(), ms = String(a.r[6]);
  if (d.since && String(d.since) === ms && d.day === today) return { ok: true, same: true, today: today, hq: a.hq };
  var res = { ok: true, today: today, ms: ms, hq: a.hq,
    shelter: { id: a.id, name: escText_(a.r[2]), address: escText_(a.r[3]), opened: iso_(a.r[1]), openedBy: escText_(a.r[4]) },
    sups: shSups_(a.id), report: shReport_(a.id, today), days: shDays_(a.id, today),
    // v0.27.41: flagged issues from earlier days that nobody has unflagged ("Carried-over issues")
    carry: shLogFor_(a.id, '').filter(function (e) { return e.flag && e.day < today; }),
    rqOpen: rqOpenCount_(a.id),
    asks: askWaiting_('sh', a.id) };     // v0.27.49: people asking to join (Current Operations > Join)
  if (a.hq) res.joinKey = escText_(a.r[7]);
  return res;
}
// One earlier day (read only for supervisors; HQ can edit it).
function shDay_(d) {
  var a = shAccess_(d); if (a.err) return a.err;
  var day = String(d.day || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return { ok: false, error: 'That day was not found.' };
  return { ok: true, hq: a.hq, today: today_(), report: shReport_(a.id, day) };
}

// Save ONE answer. Supervisors always save to today; HQ may name an earlier day.
function shSave_(d) {
  var a = shAccess_(d); if (a.err) return a.err;
  var q = String(d.q || '');
  if (!/^q([1-9]|1[0-6])x?$/.test(q)) return { ok: false, error: 'Unknown question.' };   // q7x etc.: the "Please explain" boxes (v0.27.43)
  var today = today_(), day = today;
  if (d.day && d.day !== today) {
    if (!a.hq) return { ok: false, locked: true, today: today, error: 'That day is locked. Only HQ can change it.' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.day) || d.day > today) return { ok: false, error: 'That day was not found.' };
    day = d.day;
  }
  var v = clean_(d.v, 3000), now = new Date(), who = shWho_(a, d), t = stamp_(now);
  var dr = shDayRow_(a.id, day), ans = dr ? shAnswers_(dr.r[4]) : {};
  var prev = ans[q] || {};
  if ((prev.v || '') === v) return { ok: true, ms: String(a.r[6]), today: today };
  ans[q] = { v: v, by: who, at: t };
  if (a.hq && day !== today) ans[q].hq = 1;
  var text = JSON.stringify(ans);
  if (dr) dr.sh.getRange(dr.row, 3, 1, 3).setValues([[t, safe_(who), text]]);
  else shDayTab_().appendRow([a.id, day, t, safe_(who), text]);
  return { ok: true, ms: String(shTouch_(a, now)), today: today, at: t, by: who };
}

// Add to today's running log.
function shLog_(d) {
  var a = shAccess_(d); if (a.err) return a.err;
  var text = clean_(d.text, 3000);
  if (!text) return { ok: false, error: 'Please type something first.' };
  var now = new Date(), who = shWho_(a, d), eid = 'L' + now.getTime().toString(36) + Math.floor(Math.random() * 1296).toString(36);
  var flag = d.flag ? safe_('Flagged by ' + who + ' ' + stamp_(now)) : '';
  shLogTab_().appendRow([a.id, eid, today_(), stamp_(now), safe_(who), safe_(text), '', flag]);
  return { ok: true, ms: String(shTouch_(a, now)), entry: { id: eid, at: stamp_(now), by: who, text: text, flag: flag } };
}
// FLAG or unflag a log entry (website v0.27.41). Flagged entries show in red at the top of the log.
// Anyone on the shelter can flag or unflag today's entries. Flagged entries from earlier days carry over
// into a "Carried-over issues" box until someone removes the flag (anyone may); only HQ can flag an earlier day.
function shLogFlag_(d) {
  var a = shAccess_(d); if (a.err) return a.err;
  var sh = shLogTab_(), data = sh.getDataRange().getValues(), eid = String(d.entry || ''), now = new Date(), who = shWho_(a, d);
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === a.id && String(data[i][1]) === eid) {
      // An earlier day is locked, except that anyone may REMOVE the flag of a carried-over issue once it is dealt with.
      if (asDateText_(data[i][2]) !== today_() && !a.hq && d.flag) return { ok: false, locked: true, error: 'That day is locked. Only HQ can change it.' };
      sh.getRange(i + 1, 8, 1, 1).setValues([[d.flag ? safe_('Flagged by ' + who + ' ' + stamp_(now)) : '']]);
      return { ok: true, ms: String(shTouch_(a, now)) };
    }
  }
  return { ok: false, error: 'That entry was not found.' };
}
// HQ only: change or remove (empty text) a log entry, on any day. The entry stays, marked as edited by HQ.
function shLogEdit_(d) {
  var a = shAccess_(d); if (a.err) return a.err;
  if (!a.hq) return { ok: false, login: true, error: 'Only HQ can edit the log. Please log in as HQ.' };
  var sh = shLogTab_(), data = sh.getDataRange().getValues(), eid = String(d.entry || ''), now = new Date();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === a.id && String(data[i][1]) === eid) {
      var text = clean_(d.text, 3000);
      sh.getRange(i + 1, 6, 1, 2).setValues([[safe_(text), (text ? 'Edited by HQ ' : 'Removed by HQ ') + stamp_(now)]]);
      return { ok: true, ms: String(shTouch_(a, now)) };
    }
  }
  return { ok: false, error: 'That entry was not found.' };
}

// Add a supervisor (anyone on the shelter, or HQ). Also used when someone opens the link and types their name.
function shAddSup_(d) {
  var a = shAccess_(d); if (a.err) return a.err;
  var name = shName_(d.name);
  if (!name) return { ok: false, error: 'Please type the supervisor\'s name.' };
  var have = shSups_(a.id).some(function (s) { return s.name.toLowerCase() === name.toLowerCase(); });
  var now = new Date();
  if (!have) {
    // v0.27.46: adding back someone who was removed clears the removal (their old row is reused)
    var st = shSupTab_(), data = st.getDataRange().getValues(), back = 0;
    for (var i = 1; i < data.length; i++) if (String(data[i][0]) === a.id && escText_(data[i][1]).toLowerCase() === name.toLowerCase()) back = i + 1;
    if (back) st.getRange(back, 3, 1, 3).setValues([[stamp_(now), safe_('Added back by ' + shWho_(a, d)), '']]);
    else st.appendRow([a.id, safe_(name), stamp_(now), d.self ? 'Opened the link' : safe_('Added by ' + shWho_(a, d)), '']);
  }
  return { ok: true, ms: String(have ? a.r[6] : shTouch_(a, now)), sups: shSups_(a.id), joinKey: escText_(a.r[7]) };
}

// HQ: every open shelter, most recent activity first.
function shList_(d) {
  shTabs_();
  shPurge_();
  if (!shIsHq_(d)) return { ok: false, login: true, error: 'Please log in as HQ.' };
  var items = rows_('Shelters').map(function (r) {
    return { id: String(r[0]), name: escText_(r[2]), address: escText_(r[3]), opened: iso_(r[1]), last: iso_(r[5]), ms: Number(r[6]) || 0 };
  }).sort(function (x, y) { return y.ms - x.ms; });
  var ac = askCounts_('sh'); items.forEach(function (it) { it.asking = ac[it.id] || 0; });     // v0.27.50
  return { ok: true, items: items, now: Date.now() };
}

// HQ: everything for one shelter, for the Excel download.
function shExport_(d) {
  var a = shAccess_(d); if (a.err) return a.err;
  if (!a.hq) return { ok: false, login: true, error: 'Only HQ can download. Please log in as HQ.' };
  var days = rows_('Shelter Reports').filter(function (r) { return String(r[0]) === a.id; })
    .map(function (r) { return { day: asDateText_(r[1]), answers: shAnswers_(r[4]) }; })
    .sort(function (x, y) { return x.day < y.day ? -1 : 1; });
  return { ok: true, shelter: { name: escText_(a.r[2]), address: escText_(a.r[3]), opened: iso_(a.r[1]) }, days: days, log: shLogFor_(a.id, '') };
}

// CLOSE a shelter and erase everything: the lead user name and password, or an HQ login.
function shClose_(d) {
  var id = escId_(d.id);
  if (!id) return { ok: false, error: 'That shelter was not found.' };
  if (!shIsHq_(d)) {
    var bad = leadDenied_({ user: d.user || '', password: d.password || '' });
    if (bad) return { ok: false, error: bad.error || 'Please type the lead user name and password.' };
  }
  if (!escFindRow_(shTab_(), id)) return { ok: true, closed: true };
  shErase_(id, shIsHq_(d) ? 'HQ' : 'Lead login');
  return { ok: true, closed: true };
}
function shErase_(id, how) {
  [['Shelters', 0], ['Shelter Supervisors', 0], ['Shelter Reports', 0], ['Shelter Log', 0], ['Requisitions', 0], ['Requisition Links', 0]].forEach(function (t) {
    var sh = tab_(t[0]); if (!sh) return;
    var last = sh.getLastRow(); if (last < 2) return;
    var ids = sh.getRange(2, 1, last - 1, 1).getValues();
    for (var i = ids.length - 1; i >= 0; i--) if (String(ids[i][0]) === id) sh.deleteRow(i + 2);
  });
  shClosedTab_().appendRow([id, stamp_(), how]);
}
// Erase shelters with no activity for SH_KEEP_DAYS days. Runs at most every 10 minutes (and nightly
// from autoDelete, if startAutoDelete was run once).
function shPurge_(force) {
  if (!AUTO_DELETE) return;     // v0.27.49: off for the demos
  var c = CacheService.getScriptCache();
  if (!force && c.get('shPurge')) return;
  c.put('shPurge', '1', 600);
  var sh = tab_('Shelters'); if (!sh) return;
  shTabs_();
  var cut = Date.now() - SH_KEEP_DAYS * 86400000;
  rows_('Shelters').forEach(function (r) { if ((Number(r[6]) || 0) < cut) shErase_(String(r[0]), 'automatic, no activity for ' + SH_KEEP_DAYS + ' days'); });
}

// REMOVE a supervisor (website v0.27.46, Sean: only people currently listed as supervisors may share and
// use 6409s). HQ, or the lead user name and password (the same pair that opens and closes a shelter).
// The row stays, marked "Removed by ...", so adding the same name again brings them back.
// The removed person's phone shows "You have been removed from <shelter>" the next time it checks.
function shRemoveSup_(d) {
  var hq = shIsHq_(d);
  if (!hq) {
    var bad = leadDenied_({ user: d.user || '', password: d.password || '' });
    if (bad) return { ok: false, leadLogin: true, error: bad.error || 'Please type the lead user name and password.' };
  }
  var a = shAccess_({ id: d.id, key: d.key, token: hq ? d.token : '' }); if (a.err) return a.err;
  var name = shName_(d.name);
  if (!name) return { ok: false, error: 'Which supervisor?' };
  var st = shSupTab_(), data = st.getDataRange().getValues(), now = new Date(), found = 0;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === a.id && escText_(data[i][1]).toLowerCase() === name.toLowerCase() && !escText_(data[i][4])) {
      st.getRange(i + 1, 5, 1, 1).setValues([[safe_('Removed by ' + (hq ? 'HQ' : 'the lead login') + ' ' + stamp_(now))]]);
      found = 1;
    }
  }
  if (!found) return { ok: false, error: 'That supervisor was not found.' };
  return { ok: true, ms: String(shTouch_(a, now)), sups: shSups_(a.id) };
}


/* =========================================================
   6409 DISASTER REQUISITION, LIVE (pages/req.html, js/req.js), website v0.27.46. A PROTOTYPE:
   Sean will workshop it with the logistics and mass care teams ("build it with your best
   recommendations"). Follows the paper form DCS JT DMWT Disaster Requisition (F6409 / F6409B) V.2.0.
   - Each 6409 belongs to one open shelter (one form per delivery address, as the paper form says).
     It is numbered 1, 2, 3... within its shelter.
   - Who can do what:
       Supervisors CURRENTLY on the shelter's list (and HQ): start a 6409, fill in the request, approve
         someone else's, confirm delivery, cancel, and "Share with Team member".
       The requester cannot approve their own 6409 (paper form rule). HQ can undo an approval.
       Logistics (anyone opening the link "Share with Team member" sends): see every 6409 of that shelter,
         type the requisition number, set the status and add notes. They cannot change the request, and
         the link does NOT open the shelter's report or log (client privacy).
   - Steps: Draft (waiting for approval) > Approved > With logistics > Ordered > On the way > Delivered.
     Also Cannot fill (logistics) and Cancelled.
   - Signatures are a typed name plus the time (the person's name on that phone).
   - Erased with the shelter (Close shelter, or 14 days without activity).
   Tabs (appear by themselves):
     Requisitions        one row per 6409; the form itself is kept coded in the last column (do not edit)
     Requisition Links   each shelter's logistics link code
   ========================================================= */
var RQ_HEADERS = ['Shelter ID', '6409 ID', 'No.', 'Started', 'Requested by', 'Status', 'Last change', 'Last change ms (do not edit)', 'Form (do not edit)'];
var RQ_STEPS = ['Draft', 'Approved', 'With logistics', 'Ordered', 'On the way', 'Delivered', 'Cannot fill', 'Cancelled'];
var RQ_LOG_STEPS = ['With logistics', 'Ordered', 'On the way', 'Cannot fill'];      // what logistics may set
var RQ_UNITS = ['', 'EA', 'PK', 'CS', 'BX'];
var RQ_METHODS = ['', 'Donation', 'ReQuest', 'Concur Invoice', 'P-card', 'Transfer', 'Loan', 'Other'];
// The fields people type into, and how long each may be. Request fields: supervisors/HQ while a Draft.
var RQ_REQ_FIELDS = { dr: 40, drName: 120, date: 20, title: 80, phone: 30, poc: 60, pocPhone: 30, pocEmail: 120, addr: 200, city: 80, state: 20, zip: 12,
  special: 2000, acct: 60, method: 20, methodOther: 120 };
var RQ_LOG_FIELDS = { reqNo: 40, logNote: 2000 };       // logistics (and HQ), any time before it is closed

function rqTab_() { makeTab_('Requisitions', RQ_HEADERS); return tab_('Requisitions'); }
function rqLinkTab_() { makeTab_('Requisition Links', ['Shelter ID', 'Logistics link code (do not edit)', 'Made', 'Made by']); return tab_('Requisition Links'); }
function rqLinkCode_(id) {
  var out = '';
  rows_('Requisition Links').forEach(function (r) { if (String(r[0]) === id) out = escText_(r[1]); });
  return out;
}
function rqForm_(cell) { try { var f = JSON.parse(escText_(cell)); return f && typeof f === 'object' ? f : {}; } catch (e) { return {}; } }
function rqClosed_(status) { return status === 'Delivered' || status === 'Cancelled' || status === 'Cannot fill'; }
function rqOpenCount_(id) {
  var t = tab_('Requisitions'); if (!t) return 0;
  return rows_('Requisitions').filter(function (r) { return String(r[0]) === id && !rqClosed_(escText_(r[5])); }).length;
}

/* Who is asking, and may they? role: 'hq', 'sup' (on the shelter's CURRENT list) or 'log' (logistics link). */
function rqAccess_(d) {
  shTabs_();
  var id = escId_(d.id);
  if (!id) return { err: { ok: false, error: 'This link cannot open the 6409.' } };
  var lkey = escKey_(d.lkey);
  if (lkey && !shIsHq_(d) && !escKey_(d.key)) {
    if (shIsClosed_(id)) return { err: { ok: true, closed: true } };
    var sh = shTab_(), row = escFindRow_(sh, id);
    if (!row) return { err: { ok: false, gone: true, error: 'That shelter was not found. It may have been closed.' } };
    if (lkey !== rqLinkCode_(id)) return { err: { ok: false, nokey: true, error: 'This link no longer opens these 6409s.' } };
    return { id: id, sh: sh, row: row, r: sh.getRange(row, 1, 1, SH_HEADERS.length).getValues()[0], hq: false, role: 'log',
      who: shName_(d.me) ? shName_(d.me) + ' (logistics)' : 'Logistics' };
  }
  var a = shAccess_(d); if (a.err) return a;
  if (a.hq && (d.asHq || !escKey_(d.key))) { a.role = 'hq'; a.who = 'HQ'; return a; }
  if (!shListed_(a.id, d.me)) return { err: { ok: false, notlisted: true, error: 'Only supervisors listed on this shelter can use its 6409s. Ask a supervisor to add you, or open the shelter\'s link again.' } };
  a.role = 'sup'; a.who = shName_(d.me);
  return a;
}
function rqFind_(a, rid) {
  rid = escId_(rid); if (!rid) return null;
  var t = rqTab_(), data = t.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) if (String(data[i][0]) === a.id && String(data[i][1]) === rid) return { t: t, row: i + 1, r: data[i], f: rqForm_(data[i][8]) };
  return null;
}
function rqWrite_(a, q, now, status) {
  var ms = now.getTime();
  q.t.getRange(q.row, 6, 1, 4).setValues([[status || escText_(q.r[5]), stamp_(now), String(ms), JSON.stringify(q.f)]]);
  shTouch_(a, now);         // keeps the shelter "active" (so it is not erased after 14 days while 6409s are moving)
  return String(ms);
}
function rqHist_(q, who, what, now) {
  q.f.hist = q.f.hist || [];
  q.f.hist.push({ at: stamp_(now), by: who, what: clean_(what, 300) });
  if (q.f.hist.length > 80) q.f.hist = q.f.hist.slice(-80);
}
function rqOut_(a, q) {
  var f = q.f, out = { id: String(q.r[1]), no: Number(q.r[2]) || 0, started: iso_(q.r[3]), by: escText_(q.r[4]), status: escText_(q.r[5]), ms: escText_(q.r[7]), f: f };
  if (a.role === 'log') { out.f = JSON.parse(JSON.stringify(f)); delete out.f.acct; }     // the account string stays inside the Red Cross side
  return out;
}
function rqShelter_(a) { return { id: a.id, name: escText_(a.r[2]), address: escText_(a.r[3]) }; }
function rqCan_(a) {
  return { share: a.role !== 'log', start: a.role !== 'log', logistics: a.role !== 'sup', hq: a.role === 'hq' };
}

// The shelter's 6409s, newest first.
function rqList_(d) {
  var a = rqAccess_(d); if (a.err) return a.err;
  var items = rows_('Requisitions').filter(function (r) { return String(r[0]) === a.id; }).map(function (r) {
    var f = rqForm_(r[8]), its = (f.items || []).filter(function (x) { return x && x.desc; });
    return { id: String(r[1]), no: Number(r[2]) || 0, started: iso_(r[3]), by: escText_(r[4]), status: escText_(r[5]), last: iso_(r[6]), ms: Number(r[7]) || 0,
      first: its.length ? its[0].desc : '', count: its.length, need: its.map(function (x) { return x.need || ''; }).filter(String).sort()[0] || '', reqNo: f.reqNo || '' };
  }).sort(function (x, y) { return y.no - x.no; });
  return { ok: true, role: a.role, can: rqCan_(a), shelter: rqShelter_(a), items: items, now: Date.now(), today: today_() };
}

// Start a new 6409 (supervisors and HQ). Filled in from the shelter and the person.
function rqNew_(d) {
  var a = rqAccess_(d); if (a.err) return a.err;
  if (a.role === 'log') return { ok: false, error: 'Logistics cannot start a 6409.' };
  var rid = escId_(d.rid);
  if (!rid) return { ok: false, error: 'Please reload the page and try again.' };
  var t = rqTab_(), no = 0;
  rows_('Requisitions').forEach(function (r) { if (String(r[0]) === a.id) { no = Math.max(no, Number(r[2]) || 0); if (String(r[1]) === rid) no = -1e9; } });
  if (no < 0) return { ok: true, id: rid };        // already made (a double tap)
  no += 1;
  var now = new Date(), who = a.role === 'hq' ? 'HQ' : a.who;
  var f = { date: today_(), poc: a.role === 'hq' ? '' : a.who, addr: escText_(a.r[3]), state: 'PA', items: [{}], hist: [] };
  f.requester = a.role === 'hq' ? '' : a.who;
  f.hist.push({ at: stamp_(now), by: who, what: 'Started 6409 #' + no });
  t.appendRow([a.id, rid, no, stamp_(now), safe_(who), 'Draft', stamp_(now), String(now.getTime()), JSON.stringify(f)]);
  shTouch_(a, now);
  return { ok: true, id: rid, no: no };
}

// One 6409. d.since: the "ms" the page already has; when nothing changed it only answers "same".
function rqGet_(d) {
  var a = rqAccess_(d); if (a.err) return a.err;
  var q = rqFind_(a, d.rid);
  if (!q) return { ok: false, norq: true, error: 'That 6409 was not found.' };
  if (d.since && String(d.since) === escText_(q.r[7])) return { ok: true, same: true, role: a.role };
  return { ok: true, role: a.role, can: rqCan_(a), shelter: rqShelter_(a), rq: rqOut_(a, q), me: a.who, today: today_() };
}

// Save ONE field (or the whole list of items).
function rqSave_(d) {
  var a = rqAccess_(d); if (a.err) return a.err;
  var q = rqFind_(a, d.rid); if (!q) return { ok: false, norq: true, error: 'That 6409 was not found.' };
  var k = String(d.f || ''), status = escText_(q.r[5]), now = new Date();
  if (k === 'items' || RQ_REQ_FIELDS[k] || k === 'requester') {
    if (a.role === 'log') return { ok: false, locked: true, error: 'Logistics cannot change the request. Add a note instead.' };
    if (status !== 'Draft') return { ok: false, locked: true, error: 'This 6409 is approved, so the request is locked. HQ can undo the approval to change it.' };
    if (k === 'items') {
      var list = Array.isArray(d.v) ? d.v.slice(0, 30) : [];
      q.f.items = list.map(function (x) {
        x = x || {};
        return { stock: clean_(x.stock, 40), qty: clean_(x.qty, 12), unit: RQ_UNITS.indexOf(String(x.unit || '')) >= 0 ? String(x.unit || '') : '',
          total: clean_(x.total, 12), desc: clean_(x.desc, 300), need: clean_(x.need, 40) };
      });
    } else if (k === 'method') q.f.method = RQ_METHODS.indexOf(String(d.v || '')) >= 0 ? String(d.v || '') : '';
    else if (k === 'requester') { if (a.role !== 'hq') return { ok: false, error: 'Only HQ can change the requester.' }; q.f.requester = shName_(d.v); }
    else q.f[k] = clean_(d.v, RQ_REQ_FIELDS[k]);
  } else if (RQ_LOG_FIELDS[k]) {
    if (a.role === 'sup') return { ok: false, locked: true, error: 'Only logistics (or HQ) fill this in.' };
    if (status === 'Cancelled') return { ok: false, locked: true, error: 'This 6409 was cancelled.' };
    q.f[k] = clean_(d.v, RQ_LOG_FIELDS[k]);
  } else return { ok: false, error: 'Unknown field.' };
  q.f.saved = { at: stamp_(now), by: a.who };
  return { ok: true, ms: rqWrite_(a, q, now), at: stamp_(now), by: a.who };
}

// APPROVE: a listed supervisor who is NOT the requester, or HQ. Locks the request.
function rqApprove_(d) {
  var a = rqAccess_(d); if (a.err) return a.err;
  if (a.role === 'log') return { ok: false, error: 'Logistics cannot approve a 6409.' };
  var q = rqFind_(a, d.rid); if (!q) return { ok: false, norq: true, error: 'That 6409 was not found.' };
  if (escText_(q.r[5]) !== 'Draft') return { ok: false, error: 'This 6409 is already ' + escText_(q.r[5]).toLowerCase() + '.' };
  if (a.role === 'sup' && (q.f.requester || '').toLowerCase() === a.who.toLowerCase()) return { ok: false, self: true, error: 'The requester cannot approve their own 6409. Ask another supervisor, or HQ.' };
  if (!(q.f.items || []).some(function (x) { return x && x.desc; })) return { ok: false, error: 'Add at least one item (a description) before approving.' };
  var now = new Date();
  q.f.approved = { by: a.who, at: stamp_(now), title: clean_(d.title, 80), phone: clean_(d.phone, 30) };
  rqHist_(q, a.who, 'Approved', now);
  return { ok: true, ms: rqWrite_(a, q, now, 'Approved') };
}
// HQ only: undo an approval (back to Draft) so the request can be changed.
function rqUnapprove_(d) {
  var a = rqAccess_(d); if (a.err) return a.err;
  if (a.role !== 'hq') return { ok: false, login: true, error: 'Only HQ can undo an approval. Please log in as HQ.' };
  var q = rqFind_(a, d.rid); if (!q) return { ok: false, norq: true, error: 'That 6409 was not found.' };
  if (rqClosed_(escText_(q.r[5]))) return { ok: false, error: 'This 6409 is closed.' };
  var now = new Date();
  delete q.f.approved;
  rqHist_(q, 'HQ', 'Undid the approval (back to Draft)', now);
  return { ok: true, ms: rqWrite_(a, q, now, 'Draft') };
}
// LOGISTICS (and HQ): set the step, with an optional note.
function rqStatus_(d) {
  var a = rqAccess_(d); if (a.err) return a.err;
  if (a.role === 'sup') return { ok: false, error: 'Only logistics (or HQ) set this.' };
  var q = rqFind_(a, d.rid); if (!q) return { ok: false, norq: true, error: 'That 6409 was not found.' };
  var to = String(d.status || ''), status = escText_(q.r[5]);
  if (RQ_LOG_STEPS.indexOf(to) < 0) return { ok: false, error: 'Unknown step.' };
  if (status === 'Draft') return { ok: false, error: 'This 6409 is not approved yet.' };
  if (status === 'Cancelled' || status === 'Delivered') return { ok: false, error: 'This 6409 is already ' + status.toLowerCase() + '.' };
  var now = new Date(), note = clean_(d.note, 500);
  rqHist_(q, a.who, to + (note ? ': ' + note : ''), now);
  return { ok: true, ms: rqWrite_(a, q, now, to) };
}
// RECEIPT (6409-B): the site confirms what arrived. Supervisors and HQ.
function rqReceive_(d) {
  var a = rqAccess_(d); if (a.err) return a.err;
  if (a.role === 'log') return { ok: false, error: 'The shelter confirms the delivery.' };
  var q = rqFind_(a, d.rid); if (!q) return { ok: false, norq: true, error: 'That 6409 was not found.' };
  var status = escText_(q.r[5]);
  if (status === 'Draft' || status === 'Cancelled') return { ok: false, error: 'This 6409 is ' + (status === 'Draft' ? 'not approved yet.' : 'cancelled.') };
  var all = !!d.all, disc = clean_(d.disc, 2000);
  if (!all && !disc) return { ok: false, error: 'Please say what was missing or wrong.' };
  var now = new Date();
  q.f.receipt = { all: all, disc: disc, group: clean_(d.group, 80), by: a.who, at: stamp_(now) };
  rqHist_(q, a.who, all ? 'Delivery received, all items' : 'Delivery received, with discrepancies', now);
  return { ok: true, ms: rqWrite_(a, q, now, 'Delivered') };
}
// CANCEL (supervisors and HQ), not after delivery.
function rqCancel_(d) {
  var a = rqAccess_(d); if (a.err) return a.err;
  if (a.role === 'log') return { ok: false, error: 'Logistics cannot cancel a 6409. Use Cannot fill instead.' };
  var q = rqFind_(a, d.rid); if (!q) return { ok: false, norq: true, error: 'That 6409 was not found.' };
  if (escText_(q.r[5]) === 'Delivered') return { ok: false, error: 'This 6409 was already delivered.' };
  var now = new Date();
  rqHist_(q, a.who, 'Cancelled' + (clean_(d.note, 300) ? ': ' + clean_(d.note, 300) : ''), now);
  return { ok: true, ms: rqWrite_(a, q, now, 'Cancelled') };
}
// SHARE WITH TEAM MEMBER: a listed supervisor or HQ gets the shelter's logistics link code (made the first time).
function rqShare_(d) {
  var a = rqAccess_(d); if (a.err) return a.err;
  if (a.role === 'log') return { ok: false, error: 'Only the shelter\'s supervisors and HQ can share.' };
  var code = rqLinkCode_(a.id);
  if (!code) {
    code = Utilities.getUuid().replace(/-/g, '').slice(0, 28);
    rqLinkTab_().appendRow([a.id, code, stamp_(), safe_(a.who)]);
  }
  return { ok: true, lkey: code, shelter: rqShelter_(a) };
}


/* =========================================================
   OFFLINE SCIA (pages/scia.html, js/scia.js), website v0.27.48. A BETA / DEMO (Sean, Oct 16, 2026).
   A stop gap for a full mass care response: intake can start before the Red Cross's own SCIA system
   is unlocked for the operation (the DR code). Follows the paper "SCIA Offline Intake Form".
   Everything is typed into SCIA later, by hand. It cannot sync with SCIA or any outside system.
   - HQ (the HQ login of the other forms) names a shelter and assigns ONE lead. HQ can change the lead
     and close the shelter.
   - The lead logs in with the LEAD user name and password, picks their shelter, and grants or revokes
     intake workers (who tap "Request access" and type their name). Access lasts 24 hours at most.
   - STRICTLY ONE WAY: an intake worker can only SEND an intake. Nothing about a client is ever sent back
     to a worker's phone, and the page keeps nothing on the phone.
   - HQ and the lead see the intakes (dashboard), download them for Excel in form order, and tick
     "Entered into SCIA", which DELETES that intake ("Upon uploading to SCIA, this form must be deleted").
   - A closed shelter keeps its intakes 7 days (SCIA_KEEP_DAYS), then everything is erased by itself.
   - Demo security (Sean: strengthen if adopted): the same HQ and lead logins as the other forms.
   Tabs (appear by themselves):
     Offline SCIA Shelters   one row per shelter
     Offline SCIA Workers    one row per access request
     Offline SCIA Intakes    one row per intake (client details: do not share)
   ========================================================= */
var SCIA_SH_HEADERS = ['ID', 'Opened', 'Shelter name', 'Lead', 'Opened by', 'Closed', 'Last activity ms (do not edit)', 'Lead code (do not edit)'];
var SCIA_W_HEADERS = ['Shelter ID', 'Worker ID', 'Name', 'Asked', 'Status', 'Changed', 'Access until ms (do not edit)', 'Worker code (do not edit)', 'Intakes sent'];
var SCIA_I_HEADERS = ['Shelter ID', 'Intake ID', 'Sent', 'Intake worker', 'Primary client', 'Cot #', 'People', 'Flags', 'Form (do not edit)'];
var SCIA_HOURS = 24;
var SCIA_KEEP_DAYS = 7;

function sciaTabs_() {
  makeTab_('Offline SCIA Shelters', SCIA_SH_HEADERS); makeTab_('Offline SCIA Workers', SCIA_W_HEADERS); makeTab_('Offline SCIA Intakes', SCIA_I_HEADERS);
}
function sciaCode_() { return Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8); }
function sciaRow_(id) {
  sciaTabs_();
  id = escId_(id); if (!id) return null;
  var sh = tab_('Offline SCIA Shelters'), row = escFindRow_(sh, id);
  if (!row) return null;
  return { id: id, sh: sh, row: row, r: sh.getRange(row, 1, 1, SCIA_SH_HEADERS.length).getValues()[0] };
}
function sciaTouch_(a) { a.sh.getRange(a.row, 7, 1, 1).setValues([[String(Date.now())]]); }
function sciaOut_(r) { return { id: String(r[0]), name: escText_(r[2]), lead: escText_(r[3]), opened: iso_(r[1]), closed: iso_(r[5]) }; }
/* HQ, or the lead of THIS shelter (their lead code). */
function sciaBoss_(d) {
  var a = sciaRow_(d.id);
  if (!a) return { err: { ok: false, gone: true, error: 'That shelter was not found. It may have been closed and erased.' } };
  if (d.token && !escDenied_(d)) { a.role = 'hq'; return a; }
  var code = escKey_(d.lead);
  if (code && code === escText_(a.r[7])) { if (escText_(a.r[5])) return { err: { ok: false, closed: true, error: 'This shelter was closed by HQ.' } }; a.role = 'lead'; return a; }
  return { err: { ok: false, login: true, error: d.token ? 'Your HQ login has ended. Please log in again.' : 'Please log in as the lead again.' } };
}

// Open shelters, for the worker's "Request access" and the lead's log in (names only).
function sciaShelters_() {
  sciaTabs_(); sciaPurge_();
  return { ok: true, items: rows_('Offline SCIA Shelters').filter(function (r) { return !escText_(r[5]); }).map(sciaOut_) };
}
// HQ: name a shelter and assign its lead.
function sciaOpen_(d) {
  sciaTabs_();
  if (!d.token || escDenied_(d)) return { ok: false, login: true, error: 'Please log in as HQ.' };
  var name = clean_(d.name, 120), lead = shName_(d.lead);
  if (!name) return { ok: false, error: 'Please type the shelter name.' };
  if (!lead) return { ok: false, error: 'Please type the lead\'s name.' };
  var id = escId_(d.id); if (!id) return { ok: false, error: 'Please reload the page and try again.' };
  var sh = tab_('Offline SCIA Shelters'); if (escFindRow_(sh, id)) return { ok: true, id: id };
  sh.appendRow([id, stamp_(), safe_(name), safe_(lead), 'HQ', '', String(Date.now()), sciaCode_()]);
  return { ok: true, id: id };
}
// HQ: every shelter (open and closed), with counts.
function sciaHq_(d) {
  sciaTabs_(); sciaPurge_();
  if (!d.token || escDenied_(d)) return { ok: false, login: true, error: 'Please log in as HQ.' };
  var intakes = rows_('Offline SCIA Intakes'), workers = rows_('Offline SCIA Workers'), now = Date.now();
  return { ok: true, items: rows_('Offline SCIA Shelters').map(function (r) {
    var o = sciaOut_(r);
    o.intakes = intakes.filter(function (x) { return String(x[0]) === o.id; }).length;
    o.asking = workers.filter(function (x) { return String(x[0]) === o.id && escText_(x[4]) === 'asked'; }).length;
    o.workers = workers.filter(function (x) { return String(x[0]) === o.id && escText_(x[4]) === 'granted' && Number(x[6]) > now; }).length;
    return o;
  }).reverse() };
}
// HQ: change the lead (the old lead's phone is logged out: new lead code).
function sciaSetLead_(d) {
  var a = sciaBoss_(d); if (a.err) return a.err;
  if (a.role !== 'hq') return { ok: false, login: true, error: 'Only HQ can change the lead.' };
  var lead = shName_(d.lead); if (!lead) return { ok: false, error: 'Please type the lead\'s name.' };
  a.sh.getRange(a.row, 4, 1, 1).setValues([[safe_(lead)]]);
  a.sh.getRange(a.row, 8, 1, 1).setValues([[sciaCode_()]]);
  sciaTouch_(a);
  return { ok: true };
}
// HQ: close the shelter. Workers lose access now; the intakes are erased SCIA_KEEP_DAYS later.
function sciaClose_(d) {
  var a = sciaBoss_(d); if (a.err) return a.err;
  if (a.role !== 'hq') return { ok: false, login: true, error: 'Only HQ can close the shelter.' };
  if (!escText_(a.r[5])) a.sh.getRange(a.row, 6, 1, 1).setValues([[stamp_()]]);
  sciaWorkersSet_(a.id, function () { return true; }, 'revoked');
  sciaTouch_(a);
  return { ok: true };
}
// The lead logs in: the LEAD user name and password, and their shelter.
function sciaLeadLogin_(d) {
  var bad = leadDenied_({ user: d.user || '', password: d.password || '' });
  if (bad) return { ok: false, error: bad.error || 'Please type the lead user name and password.' };
  var a = sciaRow_(d.id);
  if (!a || escText_(a.r[5])) return { ok: false, error: 'That shelter is not open.' };
  return { ok: true, lead: escText_(a.r[7]), shelter: sciaOut_(a.r) };
}

// ---- intake workers
function sciaWorker_(d) {
  var t = tab_('Offline SCIA Workers'), data = t.getDataRange().getValues(), wid = escId_(d.wid), code = escKey_(d.wkey);
  if (!wid || !code) return null;
  for (var i = 1; i < data.length; i++) if (String(data[i][0]) === String(d.id) && String(data[i][1]) === wid && escText_(data[i][7]) === code) return { t: t, row: i + 1, r: data[i] };
  return null;
}
function sciaWorkerState_(w) {
  var st = escText_(w.r[4]);
  if (st === 'granted' && Number(w.r[6]) <= Date.now()) st = 'expired';
  return st;
}
function sciaWorkersSet_(id, test, status) {
  var t = tab_('Offline SCIA Workers'), data = t.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) if (String(data[i][0]) === id && test(data[i])) t.getRange(i + 1, 5, 1, 3).setValues([[status, stamp_(), status === 'granted' ? String(Date.now() + SCIA_HOURS * 3600000) : '0']]);
}
// A worker asks for access (name + shelter). Returns nothing about the shelter's clients.
function sciaAsk_(d) {
  var a = sciaRow_(d.id);
  if (!a || escText_(a.r[5])) return { ok: false, error: 'That shelter is not open.' };
  var name = shName_(d.name), wid = escId_(d.wid), code = escKey_(d.wkey);
  if (!name) return { ok: false, error: 'Please type your name.' };
  if (!wid || !code) return { ok: false, error: 'Please reload the page and try again.' };
  if (sciaWorker_(d)) return { ok: true };
  tab_('Offline SCIA Workers').appendRow([a.id, wid, safe_(name), stamp_(), 'asked', stamp_(), '0', code, 0]);
  sciaTouch_(a);
  return { ok: true };
}
// The worker's phone checks: asked / granted / denied / revoked / expired.
function sciaAskStatus_(d) {
  sciaTabs_();
  var a = sciaRow_(d.id); if (!a) return { ok: true, status: 'gone' };
  var w = sciaWorker_(d); if (!w) return { ok: true, status: 'gone' };
  var st = escText_(a.r[5]) ? 'closed' : sciaWorkerState_(w);
  return { ok: true, status: st, name: escText_(w.r[2]), shelter: escText_(a.r[2]), lead: escText_(a.r[3]), until: Number(w.r[6]) || 0, sent: Number(w.r[8]) || 0 };
}
// SEND ONE INTAKE (the only thing a worker can do with client details). Nothing comes back but the time.
function sciaSubmit_(d) {
  var a = sciaRow_(d.id);
  if (!a || escText_(a.r[5])) return { ok: false, ended: true, error: 'This shelter is closed. The intake was not sent.' };
  var w = sciaWorker_(d); if (!w) return { ok: false, ended: true, error: 'Your access was not found. The intake was not sent.' };
  var st = sciaWorkerState_(w);
  if (st !== 'granted') return { ok: false, ended: true, status: st, error: st === 'expired' ? 'Your 24 hours of access have ended. Ask your lead to grant you again; the intake is still on this screen.' : 'Your access has ended. The intake was not sent.' };
  var iid = escId_(d.iid); if (!iid) return { ok: false, error: 'Please try again.' };
  var t = tab_('Offline SCIA Intakes'), data = t.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) if (String(data[i][0]) === a.id && String(data[i][1]) === iid) return { ok: true, at: iso_(data[i][2]) };   // sent twice (weak signal)
  var f = sciaClean_(d.form), now = new Date();
  f.worker = escText_(w.r[2]); f.date = today_();
  var people = 1 + (f.house || []).filter(function (h) { return h.name; }).length;
  t.appendRow([a.id, iid, stamp_(now), safe_(f.worker), safe_(f.pname || '(no name)'), safe_(f.pcot || ''), people, sciaFlags_(f).join(', '), JSON.stringify(f)]);
  w.t.getRange(w.row, 9, 1, 1).setValues([[(Number(w.r[8]) || 0) + 1]]);
  sciaTouch_(a);
  return { ok: true, at: stamp_(now) };
}
function sciaClean_(form) {
  var out = {};
  if (!form || typeof form !== 'object') return out;
  Object.keys(form).slice(0, 120).forEach(function (k) {
    if (!/^[a-z][a-z0-9_]{0,20}$/.test(k)) return;
    if (k === 'house') {
      out.house = (Array.isArray(form.house) ? form.house : []).slice(0, 15).map(function (h) {
        h = h || {}; return { name: clean_(h.name, 80), age: clean_(h.age, 10), cot: clean_(h.cot, 20), contact: clean_(h.contact, 120) };
      }).filter(function (h) { return h.name || h.age || h.cot || h.contact; });
    } else if (typeof form[k] === 'boolean') out[k] = form[k];
    else out[k] = clean_(form[k], 2000);
  });
  return out;
}
// Short "needs attention" labels for the dashboard (from the answers).
function sciaFlags_(f) {
  var out = [], yes = function (k) { return f[k] === 'Yes'; };
  if (f.allergy || yes('c4')) out.push('allergy');
  if (f.diet || yes('c5')) out.push('diet');
  if (f.med || yes('c6') || yes('c7')) out.push('medical');
  if (yes('c8') || f.infant) out.push('infant/pregnancy');
  if (yes('c10')) out.push('mental health');
  if (f.dis || yes('c11') || yes('c13')) out.push('mobility');
  if (yes('c12')) out.push('power');
  if (yes('c14') || f.pets) out.push('animals');
  if (f.other) out.push('see notifications');
  return out;
}

// ---- dashboard (HQ and the lead)
function sciaDash_(d) {
  var a = sciaBoss_(d); if (a.err) return a.err;
  var now = Date.now();
  var workers = rows_('Offline SCIA Workers').filter(function (r) { return String(r[0]) === a.id; }).map(function (r) {
    var st = escText_(r[4]); if (st === 'granted' && Number(r[6]) <= now) st = 'expired';
    return { wid: String(r[1]), name: escText_(r[2]), asked: iso_(r[3]), status: st, changed: iso_(r[5]), until: Number(r[6]) || 0, sent: Number(r[8]) || 0 };
  });
  var intakes = rows_('Offline SCIA Intakes').filter(function (r) { return String(r[0]) === a.id; }).map(function (r) {
    return { iid: String(r[1]), at: iso_(r[2]), by: escText_(r[3]), client: escText_(r[4]), cot: escText_(r[5]), people: Number(r[6]) || 1, flags: escText_(r[7]) };
  }).reverse();
  return { ok: true, role: a.role, shelter: sciaOut_(a.r), workers: workers, intakes: intakes, now: now, today: today_() };
}
// Grant / deny / revoke an intake worker (the lead, or HQ).
function sciaGrant_(d) {
  var a = sciaBoss_(d); if (a.err) return a.err;
  var to = { grant: 'granted', deny: 'denied', revoke: 'revoked' }[d.what];
  if (!to) return { ok: false, error: 'Unknown choice.' };
  var wid = escId_(d.wid);
  sciaWorkersSet_(a.id, function (r) { return String(r[1]) === wid; }, to);
  sciaTouch_(a);
  return { ok: true };
}
function sciaFindIntake_(a, iid) {
  var t = tab_('Offline SCIA Intakes'), data = t.getDataRange().getValues();
  iid = escId_(iid);
  for (var i = 1; i < data.length; i++) if (String(data[i][0]) === a.id && String(data[i][1]) === iid) return { t: t, row: i + 1, r: data[i] };
  return null;
}
// One intake in full (HQ and the lead only).
function sciaIntake_(d) {
  var a = sciaBoss_(d); if (a.err) return a.err;
  var x = sciaFindIntake_(a, d.iid); if (!x) return { ok: false, gone: true, error: 'That intake is no longer here. It may have been entered into SCIA and deleted.' };
  return { ok: true, at: iso_(x.r[2]), form: rqForm_(x.r[8]) };
}
// "Entered into SCIA": DELETES the intake (the paper form: "Upon uploading to SCIA, this form must be deleted").
function sciaEntered_(d) {
  var a = sciaBoss_(d); if (a.err) return a.err;
  var x = sciaFindIntake_(a, d.iid);
  if (x) x.t.deleteRow(x.row);
  sciaTouch_(a);
  return { ok: true };
}
// Everything still here, for the Excel download (HQ and the lead).
function sciaExport_(d) {
  var a = sciaBoss_(d); if (a.err) return a.err;
  var list = rows_('Offline SCIA Intakes').filter(function (r) { return String(r[0]) === a.id; }).map(function (r) { var f = rqForm_(r[8]); f.sent = iso_(r[2]); return f; });
  return { ok: true, shelter: sciaOut_(a.r), intakes: list };
}
// Closed shelters: everything erased SCIA_KEEP_DAYS after closing. Runs at most every 10 minutes (and nightly).
function sciaPurge_(force) {
  if (!AUTO_DELETE) return;     // v0.27.49: off for the demos
  var c = CacheService.getScriptCache();
  if (!force && c.get('sciaPurge')) return;
  c.put('sciaPurge', '1', 600);
  if (!tab_('Offline SCIA Shelters')) return;
  sciaTabs_();
  var cut = stamp_(new Date(Date.now() - SCIA_KEEP_DAYS * 86400000));
  rows_('Offline SCIA Shelters').forEach(function (r) {
    var closed = iso_(r[5]);
    if (!closed || closed > cut) return;
    var id = String(r[0]);
    ['Offline SCIA Shelters', 'Offline SCIA Workers', 'Offline SCIA Intakes'].forEach(function (n) {
      var sh = tab_(n), last = sh.getLastRow(); if (last < 2) return;
      var ids = sh.getRange(2, 1, last - 1, 1).getValues();
      for (var i = ids.length - 1; i >= 0; i--) if (String(ids[i][0]) === id) sh.deleteRow(i + 2);
    });
  });
}


/* =========================================================
   CURRENT OPERATIONS FOR EVERY DEVICE (website v0.27.49, Sean Oct 17, 2026). Whoever opens one of the
   three forms, on any device, sees every open event at the top (js/current-ops.js). An event this device
   is not on yet shows "Join": the lead or HQ logs in and goes straight in (coLogin_), anyone else asks
   (askJoin_, answered by the lead / a supervisor / HQ). The public list shows names only, never anything
   typed into a form; escalation worksheets show the TOWN and start time, never the street address.
   ========================================================= */
// v0.27.51 (Sean): the worksheet's name in the public list is its address WITHOUT the house number, state or zip:
// "99 Johnson" -> "Johnson"; "99 Johnson Street, Philadelphia, PA 19104" -> "Johnson Street, Philadelphia".
// Nothing typed yet (or only a number) -> '' and the page shows "Incomplete address".
function coTown_(addr) {
  var first = String(addr || '').split('\n')[0];
  var parts = first.split(',').map(function (p) {
    return p.replace(/\b(PA|Pennsylvania|NJ|New Jersey|DE|Delaware)\b/gi, '').replace(/\b\d{5}(-\d{4})?\b/g, '').replace(/\s+/g, ' ').trim();
  }).filter(String);
  if (!parts.length) return '';
  parts[0] = parts[0].replace(/^(#?\d+[A-Za-z]?([-\/][A-Za-z0-9]+)?\s+)+/, '').replace(/^#?\d+[A-Za-z]?$/, '').trim();
  parts = parts.filter(String);
  return clean_(parts.slice(0, 2).join(', '), 60);
}
// PUBLIC: the open events of one form (names only).
function coOpen_(d) {
  var form = askForm_(d.form), out = [];
  if (form === 'esc') {
    var sh = escTab_(), last = sh.getLastRow();
    if (last >= 2) sh.getRange(2, 1, last - 1, 7).getValues().forEach(function (r) {
      var id = escId_(r[0]); if (!id || escIsCleared_(id)) return;
      var w = escOpen_(r[6]); if (!w.meta.k) return;
      out.push({ id: id, started: iso_(r[1]), ms: Number(escText_(r[5])) || 0, town: coTown_(w.data.incident_addresses),
        lead: clean_(String(w.data.leaders_arc_lead_1 || '').split('\n')[0], 60) });
    });
  } else if (form === 'rec') {
    var csh = recCenters_(), lastc = csh.getLastRow();
    if (lastc >= 2) csh.getRange(2, 1, lastc - 1, 7).getValues().forEach(function (r) {
      var id = escId_(r[0]); if (!id || recIsCleared_(id)) return;
      out.push({ id: id, started: iso_(r[1]), ms: Number(escText_(r[6])) || 0, name: escText_(r[3]), lead: escText_(r[4]), count: parseInt(escText_(r[5]), 10) || 0 });
    });
  } else if (form === 'sh') {
    shTabs_();
    rows_('Shelters').forEach(function (r) {
      var id = escId_(r[0]); if (!id) return;
      out.push({ id: id, started: iso_(r[1]), ms: Number(r[6]) || 0, name: escText_(r[2]), lead: escText_(r[4]) });
    });
  } else return { ok: false, error: 'Unknown form.' };
  out.sort(function (a, b) { return b.ms - a.ms; });
  return { ok: true, items: out.slice(0, 40), now: Date.now() };
}
// THE LEAD (or HQ) OPENS AN EVENT ON ANOTHER DEVICE: the lead (or HQ) user name and password. The device gets
// the event's code and is marked a lead (co-lead) on it; on a shelter the name is added to the supervisors.
function coLogin_(d) {
  var form = askForm_(d.form), id = escId_(d.id), who = clean_(d.who, 60).replace(/\s+/g, ' ');
  if (!form || !id) return { ok: false, error: 'That event was not found.' };
  if (!who) return { ok: false, error: 'Please type your name.' };
  var bad = leadDenied_({ user: d.user || '', password: d.password || '' });
  if (bad) return { ok: false, error: bad.error || 'Please type the lead user name and password.' };
  if (form === 'esc') {
    var sh = escTab_(), row = escFindRow_(sh, id);
    if (!row || escIsCleared_(id)) return { ok: false, gone: true, error: 'That worksheet is no longer open.' };
    var key = escShareKey_(sh, row, id);     // v0.27.58: also works for worksheets started before v0.27.28
    rosterCheckIn_('esc', id, { dev: d.dev, who: who }, 'co-lead');
    return { ok: true, key: key };
  }
  if (form === 'rec') {
    var csh = recCenters_(), crow = escFindRow_(csh, id);
    if (!crow || recIsCleared_(id)) return { ok: false, gone: true, error: 'That reception center is no longer open.' };
    var jk = escKey_(csh.getRange(crow, 10, 1, 1).getValues()[0][0]);
    if (!jk) return { ok: false, error: 'This center needs one of its phones to check in first. Ask the lead to let you in instead.' };
    rosterCheckIn_('rec', id, { dev: d.dev, who: who }, 'co-lead');
    return { ok: true, key: jk, center: escText_(csh.getRange(crow, 4, 1, 1).getValues()[0][0]) };
  }
  var st = shTab_(), srow = escFindRow_(st, id);
  if (!srow || shIsClosed_(id)) return { ok: false, gone: true, error: 'That shelter is no longer open.' };
  var r = st.getRange(srow, 1, 1, SH_HEADERS.length).getValues()[0], code = escText_(r[7]);
  shAddSup_({ id: id, key: code, me: 'Lead login', name: who, self: false });     // also brings back someone who was removed
  return { ok: true, key: code, shelter: escText_(r[2]) };
}


/* =========================================================
   STRESS TEST LOGGING (website v0.27.52, Sean Oct 17, 2026). For his stress test of the Escalation and
   Reception Center forms. OFF unless the Settings tab says so, so people trying the forms other days are
   not counted. Two rows in Settings (added by themselves):
     "Stress test: OFF, ON or SURVEY"   OFF = nothing logged; ON = the two forms log; SURVEY = they show
                                        "The test is over" with a link to the survey (pages/survey.html)
     "Stress test: run name"            a label for this run, e.g. "Stress test 2026-10-21"; every row carries it
   Nothing typed into a form is ever logged: only which action, how long it took, whether it worked,
   page loads, errors, and the kind of device. Each phone has a random test code.
   Tabs (appear by themselves): "Test log" (one row per event), "Test survey" (one row per answer sheet).
   ========================================================= */
var TEST_MODE_LABEL = 'Stress test: OFF, ON or SURVEY';
var TEST_RUN_LABEL = 'Stress test: run name';
function testState_() {
  var c = CacheService.getScriptCache(), hit = c.get('testState');
  if (hit) { try { return JSON.parse(hit); } catch (e) {} }
  var sh = tab_('Settings'), data = sh.getDataRange().getValues(), mode = '', run = '', seenM = false, seenR = false;
  for (var i = 0; i < data.length; i++) {
    var k = String(data[i][0]).trim();
    if (k === TEST_MODE_LABEL) { seenM = true; mode = String(data[i][1]).trim().toUpperCase(); }
    if (k === TEST_RUN_LABEL) { seenR = true; run = clean_(escText_(data[i][1]), 80); }
  }
  if (!seenM) sh.appendRow([TEST_MODE_LABEL, 'OFF']);
  if (!seenR) sh.appendRow([TEST_RUN_LABEL, '']);
  var out = { mode: mode === 'ON' || mode === 'SURVEY' ? mode : 'OFF', run: run || 'Stress test' };
  c.put('testState', JSON.stringify(out), 20);      // a change in the Sheet shows within 20 seconds
  return out;
}
function testStatus_() { var t = testState_(); return { ok: true, mode: t.mode, run: t.mode === 'OFF' ? '' : t.run }; }
// A batch of events from one phone (only while ON). Each event: [client time ms, form, event, detail, ms].
function testLog_(d) {
  var t = testState_();
  if (t.mode !== 'ON') return { ok: true, off: true };
  var dev = String(d.dev || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 24), plat = clean_(d.plat, 40);
  var evs = Array.isArray(d.ev) ? d.ev.slice(0, 200) : [];
  if (!dev || !evs.length) return { ok: true };
  makeTab_('Test log', ['Run', 'Received', 'Phone (test code)', 'Device', 'Form', 'Event', 'Detail', 'Milliseconds', 'Phone time']);
  var now = stamp_(), rows = evs.map(function (e) {
    e = Array.isArray(e) ? e : [];
    return [safe_(t.run), now, dev, safe_(plat), safe_(clean_(e[1], 12)), safe_(clean_(e[2], 30)), safe_(clean_(e[3], 120)),
      Math.max(0, Math.min(600000, Number(e[4]) || 0)), stamp_(new Date(Number(e[0]) || Date.now()))];
  });
  var sh = tab_('Test log');
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  return { ok: true };
}
// The survey (while ON or SURVEY).
function testSurvey_(d) {
  var t = testState_();
  if (t.mode === 'OFF') return { ok: false, closed: true, error: 'The survey is closed. Thank you!' };
  var a = d.a || {};
  makeTab_('Test survey', ['Run', 'Sent', 'Phone (test code)', 'Role', 'Finding your event (1-5)', 'Joining', 'Anything fail or freeze?', 'What failed', 'This or paper (1 paper - 5 this)', 'One thing to change', 'Name (optional)']);
  tab_('Test survey').appendRow([safe_(t.run), stamp_(), String(d.dev || '').replace(/[^A-Za-z0-9]/g, '').slice(0, 24),
    safe_(clean_(a.role, 20)), Number(a.find) || '', safe_(clean_(a.join, 20)), safe_(clean_(a.fail, 5)), safe_(clean_(a.failWhat, 1000)),
    Number(a.paper) || '', safe_(clean_(a.change, 1000)), safe_(clean_(a.name, 60))]);
  return { ok: true };
}
