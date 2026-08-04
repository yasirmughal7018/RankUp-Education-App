/**
 * Rebuilds docs/03_RankUp_User_Creation_Approval_QA.docx from current business rules.
 * Run: npm run build:user-qa-docx  (from docs/)
 * Keep in sync with docs/03_RankUp_User_Creation_Approval_QA.html.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";

const __dirname = dirname(fileURLToPath(import.meta.url));

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    ...opts,
    children: [new TextRun({ text, size: 22, ...opts.run })],
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, size: 32 })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, bold: true, size: 26, color: "2E74B5" })],
  });
}

function bullet(text) {
  return new Paragraph({
    spacing: { after: 60 },
    indent: { left: 360 },
    children: [new TextRun({ text: `• ${text}`, size: 22 })],
  });
}

function cell(text, header = false) {
  return new TableCell({
    width: { size: 2400, type: WidthType.DXA },
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold: header,
            size: 18,
          }),
        ],
      }),
    ],
  });
}

function simpleTable(headers, rows) {
  return new Table({
    width: { size: 9600, type: WidthType.DXA },
    rows: [
      new TableRow({
        children: headers.map((h) => cell(h, true)),
      }),
      ...rows.map(
        (row) =>
          new TableRow({
            children: row.map((c) => cell(c)),
          }),
      ),
    ],
  });
}

const doc = new Document({
  sections: [
    {
      children: [
        h1("User Creation, Approval & Login — QA Guide"),
        p("RankUp Education — Web (React), Mobile (Flutter), and API"),
        p("Version: current codebase · Date: 2 Aug 2026"),
        p(
          "Aligned with email-username, scoped registration activation, and forgot-password first-wins. Full scenarios: docs/03_RankUp_User_Creation_Approval_QA.html",
        ),

        h2("1. Account states"),
        simpleTable(
          ["State", "login-status", "Can login?"],
          [
            ["Pending registration", "PendingApproval", "No"],
            ["Approved, needs password", "NeedsPasswordSetup", "No — set password first"],
            ["Active & ready", "Ready", "Yes"],
            [
              "Locked (school/campus change pending)",
              "LockedPendingSchoolChange",
              "No — locked page / message",
            ],
            ["Directory deactivated", "Error: not active", "No"],
            ["Rejected registration (soft)", "Rejected", "No — may re-request"],
          ],
        ),

        h2("2. Username & registration"),
        bullet("Username = email (required) for Student / Parent / Teacher self-request and directory create (incl. SchoolAdmin / CampusAdmin)."),
        bullet("Mobile optional. Student roll required only when a school is selected."),
        bullet("Login lookup: username (email) → cnic → mobile."),
        bullet("Queue: no school / Parent → PortalAdmin; school only → SchoolAdmin + PortalAdmin; school+campus → CampusAdmin + SchoolAdmin + PortalAdmin."),
        bullet("Activation: PortalAdmin any; SchoolAdmin Student/Teacher in school; CampusAdmin Student/Teacher in campus; no-school/Parent → PortalAdmin only."),
        bullet("Soft-reject keeps row (rejected_at); same email can re-request after reject."),

        h2("3. School / campus change"),
        bullet("Who can request: Teacher, Student, CampusAdmin (campus only). Parent cannot request."),
        bullet("On confirm: pending request, is_active=false, revoke sessions, logout → locked messaging."),
        bullet("Apply: PortalAdmin any; SchoolAdmin into own school; CampusAdmin Teacher/Student into own campus."),
        bullet("Reject unlocks without applying; optional leaveWithoutSchool for Student."),
        bullet("login-status while locked: LockedPendingSchoolChange."),

        h2("4. Directory create"),
        bullet("Email (username) required; no password on create → NeedsPasswordSetup."),
        bullet("PortalAdmin creates SchoolAdmin and CampusAdmin; SchoolAdmin creates CampusAdmin (own school)."),

        h2("5. Forgot password (first completion wins)"),
        bullet("POST /password-reset/request { username } — email link + pending app_user_password_reset_request + notify helpers (no existence leak)."),
        bullet("POST /password-reset/complete { token, newPassword } — email self-reset."),
        bullet("POST /password-reset/clear { username } — PortalAdmin / SchoolAdmin / CampusAdmin / linked Parent (Web bell)."),
        bullet("Notify: Student → School+Campus+Parent+Portal; Teacher → School+Campus+Portal; CampusAdmin → School+Portal; SchoolAdmin → Portal."),
        bullet("Web: /forgot-password + /reset-password?token=. Mobile: request only."),

        h2("6. Key Web routes"),
        bullet("/login — login-status branching"),
        bullet("/forgot-password, /reset-password — password reset"),
        bullet("/account-locked — school/campus change lock"),
        bullet("/account — profile + school/campus change request"),
        bullet("/admin/registrations — registration approvals"),
        bullet("/admin/directory/school-changes — school/campus change queue"),

        h2("7. Key APIs"),
        bullet("POST /api/auth/login-status — includes LockedPendingSchoolChange"),
        bullet("POST /api/auth/register — email username"),
        bullet("POST /api/auth/registrations/{id}/approve — activate when authorized"),
        bullet("POST /api/auth/password-reset/request|complete|clear"),
        bullet("POST /api/auth/me/school-change — request + lock"),
        bullet("POST /api/auth/school-changes/{id}/approve|reject"),

        h2("8. QA focus scenarios (see HTML for full steps)"),
        bullet("QA-01..05: scoped activation (School/Campus/Portal)"),
        bullet("QA-31..36: school-change lock / apply / reject / leaveWithoutSchool"),
        bullet("QA-37..38: forgot-password email + clear; first wins; locked does not notify"),

        p(
          "Full step-by-step scenarios and checklist: docs/03_RankUp_User_Creation_Approval_QA.html",
        ),
      ],
    },
  ],
});

const out = join(__dirname, "03_RankUp_User_Creation_Approval_QA.docx");
const buffer = await Packer.toBuffer(doc);
writeFileSync(out, buffer);
console.log(`Wrote ${out}`);
