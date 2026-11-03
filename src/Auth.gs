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
  cache.put('cool:' + email, '1', c.OTP_RESEND_SEC);

  const user = findUser_(email);
  if (!user) return;

  const code = newOtp_();
  cache.put('otp:' + email, JSON.stringify({ h: hmac_(email + ':' + code), tries: 0, exp: Date.now() + c.OTP_TTL_MIN * 60000 }), c.OTP_TTL_MIN * 60);

  const body = 'รหัส OTP ของคุณคือ ' + code + '\nใช้ได้ภายใน ' + c.OTP_TTL_MIN + ' นาที อย่าบอกรหัสนี้กับผู้อื่น\nหากคุณไม่ได้ขอรหัส ให้ละเว้นอีเมลนี้';
  MailApp.sendEmail({
    to: email,
    subject: 'รหัส OTP ' + code + ' – ' + c.TITLE,
    body,
    htmlBody: '<div style="font-family:sans-serif"><p>รหัส OTP ของคุณคือ</p><p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:8px 0">' + code +
      '</p><p>ใช้ได้ภายใน ' + c.OTP_TTL_MIN + ' นาที อย่าบอกรหัสนี้กับผู้อื่น<br>หากคุณไม่ได้ขอรหัส ให้ละเว้นอีเมลนี้</p></div>',
    name: c.MAIL_SENDER_NAME,
  });
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
