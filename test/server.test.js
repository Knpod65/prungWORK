const test = require('node:test');
const assert = require('node:assert');
const { makeEnv } = require('./harness');

function fresh() {
  const e = makeEnv();
  e.run('setup()');
  e.paste('import_TA', [
    [null, 'ชั่วโมงปฏิบัติงาน'], [],
    ['ลำดับที่', 'ชื่อ-สกุล', 'รหัสนักศึกษา', 'จำนวนชั่วโมง รอบที่ 1', 'จำนวนชั่วโมง รอบที่ 2', 'รวม'],
    [1, 'กมลพรรณ พุทธขาว', 661910002, 40, 40, 80],
    [2, 'พีรณัฐ มีโชค', 661910046, 20, 68, 88],
    [3, 'ไม่มีเมล', 661910099, 10, 10, 20],
  ]);
  e.paste('studentnow', [
    ['Download รายชื่อ'], ['ID', 'NAME', 'EMAIL'],
    ['661910002', 'x', 'Kamol@cmu.ac.th'], ['661910046', 'x', 'peeranat@cmu.ac.th'],
  ]);
  e.run('importHours()'); e.run('importRoster()');
  return e;
}
const login = (e, email) => {
  e.run(`apiRequestOtp(${JSON.stringify(email)})`);
  const code = /(\d{6})/.exec(e.mails[e.mails.length - 1].body)[1];
  const r = e.run(`apiVerifyOtp(${JSON.stringify(email)}, "${code}")`);
  return { code, r };
};

test('setup creates lean tabs and seeds staff', () => {
  const e = makeEnv(); e.run('setup()');
  assert.deepStrictEqual(Object.keys(e.book).sort(), ['Ack', 'Config', 'Hours', 'Response', 'Staff', 'Student']);
  assert.strictEqual(e.run('rows_("Staff")')[0].email, 'rungtiwa.p@cmu.ac.th');
  assert.ok(e.run('rows_("Config")').some(r => r.key === 'TERM'));
});

test('imports: hours long-format, emails lower-cased, missing email left blank', () => {
  const e = fresh();
  assert.strictEqual(e.run('rows_("Hours")').length, 6);
  const s = e.run('rows_("Student")');
  assert.strictEqual(s.find(x => x.student_id === '661910002').email, 'kamol@cmu.ac.th');
  assert.strictEqual(s.find(x => x.student_id === '661910099').email, '');
  e.run('importHours()');                               // idempotent
  assert.strictEqual(e.run('rows_("Hours")').length, 6);
});

test('otp: unknown email gets no mail, known gets one; wrong code counts; right code logs in', () => {
  const e = fresh();
  assert.strictEqual(e.run('apiRequestOtp("nobody@cmu.ac.th")').ok, true);
  assert.strictEqual(e.mails.length, 0);
  assert.strictEqual(e.run('apiRequestOtp("kamol@cmu.ac.th")').ok, true);
  assert.strictEqual(e.mails.length, 1);
  assert.strictEqual(e.run('apiRequestOtp("kamol@cmu.ac.th")').code, 'COOLDOWN');
  assert.strictEqual(e.run('apiVerifyOtp("kamol@cmu.ac.th","000000")').code, 'OTP_BAD');
  const code = /(\d{6})/.exec(e.mails[0].body)[1];
  const r = e.run(`apiVerifyOtp("KAMOL@cmu.ac.th","${code}")`);
  assert.ok(r.ok && r.data.length > 20);
  assert.strictEqual(e.run(`apiVerifyOtp("kamol@cmu.ac.th","${code}")`).code, 'OTP_EXPIRED'); // single use
});

test('otp locks after max tries', () => {
  const e = fresh(); e.run('apiRequestOtp("kamol@cmu.ac.th")');
  for (let i = 0; i < 5; i++) e.run('apiVerifyOtp("kamol@cmu.ac.th","111111")');
  const code = /(\d{6})/.exec(e.mails[0].body)[1];
  assert.strictEqual(e.run(`apiVerifyOtp("kamol@cmu.ac.th","${code}")`).code, 'OTP_EXPIRED');
});

test('student sees own name/id/total; confirm and report flow', () => {
  const e = fresh();
  const { r } = login(e, 'kamol@cmu.ac.th'); const t = r.data;
  const me = e.run(`apiMe("${t}")`).data;
  assert.strictEqual(me.name, 'กมลพรรณ พุทธขาว');
  assert.strictEqual(me.student.id, '661910002');
  assert.strictEqual(me.student.total, 80);
  assert.strictEqual(me.student.response, null);

  assert.strictEqual(e.run(`apiSubmit("${t}","reported","สั้น")`).code, 'DETAIL_SHORT');
  assert.strictEqual(e.run(`apiSubmit("${t}","confirmed","")`).data.response.status, 'confirmed');
  const mailsBefore = e.mails.length;
  const rep = e.run(`apiSubmit("${t}","reported","รอบที่ 2 ควรเป็น 50 ชั่วโมง")`).data;
  assert.strictEqual(rep.response.status, 'reported');
  assert.strictEqual(e.mails.length, mailsBefore + 1);
  assert.strictEqual(e.mails.at(-1).to, 'rungtiwa.p@cmu.ac.th');
  assert.match(e.mails.at(-1).body, /รอบที่ 2 ควรเป็น 50/);
  assert.strictEqual(e.run('rows_("Response")').length, 2);            // append-only history
});

test('student without email in Student tab cannot log in; token auth enforced', () => {
  const e = fresh();
  e.run('apiRequestOtp("x@cmu.ac.th")'); assert.strictEqual(e.mails.length, 0);
  assert.strictEqual(e.run('apiMe("bogus")').code, 'AUTH');
  assert.strictEqual(e.run('apiSubmit("bogus","confirmed","")').code, 'AUTH');
});

test('staff dashboard: counts, new-report banner, ack, student cannot see it', () => {
  const e = fresh();
  const s = login(e, 'peeranat@cmu.ac.th').r.data;
  e.run(`apiSubmit("${s}","reported","ชั่วโมงรอบที่ 1 ไม่ตรงกับใบลงเวลา")`);
  assert.strictEqual(e.run(`apiDashboard("${s}")`).code, 'FORBIDDEN');

  e.mails.length = 0;
  const st = login(e, 'rungtiwa.p@cmu.ac.th').r.data;
  const d = e.run(`apiDashboard("${st}")`).data;
  assert.deepStrictEqual(JSON.parse(JSON.stringify(d.rounds)), [1, 2]);
  assert.deepStrictEqual({ ...d.counts }, { all: 3, confirmed: 0, reported: 1, pending: 2, newReports: 1 });
  const row = d.students.find(x => x.id === '661910046');
  assert.strictEqual(row.total, 88);
  const d2 = e.run(`apiAck("${st}","${row.responseId}")`).data;
  assert.strictEqual(d2.counts.newReports, 0);
  assert.strictEqual(e.run('rows_("Ack")').length, 1);
  e.run(`apiAck("${st}","${row.responseId}")`);
  assert.strictEqual(e.run('rows_("Ack")').length, 1);                 // idempotent
});

test('hours changed after answering marks the answer stale', () => {
  const e = fresh();
  const t = login(e, 'kamol@cmu.ac.th').r.data;
  e.run(`apiSubmit("${t}","confirmed","")`);
  e.paste('import_TA', [['ชื่อ-สกุล', 'รหัสนักศึกษา', 'จำนวนชั่วโมง รอบที่ 1', 'จำนวนชั่วโมง รอบที่ 2'], ['กมลพรรณ พุทธขาว', 661910002, 40, 30]]);
  e.run('importHours()');
  assert.strictEqual(e.run(`apiMe("${t}")`).data.student.response.stale, true);
});

test('config tab drives behaviour (no hard-coded term)', () => {
  const e = fresh();
  const cfg = e.book.Config.data; cfg.find(r => r[0] === 'TERM')[1] = '2/2569';
  e.run('resetCaches_()');
  const t = login(e, 'kamol@cmu.ac.th').r.data;
  assert.strictEqual(e.run(`apiMe("${t}")`).data.student.hours.length, 0);   // no hours for the new term yet
});

test('term auto-converted to a date by Sheets still works, and setup() repairs it', () => {
  const e = fresh();
  const d = new Date(2569, 0, 1);                              // what Sheets makes of "1/2569"
  e.book.Config.data.find(r => r[0] === 'TERM')[1] = d;
  e.book.Hours.data.slice(1).forEach(r => { r[0] = d; });
  e.run('resetCaches_()');
  const t = login(e, 'rungtiwa.p@cmu.ac.th').r.data;
  const dash = e.run(`apiDashboard("${t}")`).data;
  assert.strictEqual(dash.counts.all, 3);
  assert.strictEqual(dash.term, '1/2569');
  e.run('setup()');
  assert.strictEqual(e.book.Config.data.find(r => r[0] === 'TERM')[1], '1/2569');
  assert.ok(e.book.Hours.data.slice(1).every(r => r[0] === '1/2569'));
});
