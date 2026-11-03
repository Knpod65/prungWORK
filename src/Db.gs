/** Tiny table layer over Sheets: tabs are tables, row 1 is the header. */

let ssMemo_ = null;
let cfgMemo_ = null;

function resetCaches_() { ssMemo_ = null; cfgMemo_ = null; }

function ss_() {
  if (ssMemo_) return ssMemo_;
  const id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (!id) throw new Error('SHEET_ID is not set — run setup() first');
  return (ssMemo_ = SpreadsheetApp.openById(id));
}

function sheet_(name) {
  const sh = ss_().getSheetByName(name);
  if (!sh) throw new Error('Missing tab: ' + name + ' — run setup()');
  return sh;
}

/** All data rows as objects keyed by header. Blank rows are skipped. */
function rows_(name) {
  const v = sheet_(name).getDataRange().getValues();
  if (v.length < 2) return [];
  const head = v[0].map(String);
  return v.slice(1)
    .filter(r => r.some(c => c !== '' && c !== null))
    .map(r => head.reduce((o, k, i) => (o[k] = r[i], o), {}));
}

function append_(name, obj) {
  const sh = sheet_(name);
  const head = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  sh.appendRow(head.map(k => (obj[k] === undefined || obj[k] === null) ? '' : obj[k]));
}

/** Replace every data row of a tab (header preserved) in a single write. */
function rewrite_(name, objs) {
  const sh = sheet_(name);
  const head = SCHEMA[name];
  const last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, head.length).clearContent();
  if (!objs.length) return;
  sh.getRange(2, 1, objs.length, head.length)
    .setValues(objs.map(o => head.map(k => (o[k] === undefined || o[k] === null) ? '' : o[k])));
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try { return fn(); } finally { lock.releaseLock(); }
}

function cfg_() {
  if (cfgMemo_) return cfgMemo_;
  const c = Object.assign({}, CONFIG_DEFAULTS);
  rows_(TAB.CONFIG).forEach(r => {
    const k = String(r.key).trim();
    if (!k) return;
    const d = CONFIG_DEFAULTS[k];
    if (typeof d === 'number') c[k] = Number(r.value) || d;
    else if (typeof d === 'boolean') c[k] = String(r.value).trim().toUpperCase() !== 'FALSE';
    else c[k] = String(r.value);
  });
  return (cfgMemo_ = c);
}

const norm_ = v => String(v === undefined || v === null ? '' : v).trim().toLowerCase();
const id_ = v => String(v === undefined || v === null ? '' : v).trim();
