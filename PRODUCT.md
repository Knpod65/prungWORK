# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **TA students** (primary): CMU teaching assistants, Thai-speaking, mostly on phones. Occasional, low-engagement users who arrive once per round to check their hours and answer.
- **Department admin staff**: a small team (listed in the Staff sheet tab; more can be added) who watch per-person status, receive notifications when a student reports a problem, and acknowledge reports.

## Product Purpose

Lets each TA verify their total work hours and either confirm them or report a discrepancy with a comment. Staff see who has confirmed, reported, or not answered, and resolve reports. Success: every TA answers once, and staff resolve reports quickly.

## Positioning

Identity is proven by an emailed OTP to the student's @cmu.ac.th address checked against the roster, so there are no accounts or passwords. Data lives in a Google Sheet that staff can edit directly.

## Operating Context

- Runs as a Google Apps Script web app backed by Google Sheets (tabs: Config, Staff, Student, Hours, Response, Ack).
- Hours are imported per term and round from the staff sheet "ส่งนักศึกษาตรวจสอบ"; roster comes from the registrar data.
- Per-term cycle: change `TERM` in Config, paste new data, run `importHours()`.
- Deploy via clasp (`npm run deploy`).

## Capabilities and Constraints

- OTP and sessions live in CacheService (expiring), not in the sheet.
- Response is an append-only log; the latest row per student is the current status.
- If hours change after a student responds (`hours_seen` differs from current total), a "ชม.เปลี่ยน" badge shows and the student must answer again.
- OTP and staff notification emails go out via GmailApp as the shared Send-as alias `MAIL_FROM` (same sender as the e-EXAM script), through the script owner's Gmail account, so that account's daily mail quota applies; staff notifications can be toggled in Config.
- Rounds are rows, so adding a round needs no new columns.
- Roster data is personal data; the temporary `studentnow` tab must be deleted after import and `seed/` is not committed.

## Brand Commitments

- Thai-first UI: all user-facing copy in Thai.
- Mobile-first for students.

## Evidence on Hand

- Working app in `src/` (Api, Auth, Db, Setup, index/app/styles HTML) and tests in `test/`.
- No testimonials, usage numbers, or CMU brand assets are recorded; do not fabricate them.

## Product Principles

- One clear action per screen for students: see hours, confirm or report.
- Trust through transparency: show exactly which hours the student is answering about, and flag changes.
- Staff time is the scarce resource: surface reports and unanswered people first.
- Plain, polite Thai; no jargon.

## Accessibility & Inclusion

- Thai text must render well (line height, no clipped diacritics) on small screens.
