/**
 * SEPA Resource Library - DAT Shift Signup backend
 *
 * This code lives inside a Google Sheet (Extensions > Apps Script).
 * It is NOT part of the website itself. See SHIFT-SIGNUP-SETUP.md.
 *
 * The Sheet has three tabs:
 *   Signups  - every signup lands here (admin reads this)
 *   Shifts   - the admin lists the shifts here (name, times, spots, days)
 *   Settings - admin email for alerts, and how far ahead people can sign up
 */

var TAB_SIGNUPS = 'Signups';
var TAB_SHIFTS = 'Shifts';
var TAB_SETTINGS = 'Settings';
var DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/* Run this ONCE from the Apps Script editor to create the tabs. */
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var signups = ss.getSheetByName(TAB_SIGNUPS) || ss.insertSheet(TAB_SIGNUPS);
  if (signups.getLastRow() === 0) {
    signups.appendRow(['Submitted', 'Shift Date', 'Shift', 'Name', 'Phone', 'Email', 'Notes']);
    signups.getRange('B:B').setNumberFormat('@');
    signups.setFrozenRows(1);
    signups.getRange('1:1').setFontWeight('bold');
  }

  var shifts = ss.getSheetByName(TAB_SHIFTS) || ss.insertSheet(TAB_SHIFTS);
  if (shifts.getLastRow() === 0) {
    shifts.getRange('A:E').setNumberFormat('@');
    shifts.appendRow(['Shift Name', 'Start', 'End', 'Spots', 'Days (All, or e.g. Mon,Wed,Sat)']);
    shifts.appendRow(['Day Shift', '8:00 AM', '8:00 PM', '3', 'All']);
    shifts.appendRow(['Night Shift', '8:00 PM', '8:00 AM', '3', 'All']);
    shifts.setFrozenRows(1);
    shifts.getRange('1:1').setFontWeight('bold');
  }

  var settings = ss.getSheetByName(TAB_SETTINGS) || ss.insertSheet(TAB_SETTINGS);
  if (settings.getLastRow() === 0) {
    settings.getRange('A:B').setNumberFormat('@');
    settings.appendRow(['Setting', 'Value']);
    settings.appendRow(['Admin email (gets an email for each signup; leave blank for none)', '']);
    settings.appendRow(['Days ahead people can sign up', '60']);
    settings.getRange('1:1').setFontWeight('bold');
    settings.setColumnWidth(1, 460);
  }

  var blank = ss.getSheetByName('Sheet1');
  if (blank && ss.getSheets().length > 1 && blank.getLastRow() === 0) ss.deleteSheet(blank);
}

/* ---------- helpers ---------- */

function tz_() { return SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone(); }

function asDateText_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, tz_(), 'yyyy-MM-dd');
  return String(v).trim();
}

function asText_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, tz_(), 'h:mm a');
  return String(v).trim();
}

function readShifts_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TAB_SHIFTS);
  var rows = sh.getDataRange().getValues().slice(1);
  var out = [];
  rows.forEach(function (r) {
    var name = asText_(r[0]);
    if (!name) return;
    var days = asText_(r[4] || 'All');
    out.push({
      name: name,
      start: asText_(r[1]),
      end: asText_(r[2]),
      spots: parseInt(r[3], 10) || 1,
      days: /^all$/i.test(days) ? 'All' : days
    });
  });
  return out;
}

function readSettings_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TAB_SETTINGS);
  var rows = sh.getDataRange().getValues();
  return {
    adminEmail: String(rows[1] && rows[1][1] || '').trim(),
    daysAhead: parseInt(rows[2] && rows[2][1], 10) || 60
  };
}

/* Count signups per "date|shift" from today onward. */
function countTaken_() {
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TAB_SIGNUPS);
  var rows = sh.getDataRange().getValues().slice(1);
  var today = Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd');
  var taken = {};
  rows.forEach(function (r) {
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
  var dow = DAY_NAMES[new Date(+p[0], +p[1] - 1, +p[2]).getDay()];
  return shift.days.split(',').some(function (d) {
    return d.trim().slice(0, 3).toLowerCase() === dow.toLowerCase();
  });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ---------- website asks: what shifts and how many spots are left? ---------- */

function doGet() {
  var s = readSettings_();
  return json_({
    ok: true,
    today: Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd'),
    daysAhead: s.daysAhead,
    shifts: readShifts_(),
    taken: countTaken_()   // counts only, never names
  });
}

/* ---------- website sends: a new signup ---------- */

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var d = JSON.parse(e.postData.contents || '{}');

    if (d.website) return json_({ ok: true });   // spam trap: real people leave this empty

    var date = String(d.date || '').trim();
    var shiftName = String(d.shift || '').trim();
    var name = String(d.name || '').trim().slice(0, 100);
    var phone = String(d.phone || '').trim().slice(0, 40);
    var email = String(d.email || '').trim().slice(0, 120);
    var notes = String(d.notes || '').trim().slice(0, 500);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return json_({ ok: false, error: 'Please pick a day.' });
    if (!name) return json_({ ok: false, error: 'Please enter your name.' });
    if (!phone && !email) return json_({ ok: false, error: 'Please enter a phone number or email.' });

    var s = readSettings_();
    var today = Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd');
    var last = Utilities.formatDate(new Date(Date.now() + s.daysAhead * 86400000), tz_(), 'yyyy-MM-dd');
    if (date < today || date > last) return json_({ ok: false, error: 'That day is not open for signup.' });

    var shift = readShifts_().filter(function (x) { return x.name === shiftName; })[0];
    if (!shift || !shiftRunsOn_(shift, date)) return json_({ ok: false, error: 'That shift is not available on that day.' });

    var taken = countTaken_()[date + '|' + shift.name] || 0;
    if (taken >= shift.spots) return json_({ ok: false, error: 'Sorry, that shift just filled up. Please pick another.' });

    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TAB_SIGNUPS)
      .appendRow([new Date(), date, shift.name, name, phone, email, notes]);

    if (s.adminEmail) {
      MailApp.sendEmail(s.adminEmail,
        'DAT shift signup: ' + name + ', ' + date + ' ' + shift.name,
        name + ' signed up for ' + shift.name + ' (' + shift.start + ' to ' + shift.end + ') on ' + date + '.\n\n' +
        'Phone: ' + (phone || '-') + '\nEmail: ' + (email || '-') + '\nNotes: ' + (notes || '-') + '\n\n' +
        'All signups: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl());
    }

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: 'Something went wrong. Please try again.' });
  } finally {
    lock.releaseLock();
  }
}
