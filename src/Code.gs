/** Web app entry. */

function doGet() {
  try {
    const c = cfg_();
    const t = HtmlService.createTemplateFromFile('index');
    t.boot = JSON.stringify({
      title: c.TITLE, faculty: c.FACULTY, term: c.TERM,
      otpMin: c.OTP_TTL_MIN, minChars: c.REPORT_MIN_CHARS,
    }).replace(/</g, '\\u003c');
    return t.evaluate()
      .setTitle(c.TITLE)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (e) {
    console.error(e);
    return HtmlService.createHtmlOutput('ระบบยังไม่พร้อมใช้งาน (ยังไม่ได้รัน setup)');
  }
}

function include(name) { return HtmlService.createHtmlOutputFromFile(name).getContent(); }
