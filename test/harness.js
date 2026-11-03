// In-memory fakes of the Apps Script services so the .gs files run unchanged under Node.
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');

function makeEnv() {
  const props = {}, cache = {}, mails = [], book = {};
  const sheet = name => ({
    name, data: [],
    getDataRange() { return { getValues: () => this.data.map(r => r.slice()) }; },
    getLastRow() { return this.data.length; },
    getLastColumn() { return Math.max(0, ...this.data.map(r => r.length)); },
    appendRow(r) { this.data.push(r.slice()); },
    getRange(r, c, nr = 1, nc = 1) {
      const s = this;
      return {
        getValues: () => Array.from({ length: nr }, (_, i) => Array.from({ length: nc }, (_, j) => (s.data[r - 1 + i] || [])[c - 1 + j] ?? '')),
        setValues(v) { v.forEach((row, i) => row.forEach((x, j) => { (s.data[r - 1 + i] = s.data[r - 1 + i] || [])[c - 1 + j] = x; })); return this; },
        clearContent() { for (let i = 0; i < nr; i++) s.data.splice(r - 1, nr); return this; },
        setFontWeight() { return this; }, setNumberFormat() { return this; },
      };
    },
    setFrozenRows() {}, getMaxRows() { return 1000; },
  });
  const ctx = {
    console, Date, JSON, Math, Object, Array, String, Number, Error, Promise,
    PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] ?? null, setProperty: (k, v) => { props[k] = v; } }) },
    CacheService: { getScriptCache: () => ({
      get: k => (cache[k] && cache[k].exp > Date.now() ? cache[k].v : null),
      put: (k, v, ttl) => { cache[k] = { v, exp: Date.now() + ttl * 1000 }; },
      remove: k => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    MailApp: { sendEmail: m => mails.push(m) },
    ScriptApp: { getService: () => ({ getUrl: () => 'https://example.test/exec' }) },
    SpreadsheetApp: { openById: () => ({
      getSheetByName: n => book[n] || null,
      insertSheet: n => (book[n] = sheet(n)) }) },
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      DigestAlgorithm: { SHA_256: 'sha256' },
      computeDigest: (a, s) => [...crypto.createHash('sha256').update(s).digest()].map(b => (b > 127 ? b - 256 : b)),
      computeHmacSha256Signature: (t, k) => crypto.createHmac('sha256', k).update(t).digest(),
      base64Encode: b => Buffer.from(b).toString('base64'),
    },
    Logger: { log() {} },
  };
  vm.createContext(ctx);
  const dir = path.join(__dirname, '..', 'src');
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.gs'))) {
    // top-level const/let/class are shared across scripts in one context
    vm.runInContext(fs.readFileSync(path.join(dir, f), 'utf8'), ctx, { filename: f });
  }
  const run = code => vm.runInContext(code, ctx);
  return { ctx, run, props, cache, mails, book, sheet,
    paste(tab, rows) { const s = book[tab] || (book[tab] = sheet(tab)); s.data = rows.map(r => r.slice()); } };
}
module.exports = { makeEnv };
