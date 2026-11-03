/**
 * Admin functions — run from the Apps Script editor (Run ▸ function name).
 *   1. setup()        creates every tab + Config + Staff seed
 *   2. paste data into tabs import_TA and studentnow
 *   3. importHours()  fills Student + Hours from import_TA
 *   4. importRoster() fills Student.email from studentnow
 */

/** The only binding to a specific spreadsheet; saved to Script Properties by setup(). */
const BOOTSTRAP_SHEET_ID = '1B3lrbfjyRWaMn2QH3x7_nlly4LKwO4mXPnRTmzF3uvc';
const SEED_STAFF = [['rungtiwa.p@cmu.ac.th', 'เจ้าหน้าที่']];

function setup() {
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('SHEET_ID')) props.setProperty('SHEET_ID', BOOTSTRAP_SHEET_ID);
  secret_();
  resetCaches_();

  const book = ss_();
  Object.keys(SCHEMA).forEach(name => {
    const head = SCHEMA[name];
    const sh = book.getSheetByName(name) || book.insertSheet(name);
    sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold');
    sh.setFrozenRows(1);
    head.forEach((k, i) => { if (/(^|_)id$|^email$/.test(k)) sh.getRange(2, i + 1, sh.getMaxRows() - 1, 1).setNumberFormat('@'); });
  });

  // Config: add any missing keys, never overwrite what the admin edited.
  const have = {};
  rows_(TAB.CONFIG).forEach(r => { have[String(r.key)] = true; });
  Object.keys(CONFIG_DEFAULTS).filter(k => !have[k]).forEach(k => append_(TAB.CONFIG, { key: k, value: CONFIG_DEFAULTS[k] }));

  if (!rows_(TAB.STAFF).length) SEED_STAFF.forEach(s => append_(TAB.STAFF, { email: s[0], name: s[1] }));
  log_('setup done. Next: paste into "' + IMPORT_TAB.HOURS + '" and "' + IMPORT_TAB.ROSTER + '", then importHours() and importRoster().');
}

/** Read a pasted tab: find the header row containing all of `must`, return {head, rows}. */
function readPasted_(tab, must) {
  const sh = ss_().getSheetByName(tab);
  if (!sh) throw new Error('Missing tab "' + tab + '" — paste the data there first');
  const v = sh.getDataRange().getValues();
  const at = v.findIndex(r => must.every(m => r.some(c => String(c).trim() === m)));
  if (at < 0) throw new Error('Tab "' + tab + '": header row with ' + must.join(', ') + ' not found');
  const head = v[at].map(c => String(c).trim());
  return { head, rows: v.slice(at + 1).filter(r => r.some(c => c !== '')) };
}

/** import_TA (sheet "ส่งนักศึกษาตรวจสอบ") → Student(id,name) + Hours(term,id,round,hours) for the current TERM. */
function importHours() {
  resetCaches_();
  const term = cfg_().TERM;
  const { head, rows } = readPasted_(IMPORT_TAB.HOURS, ['รหัสนักศึกษา', 'ชื่อ-สกุล']);
  const iId = head.indexOf('รหัสนักศึกษา'), iName = head.indexOf('ชื่อ-สกุล');
  const roundCols = [];
  head.forEach((h, i) => { const m = /จำนวนชั่วโมง\s*รอบที่\s*(\d+)/.exec(h); if (m) roundCols.push({ i, round: Number(m[1]) }); });
  if (!roundCols.length) throw new Error('No "จำนวนชั่วโมง รอบที่ N" columns found');

  const hours = [], people = {};
  rows.forEach(r => {
    const sid = id_(r[iId]);
    if (!/^\d+$/.test(sid)) return;                       // skips title / total rows
    people[sid] = String(r[iName]).trim();
    roundCols.forEach(rc => {
      const n = r[rc.i];
      if (n !== '' && !isNaN(Number(n))) hours.push({ term, student_id: sid, round: rc.round, hours: Number(n) });
    });
  });

  applyHours_(term, people, hours);
  log_('importHours: ' + Object.keys(people).length + ' students, ' + hours.length + ' hour rows (term ' + term + ')');
}

/** studentnow (registrar export) → Student.email by ID. Delete the pasted tab afterwards (it holds personal data). */
function importRoster() {
  resetCaches_();
  const { head, rows } = readPasted_(IMPORT_TAB.ROSTER, ['ID', 'EMAIL']);
  const iId = head.indexOf('ID'), iMail = head.indexOf('EMAIL');
  const mail = {};
  rows.forEach(r => { const e = norm_(r[iMail]); if (e) mail[id_(r[iId])] = e; });

  const missing = applyEmails_(mail);
  log_('importRoster: ' + (rows_(TAB.STUDENT).length - missing.length) + ' emails set' +
    (missing.length ? '; NO email for: ' + missing.join(', ') : '') +
    '. You can now delete the "' + IMPORT_TAB.ROSTER + '" tab.');
}

/** people: {id: name}; hours: [{term, student_id, round, hours}]. Replaces this term's hours for those students only. */
function applyHours_(term, people, hours) {
  withLock_(() => {
    const students = rows_(TAB.STUDENT);
    const known = {};
    students.forEach(s => { known[id_(s.student_id)] = s; });
    Object.keys(people).forEach(sid => {
      if (known[sid]) known[sid].name = people[sid];
      else students.push({ student_id: sid, name: people[sid], email: '' });
    });
    rewrite_(TAB.STUDENT, students);
    rewrite_(TAB.HOURS, rows_(TAB.HOURS).filter(h => !(String(h.term) === term && people[id_(h.student_id)])).concat(hours));
  });
}

/** mail: {id: email}. Returns ids that have no email. */
function applyEmails_(mail) {
  const missing = [];
  withLock_(() => {
    const students = rows_(TAB.STUDENT);
    students.forEach(s => {
      const e = mail[id_(s.student_id)];
      if (e) s.email = e; else missing.push(id_(s.student_id));
    });
    rewrite_(TAB.STUDENT, students);
  });
  return missing;
}

function log_(msg) { console.log(msg); Logger.log(msg); }
