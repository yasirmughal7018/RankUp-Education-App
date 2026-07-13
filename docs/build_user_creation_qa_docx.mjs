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
    "QA guide for web and mobile user creation, approval queue (app_user_approval), PortalAdmin activation, login, CampusAdmin, and multi-role.",
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
          { text: "app_user_roles + app_user_approval  ·  Date: 13 Jul 2026", color: MUTED, size: 18 },
        ]),

        h2("1. Overview & account states"),
        p("RankUp supports these user-creation paths:"),
        numbered(
          1,
          "Self-service request — Student / Parent / Teacher submit → approval queue in app_user_approval → admins record approvals → ONLY Portal Admin activates → user sets password → Login.",
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
            ["Rejected", "rejected_at set; is_approved=false on rejector row", "Rejected", "No — may re-request"],
          ],
          [1800, 3200, 2200, 2160],
        ),
        bullet("Roles live only in app_user_roles. Columns app_users.role and app_users.admin_target are removed."),
        bullet("Default login role = earliest role assignment in app_user_roles (by created_at)."),
        bullet("JWT role claim = active session role; roles = all assigned roles."),
        bullet("Self-service approval routing lives in app_user_approval (not on app_users)."),

        h2("2. Roles & permissions matrix"),
        table(
          ["Action", "PortalAdmin", "SchoolAdmin", "CampusAdmin", "Teacher", "Parent", "Student"],
          [
            ["Request account access", "—", "—", "—", "Yes", "Yes", "Yes"],
            [
              "Record registration approval",
              "Yes (activates)",
              "Own school (does not activate)",
              "Own campus (does not activate)",
              "—",
              "—",
              "—",
            ],
            [
              "Activate registration",
              "Yes — required",
              "No",
              "No",
              "—",
              "—",
              "—",
            ],
            [
              "Reject registrations",
              "All pending",
              "Own school (if not yet acted)",
              "Own campus (if not yet acted)",
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
        h3("Path A — Self-service → Approval queue → Portal Admin activates → Set password → Login"),
        numbered(1, "Guest opens Request account access (Web or Mobile)."),
        numbered(2, "Chooses Student / Parent / Teacher and submits."),
        numbered(3, "API creates pending app_users + app_user_roles + one pending app_user_approval row per eligible reviewer."),
        numbered(4, "Eligible admins see the request on Registration approvals (Pending with lists remaining reviewers)."),
        numbered(5, "SchoolAdmin / CampusAdmin may Approve → their queue row is marked; account stays pending."),
        numbered(6, "PortalAdmin Approves → account activates (NeedsPasswordSetup); role profile created."),
        numbered(7, "User enters CNIC/mobile → sets password → signs in."),
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
            ["School", "Optional", "Hidden / not allowed", "Optional"],
            ["Campus", "Optional (needs school if set)", "Hidden / not allowed", "Optional (needs school if set)"],
            ["Roll / teacher code", "Roll required *", "Hidden / not allowed", "Teacher code optional"],
          ],
          [2400, 2320, 2320, 2320],
        ),
        bullet("Username on request: CNIC if provided, otherwise mobile. Must be unique."),
        bullet("admin_target is NOT used. Approval recipients are derived from school/campus into app_user_approval."),
        h3("Who is queued in app_user_approval (at submit time)"),
        table(
          ["Selection on request", "Pending approver rows"],
          [
            ["Parent / Student or Teacher with no school", "PortalAdmin only"],
            ["School selected, no campus", "SchoolAdmin (that school) + PortalAdmin"],
            ["School + campus selected", "CampusAdmin (that campus) + SchoolAdmin (that school) + PortalAdmin"],
          ],
          [4200, 5160],
        ),

        h2("5. Approval queue & activation rules"),
        table(
          ["Reviewer", "Sees in pending list", "Can act"],
          [
            ["PortalAdmin", "All pending requests", "Approve (activates) or Reject"],
            [
              "SchoolAdmin",
              "Own school (school-only or with campus). Portal-only hidden.",
              "Approve (record only) or Reject — until already approved",
            ],
            [
              "CampusAdmin",
              "Own school + campus only. School-only and Portal-only hidden.",
              "Approve (record only) or Reject — until already approved",
            ],
          ],
          [1800, 3780, 3780],
        ),
        h3("Activation hierarchy (critical)"),
        table(
          ["Who approves", "Effect", "Account activated?"],
          [
            [
              "PortalAdmin",
              "Marks app_user_approval; creates profile; is_active=true; must_change_password=true",
              "Yes — other pending rows not required",
            ],
            ["SchoolAdmin", "Marks their queue row only", "No — still needs PortalAdmin"],
            [
              "CampusAdmin",
              "Marks their queue row only; SchoolAdmin then not required",
              "No — still needs PortalAdmin",
            ],
          ],
          [1800, 4200, 3360],
        ),
        bullet("After SchoolAdmin / CampusAdmin approve, the request stays on their Approvals list."),
        bullet("Approve / Reject buttons are hidden for that admin; UI shows: Approved — awaiting Portal Admin."),
        bullet("Pending with lists remaining pending reviewers (approved_at IS NULL). After CampusAdmin approval, pending SchoolAdmin rows are omitted from Pending with."),
        bullet("Student profile defaults on PortalAdmin activation: grade 1, section A."),
        bullet("On Reject: soft-reject — app_users.rejected_at set; rejector's app_user_approval gets is_approved=false; other pending queue rows left as-is. Login-status returns Rejected; same identity may request again (new user row)."),
        bullet("Approvals UI (Web): school line 1, campus line 2; no Admin Target column; long reason truncated with Read more."),

        h2("6. Directory (admin) create rules — Web only"),
        p("No password on create. Directory users are auto-approved and must set password on first login (NeedsPasswordSetup). Directory create does not use app_user_approval."),
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
        p("One person can hold multiple roles on one login. Roles are stored in app_user_roles only."),
        h3("Allowed combinations"),
        bullet("Teacher + Parent"),
        bullet("CampusAdmin + Teacher and/or Parent"),
        bullet("SchoolAdmin + Teacher and/or Parent"),
        bullet("SchoolAdmin + CampusAdmin + Teacher/Parent (allowed by rules)"),
        h3("Blocked combinations"),
        bullet("Student cannot combine with any other role"),
        bullet("PortalAdmin cannot combine with any other role"),
        h3("Session behaviour"),
        numbered(1, "Login default active role = earliest assignment in app_user_roles."),
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
        p("While SchoolAdmin / CampusAdmin have approved but PortalAdmin has not, login-status remains PendingApproval."),
        h3("How to check if a user is active"),
        table(
          ["Method", "How", "Platform"],
          [
            ["Login status UI", "Enter identifier; see Pending / Needs password / Ready / not active", "Web + Mobile"],
            ["Pending list", "Appears while is_active=false and no password (includes post–Campus/School approval)", "Web + Mobile"],
            ["Directory list", "Active / Inactive column and filters", "Web only"],
            ["Database", "app_users.is_active, password_hash, app_user_roles, app_user_approval", "QA / DB"],
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

        ...scenario("QA-01", "Student self-request — Portal Admin activates", "Web + Mobile", [
          "Open Request account access.",
          "Account type = Student. Fill full name, mobile, roll; optionally school + campus.",
          "Submit request. Confirm app_user_approval rows match selection.",
          "As PortalAdmin, open Approvals → Approve.",
          "On login: enter mobile/CNIC → Needs password setup.",
          "Set password (≥6) → then Sign in.",
        ], "Student reaches app home. Pending list cleared. Directory (Web) shows Active."),

        ...scenario("QA-02", "Parent self-request — Portal Admin only", "Web + Mobile", [
          "Request as Parent; confirm school/campus/roll are hidden.",
          "Submit with name + mobile.",
          "SchoolAdmin / CampusAdmin Approvals → Parent request must NOT appear.",
          "PortalAdmin Approvals → Approve (activates).",
          "Parent sets password and logs in on Web and Mobile.",
        ], "Only PortalAdmin sees and activates. Parent becomes Ready after set-password + login."),

        ...scenario(
          "QA-03",
          "Campus path — CampusAdmin records, PortalAdmin activates",
          "Web + Mobile",
          [
            "Request as Student or Teacher with school + campus.",
            "As CampusAdmin of that campus, Approve.",
            "Confirm account still PendingApproval (cannot set password yet).",
            "CampusAdmin list still shows the row; buttons hidden; message: Approved — awaiting Portal Admin.",
            "Pending with shows Portal Admin (School Admin omitted after CampusAdmin approval).",
            "As PortalAdmin, Approve → NeedsPasswordSetup → set password → login.",
          ],
          "CampusAdmin does not activate. PortalAdmin activates. SchoolAdmin not required after CampusAdmin.",
        ),

        ...scenario(
          "QA-04",
          "School-only path — SchoolAdmin records, PortalAdmin activates",
          "Web + Mobile",
          [
            "Request as Teacher/Student with school selected and campus empty.",
            "CampusAdmin must NOT see it.",
            "SchoolAdmin Approves → still pending; message Approved — awaiting Portal Admin.",
            "PortalAdmin Approves → activates.",
          ],
          "SchoolAdmin alone does not activate; PortalAdmin does.",
        ),

        ...scenario(
          "QA-05",
          "PortalAdmin first — no need for School/Campus",
          "Web + Mobile",
          [
            "Submit Student/Teacher with school + campus (full queue).",
            "As PortalAdmin, Approve immediately (without Campus/School acting).",
            "Confirm NeedsPasswordSetup; user can set password.",
          ],
          "PortalAdmin alone activates even if other approval rows remain pending.",
        ),

        ...scenario("QA-06", "Teacher / Student without school (Portal only)", "Web + Mobile", [
          "Request as Teacher or Student with school empty (Student still needs roll).",
          "Confirm SchoolAdmin / CampusAdmin do not see it.",
          "PortalAdmin Approves → activates → set password.",
        ], "Portal-only queue; activation works without school/campus on the request."),

        ...scenario("QA-07", "Student request validation", "Web + Mobile", [
          "As Student, submit without roll number → blocked.",
          "Without full name or mobile → blocked.",
          "Campus without school → blocked.",
          "School/campus empty is allowed (Portal-only queue).",
        ], "Roll + identity required; school/campus optional for Student."),

        ...scenario("QA-08", "Parent must not send school/campus/roll", "Web + Mobile + API", [
          "UI: switching to Parent clears/hides school fields.",
          "API optional: POST register as Parent with schoolId → validation error.",
        ], "Parent requests never carry school/campus/roll."),

        ...scenario("QA-09", "Duplicate mobile / CNIC / username", "Web + Mobile", [
          "Submit a valid Student request.",
          "Submit again with same mobile or CNIC → error.",
          "Reject first request, then same mobile can register again.",
        ], "Uniqueness while pending/active; after reject, re-request allowed."),

        ...scenario("QA-10", "Reject registration", "Web + Mobile", [
          "Create a pending request.",
          "Admin Rejects (before or without prior Campus/School record).",
          "Confirm removed from Approvals.",
          "Login with same identifier → status Rejected (message invites re-request).",
          "Submit Request Access again with same CNIC/mobile → succeeds (new pending row).",
        ], "Soft-reject (user + approval trail kept); login-status Rejected; re-request allowed."),

        ...scenario("QA-11", "SchoolAdmin & CampusAdmin scope isolation", "Web + Mobile", [
          "Create Student request for School A / Campus 1.",
          "Create Parent request (no school).",
          "SchoolAdmin of School B → must not see School A request.",
          "CampusAdmin of School A / Campus 2 → must not see Campus 1 request.",
          "CampusAdmin of Campus 1 → sees Student request; not Parent.",
          "SchoolAdmin of School A → sees Student request; not Parent.",
        ], "Scope by school/campus on the request (not admin_target)."),

        ...scenario("QA-12", "PendingApproval login messaging (including partial approval)", "Web + Mobile", [
          "While request is pending (including after CampusAdmin/SchoolAdmin approval), enter identifier on login.",
          "Do not proceed to password login.",
        ], "Status PendingApproval until PortalAdmin activates."),

        ...scenario("QA-13", "NeedsPasswordSetup then Ready (after PortalAdmin)", "Web + Mobile", [
          "PortalAdmin Approves a pending user.",
          "Login identifier → NeedsPasswordSetup.",
          "Try login before set-initial-password → blocked.",
          "Set password → login succeeds → Ready.",
          "Later login goes straight to password step.",
        ], "Set-password does not auto-login; user must sign in afterward."),

        ...scenario(
          "QA-14",
          "Directory create Student (auto-approve + set password)",
          "Web create; Web + Mobile login",
          [
            "Admin opens /admin/directory/students → Create.",
            "Fill required fields including username — NO password field.",
            "Save; confirm first-login password message.",
            "Login: NeedsPasswordSetup → set password → Sign in.",
          ],
          "No pending approval queue. NeedsPasswordSetup then Ready.",
        ),

        ...scenario(
          "QA-15",
          "Directory create Teacher / Parent",
          "Web create; Web + Mobile login",
          [
            "Create Teacher via directory (no password); first login set password.",
            "Create Parent via directory (no password); optionally link student; first login set password.",
          ],
          "Both Active after create; Ready after set-password + login.",
        ),

        ...scenario("QA-16", "PortalAdmin creates SchoolAdmin", "Web create; Web + Mobile login", [
          "PortalAdmin opens /admin/directory/school-admins.",
          "Create School Admin: name, username, school (optional contacts). No password.",
          "SchoolAdmin / CampusAdmin cannot open this page.",
          "New School Admin: NeedsPasswordSetup → set password → access school Approvals.",
        ], "Auto-approved SchoolAdmin; first login requires set-initial-password."),

        ...scenario(
          "QA-17",
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

        ...scenario("QA-18", "CampusAdmin creates Student / Teacher / Parent", "Web", [
          "Login as CampusAdmin (active role CampusAdmin).",
          "Create Student/Teacher — school/campus forced to own campus.",
          "Create Parent.",
          "Attempt create for another campus → blocked.",
        ], "Creates succeed only in own school+campus; auto-approved; users need set-password."),

        ...scenario(
          "QA-19",
          "Multi-role: add Teacher to existing Parent",
          "Web + Mobile + API",
          [
            "Create/approve a Parent who can login (Ready).",
            "As admin, directory-create Teacher using the same mobile (and school/campus/teacher code).",
            "Confirm no duplicate user; Parent account now has roles Parent + Teacher in app_user_roles.",
            "Login → default active role from earliest assignment; switch to Teacher on Web header / Mobile Profile.",
            "Confirm nav/permissions change with active role; refresh keeps active role.",
          ],
          "One account, two roles; switch-role works; one password.",
        ),

        ...scenario("QA-20", "Multi-role: CampusAdmin + Teacher", "Web + Mobile", [
          "Create CampusAdmin, then add Teacher role via directory (same mobile) OR create Teacher then add CampusAdmin.",
          "Login and switch between CampusAdmin and Teacher.",
          "As CampusAdmin: Approvals + directory available.",
          "As Teacher: quiz manage available; Approvals not available.",
        ], "Active-role gates features correctly; both roles listed in /auth/me."),

        ...scenario(
          "QA-21",
          "Multi-role blocked: Student + anything / PortalAdmin + anything",
          "Web + API",
          [
            "Try directory-create Teacher with mobile of an existing Student → error.",
            "Try add any role to PortalAdmin → error.",
            "Try add Student role to a Teacher → error.",
          ],
          "Validation / business-rule errors; no second role added.",
        ),

        ...scenario("QA-22", "Deactivate / activate user (active check)", "Web directory; Web + Mobile login", [
          "Create or PortalAdmin-approve a user who can login.",
          "On Web directory, Deactivate.",
          "Attempt login on Web and Mobile → not active.",
          "Activate again → login succeeds.",
        ], "Deactivated is not PendingApproval. Activated returns to Ready."),

        ...scenario("QA-23", "SchoolAdmin / CampusAdmin cannot create outside scope", "Web + API", [
          "Login as SchoolAdmin; try create student for another school.",
          "Login as CampusAdmin; try create for another campus.",
        ], "Blocked by UI and/or API (403 / validation)."),

        ...scenario("QA-24", "Approvals UI polish (Web)", "Web", [
          "Submit request with a long reason.",
          "Approvals table shows school line 1, campus line 2; truncated reason; Pending with list.",
          "Click Read more → popup shows full reason.",
          "Confirm Admin Target column is not shown.",
          "After CampusAdmin approve, confirm status text instead of buttons.",
        ], "Truncation + popup; no Admin Target; awaiting message after local approve."),

        ...scenario("QA-25", "Searchable school/campus on Request Access (Web)", "Web", [
          "Open /request-access as Student/Teacher.",
          "Open School dropdown → type to filter (optional field).",
          "Select school → Campus searchable list loads.",
        ], "Filter-as-you-type works; Mobile may remain native dropdowns."),

        ...scenario("QA-26", "Password minimum length", "Web + Mobile", [
          "After PortalAdmin approval, try set password shorter than 6 characters.",
        ], "Validation error; password not saved."),

        ...scenario("QA-27", "Login with CNIC vs mobile", "Web + Mobile", [
          "Register/create user with both CNIC and mobile when possible.",
          "After Ready, login using CNIC, then using mobile.",
        ], "Both identifiers resolve to the same account when stored."),

        ...scenario("QA-28", "Notifications for new registration (admin)", "Web + Mobile", [
          "As eligible admin logged in, submit a new request from another device.",
          "Check in-app notifications / Approvals (Portal / School / Campus as queued).",
        ], "Eligible admins in the approval queue receive RegistrationRequest notification."),

        ...scenario("QA-29", "Non-admin cannot open Approvals", "Web + Mobile", [
          "Login as Student / Teacher / Parent (active role).",
          "Navigate to Approvals / admin registrations.",
        ], "Redirect / forbidden; no pending list."),

        ...scenario("QA-30", "Switch role then refresh token", "Web + Mobile + API", [
          "Login as multi-role user; switch to non-default role.",
          "Wait for / force access-token refresh (or call refresh API).",
          "Call GET /api/auth/me.",
        ], "Active role remains the switched role after refresh; permissions match active role."),

        h2("11. Quick verification checklist"),
        table(
          ["#", "Check", "Web", "Mobile", "Pass?"],
          [
            ["1", "Student requires roll; school/campus optional", "☐", "☐", ""],
            ["2", "Parent hides school/campus/roll", "☐", "☐", ""],
            ["3", "Teacher school/campus/code optional", "☐", "☐", ""],
            ["4", "Submit writes correct app_user_approval queue", "☐", "☐", ""],
            ["5", "Pending scope by school/campus (no admin_target)", "☐", "☐", ""],
            ["6", "SchoolAdmin / CampusAdmin approve does NOT activate", "☐", "☐", ""],
            ["7", "After local approve: Approved — awaiting Portal Admin.", "☐", "☐", ""],
            ["8", "PortalAdmin approve → NeedsPasswordSetup", "☐", "☐", ""],
            ["9", "PortalAdmin alone can activate (others not required)", "☐", "☐", ""],
            ["10", "CampusAdmin approve removes SchoolAdmin from Pending with", "☐", "☐", ""],
            ["11", "Set password → Ready login", "☐", "☐", ""],
            ["12", "Reject → soft-reject + login-status Rejected; re-request OK", "☐", "☐", ""],
            ["13", "Directory create → NeedsPasswordSetup (no approval queue)", "☐", "login", ""],
            ["14", "PortalAdmin creates SchoolAdmin; first login set password", "☐", "☐", ""],
            ["15", "Portal/School Admin creates CampusAdmin; first login set password", "☐", "☐", ""],
            ["16", "CampusAdmin campus-scoped list + directory create", "☐", "☐", ""],
            ["17", "Multi-role add Teacher to Parent; switch role", "☐", "☐", ""],
            ["18", "Student / PortalAdmin cannot combine roles", "☐", "—", ""],
            ["19", "Deactivate → not active", "☐", "☐", ""],
            ["20", "Required * dark red bold", "☐", "☐", ""],
            ["21", "Approvals UI: Pending with, no Admin Target, Read more", "☐", "—", ""],
            ["22", "Switch role survives token refresh", "☐", "☐", ""],
            ["23", "No role / admin_target columns on app_users", "DB", "—", ""],
          ],
          [600, 5200, 1000, 1200, 1360],
        ),

        h2("12. API reference"),
        table(
          ["Method", "Path", "Auth", "Purpose"],
          [
            ["POST", "/api/auth/register", "Anonymous", "Self-service; creates app_user_approval queue"],
            ["GET", "/api/auth/registration-options/schools", "Anonymous", "Schools"],
            ["GET", "/api/auth/registration-options/schools/{id}/campuses", "Anonymous", "Campuses"],
            ["GET", "/api/auth/registrations/pending", "Portal/School/Campus Admin", "Pending + pendingApprovers + currentUserHasApproved"],
            ["POST", "/api/auth/registrations/{id}/approve", "Portal/School/Campus Admin", "isActivated + message (PortalAdmin activates)"],
            ["POST", "/api/auth/registrations/{id}/reject", "Portal/School/Campus Admin", "Soft-reject (keep trail)"],
            ["POST", "/api/auth/login-status", "Anonymous", "Pre-login status"],
            ["POST", "/api/auth/set-initial-password", "Anonymous", "First password (after PortalAdmin)"],
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
          "Companion HTML: docs/02_RankUp_User_Creation_Approval_QA.html — Rebuild DOCX: node docs/build_user_creation_qa_docx.mjs — Source of truth: WebApi Auth/Directory, React auth/admin, Flutter login & pending registrations, tables app_user_roles and app_user_approval (no app_users.role / admin_target).",
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
