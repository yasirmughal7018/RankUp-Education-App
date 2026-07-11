/**
 * Builds docs/02_RankUp_User_Creation_Approval_QA.docx
 * Run: node docs/build_user_creation_qa_docx.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  convertInchesToTwip,
} from "docx";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT = join(__dirname, "02_RankUp_User_Creation_Approval_QA.docx");

const BLUE = "2E74B5";
const INK = "0B2545";
const MUTED = "53606D";
const FILL = "F4F6F9";
const BORDER = "D9E1EA";

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.after ?? 120, before: opts.before ?? 0 },
    children: [
      new TextRun({
        text,
        font: "Calibri",
        size: opts.size ?? 22,
        bold: opts.bold,
        color: opts.color,
        italics: opts.italics,
      }),
    ],
  });
}

function rich(runs, opts = {}) {
  return new Paragraph({
    spacing: { after: opts.after ?? 120, before: opts.before ?? 0 },
    children: runs.map(
      (r) =>
        new TextRun({
          font: "Calibri",
          size: r.size ?? 22,
          ...r,
        }),
    ),
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 0, after: 160 },
    children: [new TextRun({ text, font: "Calibri", bold: true, size: 36, color: INK })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120 },
    children: [new TextRun({ text, font: "Calibri", bold: true, size: 28, color: BLUE })],
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 80 },
    children: [new TextRun({ text, font: "Calibri", bold: true, size: 24, color: INK })],
  });
}

function bullet(text) {
  return new Paragraph({
    spacing: { after: 60 },
    indent: { left: convertInchesToTwip(0.25) },
    children: [new TextRun({ text: `• ${text}`, font: "Calibri", size: 22 })],
  });
}

function numbered(n, text) {
  return new Paragraph({
    spacing: { after: 60 },
    indent: { left: convertInchesToTwip(0.25) },
    children: [new TextRun({ text: `${n}. ${text}`, font: "Calibri", size: 22 })],
  });
}

function cell(text, opts = {}) {
  return new TableCell({
    width: { size: opts.width ?? 2000, type: WidthType.DXA },
    shading: opts.header ? { fill: FILL } : undefined,
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
      left: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
      right: { style: BorderStyle.SINGLE, size: 4, color: BORDER },
    },
    children: [
      new Paragraph({
        spacing: { after: 40, before: 40 },
        children: [
          new TextRun({
            text: String(text ?? ""),
            font: "Calibri",
            size: 18,
            bold: !!opts.header,
            color: opts.header ? INK : undefined,
          }),
        ],
      }),
    ],
  });
}

function table(headers, rows, colWidths) {
  const widths = colWidths ?? headers.map(() => Math.floor(9360 / headers.length));
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({
        children: headers.map((h, i) => cell(h, { header: true, width: widths[i] })),
      }),
      ...rows.map(
        (row) =>
          new TableRow({
            children: row.map((c, i) => cell(c, { width: widths[i] })),
          }),
      ),
    ],
  });
}

function scenario(id, title, platforms, steps, expected, note) {
  const blocks = [
    h3(`${id} — ${title}`),
    rich([{ text: `Platforms: ${platforms}`, italics: true, color: MUTED, size: 20 }]),
    ...steps.map((s, i) => numbered(i + 1, s)),
    rich(
      [
        { text: "Expected: ", bold: true, color: "166534" },
        { text: expected, color: "166534" },
      ],
      { after: 80 },
    ),
  ];
  if (note) {
    blocks.push(
      rich(
        [
          { text: "Note: ", bold: true, color: "92400E" },
          { text: note, color: "92400E" },
        ],
        { after: 160 },
      ),
    );
  }
  return blocks;
}

const doc = new Document({
  creator: "RankUp Education",
  title: "User Creation, Approval & Login — QA Guide",
  description:
    "QA guide for web and mobile user creation, approval, login, CampusAdmin, and multi-role.",
  sections: [
    {
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(0.75),
            bottom: convertInchesToTwip(0.75),
            left: convertInchesToTwip(0.85),
            right: convertInchesToTwip(0.85),
          },
        },
      },
      children: [
        h1("User Creation, Approval & Login — QA Guide"),
        p("RankUp Education — Web (React), Mobile (Flutter), and API", {
          color: MUTED,
          size: 24,
          after: 80,
        }),
        rich([
          { text: "Version: current codebase  ·  ", color: MUTED, size: 18 },
          {
            text: "Roles: PortalAdmin · SchoolAdmin · CampusAdmin · Teacher · Parent · Student  ·  ",
            color: MUTED,
            size: 18,
          },
          { text: "Multi-role + active role  ·  Date: 11 Jul 2026", color: MUTED, size: 18 },
        ]),

        h2("1. Overview & account states"),
        p("RankUp supports these user-creation paths:"),
        numbered(
          1,
          "Self-service request — Student / Parent / Teacher submit → Admin reviews → Approve or Reject → On approve, user sets password → Login.",
        ),
        numbered(
          2,
          "Directory create (Web) — Admin creates Student / Teacher / Parent / SchoolAdmin / CampusAdmin with NO password → auto-approved → user sets password on first login.",
        ),
        numbered(
          3,
          "Add role to existing account — Directory create matching an existing mobile/CNIC adds a second role (multi-role) when combination rules allow.",
        ),
        p(
          "PortalAdmin is not created via the app (seed/DB). SchoolAdmin is created by PortalAdmin. CampusAdmin is created by PortalAdmin or SchoolAdmin.",
        ),
        p(
          "Important: Approving a registration OR directory-creating a user does NOT set a password. The user must set password on first login, then sign in.",
          { bold: true, after: 160 },
        ),
        table(
          ["State", "DB condition", "login-status", "Can login?"],
          [
            ["Pending approval", "is_active=false AND password_hash NULL", "PendingApproval", "No"],
            [
              "Approved, needs password",
              "is_active=true AND password_hash NULL",
              "NeedsPasswordSetup",
              "No — set password first",
            ],
            ["Active & ready", "is_active=true AND password set", "Ready", "Yes"],
            ["Deactivated", "is_active=false with password set", "not active", "No"],
            ["Rejected", "Row deleted from app_users", "No account found", "No"],
          ],
          [1800, 3200, 2200, 2160],
        ),
        p(
          "Roles live in app_user_roles. app_users.role is the primary/default role at login. JWT role claim is the active role for the session.",
          { after: 160 },
        ),

        h2("2. Roles & permissions matrix"),
        table(
          ["Action", "PortalAdmin", "SchoolAdmin", "CampusAdmin", "Teacher", "Parent", "Student"],
          [
            ["Request account access", "—", "—", "—", "Yes", "Yes", "Yes"],
            [
              "Approve / reject registrations",
              "All",
              "Own school, School Admin target",
              "Own school+campus, School Admin target",
              "—",
              "—",
              "—",
            ],
            [
              "Directory create Student/Teacher/Parent",
              "Any school",
              "Own school",
              "Own school+campus",
              "—",
              "—",
              "—",
            ],
            ["Directory create SchoolAdmin", "Yes", "—", "—", "—", "—", "—"],
            ["Directory create CampusAdmin", "Yes", "Own school", "—", "—", "—", "—"],
            ["Manage schools / campuses", "Yes", "Own school", "—", "—", "—", "—"],
            [
              "Activate / deactivate",
              "Yes",
              "Own school",
              "Own campus scope",
              "—",
              "—",
              "—",
            ],
            [
              "Switch active role",
              "If multi-role",
              "If multi-role",
              "If multi-role",
              "If multi-role",
              "If multi-role",
              "N/A",
            ],
            ["Create PortalAdmin via app", "No", "No", "No", "No", "No", "No"],
          ],
          [2100, 1200, 1400, 1400, 900, 900, 960],
        ),

        h2("3. Ways to create users"),
        h3("Path A — Self-service → Approve → Set password → Login"),
        numbered(1, "Guest opens Request account access (Web or Mobile)."),
        numbered(2, "Chooses Student / Parent / Teacher and submits."),
        numbered(3, "Request appears on Registration approvals for eligible admins."),
        numbered(4, "Admin Approves (or Rejects)."),
        numbered(5, "On Approve: user becomes active but has no password; role profile created."),
        numbered(6, "User enters CNIC/mobile → NeedsPasswordSetup → sets password → signs in."),
        h3("Path B — Directory create (Web only)"),
        numbered(1, "Admin opens Directory (Students / Teachers / Parents / School Admins / Campus Admins)."),
        numbered(2, "Creates user with username and required fields — NO password."),
        numbered(3, "User is auto-approved (active, no password) → NeedsPasswordSetup."),
        numbered(4, "On first login, user sets initial password, then signs in."),
        h3("Path C — Add role to existing user (multi-role)"),
        numbered(
          1,
          "Admin creates Teacher / Parent / SchoolAdmin / CampusAdmin with a mobile or CNIC that already belongs to an existing account.",
        ),
        numbered(2, "If combination rules allow, the new role is added to app_user_roles."),
        numbered(3, "User keeps one password; after login they can switch active role."),

        h2("4. Self-service request field rules"),
        table(
          ["Field", "Student", "Parent", "Teacher"],
          [
            ["Full name", "Required *", "Required *", "Required *"],
            ["Mobile number", "Required *", "Required *", "Required *"],
            ["Account type", "Required *", "Required *", "Required *"],
            ["Email / CNIC / Reason", "Optional", "Optional", "Optional"],
            ["School", "Required *", "Hidden / not allowed", "Optional"],
            ["Campus", "Required *", "Hidden / not allowed", "Optional (needs school if set)"],
            ["Roll / teacher code", "Roll required *", "Hidden / not allowed", "Teacher code optional"],
          ],
          [2400, 2320, 2320, 2320],
        ),
        bullet("Username on request: CNIC if provided, otherwise mobile. Must be unique."),
        bullet(
          "School selected → admin_target = School Admin → SchoolAdmin (same school), CampusAdmin (same school+campus), and PortalAdmin.",
        ),
        bullet("No school → admin_target = Portal Admin → PortalAdmin only."),

        h2("5. Approval & rejection rules"),
        table(
          ["Reviewer", "Sees in pending list", "Can approve / reject"],
          [
            ["PortalAdmin", "All pending requests", "All pending requests"],
            [
              "SchoolAdmin",
              "Own school AND admin_target = School Admin",
              "Same scope only (Portal-target forbidden)",
            ],
            [
              "CampusAdmin",
              "Own school + campus AND admin_target = School Admin",
              "Same campus scope only",
            ],
          ],
          [1800, 3780, 3780],
        ),
        bullet("On Approve: is_active=true, password still null, must_change_password=true; role profile created."),
        bullet("Student profile defaults: grade 1, section A."),
        bullet("Teacher approve requires school + campus on the request."),
        bullet("On Reject: user row hard-deleted; login-status returns No account found; can request again."),
        bullet("Approvals UI (Web): school line 1, campus line 2; no Admin Target column; long reason truncated with Read more."),

        h2("6. Directory (admin) create rules — Web only"),
        p("No password on create. Directory users are auto-approved and must set password on first login (NeedsPasswordSetup)."),
        table(
          ["Entity", "Who", "Required fields", "Optional"],
          [
            [
              "Student",
              "Portal/School/Campus Admin",
              "fullName, username, school, campus, roll, grade, section",
              "mobile",
            ],
            [
              "Teacher",
              "Portal/School/Campus Admin",
              "fullName, username, school, campus, teacherCode",
              "mobile",
            ],
            ["Parent", "Portal/School/Campus Admin", "fullName, username", "cnic, mobile"],
            ["SchoolAdmin", "PortalAdmin only", "fullName, username, school", "mobile, cnic, email"],
            [
              "CampusAdmin",
              "PortalAdmin or SchoolAdmin",
              "fullName, username, school, campus",
              "mobile, cnic, email",
            ],
          ],
          [1400, 2000, 4000, 1960],
        ),
        bullet("Web: /admin/directory/school-admins, /admin/directory/campus-admins"),
        bullet("CampusAdmin cannot manage Campus Admins. SchoolAdmin is locked to own school when creating CampusAdmin."),
        bullet("If mobile/CNIC matches an existing user and role rules allow, the role is added to that account (Path C)."),

        h2("7. Multi-role & active role"),
        p("One person can hold multiple roles on one login. Roles are stored in app_user_roles."),
        h3("Allowed combinations"),
        bullet("Teacher + Parent"),
        bullet("CampusAdmin + Teacher and/or Parent"),
        bullet("SchoolAdmin + Teacher and/or Parent"),
        bullet("SchoolAdmin + CampusAdmin + Teacher/Parent (allowed by rules)"),
        h3("Blocked combinations"),
        bullet("Student cannot combine with any other role"),
        bullet("PortalAdmin cannot combine with any other role"),
        h3("Session behaviour"),
        numbered(1, "Login uses primary role (app_users.role) as the default active role."),
        numbered(2, "API returns role (active) and roles (all)."),
        numbered(3, "POST /api/auth/switch-role issues new tokens for the selected role."),
        numbered(4, "Refresh token stores active_role so refresh keeps the same acting role."),
        numbered(5, "Authorization uses the active role only."),
        bullet("Web: Acting as switcher in the header when roles.length > 1."),
        bullet("Mobile: role switcher on Profile when multiple roles exist."),

        h2("8. Login / password / active checks"),
        h3("Shared 3-step flow (Web + Mobile)"),
        numbered(1, "Enter CNIC or mobile → POST /api/auth/login-status."),
        numbered(2, "Branch: PendingApproval | NeedsPasswordSetup | Ready."),
        numbered(3, "Sign in → POST /api/auth/login."),
        p("Login identifier resolution: username → CNIC → mobile."),
        h3("How to check if a user is active"),
        table(
          ["Method", "How", "Platform"],
          [
            ["Login status UI", "Enter identifier; see Pending / Needs password / Ready / not active", "Web + Mobile"],
            ["Pending list", "Appears on Approvals only while pending", "Web + Mobile"],
            ["Directory list", "Active / Inactive column and filters", "Web only"],
            ["Database", "app_users.is_active, password_hash, app_user_roles", "QA / DB"],
            ["GET /api/auth/me", "After login; includes role, roles, mustChangePassword", "API"],
          ],
          [2200, 4800, 2360],
        ),

        h2("9. Where to test (Web & Mobile)"),
        table(
          ["Feature", "Web (React)", "Mobile (Flutter)"],
          [
            ["Login", "/login", "Login screen"],
            ["Request account", "/request-access", "Login → Request account access sheet"],
            ["Registration approvals", "/admin/registrations", "Admin → Approvals"],
            ["Directory create / activate", "/admin/directory/*", "Not available"],
            ["School Admins", "/admin/directory/school-admins", "Not available"],
            ["Campus Admins", "/admin/directory/campus-admins", "Not available"],
            ["Role switcher", "Header Acting as", "Profile → Acting as"],
            ["Forced change password", "Change password modal", "/change-password"],
          ],
          [2800, 3280, 3280],
        ),

        h2("10. QA scenarios (step-by-step)"),

        ...scenario("QA-01", "Student self-request — happy path", "Web + Mobile", [
          "Open Request account access.",
          "Account type = Student. Fill full name, mobile, school, campus, roll number.",
          "Submit request.",
          "As PortalAdmin, SchoolAdmin (same school), or CampusAdmin (same campus), open Approvals and Approve.",
          "On login: enter mobile/CNIC → Needs password setup.",
          "Set password (≥6) → then Sign in.",
        ], "Student reaches app home. Pending list cleared. Directory (Web) shows Active."),

        ...scenario("QA-02", "Parent self-request — Portal Admin only", "Web + Mobile", [
          "Request as Parent; confirm school/campus/roll are hidden.",
          "Submit with name + mobile.",
          "SchoolAdmin / CampusAdmin Approvals → Parent request must NOT appear.",
          "PortalAdmin Approvals → Approve.",
          "Parent sets password and logs in on Web and Mobile.",
        ], "Only PortalAdmin can approve. Parent becomes Ready after set-password + login."),

        ...scenario(
          "QA-03",
          "Teacher self-request with school (School / Campus Admin path)",
          "Web + Mobile",
          [
            "Request as Teacher; select school + campus; optional teacher code.",
            "SchoolAdmin of that school, CampusAdmin of that campus, and PortalAdmin can Approve.",
            "Set password → login as Teacher on Web and Mobile.",
          ],
          "Teacher profile created; login succeeds.",
        ),

        ...scenario(
          "QA-04",
          "Teacher self-request without school (Portal Admin path)",
          "Web + Mobile + API",
          [
            "Request as Teacher with school empty.",
            "Confirm SchoolAdmin / CampusAdmin do not see it.",
            "PortalAdmin attempts Approve.",
          ],
          "Document actual API result.",
          "Teacher profile creation requires school + campus at approve time — approve may fail if missing. Prefer school+campus or directory create.",
        ),

        ...scenario("QA-05", "Student request validation (required fields)", "Web + Mobile", [
          "As Student, submit without school → blocked.",
          "Without campus → blocked.",
          "Without roll number → blocked.",
          "Without full name or mobile → blocked.",
        ], "Client and/or API validation errors; no pending row created."),

        ...scenario("QA-06", "Parent must not send school/campus/roll", "Web + Mobile + API", [
          "UI: switching to Parent clears/hides school fields.",
          "API optional: POST register as Parent with schoolId → validation error.",
        ], "Parent requests never carry school/campus/roll."),

        ...scenario("QA-07", "Duplicate mobile / CNIC / username", "Web + Mobile", [
          "Submit a valid Student request.",
          "Submit again with same mobile or CNIC → error.",
          "Reject first request, then same mobile can register again.",
        ], "Uniqueness while pending/active; after reject, re-request allowed."),

        ...scenario("QA-08", "Reject registration", "Web + Mobile", [
          "Create a pending request.",
          "Admin Rejects.",
          "Confirm removed from Approvals.",
          "Login with same identifier → No account found.",
        ], "Hard delete; cannot login; can request again."),

        ...scenario("QA-09", "SchoolAdmin & CampusAdmin scope isolation", "Web + Mobile", [
          "Create Student request for School A / Campus 1.",
          "Create Parent request (Portal target).",
          "SchoolAdmin of School B → must not see School A request.",
          "CampusAdmin of School A / Campus 2 → must not see Campus 1 request.",
          "CampusAdmin of Campus 1 → sees Student request; not Parent portal request.",
          "SchoolAdmin of School A → sees Student request; not Parent.",
        ], "Each admin only sees own-scope School-Admin-target requests."),

        ...scenario("QA-10", "PendingApproval login messaging", "Web + Mobile", [
          "While request is pending, enter identifier on login.",
          "Do not proceed to password login.",
        ], "Status PendingApproval with wait-for-admin message on both clients."),

        ...scenario("QA-11", "NeedsPasswordSetup then Ready", "Web + Mobile", [
          "Approve a pending user.",
          "Login identifier → NeedsPasswordSetup.",
          "Try login before set-initial-password → blocked.",
          "Set password → login succeeds → Ready.",
          "Later login goes straight to password step.",
        ], "Set-password does not auto-login; user must sign in afterward."),

        ...scenario(
          "QA-12",
          "Directory create Student (auto-approve + set password)",
          "Web create; Web + Mobile login",
          [
            "Admin opens /admin/directory/students → Create.",
            "Fill required fields including username — NO password field.",
            "Save; confirm first-login password message.",
            "Login: NeedsPasswordSetup → set password → Sign in.",
          ],
          "No pending approval. NeedsPasswordSetup then Ready.",
        ),

        ...scenario(
          "QA-13",
          "Directory create Teacher / Parent",
          "Web create; Web + Mobile login",
          [
            "Create Teacher via directory (no password); first login set password.",
            "Create Parent via directory (no password); optionally link student; first login set password.",
          ],
          "Both Active after create; Ready after set-password + login.",
        ),

        ...scenario("QA-14", "PortalAdmin creates SchoolAdmin", "Web create; Web + Mobile login", [
          "PortalAdmin opens /admin/directory/school-admins.",
          "Create School Admin: name, username, school (optional contacts). No password.",
          "SchoolAdmin / CampusAdmin cannot open this page.",
          "New School Admin: NeedsPasswordSetup → set password → access school Approvals.",
        ], "Auto-approved SchoolAdmin; first login requires set-initial-password."),

        ...scenario(
          "QA-15",
          "PortalAdmin / SchoolAdmin creates CampusAdmin",
          "Web create; Web + Mobile login",
          [
            "PortalAdmin or SchoolAdmin opens /admin/directory/campus-admins.",
            "Create Campus Admin with school + campus (SchoolAdmin locked to own school). No password.",
            "CampusAdmin cannot open Campus Admins management.",
            "New Campus Admin: set password → Approvals only for own campus; can create Student/Teacher/Parent in own campus.",
          ],
          "Auto-approved CampusAdmin; campus-scoped approvals and directory create.",
        ),

        ...scenario("QA-16", "CampusAdmin creates Student / Teacher / Parent", "Web", [
          "Login as CampusAdmin (active role CampusAdmin).",
          "Create Student/Teacher — school/campus forced to own campus.",
          "Create Parent.",
          "Attempt create for another campus → blocked.",
        ], "Creates succeed only in own school+campus; auto-approved; users need set-password."),

        ...scenario(
          "QA-17",
          "Multi-role: add Teacher to existing Parent",
          "Web + Mobile + API",
          [
            "Create/approve a Parent who can login (Ready).",
            "As admin, directory-create Teacher using the same mobile (and school/campus/teacher code).",
            "Confirm no duplicate user; Parent account now has roles Parent + Teacher.",
            "Login → default active role is primary; switch to Teacher on Web header / Mobile Profile.",
            "Confirm nav/permissions change with active role; refresh keeps active role.",
          ],
          "One account, two roles; switch-role works; one password.",
        ),

        ...scenario("QA-18", "Multi-role: CampusAdmin + Teacher", "Web + Mobile", [
          "Create CampusAdmin, then add Teacher role via directory (same mobile) OR create Teacher then add CampusAdmin.",
          "Login and switch between CampusAdmin and Teacher.",
          "As CampusAdmin: Approvals + directory available.",
          "As Teacher: quiz manage available; Approvals not available.",
        ], "Active-role gates features correctly; both roles listed in /auth/me."),

        ...scenario(
          "QA-19",
          "Multi-role blocked: Student + anything / PortalAdmin + anything",
          "Web + API",
          [
            "Try directory-create Teacher with mobile of an existing Student → error.",
            "Try add any role to PortalAdmin → error.",
            "Try add Student role to a Teacher → error.",
          ],
          "Validation / business-rule errors; no second role added.",
        ),

        ...scenario("QA-20", "Deactivate / activate user (active check)", "Web directory; Web + Mobile login", [
          "Create or approve a user who can login.",
          "On Web directory, Deactivate.",
          "Attempt login on Web and Mobile → not active.",
          "Activate again → login succeeds.",
        ], "Deactivated is not PendingApproval. Activated returns to Ready."),

        ...scenario("QA-21", "SchoolAdmin / CampusAdmin cannot create outside scope", "Web + API", [
          "Login as SchoolAdmin; try create student for another school.",
          "Login as CampusAdmin; try create for another campus.",
        ], "Blocked by UI and/or API (403 / validation)."),

        ...scenario("QA-22", "Approvals UI polish (Web)", "Web", [
          "Submit request with a long reason.",
          "Approvals table shows school line 1, campus line 2; truncated reason.",
          "Click Read more → popup shows full reason.",
          "Confirm Admin Target column is not shown.",
        ], "Truncation + popup; no Admin Target column."),

        ...scenario("QA-23", "Searchable school/campus on Request Access (Web)", "Web", [
          "Open /request-access as Student/Teacher.",
          "Open School dropdown → type to filter.",
          "Select school → Campus searchable list loads.",
        ], "Filter-as-you-type works; Mobile may remain native dropdowns."),

        ...scenario("QA-24", "Password minimum length", "Web + Mobile", [
          "After approval, try set password shorter than 6 characters.",
        ], "Validation error; password not saved."),

        ...scenario("QA-25", "Login with CNIC vs mobile", "Web + Mobile", [
          "Register/create user with both CNIC and mobile when possible.",
          "After Ready, login using CNIC, then using mobile.",
        ], "Both identifiers resolve to the same account when stored."),

        ...scenario("QA-26", "Notifications for new registration (admin)", "Web + Mobile", [
          "As eligible admin logged in, submit a new request from another device.",
          "Check in-app notifications / Approvals (Portal / School / Campus as applicable).",
        ], "Eligible admins receive RegistrationRequest notification."),

        ...scenario("QA-27", "Non-admin cannot open Approvals", "Web + Mobile", [
          "Login as Student / Teacher / Parent (active role).",
          "Navigate to Approvals / admin registrations.",
        ], "Redirect / forbidden; no pending list."),

        ...scenario("QA-28", "Switch role then refresh token", "Web + Mobile + API", [
          "Login as multi-role user; switch to non-primary role.",
          "Wait for / force access-token refresh (or call refresh API).",
          "Call GET /api/auth/me.",
        ], "Active role remains the switched role after refresh; permissions match active role."),

        h2("11. Quick verification checklist"),
        table(
          ["#", "Check", "Web", "Mobile", "Pass?"],
          [
            ["1", "Student request requires school, campus, roll", "☐", "☐", ""],
            ["2", "Parent hides school/campus/roll", "☐", "☐", ""],
            ["3", "Teacher school/campus/code optional", "☐", "☐", ""],
            ["4", "Pending shows for Portal / School / Campus correctly", "☐", "☐", ""],
            ["5", "SchoolAdmin / CampusAdmin cannot see Portal-target", "☐", "☐", ""],
            ["6", "Approve → NeedsPasswordSetup", "☐", "☐", ""],
            ["7", "Set password → Ready login", "☐", "☐", ""],
            ["8", "Reject → account not found", "☐", "☐", ""],
            ["9", "Directory create → NeedsPasswordSetup (no admin password)", "☐", "login", ""],
            ["10", "PortalAdmin creates SchoolAdmin; first login set password", "☐", "☐", ""],
            ["11", "Portal/School Admin creates CampusAdmin; first login set password", "☐", "☐", ""],
            ["12", "CampusAdmin campus-scoped approve + directory create", "☐", "☐", ""],
            ["13", "Multi-role add Teacher to Parent; switch role", "☐", "☐", ""],
            ["14", "Student / PortalAdmin cannot combine roles", "☐", "—", ""],
            ["15", "Deactivate → not active", "☐", "☐", ""],
            ["16", "Required * dark red bold", "☐", "☐", ""],
            ["17", "Approvals UI: 2-line school/campus, no Admin Target, Read more", "☐", "—", ""],
            ["18", "Switch role survives token refresh", "☐", "☐", ""],
          ],
          [600, 5200, 1000, 1200, 1360],
        ),

        h2("12. API reference"),
        table(
          ["Method", "Path", "Auth", "Purpose"],
          [
            ["POST", "/api/auth/register", "Anonymous", "Self-service request"],
            ["GET", "/api/auth/registration-options/schools", "Anonymous", "Schools"],
            ["GET", "/api/auth/registration-options/schools/{id}/campuses", "Anonymous", "Campuses"],
            ["GET", "/api/auth/registrations/pending", "Portal/School/Campus Admin", "Pending list"],
            ["POST", "/api/auth/registrations/{id}/approve", "Portal/School/Campus Admin", "Approve"],
            ["POST", "/api/auth/registrations/{id}/reject", "Portal/School/Campus Admin", "Reject"],
            ["POST", "/api/auth/login-status", "Anonymous", "Pre-login status"],
            ["POST", "/api/auth/set-initial-password", "Anonymous", "First password"],
            ["POST", "/api/auth/login", "Anonymous", "Sign in (role + roles)"],
            ["POST", "/api/auth/switch-role", "Bearer", "Change active role; new tokens"],
            ["POST", "/api/auth/token/refresh", "Anonymous", "Refresh (keeps active_role)"],
            ["GET", "/api/auth/me", "Bearer", "Current user (role, roles)"],
            ["POST", "/api/directory/students|teachers|parents", "Admins", "Create / add-role users"],
            ["POST", "/api/directory/school-admins", "PortalAdmin", "Create SchoolAdmin"],
            ["POST", "/api/directory/campus-admins", "Portal/School Admin", "Create CampusAdmin"],
            ["POST", "/api/directory/.../activate|deactivate", "Admins", "Active status"],
          ],
          [1000, 4200, 1800, 2360],
        ),

        p(
          "Companion HTML: docs/02_RankUp_User_Creation_Approval_QA.html — Rebuild DOCX: node docs/build_user_creation_qa_docx.mjs — Source of truth: WebApi Auth/Directory, React auth/admin/directory, Flutter login & pending registrations, table app_user_roles.",
          { color: MUTED, size: 18, before: 200 },
        ),
      ],
    },
  ],
});

mkdirSync(__dirname, { recursive: true });
const buffer = await Packer.toBuffer(doc);
writeFileSync(OUTPUT, buffer);
console.log(`Wrote ${OUTPUT}`);
