/**
 * Rebuilds docs/02_RankUp_User_Creation_Approval_QA.docx from current business rules.
 * Run: npm run build:user-qa-docx  (from docs/)
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
        p("Version: current codebase · Date: 17 Jul 2026"),
        p(
          "Regenerated to match business logic including school/campus change lock/unlock.",
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

        h2("2. Registration (unchanged core)"),
        bullet("Student / Parent / Teacher self-request → app_user_approval queue."),
        bullet("SchoolAdmin / CampusAdmin soft-approve only; do NOT activate."),
        bullet("PortalAdmin alone activates → NeedsPasswordSetup → set password → login."),
        bullet("Soft-reject keeps row (rejected_at); same CNIC/mobile can re-request."),

        h2("3. School / campus change (new)"),
        bullet("Who can request: Teacher, Student, CampusAdmin (campus only for CampusAdmin). Parent cannot request."),
        bullet("PortalAdmin / SchoolAdmin cannot request via profile."),
        bullet("Web Profile + Mobile Profile: separate School/campus section + Request button (not Save profile)."),
        bullet("Confirmation popup required before submit."),
        bullet("On confirm: create pending request, set is_active=false, revoke sessions, logout → locked messaging."),
        bullet("Apply (unlock + move): PortalAdmin any; SchoolAdmin into own school; CampusAdmin Teacher/Student into own campus."),
        bullet("List filters match apply matrix — Approve & apply (no separate record-approval-only action)."),
        bullet("Reject: unlock without applying change."),
        bullet("PortalAdmin UI shows schoolAdminHasApproved yes/no."),
        bullet("login-status while locked: LockedPendingSchoolChange."),

        h2("4. Directory create"),
        bullet("PortalAdmin creates SchoolAdmin and CampusAdmin."),
        bullet("SchoolAdmin creates CampusAdmin (own school only)."),
        bullet("Directory users: auto-approved, NeedsPasswordSetup on first login."),

        h2("5. Key Web routes"),
        bullet("/login — login-status branching"),
        bullet("/account-locked — why locked (school/campus change)"),
        bullet("/account — profile + separate school/campus change"),
        bullet("/admin/registrations — registration approvals"),
        bullet("/admin/school-changes — school/campus change approvals"),
        bullet("/admin/directory/school-admins — PortalAdmin only"),
        bullet("/admin/directory/campus-admins — PortalAdmin or SchoolAdmin"),

        h2("6. Key APIs"),
        bullet("POST /api/auth/login-status — includes LockedPendingSchoolChange"),
        bullet("POST /api/auth/me/school-change — request + lock"),
        bullet("GET /api/auth/school-changes/pending — includes schoolAdminHasApproved"),
        bullet("POST /api/auth/school-changes/{id}/approve|reject"),

        h2("7. QA focus scenarios"),
        bullet("QA-31: Teacher change → confirm → lock → SchoolAdmin apply → unlock"),
        bullet("QA-32: PortalAdmin apply; see School Admin approved / not yet"),
        bullet("QA-33: Reject unlocks without applying"),
        bullet("QA-34: CampusAdmin applies Teacher/Student inbound campus change"),
        bullet("QA-35: CampusAdmin campus-only request"),
        bullet("QA-36: Cancel confirm → no lock"),

        p(
          "Full step-by-step scenarios and checklist: see docs/02_RankUp_User_Creation_Approval_QA.html",
        ),
      ],
    },
  ],
});

const out = join(__dirname, "02_RankUp_User_Creation_Approval_QA.docx");
const buffer = await Packer.toBuffer(doc);
writeFileSync(out, buffer);
console.log(`Wrote ${out}`);
