// Builds docs/manual/manual.html and manual.pdf.  Usage: npm run manual
//   node docs/manual/shoot.mjs   renders the screenshots from the real src/ (run first, or use `npm run manual`)
//   node docs/manual/build.mjs   assembles the manual and prints the PDF
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { SHOTS } from './shots.mjs';
import { findChrome } from './chrome.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const ROOT = path.resolve(HERE, '../..');
const shot = id => SHOTS.find(s => s.id === id);

let commit = 'unknown';
try { commit = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim(); } catch { /* not a git checkout */ }
const today = new Date().toLocaleDateString('th-TH', { dateStyle: 'long', timeZone: 'Asia/Bangkok' });

// ---- building blocks --------------------------------------------------------------------
const n = k => `<span class="n">${k}</span>`;
const img = (id, cls = '') => `<img class="${cls}" src="img/${id}.png" alt="">`;

/** Picture + the table generated from the same marks that drew the boxes on it. */
function screen(id, { caption = '', cls = '', flow = false } = {}) {
  const s = shot(id);
  const rows = s.marks.map(k => `<tr><td class="c1">${n(k.n)}</td>
      <td class="c2"><b>${k.what}</b> <span class="tag">${k.kind}</span></td><td class="c3">${k.desc}</td></tr>`).join('');
  return `<section class="screen${flow ? ' flow' : ''}">
    <figure class="${cls}">${img(id)}${caption ? `<figcaption>${caption}</figcaption>` : ''}</figure>
    ${rows ? `<table class="callouts"><thead><tr><th class="c1">เลข</th><th class="c2">อะไร</th><th class="c3">ทำอะไรได้</th></tr></thead><tbody>${rows}</tbody></table>` : ''}
  </section>`;
}
const legend = id => `<ol class="legend">${shot(id).marks.map(k => `<li>${n(k.n)} ${k.what}</li>`).join('')}</ol>`;
const step = (no, title, id) => `<h3 class="step" id="${id}"><span class="stepno">${no}</span>${title}</h3>`;
const h4 = t => `<h4>${t}</h4>`;
const note = (label, html) => `<div class="note"><b>${label}</b> ${html}</div>`;
const warn = (label, html) => `<div class="note warn"><b>${label}</b> ${html}</div>`;
const table2 = (head, rows) => `<table class="plain"><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${
  rows.map(r => `<tr>${r.map((c, i) => `<td${i === 0 ? ' class="k"' : ''}>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
const badge = (cls, t) => `<span class="badge ${cls}">${t}</span>`;

// ---- content -----------------------------------------------------------------------------
const body = `
<header class="cover">
  <h1>คู่มือใช้งานระบบตรวจสอบชั่วโมง TA</h1>
  <p class="lead">ระบบนี้ให้นักศึกษา TA ล็อกอินด้วยรหัส OTP ทางอีเมล @cmu.ac.th เพื่อดูชั่วโมงของตนเอง แล้วกด <b>ยืนยัน</b> หรือ <b>รายงาน</b> ว่าไม่ถูกต้อง
    ส่วนเจ้าหน้าที่ดูสถานะของนักศึกษาทุกคนและได้รับอีเมลแจ้งเตือนเมื่อมีรายงาน ใช้ได้ทั้งมือถือและคอมพิวเตอร์ ไม่ต้องสมัครสมาชิกหรือตั้งรหัสผ่าน</p>
  ${note('วิธีอ่านภาพ', `ภาพในคู่มือใช้<b>ข้อมูลสมมติ</b> (ชื่อ รหัส และอีเมลไม่ใช่ของจริง) กรอบสีส้มที่มีตัวเลข ${n(1)} คือจุดที่อธิบายไว้ในตารางใต้ภาพ
    ป้าย <span class="tag">กรอกได้</span> <span class="tag">กดได้</span> <span class="tag">ดูอย่างเดียว</span> บอกว่าจุดนั้นทำอะไรได้`)}
  <nav class="toc" aria-label="สารบัญ">
    <div>
      <h2>ส่วนที่ 1 สำหรับนักศึกษา TA</h2>
      <ol>
        <li><a href="#s1">เปิดลิงก์และกรอกอีเมล</a></li>
        <li><a href="#s2">เปิดอีเมลและดูรหัส OTP</a></li>
        <li><a href="#s3">กรอกรหัส OTP</a></li>
        <li><a href="#s4">ตรวจชั่วโมงของคุณ</a>: ยืนยัน หรือรายงาน</li>
        <li><a href="#s5">เมื่อชั่วโมงถูกปรับหลังคุณตอบ</a></li>
        <li><a href="#s6">ใช้บนมือถือ</a> · <a href="#s7">แก้ปัญหาที่พบบ่อย</a></li>
      </ol>
    </div>
    <div>
      <h2>ส่วนที่ 2 สำหรับเจ้าหน้าที่</h2>
      <ol>
        <li><a href="#t1">หน้าแดชบอร์ด</a></li>
        <li><a href="#t2">ดูและรับทราบรายงาน</a></li>
        <li><a href="#t3">ค้นหาและกรอง</a> · <a href="#t4">ใช้บนมือถือ</a></li>
        <li><a href="#t5">อีเมลแจ้งเตือนเมื่อมีรายงาน</a></li>
      </ol>
      <h2>ส่วนที่ 3 สำหรับผู้ดูแลระบบ</h2>
      <ol>
        <li><a href="#u1">งานประจำในชีต (ไม่ต้องแก้โค้ด)</a></li>
        <li><a href="#u2">ก่อนเปิดให้ TA ใช้</a></li>
      </ol>
    </div>
  </nav>
  <p class="ver">ตรงกับระบบ ณ วันที่ ${today} · รหัสเวอร์ชัน ${commit}</p>
</header>

<div class="part">ส่วนที่ 1 สำหรับนักศึกษา TA</div>

${step('ขั้นที่ 1', 'เปิดลิงก์และกรอกอีเมล', 's1')}
<p>เปิดลิงก์ที่เจ้าหน้าที่ส่งให้ จะพบหน้าเข้าสู่ระบบ จุดที่กรอกได้มีช่องเดียว คือช่องอีเมล</p>
${screen('a-email', { cls: 'w72' })}
<p>ใช้อีเมลของตนเองเท่านั้น หากอีเมลไม่อยู่ในรายชื่อ ระบบจะไม่ส่งรหัสให้ (และไม่บอกว่าอีเมลนั้นมีหรือไม่มีในระบบ) ให้ติดต่อเจ้าหน้าที่</p>

${step('ขั้นที่ 2', 'เปิดอีเมลและดูรหัส OTP', 's2')}
<p>ตรวจกล่องจดหมายของคุณ ภายในประมาณ 1–2 นาทีจะได้อีเมลหน้าตาแบบนี้</p>
<section class="screen"><figure class="narrow">${img('email-otp')}<figcaption>อีเมลรหัส OTP (ตัวอย่าง)</figcaption></figure></section>
<ul>
  <li>รหัสเป็นตัวเลข 6 หลัก <b>ใช้ได้ 10 นาที และใช้ได้ครั้งเดียว</b></li>
  <li>ถ้าไม่เจอ ให้ดูในโฟลเดอร์ Junk/Spam หรือค้นหาชื่อผู้ส่ง “ระบบตรวจสอบชั่วโมง TA”</li>
  <li><b>อย่าบอกรหัสนี้กับใคร</b> เจ้าหน้าที่จะไม่ขอรหัส OTP ทางโทรศัพท์หรือแชท</li>
</ul>

${step('ขั้นที่ 3', 'กรอกรหัส OTP', 's3')}
<p>กลับมาที่หน้าเว็บ หน้าจอเปลี่ยนเป็นหน้ากรอกรหัสโดยอัตโนมัติ</p>
${screen('b-code', { cls: 'w72' })}
<ul>
  <li>ถ้ากรอกผิด ระบบแจ้ง “รหัสไม่ถูกต้อง” และเลือกข้อความในช่องไว้ให้ พิมพ์ทับได้ทันที กรอกผิดได้ 5 ครั้ง หลังจากนั้นรหัสถูกยกเลิก ต้องกด “ส่งรหัสใหม่”</li>
  <li>รหัสใหม่จะแทนรหัสเก่าเสมอ ให้ใช้รหัสจากอีเมลฉบับล่าสุดเท่านั้น</li>
</ul>

${step('ขั้นที่ 4', 'ตรวจชั่วโมงของคุณ', 's4')}
<p>เมื่อเข้าสู่ระบบสำเร็จ จะเห็นหน้าสรุปชั่วโมงของคุณ</p>
${note('ตรวจให้ละเอียดก่อนกด', 'เทียบชั่วโมงรวมกับใบลงเวลาหรือตารางของคุณ แล้วเลือกทางใดทางหนึ่งด้านล่าง')}
${screen('c-ask')}

${h4('ทางที่ 1 ชั่วโมงถูกต้อง: กด “ถูกต้อง ยืนยัน”')}
<p>ระบบบันทึกการยืนยันพร้อมวันและเวลาทันที</p>
${screen('c-confirmed')}

${h4('ทางที่ 2 ชั่วโมงไม่ถูกต้อง: กด “ไม่ถูกต้อง รายงาน”')}
<p>จะมีช่องให้บอกเจ้าหน้าที่ว่าผิดตรงไหน</p>
${screen('c-report')}
${note('เขียนให้เจ้าหน้าที่ตรวจต่อได้ง่าย', 'บอกรอบที่ผิด ตัวเลขที่คุณคิดว่าถูกต้อง และเหตุผลหรือวันที่ที่เกี่ยวข้อง')}
<p>เมื่อกด “ส่งรายงาน” ระบบส่งถึงเจ้าหน้าที่ทันที และเจ้าหน้าที่ได้รับอีเมลแจ้งเตือนด้วย</p>
${screen('c-reported')}
<p>ตอบผิดหรือเปลี่ยนใจ กด “เปลี่ยนคำตอบ” ได้เสมอ ระบบเก็บทุกคำตอบไว้เป็นประวัติ และถือคำตอบล่าสุดเป็นสถานะปัจจุบัน</p>

${step('ขั้นที่ 5', 'เมื่อชั่วโมงถูกปรับหลังคุณตอบ', 's5')}
<p>ถ้าเจ้าหน้าที่แก้ชั่วโมงในระบบหลังจากที่คุณยืนยันหรือรายงานไปแล้ว ระบบจะแจ้งและให้คุณตอบใหม่ ส่วนคำถามและปุ่มจะแสดงอยู่เลย</p>
${screen('c-stale')}

${step('ใช้บนมือถือ', 'หน้าตาเหมือนกัน ปุ่มเรียงลงมา', 's6')}
<section class="screen side"><div><p>หน้าจอเรียงเป็นแนวตั้ง ปุ่มกว้างเต็มแถว กดง่ายด้วยนิ้ว ทุกปุ่มสูงอย่างน้อย 44 พิกเซล</p>${legend('c-mobile')}</div>
<figure class="phone">${img('c-mobile')}</figure></section>

${step('แก้ปัญหา', 'ปัญหาที่พบบ่อย (นักศึกษา)', 's7')}
${table2(['ข้อความ / อาการ', 'ทำอย่างไร'], [
  ['ไม่ได้รับอีเมล OTP', 'รอ 1–2 นาที ตรวจ Junk/Spam จากนั้นกด “ส่งรหัสใหม่” (กดได้หลังรอ 1 นาที) ถ้ายังไม่ได้ ตรวจว่าพิมพ์อีเมลถูกและเป็นอีเมลที่ลงทะเบียนไว้ แล้วติดต่อเจ้าหน้าที่'],
  ['รหัสไม่ถูกต้อง', 'ตรวจตัวเลขอีกครั้ง และใช้รหัสจากอีเมลฉบับล่าสุดเท่านั้น'],
  ['รหัสหมดอายุ / กรอกผิดเกินกำหนด', 'กด “ส่งรหัสใหม่” แล้วใช้รหัสใหม่'],
  ['ขอรหัสบ่อยเกินไป', 'รอสักครู่ (ประมาณ 1 นาที) แล้วลองใหม่'],
  ['ส่งอีเมลไม่สำเร็จ', 'กดขอรหัสใหม่อีกครั้ง ขอใหม่ได้ทันที ถ้ายังไม่ได้ให้ติดต่อเจ้าหน้าที่'],
  ['ระบบส่งอีเมลเต็มโควตาของวันนี้', 'ลองใหม่พรุ่งนี้ หรือติดต่อเจ้าหน้าที่'],
  ['เซสชันหมดอายุ', 'เข้าสู่ระบบใหม่ ระบบจำการเข้าสู่ระบบได้ประมาณ 6 ชั่วโมง และเมื่อปิดแท็บจะออกจากระบบ'],
  ['ยังไม่มีข้อมูลชั่วโมงของคุณในภาคเรียนนี้', 'ข้อมูลของคุณยังไม่ถูกบันทึกในระบบ ติดต่อเจ้าหน้าที่'],
  ['ตัวเลขชั่วโมงไม่ตรงกับที่คุณมี', 'กด “ไม่ถูกต้อง รายงาน” พร้อมอธิบาย (อย่ากดยืนยัน)'],
  ['กดยืนยันหรือรายงานผิด', 'กด “เปลี่ยนคำตอบ” แล้วเลือกใหม่'],
])}

<div class="part">ส่วนที่ 2 สำหรับเจ้าหน้าที่</div>
<p>เจ้าหน้าที่ใช้ลิงก์เดียวกับนักศึกษา และล็อกอินด้วย OTP แบบเดียวกัน (ขั้นที่ 1–3 ข้างต้น) แต่ใช้อีเมลที่ลงไว้ในแท็บ <code>Staff</code> ของชีต
เมื่อเข้าสำเร็จจะเห็น<b>แดชบอร์ด</b>แทนหน้านักศึกษา</p>

${step('1', 'หน้าแดชบอร์ด', 't1')}
${screen('d-dash', { flow: true })}
<p>ป้ายสถานะ: ${badge('b-confirmed', 'ยืนยันแล้ว')} เขียว · ${badge('b-reported', 'รายงาน')} แดง · ${badge('b-pending', 'ยังไม่ตอบ')} เทา · ${badge('b-stale', 'ชม.เปลี่ยน')} ขอบเทา
หมายถึงชั่วโมงถูกแก้หลังนักศึกษาตอบ และต้องรอให้ตอบใหม่</p>
<p>หน้านี้<b>รีเฟรชข้อมูลอัตโนมัติทุก 1 นาที</b>ขณะเปิดแท็บอยู่ และรีเฟรชทันทีเมื่อสลับกลับมาที่แท็บ ชื่อแท็บของเบราว์เซอร์จะแสดงจำนวนรายงานใหม่ เช่น <code>(1) ตรวจสอบชั่วโมง TA</code>
ทำให้เห็นได้แม้เปิดหน้าอื่นอยู่ การพิมพ์ในช่องค้นหาไม่ถูกขัดจังหวะเมื่อรีเฟรช</p>

${step('2', 'ดูและรับทราบรายงาน', 't2')}
<p>กด “ดูรายการ” (${n(4)} ในภาพก่อนหน้า) หรือปุ่มกรอง “รายงาน” เพื่อดูเฉพาะรายงาน</p>
${screen('d-reports')}
<p>หลังกด “รับทราบ” ปุ่มเปลี่ยนเป็นข้อความ “รับทราบแล้ว” และตัวเลขในแถบสีแดงลดลง (เมื่อรับทราบครบ แถบสีแดงหายไป) ระบบบันทึกอีเมลของผู้กดและเวลาไว้ในแท็บ <code>Ack</code></p>

${step('3', 'ค้นหาและกรอง', 't3')}
<p>พิมพ์ในช่องค้นหา ผลจะแสดงทันที ค้นได้ทั้งชื่อและรหัส ใช้ร่วมกับปุ่มกรองได้</p>
${screen('d-search')}

${step('4', 'ใช้บนมือถือ', 't4')}
<section class="screen side"><div><p>แถวรายชื่อเรียงต่อกันเป็นการ์ด ใช้งานได้ครบเหมือนบนคอมพิวเตอร์ ตัวเลขแต่ละช่องมีป้ายนำหน้า เช่น “รอบ 1: 36” “รวม: 86”</p>
<p>ภาพนี้แสดงเฉพาะส่วนบนของหน้า ที่เหลือเลื่อนลงดูได้</p></div><figure class="phone">${img('d-mobile')}</figure></section>

${step('5', 'อีเมลแจ้งเตือนเมื่อมีรายงาน', 't5')}
<p>เมื่อนักศึกษากด “ส่งรายงาน” ระบบส่งอีเมลแจ้งผู้รับที่ตั้งไว้ ดังตัวอย่าง</p>
<section class="screen"><figure class="narrow">${img('email-notify')}<figcaption>อีเมลแจ้งเตือน (ตัวอย่าง) ปุ่มสีน้ำเงินเปิดระบบไปที่แดชบอร์ด</figcaption></figure></section>
<p>อีเมลบอกชื่อ รหัส ภาคเรียน ชั่วโมงรวมในระบบ และข้อความของนักศึกษา ส่งในนาม <code>polsci.ecwp@gmail.com</code> หัวเรื่องขึ้นต้นด้วย <code>[TA 1/2569]</code> เพื่อค้นหาได้ง่าย</p>
<p>ผู้รับตั้งได้ที่ <code>NOTIFY_TO</code> ในแท็บ <code>Config</code> (ค่าตั้งต้นคือ <code>rungtiwa.p@cmu.ac.th</code> คนเดียว ใส่หลายอีเมลคั่นด้วยจุลภาคได้ หรือเว้นว่างเพื่อส่งถึงทุกคนในแท็บ <code>Staff</code>)
ปิดการแจ้งเตือนทางอีเมลได้โดยตั้ง <code>NOTIFY_EMAIL</code> เป็น <code>FALSE</code></p>

<div class="part">ส่วนที่ 3 สำหรับผู้ดูแลระบบ</div>
${step('1', 'งานประจำในชีต (ไม่ต้องแก้โค้ด)', 'u1')}
${table2(['ต้องการ', 'ทำที่ไหน'], [
  ['เพิ่ม/ลบเจ้าหน้าที่', 'แท็บ <code>Staff</code> เพิ่มหรือลบแถว (อีเมล และชื่อ) มีผลทันที (ผู้รับอีเมลแจ้งเตือนตั้งแยกที่ <code>NOTIFY_TO</code>)'],
  ['เพิ่มนักศึกษา หรือแก้อีเมลที่รับ OTP', 'แท็บ <code>Student</code> (รหัส ชื่อ อีเมล) นักศึกษาที่ไม่มีอีเมลจะเข้าสู่ระบบไม่ได้'],
  ['แก้ชั่วโมง', 'แท็บ <code>Hours</code> หนึ่งแถวต่อคนต่อรอบ นักศึกษาที่ตอบไปแล้วจะเห็นป้าย “ชม.เปลี่ยน” และต้องตอบใหม่'],
  ['เปลี่ยนภาคเรียน', 'แก้ <code>TERM</code> ในแท็บ <code>Config</code> วางข้อมูลใหม่ในแท็บ <code>import_TA</code> แล้วรัน <code>importHours()</code> ข้อมูลภาคเก่าไม่ถูกแตะ'],
  ['ดูประวัติคำตอบ', 'แท็บ <code>Response</code> (เพิ่มต่อท้ายอย่างเดียว แถวล่าสุดของแต่ละคนคือสถานะปัจจุบัน) และ <code>Ack</code> (ใครรับทราบเมื่อใด)'],
  ['ปรับอายุรหัสและจำนวนครั้งที่กรอกผิดได้', '<code>OTP_TTL_MIN</code> (10) · <code>OTP_MAX_TRIES</code> (5) · <code>OTP_RESEND_SEC</code> (60) ในแท็บ <code>Config</code>'],
  ['เปลี่ยนผู้รับอีเมลแจ้งเตือนรายงาน', '<code>NOTIFY_TO</code> ในแท็บ <code>Config</code> ใส่อีเมลเดียวหรือหลายอีเมลคั่นด้วยจุลภาค เว้นว่าง = ทุกคนในแท็บ <code>Staff</code>'],
  ['เปลี่ยนชื่อผู้ส่งหรือที่อยู่ที่ใช้ส่ง', '<code>MAIL_SENDER_NAME</code> · <code>MAIL_FROM</code> · <code>MAIL_REPLY_TO</code> (เว้นว่าง <code>MAIL_FROM</code> = ส่งจากบัญชีเจ้าของสคริปต์)'],
])}
<p>ถ้าค่าภาคเรียนในชีตถูกแปลงเป็นวันที่ (Google Sheets ทำเช่นนี้กับ “1/2569”) ระบบอ่านกลับเป็น “1/2569” ให้เสมอ และ <code>setup()</code> ซ่อมค่าที่ถูกแปลงแล้ว</p>

${step('2', 'ก่อนเปิดให้ TA ใช้', 'u2')}
<ol class="check">
  <li><b>ที่อยู่ผู้ส่ง</b> <code>polsci.ecwp@gmail.com</code> ต้องถูกเพิ่มและยืนยันแล้วเป็น “Send mail as” ใน Gmail ของเจ้าของสคริปต์ (Settings ▸ Accounts) ถ้ายังไม่พร้อม ระบบยังส่งได้ แต่จากบัญชีเจ้าของสคริปต์</li>
  <li>รัน <code>authorizeMailSend()</code> หนึ่งครั้งในตัวแก้ไข Apps Script อนุญาตสิทธิ์ Gmail แล้วอ่าน log ว่าขึ้น “Alias OK” และตรวจอีเมลทดสอบที่ได้รับ</li>
  <li>ตั้งค่า Web app: Execute as <b>Me</b> · Who has access <b>Anyone</b> เมื่ออัปเดตโค้ดให้ Deploy ▸ Manage deployments ▸ แก้ไขการ deploy เดิมเป็นเวอร์ชันใหม่ เพื่อให้ลิงก์เดิมใช้ได้</li>
  <li>ทดลองด้วยบัญชีทดสอบบนมือถือ: ขอ OTP · กรอกรหัสผิด · ส่งรหัสใหม่ · ยืนยัน · รายงาน · อีเมลแจ้งเตือนถึงเจ้าหน้าที่ · รับทราบ</li>
  <li>ตรวจว่า <code>TERM</code> ถูกต้อง รายชื่อในแท็บ <code>Staff</code> ครบ และนักศึกษาทุกคนมีอีเมลในแท็บ <code>Student</code> (log ของ <code>importRoster()</code> บอกว่าใครไม่มีอีเมล)</li>
  <li><b>ลบแท็บ <code>studentnow</code></b> หลังนำเข้าอีเมล เพราะมีข้อมูลส่วนบุคคล</li>
</ol>
${warn('โควตาอีเมลต่อวัน', 'อีเมลทุกฉบับ (ทั้ง OTP และแจ้งเตือน) นับรวมกันในบัญชีของเจ้าของสคริปต์ บัญชี Gmail ทั่วไปส่งได้ราว 100 ฉบับต่อวัน บัญชี Workspace ราว 1,500 ฉบับ ถ้าเหลือน้อยกว่า 2 ระบบจะแจ้งนักศึกษาว่าเต็มโควตา หากมี TA จำนวนมากให้ใช้บัญชี Workspace')}
`;

// ---- page + print styles -----------------------------------------------------------------
const css = `
:root{--ink:#1A1A1A;--muted:#5B6770;--green:#1A2E24;--sage:#7CB87A;--sage-ink:#0F1A14;--soft:#F3F4F6;--line:#D9DEE2;--destructive:#B84A3A;--mark:#F59E0B}
@page{size:A4;margin:17mm 16mm 20mm;
  @bottom-center{content:"คู่มือระบบตรวจสอบชั่วโมง TA  ·  หน้า " counter(page);font:9pt 'Noto Sans Thai','Sarabun',sans-serif;color:var(--muted)}}
*{box-sizing:border-box}
html{font:11pt/1.8 'Noto Sans Thai','Sarabun','Thonburi',Tahoma,sans-serif;color:var(--ink);-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{margin:0;max-width:178mm}
p{margin:0 0 9pt;max-width:70ch}
ul,ol{margin:0 0 10pt;padding-left:1.3em;max-width:70ch} li{margin-bottom:3pt}
code{font:600 .88em/1 'SF Mono',Menlo,Consolas,monospace;background:var(--soft);border-radius:5px;padding:1.5pt 5pt}
a{color:inherit;text-decoration:none}

.cover h1{font-size:28pt;line-height:1.35;margin:0 0 6pt;font-weight:700;color:var(--green)}
.cover .lead{font-size:13.2pt;line-height:1.75;color:#2d3a33;max-width:none;margin-bottom:12pt}
.cover .ver{font-size:9pt;color:var(--muted);margin:14pt 0 0}
.toc{display:grid;grid-template-columns:1fr 1fr;gap:12mm;margin:14pt 0 0;padding:14pt 0 0;border-top:1px solid var(--line)}
.toc h2{font-size:13.2pt;margin:0 0 4pt;color:var(--green)} .toc h2:not(:first-child){margin-top:12pt}
.toc ol{list-style:none;padding:0;margin:0;font-size:10.5pt} .toc li{margin:0 0 2pt}

.part{background:var(--green);color:#fff;border-radius:14px;padding:9pt 16pt;font-size:18pt;font-weight:700;margin:20pt 0 10pt;break-before:page;break-after:avoid}
.cover + .part{break-before:page}
p.keep{break-after:avoid}
figure.w72{width:72%;margin-inline:auto}
.side{display:grid;grid-template-columns:1fr 50mm;gap:10mm;align-items:start}
.side figure{margin:0}
.side .legend{margin-top:6pt}
h3.step{display:flex;align-items:center;gap:9pt;font-size:16pt;line-height:1.4;margin:16pt 0 6pt;break-after:avoid}
.stepno{flex:none;background:var(--sage);color:var(--sage-ink);border-radius:999px;padding:1pt 11pt;font-size:10pt;font-weight:700;line-height:1.7}
h4{font-size:13.2pt;margin:14pt 0 4pt;color:var(--green);break-after:avoid}

.note{break-after:avoid;background:#EEF5EE;border-radius:12px;padding:8pt 13pt;margin:0 0 10pt;font-size:10.5pt;line-height:1.7;break-inside:avoid}
.note.warn{background:#FBEDEA}
.tag{display:inline-block;background:var(--soft);border:1px solid var(--line);border-radius:999px;padding:0 7pt;font-size:8.5pt;line-height:1.6;font-weight:600;color:#374151;white-space:nowrap}
.n{display:inline-flex;align-items:center;justify-content:center;width:17pt;height:17pt;border-radius:50%;background:var(--mark);color:#1A1A1A;font:700 9.5pt/1 'Inter',sans-serif;vertical-align:middle}

.screen{break-inside:avoid;margin:0 0 12pt}
figure{margin:0 0 7pt} figure img{display:block;width:100%;height:auto;border-radius:10px;border:1px solid var(--line)}
figure.narrow{width:68%;margin-inline:auto} figure.phone{width:50mm;margin-inline:auto}
figcaption{font-size:9.5pt;color:var(--muted);text-align:center;margin-top:5pt}
figure.phone figcaption{text-align:left}
.legend{list-style:none;margin:0;padding:0;font-size:10pt;color:var(--ink)} .legend li{margin:2pt 0;display:flex;gap:6pt;align-items:center}

table{width:100%;border-collapse:collapse;font-size:10.5pt;line-height:1.6}
th{background:var(--soft);text-align:left;font-size:9.5pt;font-weight:700;color:#374151;padding:5pt 9pt}
td{padding:6pt 9pt;vertical-align:top;border-top:1px solid var(--line)}
tr{break-inside:avoid}
.callouts .c1{width:13mm;text-align:center} .callouts .c2{width:60mm}
table.plain td.k{width:58mm;font-weight:600}
table.plain{font-size:10pt;line-height:1.55} table.plain td{padding:4pt 9pt}
.screen.flow{break-inside:auto} .screen.flow figure{break-inside:avoid}
.badge{display:inline-flex;border-radius:999px;padding:0 9pt;font-size:9pt;font-weight:700;line-height:1.7}
.b-confirmed{background:var(--sage);color:var(--sage-ink)} .b-reported{background:var(--destructive);color:#fff}
.b-pending{background:#E5E7EB;color:#374151} .b-stale{background:#fff;border:1px solid var(--line);color:var(--muted)}

ol.check{padding-left:1.4em} ol.check li{margin-bottom:6pt}
`;

const bodyKept = body.replace(/<p>((?:(?!<\/p>)[^])*)<\/p>(\s*)(?=<section class="screen|<div class="note">)/g, '<p class="keep">$1</p>$2');
const html = `<!DOCTYPE html><html lang="th"><head><meta charset="utf-8"><title>คู่มือระบบตรวจสอบชั่วโมง TA</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@600;700&family=Noto+Sans+Thai:wght@400;600;700&display=swap" rel="stylesheet">
<style>${css}</style></head><body>${bodyKept}</body></html>`;

const out = path.join(HERE, 'manual.html');
fs.writeFileSync(out, html);
const pdf = path.join(HERE, 'manual.pdf');
execFileSync(findChrome(), ['--headless=new', '--no-sandbox', '--disable-gpu', '--no-pdf-header-footer', '--virtual-time-budget=15000', '--print-to-pdf=' + pdf, 'file://' + out],
  { stdio: 'ignore', timeout: 90000, killSignal: 'SIGKILL' });
console.log('wrote', path.relative(ROOT, out), 'and', path.relative(ROOT, pdf), fs.statSync(pdf).size, 'bytes');
