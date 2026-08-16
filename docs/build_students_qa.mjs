/**
 * Rebuilds the Students Business & QA Guide from current application rules.
 * Outputs:
 *   - docs/04_RankUp_Students_QA.html
 *   - docs/04_RankUp_Students_QA.docx
 *
 * Run: npm run build:students-qa  (from docs/)
 *
 * Note: Questions guide is docs/04_RankUp_Questions_Business_QA.*; this file uses
 * the product filename requested for the Student module (04_RankUp_Students_QA).
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
const DOC_DATE = "16 Aug 2026";
const DOC_TITLE = "RankUp Education — Students Business & QA Guide";
const DOC_SUBTITLE =
  "Student identity, registration, directory, quizzes, rankings, dashboards, school change, Tutor links, and known gaps — as implemented.";

const identityRules = [
  ["Role exclusivity", "Student cannot combine with any other role (UserRoleRules). Adding Student when another role exists, or adding any role when Student exists, fails. Tutor/Parent/Teacher/Coordinator are combinable with each other but never with Student."],
  ["Self role remove", "Student is never removable via RemoveMyRole; Student accounts have no companion roles."],
  ["Permissions (JWT /me)", "dashboard.view, quiz.attempt, worksheet.submit, message.send, discussion.participate, ranking.view — claim strings only; worksheets/messages/discussions remain stubs."],
  ["Profile table", "app_user_students: student_id = app_users.id; grade (Class lookup id); section (free text); optional mobile_number."],
  ["School / campus", "Stored on app_users.school_id / campus_id, not on the student profile row."],
  ["Roll number", "app_users.roll_number_teacher_code (not on app_user_students)."],
  ["Self profile edit", "PUT /auth/me updates name/mobile/email/CNIC only — not grade/section (admins use directory)."],
];

const registrationRules = [
  ["Endpoint", "POST /api/auth/register (AllowAnonymous)"],
  ["Username", "Always email for Student / Parent / Teacher / Tutor"],
  ["Grade", "Required for Student (grade > 0); must be an active Class lookup"],
  ["Section", "Required for Student (non-blank trimmed text)"],
  ["School / campus", "Optional; campus requires school; drives approval queue routing"],
  ["Roll number", "Required only when a school is selected; cleared when no school"],
  ["Persistence", "Pending fields registration_grade + registration_section on app_users"],
  ["Parent/Teacher/Tutor", "Grade/section rejected if sent for Parent, Teacher, or Tutor; Tutor never uses school/campus/roll"],
];

const publicOptions = [
  ["GET /auth/registration-options/schools", "Active schools for the form"],
  ["GET /auth/registration-options/schools/{schoolId}/campuses", "Campuses for selected school"],
  ["GET /auth/registration-options/grades", "Class lookups for grade dropdown"],
];

const approvalRouting = [
  ["No school (incl. Parent / Tutor)", "PortalAdmin only"],
  ["School only", "SchoolAdmin (that school) + PortalAdmin"],
  ["Campus", "CampusAdmin (that campus) + SchoolAdmin + PortalAdmin"],
];

const approvalActivation = [
  ["PortalAdmin", "Can approve and activate any registration (including Parent / Tutor / no-school)"],
  ["SchoolAdmin", "Can activate Student/Teacher with school in scope; cannot activate no-school / Parent / Tutor"],
  ["CampusAdmin", "Can activate Student/Teacher with campus in scope"],
  ["On Student activate", "CreateProfileForRoleAsync uses registration_grade + registration_section — no hardcoded grade 1 / section A"],
  ["Legacy pending", "Missing grade/section → validation: ask student to submit a new request"],
  ["Reject", "Reason required (min length enforced); soft-reject trail kept"],
];

const directoryRules = [
  ["GET /directory/students", "Filters: schoolId, campusId, grade, search, paging. Scope by admin school/campus. Search name/username/roll. List payload may include teacherNames, parentNames, tutorNames for assigned-people UI."],
  ["POST /directory/students", "Requires FullName, email/username, RollNumber, Grade (>0), Section, SchoolId, CampusId. Creates active Student ready for password setup. Does not re-validate Class lookup (unlike register)."],
  ["PUT /directory/students/{id}", "Update name, campus (same school), roll, grade, section (and school/campus where allowed)."],
  ["Activate / deactivate / bulk-deactivate", "Scope-checked; deactivate revokes refresh tokens."],
  ["List roles", "PortalAdmin, SchoolAdmin, CampusAdmin, Teacher, Coordinator"],
  ["Mutate roles", "PortalAdmin, SchoolAdmin, CampusAdmin"],
];

const parentLinking = [
  ["POST /directory/parents/{parentId}/students", "PortalAdmin link student + relationship (default Guardian). School/Campus Admin parents are view-only for children."],
  ["DELETE /directory/parents/{parentId}/students/{studentId}", "PortalAdmin unlink"],
  ["GET /parents/me/students", "Parent-only: linked children"],
  ["POST /parents/me/students", "Parent self-link child by CNIC or username (+ optional relationship)"],
  ["Student “my parents”", "Not implemented — no student-facing parents list API/UI"],
];

const tutorLinking = [
  ["Model", "Tutor is a combinable tuition role (lookup 2017). Profile app_user_tutors; links in tutor_student_relations (not class roster)."],
  ["Directory Tutors", "PortalAdmin only: /admin/directory/tutors — create, activate/deactivate, link/unlink students by CNIC or username."],
  ["POST /directory/tutors/{tutorId}/students", "PortalAdmin link (body: cnic or username)"],
  ["DELETE /directory/tutors/{tutorId}/students/{studentId}", "PortalAdmin unlink"],
  ["Tutor self APIs", "Acting as Tutor: linked-student list / history surfaces (Web + Mobile as implemented)"],
  ["Student assigned people", "Directory student tiles may show Teachers / Parents / Tutors names (view popup) for admins"],
  ["Grant Tutor companion", "PortalAdmin may add Tutor onto Parent/Teacher/Coordinator (and reverse). School/Campus Admin cannot grant Tutor on Teachers/Coordinators lists."],
];

const quizStudentApis = [
  ["GET /quizzes", "Assigned quizzes for the student"],
  ["GET /quizzes/{quizId}", "Detail if assigned"],
  ["POST /quizzes/{quizId}/attempts", "Start/resume; Student only; deviceId required"],
  ["PUT .../attempts/{id}/draft", "Save draft; optional offline sync fields"],
  ["POST .../attempts/{id}/submit", "Submit + score"],
  ["POST .../attempts/{id}/sync", "Offline replay; idempotent clientSyncId"],
  ["GET .../attempts/{id}/result", "Own result (Parent or linked Tutor may view linked child)"],
];

const quizAttemptRules = [
  ["Device lock", "Attempt bound to starting deviceId; mismatch → locked to starting device"],
  ["Window", "Assignment StartDateTime–EndDateTime enforced"],
  ["Attempts", "AllowedAttempts quota; Allow Retry may add extras"],
  ["Instructions", "Non-empty instructions require acknowledge on start"],
  ["Offline", "Draft/submit sync supported with clientSyncId / isOfflineSync"],
  ["Students do not assign", "AssignedById is Teacher/Parent/Tutor; students only take"],
];

const reportsRankings = [
  ["GET /reports/students/{id}/quiz-history", "Student: self only. Also Parent (linked), Tutor (linked via tutor_student_relations), Teacher/Coordinator/SchoolAdmin (campus), PortalAdmin. CampusAdmin not in ACL."],
  ["GET /reports/rankings/me?scope=class|school", "Student only. Rank by max submitted quiz_attempts.percentage. Class = campus+grade+section (grade-only if section empty). School = whole school. Optional quizId."],
  ["GET /reports/rankings", "Staff only (PortalAdmin/SchoolAdmin/Teacher/Coordinator) — not Student"],
  ["Summary / performance", "Staff only"],
];

const dashboardRules = [
  ["Web /student/dashboard", "Quiz-only: progress %, in progress, assigned, completion bar, assigned list. Rank/AI/weak-topic cards omitted."],
  ["Mobile /student", "Quiz stats, today’s quizzes, upcoming, subject averages (from quiz data), recent results. Live mapper zeroes fake ranks/streak; streak pill hidden when 0."],
  ["Not on live student home", "Level/Rank cards, AI recommendation, fabricated streak/goals/achievements"],
];

const schoolChangeRules = [
  ["Who", "Student, Teacher, Coordinator, CampusAdmin (not PortalAdmin/SchoolAdmin/Parent/Tutor)"],
  ["Student effect", "Sole role → full account lock + token revoke until approve/reject"],
  ["Approve", "Applies destination school/campus; unlocks"],
  ["Reject", "Unlock; optional leaveWithoutSchool clears school/campus only for Student requester"],
  ["Role requests", "Student cannot request companion roles"],
];

const webRoutes = [
  ["/student/dashboard", "Learning dashboard"],
  ["/student/quizzes", "Assigned quizzes"],
  ["/student/quizzes/:quizId", "Detail / start"],
  ["/student/quizzes/:quizId/attempts/:attemptId", "Take attempt"],
  ["/student/quizzes/:quizId/attempts/:attemptId/result", "Result"],
  ["/student/history", "Self quiz history"],
  ["/student/rankings", "Class / school peer rankings"],
  ["/admin/directory/students", "Admin directory (not student session)"],
  ["/request-access", "Public register (grade+section for Student)"],
];

const mobileRoutes = [
  ["/student", "Home dashboard"],
  ["/quizzes", "Learn / attempts"],
  ["/reports", "Student → My quiz history"],
  ["/rankings", "Class / school peer rankings"],
  ["/ai-assistant", "Static AI preview (no backend)"],
  ["/profile, /settings, /notifications", "Profile/settings real; notifications API"],
  ["/messages, /worksheets, /discussions", "Stub / placeholder"],
];

const webNav = [
  ["Desktop", "Learning · My quizzes · History · Rankings"],
  ["Mobile bottom (web shell)", "Learn · Quizzes · Ranks (History via pages)"],
];

const mobileNav = [
  ["Bottom nav", "Home · Learn · AI · Ranks · Profile"],
  ["History", "From dashboard tile → /reports (not bottom nav)"],
];

const gaps = [
  ["AI assistant", "Mobile static UI; no AI backend; dashboard AI omitted on live home"],
  ["Worksheets / messaging / discussions / attendance / rewards", "Stub APIs or placeholder UI; permission strings may still appear"],
  ["Student “my parents” / “my tutors”", "Missing — student cannot list parents/tutors; parents/tutors link via admin or self CNIC/username flows"],
  ["Subject / city rankings", "Not built — only class and school scopes"],
  ["Directory Class lookup validation", "Register validates Class lookup; directory create only requires grade > 0"],
  ["CampusAdmin quiz history", "Not in student quiz-history ACL"],
  ["Fake gamification", "Intentionally removed from live Web/Mobile student dashboards"],
];

const scenarios = [
  ["STU-01", "Register without grade/section", "Submit Student request omitting grade or section.", "HTTP 400 validation: grade and section required."],
  ["STU-02", "Register with invalid grade", "Submit grade that is not a Class lookup id.", "HTTP 400: Grade must be a valid Class option."],
  ["STU-03", "Register with school needs roll", "Select school, omit roll number.", "HTTP 400: Roll number required when school selected."],
  ["STU-04", "Approve uses stored grade/section", "Register with Class X + section B; PortalAdmin activates.", "app_user_students.grade = X, section = B (not 1/A)."],
  ["STU-05", "Legacy pending missing grade", "Activate an old pending Student without registration_grade/section.", "Validation error asking for a new request."],
  ["STU-06", "Directory create", "Admin creates student with grade+section+roll+school+campus.", "Active Student provisioned; ready for set-initial-password."],
  ["STU-07", "History self only", "Student A requests quiz-history for Student B.", "403 Forbidden."],
  ["STU-08", "Class rankings", "Two classmates submit quizzes; open /student/rankings (class).", "Ordered by best %; current user highlighted with myRank."],
  ["STU-09", "School rankings", "Toggle scope=school.", "Cohort expands to school peers; staff /reports/rankings still blocked for Student."],
  ["STU-10", "Quiz device lock", "Start attempt on device A; continue draft on device B.", "Locked to the device that started it."],
  ["STU-11", "School change locks Student", "Student requests school change.", "Account fully locked until destination/Portal admin approves or rejects."],
  ["STU-12", "Dashboard honesty", "Open Web and Mobile student home with no fabricated APIs.", "No fake rank/AI/weak-topic cards; quiz stats from assigned quizzes only."],
  ["STU-13", "Parent link invisible to student", "Admin links parent↔student; student opens profile/home.", "No “my parents” list for the student."],
  ["STU-14", "Role exclusivity", "Try grant Teacher onto a Student account (or reverse).", "Business rule: Student accounts cannot be combined with other roles."],
  ["STU-15", "Tutor cannot combine with Student", "Try grant Tutor onto a Student (or Student onto Tutor).", "Rejected by UserRoleRules — Student exclusive."],
  ["STU-16", "PortalAdmin links Tutor↔Student", "PortalAdmin links student on Tutors directory by CNIC/username.", "tutor_student_relations row; student list may show tutorNames."],
  ["STU-17", "SchoolAdmin cannot manage Tutors", "SchoolAdmin opens /admin/directory/tutors or tries tutor link API.", "Forbidden / no Tutors nav — PortalAdmin only."],
];

const checklist = [
  "Student self-register requires Class grade + section; grades load from /auth/registration-options/grades.",
  "Roll required only when school is selected; Parent/Tutor never get grade/section/school on register.",
  "Approve activation writes Student profile from registration_grade/section (no 1/A default).",
  "Legacy pending without grade/section cannot activate.",
  "Directory create/update requires grade+section+roll.",
  "Student JWT includes quiz.attempt and ranking.view.",
  "GET /reports/students/{id}/quiz-history is self-only for Student.",
  "GET /reports/rankings/me supports class and school; staff rankings endpoint remains staff-only.",
  "Web routes: dashboard, quizzes, history, rankings under StudentRoute.",
  "Mobile: home, quizzes, reports history, rankings — no fake Ayan/Sara leaderboard.",
  "Live dashboards omit fabricated rank/AI/streak UI.",
  "Quiz start requires deviceId; cross-device resume is locked.",
  "Student school-change fully locks the account; Parent/Tutor cannot request school change.",
  "Student cannot combine roles (including Tutor) or self-remove Student.",
  "No student-facing my-parents / my-tutors API.",
  "Tutor–student links and Tutors directory are PortalAdmin-only; School/Campus Admin cannot grant Tutor companions.",
];

function esc(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function htmlTable(headers, rows) {
  const head = headers.map((h) => `<th>${esc(h)}</th>`).join("");
  const body = rows
    .map(
      (row) =>
        `<tr>${row.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`,
    )
    .join("");
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function htmlBullets(items) {
  return `<ul>${items.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>`;
}

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(DOC_TITLE)}</title>
  <style>
    :root { --ink:#0f172a; --primary:#2563eb; --muted:#475569; --border:#dbe3ed; --surface:#f8fafc; --ok:#166534; --ok-bg:#dcfce7; --warn:#92400e; --warn-bg:#fef3c7; }
    * { box-sizing:border-box; }
    body { margin:0; color:var(--ink); background:#fff; font-family:Inter,Calibri,Arial,sans-serif; font-size:15px; line-height:1.55; }
    main { max-width:1120px; margin:0 auto; padding:40px 24px 64px; }
    header { border-bottom:1px solid var(--border); margin-bottom:28px; padding-bottom:20px; }
    h1 { margin:0 0 8px; font-size:30px; }
    h2 { color:var(--primary); margin:34px 0 10px; font-size:22px; border-bottom:1px solid var(--border); padding-bottom:6px; }
    h3 { margin:22px 0 8px; font-size:17px; }
    p { margin:8px 0 14px; }
    .subtitle { color:var(--muted); font-size:16px; }
    .meta { display:flex; flex-wrap:wrap; gap:8px; margin-top:12px; }
    .chip { border:1px solid var(--border); border-radius:999px; padding:4px 10px; background:var(--surface); font-size:12px; font-weight:600; }
    .ok,.note { margin:14px 0; padding:12px 14px; border-radius:10px; }
    .ok { color:var(--ok); background:var(--ok-bg); border:1px solid #22c55e; }
    .note { color:var(--warn); background:var(--warn-bg); border:1px solid #f59e0b; }
    table { width:100%; border-collapse:collapse; margin:12px 0 20px; font-size:13.5px; }
    th,td { border:1px solid var(--border); padding:8px 10px; text-align:left; vertical-align:top; }
    th { background:var(--surface); }
    code { background:#f1f5f9; border-radius:4px; padding:1px 5px; font-family:Consolas,monospace; }
    li { margin:4px 0; }
    .scenario { margin:12px 0; padding:14px; border:1px solid var(--border); border-radius:12px; }
    .scenario strong { color:var(--primary); }
    footer { margin-top:40px; padding-top:16px; border-top:1px solid var(--border); color:var(--muted); font-size:13px; }
  </style>
</head>
<body>
<main>
  <header>
    <h1>${esc(DOC_TITLE)}</h1>
    <p class="subtitle">${esc(DOC_SUBTITLE)}</p>
    <div class="meta">
      <span class="chip">Web + Mobile + API</span>
      <span class="chip">${esc(DOC_DATE)}</span>
      <span class="chip">Exclusive Student role</span>
      <span class="chip">Tutor links (PortalAdmin)</span>
      <span class="chip">Honest dashboards</span>
      <span class="chip">Peer rankings</span>
    </div>
  </header>

  <div class="ok"><strong>Canonical Student MVP:</strong> exclusive Student role (never combines with Tutor/Parent/Teacher/…); register/directory with real grade (Class lookup) + section; take assigned quizzes (incl. offline); self history; class/school peer rankings from best attempt %; quiz-only dashboards. Parent and Tutor linking is admin/parent/tutor-side only (Tutors directory = PortalAdmin).</div>

  <div class="note"><strong>Related docs:</strong> User creation/approval (<code>03_RankUp_User_Creation_Approval_QA</code>), Quizzes (<code>05_RankUp_Quiz_Business_QA</code>), Questions (<code>04_RankUp_Questions_Business_QA</code>). This guide is Student-centric and does not restate full quiz lifecycle.</div>

  <h2>1. Identity and role rules</h2>
  ${htmlTable(["Topic", "Rule"], identityRules)}

  <h2>2. Registration and approval</h2>
  <h3>2.1 Self-registration</h3>
  ${htmlTable(["Topic", "Rule"], registrationRules)}
  <h3>2.2 Public registration options</h3>
  ${htmlTable(["Endpoint", "Purpose"], publicOptions)}
  <h3>2.3 Approval queue routing</h3>
  ${htmlTable(["Destination", "Reviewers"], approvalRouting)}
  <h3>2.4 Approve / activate</h3>
  ${htmlTable(["Actor / case", "Rule"], approvalActivation)}
  <p>Web: <code>RequestAccessPage</code> requires grade + section for Student. Admin pending/approve dialogs show grade name and section.</p>

  <h2>3. Directory (admin)</h2>
  ${htmlTable(["Endpoint / topic", "Rule"], directoryRules)}
  <p>Web route: <code>/admin/directory/students</code>.</p>

  <h2>4. Parent linking</h2>
  ${htmlTable(["Endpoint / topic", "Rule"], parentLinking)}

  <h2>4b. Tutor linking (tuition)</h2>
  ${htmlTable(["Endpoint / topic", "Rule"], tutorLinking)}

  <h2>5. Quizzes (student take flow)</h2>
  <h3>5.1 Student-callable APIs</h3>
  ${htmlTable(["Endpoint", "Rule"], quizStudentApis)}
  <h3>5.2 Attempt rules</h3>
  ${htmlBullets(quizAttemptRules.map(([k, v]) => `${k}: ${v}`))}
  <p>Full quiz lifecycle, types, scoring, and review: see Quizzes Business &amp; QA Guide.</p>

  <h2>6. Reports and rankings</h2>
  ${htmlTable(["Endpoint", "Student rule"], reportsRankings)}

  <h2>7. Dashboards</h2>
  ${htmlTable(["Surface", "Behavior"], dashboardRules)}

  <h2>8. School change</h2>
  ${htmlTable(["Topic", "Rule"], schoolChangeRules)}

  <h2>9. Web routes and navigation</h2>
  ${htmlTable(["Path", "Purpose"], webRoutes)}
  ${htmlTable(["Nav", "Items"], webNav)}

  <h2>10. Mobile routes and navigation</h2>
  ${htmlTable(["Path", "Purpose"], mobileRoutes)}
  ${htmlTable(["Nav", "Items"], mobileNav)}

  <h2>11. Known gaps and deferred work</h2>
  ${htmlTable(["Area", "Status"], gaps)}

  <h2>12. QA scenarios</h2>
  ${scenarios
    .map(
      ([id, title, steps, expected]) =>
        `<div class="scenario"><strong>${esc(id)} — ${esc(title)}</strong><p><b>Steps:</b> ${esc(steps)}</p><p><b>Expected:</b> ${esc(expected)}</p></div>`,
    )
    .join("")}

  <h2>13. Verification checklist</h2>
  <ul>${checklist.map((item) => `<li>☐ ${esc(item)}</li>`).join("")}</ul>

  <footer>Generated by docs/build_students_qa.mjs. Edit the generator and rerun <code>npm run build:students-qa</code>.</footer>
</main>
</body>
</html>
`;

function docParagraph(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, size: 22, ...opts.run })],
  });
}

function docHeading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({
    heading: level,
    spacing: { before: 240, after: 120 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: level === HeadingLevel.HEADING_1 ? 32 : 26,
        color: level === HeadingLevel.HEADING_1 ? undefined : "2E74B5",
      }),
    ],
  });
}

function docBullet(text) {
  return new Paragraph({
    spacing: { after: 60 },
    indent: { left: 360 },
    children: [new TextRun({ text: `• ${text}`, size: 22 })],
  });
}

function docCell(text, header = false) {
  return new TableCell({
    width: { size: 2400, type: WidthType.DXA },
    children: [
      new Paragraph({
        children: [new TextRun({ text: String(text), bold: header, size: 18 })],
      }),
    ],
  });
}

function docTable(headers, rows) {
  return new Table({
    width: { size: 9600, type: WidthType.DXA },
    rows: [
      new TableRow({ children: headers.map((h) => docCell(h, true)) }),
      ...rows.map(
        (row) => new TableRow({ children: row.map((c) => docCell(c)) }),
      ),
    ],
  });
}

const docChildren = [
  docHeading(DOC_TITLE),
  docParagraph(DOC_SUBTITLE),
  docParagraph(`Version: current codebase · Date: ${DOC_DATE}`),
  docParagraph(
    "Canonical Student MVP: exclusive role (never with Tutor); register/directory with Class grade + section; assigned quizzes + offline; self history; class/school peer rankings; honest quiz-only dashboards; Tutor links PortalAdmin-only.",
    { run: { bold: true, color: "166534" } },
  ),

  docHeading("1. Identity and role rules"),
  docTable(["Topic", "Rule"], identityRules),

  docHeading("2. Registration and approval"),
  docHeading("2.1 Self-registration", HeadingLevel.HEADING_2),
  docTable(["Topic", "Rule"], registrationRules),
  docHeading("2.2 Public registration options", HeadingLevel.HEADING_2),
  docTable(["Endpoint", "Purpose"], publicOptions),
  docHeading("2.3 Approval queue routing", HeadingLevel.HEADING_2),
  docTable(["Destination", "Reviewers"], approvalRouting),
  docHeading("2.4 Approve / activate", HeadingLevel.HEADING_2),
  docTable(["Actor / case", "Rule"], approvalActivation),

  docHeading("3. Directory (admin)"),
  docTable(["Endpoint / topic", "Rule"], directoryRules),

  docHeading("4. Parent linking"),
  docTable(["Endpoint / topic", "Rule"], parentLinking),

  docHeading("4b. Tutor linking (tuition)"),
  docTable(["Endpoint / topic", "Rule"], tutorLinking),

  docHeading("5. Quizzes (student take flow)"),
  docHeading("5.1 Student-callable APIs", HeadingLevel.HEADING_2),
  docTable(["Endpoint", "Rule"], quizStudentApis),
  docHeading("5.2 Attempt rules", HeadingLevel.HEADING_2),
  ...quizAttemptRules.map(([k, v]) => docBullet(`${k}: ${v}`)),

  docHeading("6. Reports and rankings"),
  docTable(["Endpoint", "Student rule"], reportsRankings),

  docHeading("7. Dashboards"),
  docTable(["Surface", "Behavior"], dashboardRules),

  docHeading("8. School change"),
  docTable(["Topic", "Rule"], schoolChangeRules),

  docHeading("9. Web routes and navigation"),
  docTable(["Path", "Purpose"], webRoutes),
  docTable(["Nav", "Items"], webNav),

  docHeading("10. Mobile routes and navigation"),
  docTable(["Path", "Purpose"], mobileRoutes),
  docTable(["Nav", "Items"], mobileNav),

  docHeading("11. Known gaps and deferred work"),
  docTable(["Area", "Status"], gaps),

  docHeading("12. QA scenarios"),
  ...scenarios.flatMap(([id, title, steps, expected]) => [
    docHeading(`${id} — ${title}`, HeadingLevel.HEADING_2),
    docParagraph(`Steps: ${steps}`),
    docParagraph(`Expected: ${expected}`, { run: { bold: true, color: "166534" } }),
  ]),

  docHeading("13. Verification checklist"),
  ...checklist.map((item) => docBullet(`☐ ${item}`)),
];

const document = new Document({
  sections: [{ children: docChildren }],
});

writeFileSync(join(__dirname, "04_RankUp_Students_QA.html"), html);
writeFileSync(
  join(__dirname, "04_RankUp_Students_QA.docx"),
  await Packer.toBuffer(document),
);

console.log("Rebuilt Students Business & QA HTML and DOCX.");
