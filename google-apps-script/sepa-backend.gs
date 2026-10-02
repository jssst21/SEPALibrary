/**
 * SEPA Resource Library - Google Sheet backend
 * Powers: DAT shift signup calendar + Discussion Forums
 *
 * This code lives inside ONE Google Sheet (Extensions > Apps Script).
 * It is NOT part of the website itself. See "Admin Guides" folder, Guide 2.
 *
 * Tabs the admin uses:
 *   Signups   - every shift signup (delete a row to cancel it)
 *   Shifts    - shift names, times, spots, days
 *   Settings  - admin email, how far ahead people can sign up
 *   Members   - forum members (only used if logins are turned on). YES in "Blocked" blocks someone.
 *   Topics    - forum discussions. Type YES in "Hidden" to hide one.
 *   Replies   - forum replies. Type YES in "Hidden" to hide one.
 *   Sessions  - logins, only if turned on (leave alone; delete all rows to log everyone out)
 */

/* The Google Sheet this script saves to (the long code in the Sheet's web address,
   between /d/ and /edit). Leave blank only if the script was opened from the Sheet itself. */
var SHEET_ID = '1Ndx-55A7LBEYv8lrX8lpryu9-iOUL9WXmwiTiM9eF9I';

var DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* Forum logins. false = no sign-up: anyone can read and post by typing their name.
   true  = members must join / log in (name + password). */
var FORUM_REQUIRES_LOGIN = false;
var SESSION_DAYS = 180;

/* =========================================================
   ONE-TIME SETUP: run this once from the Apps Script editor
   ========================================================= */
function setup() {
  makeTab_('Signups', ['Submitted', 'Shift Date', 'Shift', 'Name', 'Phone', 'Email', 'Notes']);
  makeTab_('Shifts', ['Shift Name', 'Start', 'End', 'Spots', 'Days (All, or e.g. Mon,Wed,Sat)'], [
    ['Day Shift', '8:00 AM', '8:00 PM', '3', 'All'],
    ['Night Shift', '8:00 PM', '8:00 AM', '3', 'All']
  ]);
  makeTab_('Settings', ['Setting', 'Value'], [
    ['Admin email (gets an email for each shift signup; leave blank for none)', ''],
    ['Days ahead people can sign up', '60']
  ]);
  makeTab_('Members', ['Name', 'Joined', 'Blocked (type YES)', 'Password check (do not edit)', 'Salt (do not edit)']);
  makeTab_('Topics', ['ID', 'Created', 'Author', 'Title', 'Message', 'Last Activity', 'Replies', 'Hidden (type YES)']);
  makeTab_('Replies', ['ID', 'Topic ID', 'Created', 'Author', 'Message', 'Hidden (type YES)']);
  makeTab_('Sessions', ['Token', 'Name', 'Created']);

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
      join: FORUM_REQUIRES_LOGIN ? join_ : null,
      login: FORUM_REQUIRES_LOGIN ? login_ : null,
      logout: logout_,
      topics: listTopics_,
      topic: getTopic_,
      newTopic: newTopic_,
      reply: reply_
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
   ========================================================= */
function readShifts_() {
  return rows_('Shifts').map(function (r) {
    var days = asText_(r[4] || 'All');
    return {
      name: asText_(r[0]), start: asText_(r[1]), end: asText_(r[2]),
      spots: parseInt(r[3], 10) || 1, days: /^all$/i.test(days) ? 'All' : days
    };
  }).filter(function (s) { return s.name; });
}

function readSettings_() {
  var r = tab_('Settings').getDataRange().getValues();
  return {
    adminEmail: String(r[1] && r[1][1] || '').trim(),
    daysAhead: parseInt(r[2] && r[2][1], 10) || 60
  };
}

function countTaken_() {
  var today = today_(), taken = {};
  rows_('Signups').forEach(function (r) {
    var d = asDateText_(r[1]);
    if (d < today) return;
    var key = d + '|' + asText_(r[2]);
    taken[key] = (taken[key] || 0) + 1;
  });
  return taken;
}

function shiftRunsOn_(shift, dateText) {
  if (shift.days === 'All') return true;
  var p = dateText.split('-');
  var dow = DAY_NAMES[new Date(+p[0], +p[1] - 1, +p[2]).getDay()].toLowerCase();
  return shift.days.split(',').some(function (d) { return d.trim().slice(0, 3).toLowerCase() === dow; });
}

function shiftData_() {
  return { ok: true, today: today_(), daysAhead: readSettings_().daysAhead, shifts: readShifts_(), taken: countTaken_() };
}

function shiftSignup_(d) {
  if (d.website) return { ok: true };   // spam trap
  var date = clean_(d.date, 10), shiftName = clean_(d.shift, 100);
  var name = clean_(d.name, 100), phone = clean_(d.phone, 40), email = clean_(d.email, 120), notes = clean_(d.notes, 500);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: 'Please pick a day.' };
  if (!name) return { ok: false, error: 'Please enter your name.' };
  if (!phone && !email) return { ok: false, error: 'Please enter a phone number or email.' };

  var s = readSettings_();
  var last = Utilities.formatDate(new Date(Date.now() + s.daysAhead * 86400000), tz_(), 'yyyy-MM-dd');
  if (date < today_() || date > last) return { ok: false, error: 'That day is not open for signup.' };

  var shift = readShifts_().filter(function (x) { return x.name === shiftName; })[0];
  if (!shift || !shiftRunsOn_(shift, date)) return { ok: false, error: 'That shift is not available on that day.' };
  if ((countTaken_()[date + '|' + shift.name] || 0) >= shift.spots) {
    return { ok: false, error: 'Sorry, that shift just filled up. Please pick another.' };
  }

  tab_('Signups').appendRow([stamp_(), date, safe_(shift.name), safe_(name), safe_(phone), safe_(email), safe_(notes)]);

  if (s.adminEmail) {
    MailApp.sendEmail(s.adminEmail, 'DAT shift signup: ' + name + ', ' + date + ' ' + shift.name,
      name + ' signed up for ' + shift.name + ' (' + shift.start + ' to ' + shift.end + ') on ' + date + '.\n\n' +
      'Phone: ' + (phone || '-') + '\nEmail: ' + (email || '-') + '\nNotes: ' + (notes || '-') + '\n\n' +
      'All signups: ' + ss_().getUrl());
  }
  return { ok: true };
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
