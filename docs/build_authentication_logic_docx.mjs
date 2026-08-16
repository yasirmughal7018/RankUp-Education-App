/**
 * Rebuilds docs/02_RankUp_Authentication_Logic.docx from current business rules.
 * Run: npm run build:auth-logic-docx  (from docs/)
 * Keep in sync with docs/02_RankUp_Authentication_Logic.html and .py
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

function p(text) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, size: 22 })],
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
        children: [new TextRun({ text, bold: header, size: 18 })],
      }),
    ],
  });
}

function simpleTable(headers, rows) {
  return new Table({
    width: { size: 9600, type: WidthType.DXA },
    rows: [
      new TableRow({ children: headers.map((h) => cell(h, true)) }),
      ...rows.map(
        (row) => new TableRow({ children: row.map((c) => cell(c)) }),
      ),
    ],
  });
}

const doc = new Document({
  sections: [
    {
      children: [
        h1("RankUp Education — Authentication & Login Logic"),
        p("API shared; React full; Flutter Mobile partial. Version: 16 Aug 2026 (Tutor role)."),
        p(
          "Source of truth: AuthService + UserRoleRules + React. Companion QA: docs/03_RankUp_User_Creation_Approval_QA.html",
        ),

        h2("1. Executive summary"),
        bullet("JWT access (~30 min) + hashed refresh (30 days)."),
        bullet("Two-step login: login-status → set-initial-password or password login."),
        bullet("Username = email (required) for Student/Parent/Teacher/Tutor/SchoolAdmin/CampusAdmin. Lookup: username → cnic → mobile."),
        bullet("Registration activation: PortalAdmin any; SchoolAdmin/CampusAdmin Student/Teacher in scope; no-school/Parent/Tutor → PortalAdmin only."),
        bullet("Forgot password: username request → email link + pending app_user_password_reset_request + notify helpers; first completion wins."),
        bullet("Soft reject (rejected_at + rejection_reason). School/campus change locks until destination apply/reject (optional leaveWithoutSchool for Student)."),
        bullet("Eight roles. Exclusive: Student, PortalAdmin, SchoolAdmin, CampusAdmin. Combinable: Teacher + Parent + Coordinator + Tutor (any subset)."),
        bullet("Session role = JWT / refresh_tokens.active_role (Acting as). Self-remove Parent/Teacher/Coordinator/Tutor when another role remains."),
        bullet("Tutors directory + Parent/Tutor companion grants/removes on Teachers/Coordinators are PortalAdmin-only. School/Campus may manage Teacher↔Coordinator in scope."),

        h2("2. Username & login"),
        bullet("Self-register and directory create: email required; username = normalized email; no CNIC rewrite on activate."),
        bullet("Mobile optional. Student roll required only when school selected. Tutor never uses school/campus/roll."),
        bullet("Queue: Parent/Tutor/no-school → PortalAdmin; school only → SchoolAdmin+PortalAdmin; school+campus → CampusAdmin+SchoolAdmin+PortalAdmin."),

        h2("3. Account states (login-status)"),
        simpleTable(
          ["State", "login-status", "Can sign in?"],
          [
            ["Pending registration", "PendingApproval", "No"],
            ["Rejected (soft)", "Rejected", "No — may re-request"],
            ["Needs password", "NeedsPasswordSetup", "No — set password first"],
            ["Ready", "Ready", "Yes"],
            ["Locked (school change)", "LockedPendingSchoolChange", "No"],
            ["Deactivated", "(throws not active)", "No"],
          ],
        ),

        h2("4. Activation hierarchy"),
        simpleTable(
          ["Approver", "Activates"],
          [
            ["PortalAdmin", "Any pending registration"],
            ["SchoolAdmin", "Student/Teacher in own school"],
            ["CampusAdmin", "Student/Teacher in own campus"],
            ["No-school / Parent / Tutor", "PortalAdmin only"],
          ],
        ),

        h2("5. Multi-role & directory companions"),
        bullet("Allowed: any subset of Teacher+Parent+Coordinator+Tutor."),
        bullet("Blocked: Student/PortalAdmin/SchoolAdmin/CampusAdmin with any other role."),
        bullet("Tutor profile: app_user_tutors; student links: tutor_student_relations (not class roster). Lookup id 2017."),
        bullet("Grant APIs include tutors list and …/roles/tutor (PortalAdmin for Tutor/Parent companions on Teachers/Coordinators)."),
        bullet("Remove APIs: DELETE /api/directory/…/{id}/roles/{role} — companion only; not list primary; not sole role; Parent/Tutor remove PortalAdmin-only on Teachers/Coordinators."),
        bullet("Self-service: POST /api/auth/me/role-requests (Parent/Teacher/Coordinator/Tutor); DELETE /api/auth/me/roles/{role}."),

        h2("6. Forgot password (first completion wins)"),
        bullet("POST /api/auth/password-reset/request { username } — always success; email link + pending row + notify."),
        bullet("POST /api/auth/password-reset/complete { token, newPassword } — emailed self-reset."),
        bullet("POST /api/auth/password-reset/clear { username } — PortalAdmin / SchoolAdmin / CampusAdmin / linked Parent."),
        simpleTable(
          ["Requester", "Notified"],
          [
            ["Student", "SchoolAdmin + CampusAdmin + linked Parents + PortalAdmin"],
            ["Teacher", "SchoolAdmin + CampusAdmin + PortalAdmin"],
            ["CampusAdmin", "SchoolAdmin + PortalAdmin"],
            ["SchoolAdmin", "PortalAdmin"],
            ["Parent / Tutor", "PortalAdmin"],
          ],
        ),
        bullet("Web: /forgot-password + /reset-password?token=. Mobile: request only."),

        h2("7. School / campus change"),
        bullet("Request: Teacher / Student / CampusAdmin / Coordinator. Parent and Tutor cannot."),
        bullet("Rules follow active role. Multi-role: only requesting role locks."),
        bullet("Locks account when single-role (LockedPendingSchoolChange). Destination admin applies or rejects."),
        bullet("Reject unlocks; optional leaveWithoutSchool for Student."),

        h2("8. Key APIs"),
        bullet("POST /api/auth/login-status | set-initial-password | login | register | switch-role"),
        bullet("DELETE /api/auth/me/roles/{role} — remove Parent/Teacher/Coordinator/Tutor when another role remains"),
        bullet("POST /api/auth/me/role-requests; GET/approve/reject /api/auth/role-requests/…"),
        bullet("Directory grant/remove companions on teachers|parents|coordinators|tutors"),
        bullet("POST /api/auth/registrations/{id}/approve|reject — activate when authorized; reject requires reason"),
        bullet("POST /api/auth/password-reset/request|complete|clear"),
        bullet("POST /api/auth/me/school-change; school-changes/{id}/approve|reject"),

        h2("9. Tables"),
        bullet("app_users (username=email; rejection_reason), app_user_roles (no is_active), app_user_role_request"),
        bullet("app_approval"),
        bullet("app_user_tutors, tutor_student_relations"),
        bullet("app_user_school_change_request / _approval"),
        bullet("app_user_password_reset_request — pending reset; first completion wins"),
        bullet("App:PublicWebBaseUrl — reset email link base"),

        h2("10. Client parity"),
        simpleTable(
          ["Capability", "React", "Flutter"],
          [
            ["login-status / set-initial-password / login", "Yes", "Yes"],
            ["Forgot-password request", "Yes", "Yes"],
            ["Email reset-password page", "Yes", "No (open Web link)"],
            ["Password-reset clear", "Yes (bell)", "No"],
            ["School-change request", "Yes", "Yes"],
            ["School-change admin queue", "Yes", "No"],
            ["Multi-role switch", "Acting as toggle", "Profile dropdown"],
            ["Role request / remove Parent|Teacher|Coordinator|Tutor", "Yes", "Limited / Web first"],
            ["Directory Tutors + Tutor companions", "PortalAdmin", "No"],
            ["Directory grant/remove companions", "Yes", "No"],
            ["Directory manage", "Yes", "No"],
          ],
        ),

        p("Full HTML: docs/02_RankUp_Authentication_Logic.html · Generator: build_authentication_logic_docx.mjs / .py"),
      ],
    },
  ],
});

const out = join(__dirname, "02_RankUp_Authentication_Logic.docx");
const buffer = await Packer.toBuffer(doc);
writeFileSync(out, buffer);
console.log(`Wrote ${out}`);
