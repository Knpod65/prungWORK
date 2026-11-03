/** OTP login by email. OTP + sessions live in CacheService (auto-expiring), never in the sheet. */

class Fail extends Error { constructor(code) { super(code); this.code = code; } }
const fail_ = code => { throw new Fail(code); };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function secret_() {
  const p = PropertiesService.getScriptProperties();
  let s = p.getProperty('SECRET');
  if (!s) { s = Utilities.getUuid() + Utilities.getUuid(); p.setProperty('SECRET', s); }
  return s;
}

function hmac_(text) {
  return Utilities.base64Encode(Utilities.computeHmacSha256Signature(String(text), secret_()));
}

function safeEq_(a, b) {
  a = String(a); b = String(b);
  let d = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return d === 0;
}

function newOtp_() {
  const d = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + Date.now());
  let n = 0;
  for (let i = 0; i < 4; i++) n = n * 256 + (d[i] & 255);
  return String(n % 1000000).padStart(6, '0');
}

/** Resolve an email to a user from the Staff / Student tabs (roles are never cached). */
function findUser_(email) {
  const staff = rows_(TAB.STAFF).find(r => norm_(r.email) === email) || null;
  const student = rows_(TAB.STUDENT).find(r => norm_(r.email) === email) || null;
  if (!staff && !student) return null;
  return {
    email, staff, student,
    role: staff ? 'staff' : 'student',
    name: (staff && staff.name) || (student && student.name) || email,
  };
}

/** Send an OTP. Unknown emails get no mail but the same response (no account enumeration). */
function requestOtp_(raw) {
  const email = norm_(raw);
  if (!EMAIL_RE.test(email)) fail_('BAD_EMAIL');
  const c = cfg_();
  const cache = CacheService.getScriptCache();
  if (cache.get('cool:' + email)) fail_('COOLDOWN');
  // Checked before the user lookup so it reveals nothing about who is registered.
  // Consumer Gmail allows ~100 mails/day, Workspace ~1500.
  if (MailApp.getRemainingDailyQuota() < 2) fail_('MAIL_QUOTA');
  cache.put('cool:' + email, '1', c.OTP_RESEND_SEC);

  const user = findUser_(email);
  if (!user) return;

  const code = newOtp_();
  cache.put('otp:' + email, JSON.stringify({ h: hmac_(email + ':' + code), tries: 0, exp: Date.now() + c.OTP_TTL_MIN * 60000 }), c.OTP_TTL_MIN * 60);

  const body = 'รหัส OTP ของคุณคือ ' + code + '\nใช้ได้ภายใน ' + c.OTP_TTL_MIN + ' นาที และใช้ได้ครั้งเดียว อย่าบอกรหัสนี้กับผู้อื่น\nหากคุณไม่ได้ขอรหัส ให้ละเว้นอีเมลนี้';
  try {
    sendMail_(email, 'รหัส OTP ' + code + ' – ' + c.TITLE, body, otpHtml_(code, c));
  } catch (e) {
    // The user never got this code: release the cooldown and drop the OTP so they can retry at once.
    cache.remove('otp:' + email); cache.remove('cool:' + email);
    console.error('otp mail failed', e && e.stack || e);
    fail_('MAIL_FAIL');
  }
}

/**
 * The one place mail leaves the system. Sends as the shared Send-as alias (MAIL_FROM) with a
 * reply-to (MAIL_REPLY_TO), the way e-EXAM does, instead of the script owner's own address.
 * The alias must be a verified "Send mail as" address on the script owner's Gmail; if Gmail
 * rejects it we still deliver from the owner's address rather than lock everyone out.
 */
function sendMail_(to, subject, body, htmlBody) {
  const c = cfg_();
  const opts = { name: c.MAIL_SENDER_NAME };
  if (htmlBody) opts.htmlBody = htmlBody;
  if (c.MAIL_REPLY_TO) opts.replyTo = c.MAIL_REPLY_TO;
  if (c.MAIL_FROM) {
    try { GmailApp.sendEmail(to, subject, body, Object.assign({ from: c.MAIL_FROM }, opts)); return; }
    catch (e) { console.error('send as ' + c.MAIL_FROM + ' failed, using the account default:', e && e.message || e); }
  }
  GmailApp.sendEmail(to, subject, body, opts);
}

const escHtml_ = t => String(t).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

/**
 * OTP email in the app's own look: dark green frame, leaf mark, white card, accent badge.
 * Mail clients strip <style>, web fonts and most images, so this is table layout with inline
 * styles only and system Thai fonts. The light card keeps it readable when a client auto-darkens.
 */
function otpHtml_(code, c) {
  const font = "font-family:'Noto Sans Thai','Sarabun',Tahoma,'Leelawadee UI','Thonburi',Arial,sans-serif;";
  const title = escHtml_(c.TITLE), faculty = escHtml_(c.FACULTY), min = escHtml_(c.OTP_TTL_MIN);
  return '<!DOCTYPE html><html lang="th"><body style="margin:0;padding:0;background:#1A2E24;">' +
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#1A2E24;">รหัส OTP ของคุณคือ ' + code + ' ใช้ได้ภายใน ' + min + ' นาที</div>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#1A2E24;"><tr><td align="center" style="padding:28px 16px;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:460px;">' +
      // brand row
      '<tr><td style="padding:0 4px 16px;' + font + '">' +
        '<table role="presentation" cellpadding="0" cellspacing="0"><tr>' +
          '<td width="22" height="22" style="width:22px;height:22px;background:#7CB87A;border-radius:2px 14px 2px 14px;font-size:0;line-height:0;">&nbsp;</td>' +
          '<td style="padding-left:10px;color:#FFFFFF;font-size:15px;font-weight:700;line-height:1.5;' + font + '">' + title + '</td>' +
        '</tr></table></td></tr>' +
      // card
      '<tr><td style="background:#FFFFFF;border-radius:16px;padding:32px 28px;' + font + 'color:#1A1A1A;">' +
        '<p style="margin:0 0 4px;font-size:22px;font-weight:700;line-height:1.5;color:#1A1A1A;">รหัส OTP ของคุณ</p>' +
        '<p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#5B6770;">กรอกรหัสนี้ในหน้าเข้าสู่ระบบเพื่อดูและยืนยันชั่วโมง TA</p>' +
        '<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="background:#F3F4F6;border-radius:12px;padding:18px 8px;">' +
          '<span style="font-size:38px;font-weight:700;line-height:1.3;letter-spacing:10px;color:#1A2E24;padding-left:10px;">' + code + '</span>' +
        '</td></tr></table>' +
        '<p style="margin:20px 0 0;"><span style="display:inline-block;background:#7CB87A;color:#0F1A14;border-radius:9999px;padding:5px 14px;font-size:13px;font-weight:700;line-height:1.5;">ใช้ได้ภายใน ' + min + ' นาที</span> <span style="font-size:13px;color:#5B6770;">และใช้ได้ครั้งเดียว</span></p>' +
        '<p style="margin:20px 0 0;font-size:14px;line-height:1.8;color:#5B6770;">อย่าบอกรหัสนี้กับผู้อื่น แม้จะอ้างว่าเป็นเจ้าหน้าที่<br>หากคุณไม่ได้ขอรหัส ให้ละเว้นอีเมลนี้ได้เลย</p>' +
      '</td></tr>' +
      // footer
      '<tr><td align="center" style="padding:18px 8px 0;font-size:12px;line-height:1.7;color:#C8D4CC;' + font + '">' + faculty + '</td></tr>' +
    '</table></td></tr></table></body></html>';
}

/** Check the code; on success return a session token. */
function verifyOtp_(raw, codeRaw) {
  const email = norm_(raw);
  const code = String(codeRaw || '').replace(/\D/g, '');
  const c = cfg_();
  const cache = CacheService.getScriptCache();
  return withLock_(() => {
    const entry = JSON.parse(cache.get('otp:' + email) || 'null');
    if (!entry) fail_('OTP_EXPIRED');
    if (entry.tries >= c.OTP_MAX_TRIES) { cache.remove('otp:' + email); fail_('OTP_LOCKED'); }
    if (!safeEq_(entry.h, hmac_(email + ':' + code))) {
      entry.tries++;
      const ttl = Math.max(1, Math.ceil((entry.exp - Date.now()) / 1000));
      if (entry.tries >= c.OTP_MAX_TRIES) cache.remove('otp:' + email);
      else cache.put('otp:' + email, JSON.stringify(entry), ttl);
      fail_('OTP_BAD');
    }
    cache.remove('otp:' + email);
    const token = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
    cache.put('sess:' + hmac_(token), email, Math.min(21600, c.SESSION_HOURS * 3600));
    return token;
  });
}

function userFromToken_(token) {
  if (!token) fail_('AUTH');
  const email = CacheService.getScriptCache().get('sess:' + hmac_(token));
  const user = email && findUser_(email);
  if (!user) fail_('AUTH');
  return user;
}

function endSession_(token) {
  if (token) CacheService.getScriptCache().remove('sess:' + hmac_(token));
}
