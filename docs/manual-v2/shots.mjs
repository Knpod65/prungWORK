// One definition per screenshot. The same `marks` list draws the numbered boxes on the image
// AND becomes the table under it, so the picture and its explanation can never disagree.
// All people and emails are fictional.

const STU = { name: 'สมหญิง รักเรียน', email: 'demo.student@cmu.ac.th', id: '691910001' };
const H = (a, b) => [{ round: 1, hours: a }, { round: 2, hours: b }];
const AT = '2026-11-03T08:00:00Z';   // shows as 3 พ.ย. 2569 15:00 (Asia/Bangkok)

const student = (over = {}) => ({ role: 'student', token: true, ...STU, hours: H(36, 44), total: 80, response: null, ...over });

const row = (id, name, a, b, status, extra = {}) => ({
  id, name, hours: b == null ? [{ round: 1, hours: a }] : H(a, b), total: a + (b || 0), status,
  detail: '', at: status === 'pending' ? null : AT, responseId: status === 'pending' ? null : 'r' + id, acked: false, stale: false, ...extra,
});
const DASH = { students: [
  row('691910001', 'สมหญิง รักเรียน', 36, 50, 'reported', { detail: 'รอบที่ 2 ควรเป็น 50 ชั่วโมง เพราะมีงานสอนเพิ่มเติมเมื่อ 10–14 ก.ย.' }),
  row('691910002', 'สมชาย ใจดี', 40, 40, 'confirmed'),
  row('691910003', 'มาลี สุขใจ', 30, 45, 'reported', { detail: 'ชั่วโมงรอบที่ 1 ขาดไป 5 ชั่วโมง', acked: true }),
  row('691910004', 'ปราณี ศรีสุข', 20, null, 'pending'),
  row('691910005', 'วีระ ทองดี', 36, 44, 'confirmed', { stale: true }),
  row('691910006', 'นภา แสงจันทร์', 28, 32, 'pending'),
] };
const staff = { role: 'staff', token: true, name: 'เจ้าหน้าที่ฝ่ายการศึกษา', email: 'staff@cmu.ac.th', dash: DASH };
const staffShort = { ...staff, dash: { students: [0, 1, 3, 4].map(i => DASH.students[i]) } };

const T = { yes: 'กดได้', type: 'กรอกได้', view: 'ดูอย่างเดียว' };
const m = (n, sel, what, kind, desc, extra = {}) => ({ n, sel, what, kind, desc, ...extra });

export const SHOTS = [
  {
    id: 'a-email', w: 920, scn: { role: 'student', token: false },
    steps: ``,
    marks: [
      m(1, '#email', 'ช่องอีเมล', T.type, 'ใส่อีเมลมหาวิทยาลัยของคุณ (…@cmu.ac.th) ต้องเป็นอีเมลที่ลงทะเบียนไว้กับเจ้าหน้าที่'),
      m(2, '#f button[type=submit]', 'ปุ่ม “รับรหัส OTP”', T.yes, 'ระบบส่งรหัส 6 หลักไปที่อีเมลนั้น'),
    ],
  },
  {
    id: 'email-otp', w: 560, kind: 'email', marks: [],
    emailExpr: 'otpHtml_("482916", cfg_())',
  },
  {
    id: 'email-notify', w: 560, kind: 'email', marks: [],
    emailExpr: 'notifyHtml_({ name: "สมหญิง รักเรียน" }, { student_id: "691910001", term: "1/2569", hours_seen: 80, detail: "รอบที่ 2 ควรเป็น 50 ชั่วโมง เพราะมีงานสอนเพิ่มเติมเมื่อ 10–14 ก.ย." }, "https://script.google.com/macros/s/EXAMPLE/exec", cfg_())',
  },
  {
    id: 'b-code', w: 920, scn: { role: 'student', token: false },
    steps: `await until('#email'); $('#email').value='${STU.email}'; $('#f').requestSubmit(); await until('#code');`,
    marks: [
      m(1, '#code', 'ช่องรหัส 6 หลัก', T.type, 'พิมพ์ตัวเลขจากอีเมล พิมพ์ได้เฉพาะตัวเลข ไม่ต้องเว้นวรรค'),
      m(2, '#cd', 'เวลานับถอยหลัง', T.view, 'บอกเวลาที่รหัสยังใช้ได้ เมื่อหมดเวลา ปุ่มยืนยันจะกดไม่ได้'),
      m(3, '#verify', 'ปุ่ม “ยืนยันและเข้าสู่ระบบ”', T.yes, 'ตรวจรหัสและเข้าสู่ระบบ'),
      m(4, '#resend', 'ปุ่ม “ส่งรหัสใหม่”', T.yes, 'กดได้เมื่อนับถอยหลังครบ 1 นาที ใช้เมื่อรหัสหมดอายุหรือไม่ได้รับอีเมล'),
      m(5, '#back', 'ปุ่ม “เปลี่ยนอีเมล”', T.yes, 'กลับไปกรอกอีเมลใหม่ ถ้าพิมพ์อีเมลผิด'),
      m(6, '#help', 'กล่อง “ยังไม่พบอีเมล?”', T.view, 'บอกวิธีหาอีเมลที่ไม่เข้ากล่องจดหมาย'),
    ],
  },
  {
    id: 'c-ask', w: 920, scn: student(),
    steps: `await until('#yes');`,
    marks: [
      m(1, '#whoName', 'ชื่อของคุณ (มุมขวาบน)', T.view, 'ใช้เช็กว่าเข้าสู่ระบบถูกบัญชี'),
      m(2, '#logout', 'ปุ่ม “ออกจากระบบ”', T.yes, 'แนะนำให้กดทุกครั้งเมื่อใช้เครื่องสาธารณะ'),
      m(3, '.who-name', 'ชื่อ-สกุล รหัสนักศึกษา ภาคเรียน', T.view, 'ตรวจว่าเป็นข้อมูลของคุณ'),
      m(4, '.stats .stat:not(.total)', 'ชั่วโมงแต่ละรอบ', T.view, 'รอบที่ 1, รอบที่ 2 … ตามที่เจ้าหน้าที่บันทึก', { all: true }),
      m(5, '.stat.total', 'ชั่วโมงรวม (กล่องสีเข้ม)', T.view, 'ตัวเลขที่คุณต้องตรวจ คือผลรวมของทุกรอบ'),
      m(6, '#yes', 'ปุ่ม “ถูกต้อง ยืนยัน”', T.yes, 'กดเมื่อชั่วโมงรวมถูกต้อง'),
      m(7, '#no', 'ปุ่ม “ไม่ถูกต้อง รายงาน”', T.yes, 'กดเมื่อชั่วโมงไม่ถูกต้อง จะมีช่องให้บอกเจ้าหน้าที่'),
    ],
  },
  {
    id: 'c-confirmed', w: 920, scn: student(), clip: '.card',
    steps: `await until('#yes'); $('#yes').click(); await until('#change');`,
    marks: [
      m(1, '#status', 'สถานะ', T.view, 'ป้ายสีเขียว “ยืนยันแล้ว” พร้อมวันและเวลาที่ยืนยัน'),
      m(2, '#change', '“เปลี่ยนคำตอบ”', T.yes, 'กลับไปเลือกใหม่ ถ้ากดผิด'),
    ],
  },
  {
    id: 'c-report', w: 920, scn: student(), clip: '.card',
    steps: `await until('#no'); $('#no').click(); const d=$('#detail'); d.value='รอบที่ 2 ควรเป็น 50 ชั่วโมง เพราะมีงานสอนเพิ่มเติมเมื่อ 10–14 ก.ย.'; d.dispatchEvent(new Event('input'));`,
    marks: [
      m(1, '#detail', 'ช่องรายละเอียด', T.type, 'พิมพ์ว่าไม่ถูกต้องตรงไหน ยาวได้ไม่เกิน 1,000 ตัวอักษร และต้องมีอย่างน้อย 10 ตัวอักษร'),
      m(2, '.count', 'ตัวนับตัวอักษร', T.view, 'บอกว่าพิมพ์ไปแล้วกี่ตัว'),
      m(3, '#send', 'ปุ่ม “ส่งรายงาน”', T.yes, 'ส่งถึงเจ้าหน้าที่ทันที'),
      m(4, '#cancel', 'ปุ่ม “ยกเลิก”', T.yes, 'ปิดช่องนี้โดยไม่ส่งอะไร'),
    ],
  },
  {
    id: 'c-reported', w: 920, clip: '.card',
    scn: student({ response: { id: 'x', status: 'reported', detail: 'รอบที่ 2 ควรเป็น 50 ชั่วโมง เพราะมีงานสอนเพิ่มเติมเมื่อ 10–14 ก.ย.', at: AT, hoursSeen: 80, stale: false } }),
    steps: `await until('#change');`,
    marks: [
      m(1, '#status', 'สถานะ', T.view, 'ป้ายสีแดง “รายงานแล้ว” พร้อมข้อความที่คุณส่ง'),
      m(2, '#change', '“เปลี่ยนคำตอบ”', T.yes, 'ส่งรายงานใหม่ หรือเปลี่ยนเป็นยืนยัน'),
    ],
  },
  {
    id: 'c-stale', w: 920, clip: '.card',
    scn: student({ hours: H(36, 50), total: 86, response: { id: 'x', status: 'confirmed', detail: '', at: AT, hoursSeen: 80, stale: true } }),
    steps: `await until('#yes');`,
    marks: [
      m(1, '#status', 'ข้อความ “ชั่วโมงถูกปรับปรุงหลังคุณตอบ”', T.view, 'บอกชั่วโมงเดิมที่คุณเคยเห็น (ที่นี่คือ 80 ชั่วโมง)'),
      m(2, '.stat.total', 'ชั่วโมงรวมใหม่', T.view, 'ตัวเลขล่าสุดในระบบ (ที่นี่คือ 86 ชั่วโมง)'),
      m(3, '#yes', 'ปุ่ม “ถูกต้อง ยืนยัน”', T.yes, 'ยืนยันตัวเลขใหม่'),
      m(4, '#no', 'ปุ่ม “ไม่ถูกต้อง รายงาน”', T.yes, 'รายงานอีกครั้งถ้ายังไม่ถูกต้อง'),
    ],
  },
  {
    id: 'c-mobile', w: 390, scn: student(),
    steps: `await until('#yes');`,
    marks: [
      m(1, '#yes', '“ถูกต้อง ยืนยัน”', T.yes, ''),
      m(2, '#no', '“ไม่ถูกต้อง รายงาน”', T.yes, ''),
      m(3, '#logout', '“ออกจากระบบ”', T.yes, ''),
    ],
  },
  {
    id: 'd-dash', w: 900, scn: staffShort,
    steps: `await until('#rows .row:not(.head)');`,
    marks: [
      m(1, '#whoName', 'ชื่อผู้ใช้ (มุมขวาบน)', T.view, 'ใช้เช็กว่าเข้าสู่ระบบถูกบัญชี'),
      m(2, '#logout', 'ปุ่ม “ออกจากระบบ”', T.yes, 'แนะนำให้กดเมื่อใช้เครื่องสาธารณะ'),
      m(3, '.banner', 'แถบสีแดง', T.view, 'บอกจำนวนรายงานที่ยังไม่กด “รับทราบ” หายไปเมื่อรับทราบครบ'),
      m(4, '#showRep', 'ปุ่ม “ดูรายการ”', T.yes, 'กรองให้เห็นเฉพาะคนที่รายงาน'),
      m(5, '.tile:nth-child(1)', '“ยืนยันแล้ว”', T.view, 'จำนวนที่ยืนยันแล้ว จากทั้งหมด'),
      m(6, '.tile:nth-child(2)', '“รายงานไม่ถูกต้อง”', T.view, 'นับทุกคนที่รายงาน แม้รับทราบแล้ว (ต่างจากเลขในแถบสีแดง ซึ่งนับเฉพาะที่ยังไม่รับทราบ)'),
      m(7, '.tile:nth-child(3)', '“ยังไม่ตอบ”', T.view, 'ใช้ตามคนที่ยังไม่ตอบ'),
      m(8, '#q', 'ช่องค้นหา', T.type, 'พิมพ์ชื่อหรือรหัสนักศึกษา ผลแสดงทันที'),
      m(9, '.chips', 'ปุ่มกรองสถานะ', T.yes, 'ทั้งหมด / รายงาน / ยังไม่ตอบ / ยืนยันแล้ว ปุ่มที่เลือกอยู่เป็นสีเขียวเข้ม'),
      m(10, '#rows .row:not(.head)', 'แถวนักศึกษา', T.view, 'ชื่อ รหัส ชั่วโมงแต่ละรอบ ชั่วโมงรวม และสถานะพร้อมวันเวลาที่ตอบ แถว “รายงาน” จะแสดงข้อความของนักศึกษา'),
    ],
  },
  {
    id: 'd-reports', w: 900, scn: staff, clip: '.card',
    steps: `await until('#showRep'); $('#showRep').click(); await sleep(100);`,
    marks: [
      m(1, '[data-f=reported]', 'ปุ่มกรอง “รายงาน”', T.yes, 'กดแล้วเห็นเฉพาะคนที่รายงาน'),
      m(2, '.detail p', 'ข้อความจากนักศึกษา', T.view, 'อ่านว่าผิดตรงไหน'),
      m(3, '[data-ack]', 'ปุ่ม “รับทราบ”', T.yes, 'กดเมื่อคุณเห็นและดำเนินการแล้ว'),
      m(4, '[data-acked]', '“รับทราบแล้ว”', T.view, 'รายงานที่รับทราบไปแล้วจะแสดงข้อความนี้แทนปุ่ม'),
    ],
  },
  {
    id: 'd-search', w: 900, scn: staff, clip: '.card',
    steps: `await until('#q'); const q=$('#q'); q.value='สม'; q.dispatchEvent(new Event('input')); await sleep(100);`,
    marks: [
      m(1, '#q', 'ช่องค้นหา', T.type, 'พิมพ์ “สม” เห็นเฉพาะชื่อที่มีคำนี้ ค้นได้ทั้งชื่อและรหัส'),
      m(2, '.chips', 'ปุ่มกรอง', T.yes, 'ใช้ร่วมกับช่องค้นหาได้ เช่น กรอง “ยังไม่ตอบ” แล้วพิมพ์ชื่อ'),
    ],
  },
  {
    id: 'd-mobile', w: 390, scn: staff, clipRect: { x: 0, y: 0, w: 390, h: 900 },
    steps: `await until('#rows .row:not(.head)');`,
    marks: [],
  },
];

export const SAMPLE = { STU, DASH };
