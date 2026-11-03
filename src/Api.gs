/** Functions callable from the browser (google.script.run). Names ending in "_" stay private. */

function guard_(fn) {
  try { const data = fn(); return { ok: true, data: data === undefined ? null : data }; }
  catch (e) {
    if (!(e instanceof Fail)) console.error(e && e.stack || e);
    return { ok: false, code: e instanceof Fail ? e.code : 'ERROR' };
  }
}

function apiRequestOtp(email) { return guard_(() => requestOtp_(email)); }
function apiVerifyOtp(email, code) { return guard_(() => verifyOtp_(email, code)); }
function apiLogout(token) { return guard_(() => endSession_(token)); }

function apiMe(token) {
  return guard_(() => {
    const u = userFromToken_(token);
    const out = { email: u.email, name: u.name, role: u.role };
    if (u.role === 'student' && u.student) out.student = studentView_(id_(u.student.student_id));
    return out;
  });
}

function apiSubmit(token, status, detail) {
  return guard_(() => {
    const u = userFromToken_(token);
    if (!u.student) fail_('FORBIDDEN');
    if (status !== STATUS.CONFIRMED && status !== STATUS.REPORTED) fail_('BAD_STATUS');
    const c = cfg_();
    detail = String(detail || '').trim().slice(0, 1000);
    if (status === STATUS.REPORTED && detail.length < c.REPORT_MIN_CHARS) fail_('DETAIL_SHORT');
    if (status === STATUS.CONFIRMED) detail = '';

    const sid = id_(u.student.student_id);
    const view = studentView_(sid);
    if (!view.hours.length) fail_('NO_HOURS');

    const rec = {
      response_id: Utilities.getUuid(), term: c.TERM, student_id: sid,
      status, hours_seen: view.total, detail, at: new Date(),
    };
    withLock_(() => append_(TAB.RESPONSE, rec));
    if (status === STATUS.REPORTED) notifyStaff_(u, rec);
    return studentView_(sid);
  });
}

function apiDashboard(token) {
  return guard_(() => {
    if (userFromToken_(token).role !== 'staff') fail_('FORBIDDEN');
    return dashboard_();
  });
}

function apiAck(token, responseId) {
  return guard_(() => {
    const u = userFromToken_(token);
    if (u.role !== 'staff') fail_('FORBIDDEN');
    return withLock_(() => {
      if (!rows_(TAB.RESPONSE).some(r => r.response_id === responseId)) fail_('NOT_FOUND');
      if (!rows_(TAB.ACK).some(r => r.response_id === responseId)) {
        append_(TAB.ACK, { response_id: responseId, by: u.email, at: new Date() });
      }
      return dashboard_();
    });
  });
}

// ---- views ---------------------------------------------------------------

const iso_ = d => (d instanceof Date ? d.toISOString() : d ? String(d) : null);

function hoursOf_(term) {
  const by = {};
  rows_(TAB.HOURS).filter(r => String(r.term) === term).forEach(r => {
    (by[id_(r.student_id)] = by[id_(r.student_id)] || []).push({ round: Number(r.round), hours: Number(r.hours) || 0 });
  });
  Object.keys(by).forEach(k => by[k].sort((a, b) => a.round - b.round));
  return by;
}

const sum_ = list => Math.round(list.reduce((t, h) => t + h.hours, 0) * 100) / 100;

/** Latest response per student for the term (the log is append-only; last row wins). */
function latestResponses_(term) {
  const m = {};
  rows_(TAB.RESPONSE).filter(r => String(r.term) === term).forEach(r => { m[id_(r.student_id)] = r; });
  return m;
}

const respView_ = r => r && {
  id: r.response_id, status: r.status, detail: r.detail || '', at: iso_(r.at), hoursSeen: Number(r.hours_seen),
};

function studentView_(sid) {
  const term = cfg_().TERM;
  const hours = hoursOf_(term)[sid] || [];
  const total = sum_(hours);
  const r = respView_(latestResponses_(term)[sid]);
  if (r) r.stale = r.hoursSeen !== total;
  return { id: sid, term, hours, total, response: r || null };
}

function dashboard_() {
  const term = cfg_().TERM;
  const hours = hoursOf_(term);
  const latest = latestResponses_(term);
  const acked = {};
  rows_(TAB.ACK).forEach(a => { acked[a.response_id] = true; });
  const names = {};
  rows_(TAB.STUDENT).forEach(s => { names[id_(s.student_id)] = s.name; });

  const rounds = [];
  const list = Object.keys(hours).sort().map(sid => {
    hours[sid].forEach(h => { if (rounds.indexOf(h.round) < 0) rounds.push(h.round); });
    const total = sum_(hours[sid]);
    const r = respView_(latest[sid]);
    return {
      id: sid, name: names[sid] || sid, hours: hours[sid], total,
      status: r ? r.status : STATUS.PENDING,
      detail: r ? r.detail : '', at: r ? r.at : null,
      responseId: r ? r.id : null, acked: !!(r && acked[r.id]), stale: !!(r && r.hoursSeen !== total),
    };
  });
  const count = s => list.filter(x => x.status === s).length;
  return {
    term, rounds: rounds.sort((a, b) => a - b), students: list,
    counts: {
      all: list.length, confirmed: count(STATUS.CONFIRMED), reported: count(STATUS.REPORTED), pending: count(STATUS.PENDING),
      newReports: list.filter(x => x.status === STATUS.REPORTED && !x.acked).length,
    },
  };
}

function notifyStaff_(user, rec) {
  const c = cfg_();
  if (!c.NOTIFY_EMAIL) return;
  try {
    const to = rows_(TAB.STAFF).map(s => norm_(s.email)).filter(Boolean).join(',');
    if (!to) return;
    let url = '';
    try { url = ScriptApp.getService().getUrl(); } catch (e) { /* not deployed yet */ }
    MailApp.sendEmail({
      to, name: c.MAIL_SENDER_NAME,
      subject: '[TA ' + c.TERM + '] นักศึกษารายงานชั่วโมงไม่ถูกต้อง: ' + user.name + ' (' + rec.student_id + ')',
      body: user.name + ' (' + rec.student_id + ') รายงานว่าชั่วโมง TA ไม่ถูกต้อง\nชั่วโมงรวมในระบบ: ' + rec.hours_seen +
        '\n\nรายละเอียด:\n' + rec.detail + (url ? '\n\nเปิดระบบ: ' + url : ''),
    });
  } catch (e) { console.error('notify failed', e); }   // never block the student's submit
}
