/**
 * Schema + defaults. All real data (people, hours, settings) lives in the spreadsheet;
 * nothing here is data. One narrow tab per concern.
 */
const TAB = {
  CONFIG: 'Config', STAFF: 'Staff', STUDENT: 'Student', HOURS: 'Hours',
  RESPONSE: 'Response', ACK: 'Ack',
};

/** Column order of every tab (header row 1). */
const SCHEMA = {
  Config:   ['key', 'value'],
  Staff:    ['email', 'name'],
  Student:  ['student_id', 'name', 'email'],
  Hours:    ['term', 'student_id', 'round', 'hours'],          // one row per student per round
  Response: ['response_id', 'term', 'student_id', 'status', 'hours_seen', 'detail', 'at'], // append-only log
  Ack:      ['response_id', 'by', 'at'],                       // staff acknowledged a report
};

/**
 * Tabs the admin pastes raw data into, then runs importHours() / importRoster().
 * import_TA = the "ส่งนักศึกษาตรวจสอบ" sheet only (ลำดับ, ชื่อ-สกุล, รหัสนักศึกษา, รอบที่ 1, รอบที่ 2, รวม).
 * studentnow = the registrar export (needs columns ID, EMAIL).
 */
const IMPORT_TAB = { HOURS: 'import_TA', ROSTER: 'studentnow' };

/** Used only when a key is missing from the Config tab. setup() writes these into the tab. */
const CONFIG_DEFAULTS = {
  TERM: '1/2569',
  TITLE: 'ตรวจสอบชั่วโมง TA',
  FACULTY: 'คณะรัฐศาสตร์และรัฐประศาสนศาสตร์',
  MAIL_SENDER_NAME: 'ระบบตรวจสอบชั่วโมง TA',
  NOTIFY_EMAIL: true,        // email staff when a student reports
  OTP_TTL_MIN: 10,
  OTP_MAX_TRIES: 5,
  OTP_RESEND_SEC: 60,
  SESSION_HOURS: 6,          // CacheService hard limit is 6h
  REPORT_MIN_CHARS: 10,
};

const STATUS = { CONFIRMED: 'confirmed', REPORTED: 'reported', PENDING: 'pending' };
