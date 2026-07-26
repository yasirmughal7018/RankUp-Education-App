/**
 * Rebuilds the Quizzes Business & QA Guide from current application rules.
 * Outputs:
 *   - docs/05_RankUp_Quiz_Business_QA.html
 *   - docs/05_RankUp_Quiz_Business_QA.docx
 *
 * Run: npm run build:quiz-qa  (from docs/)
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

const lifecycleStatuses = [
  ["60", "Not Assigned", "Initial editable (draft) state. Owner may edit metadata/questions, publish, duplicate, or soft-delete when there are no assignments."],
  ["61", "Published", "Published for assignment. Teacher quizzes still require approval; ParentPrivate quizzes auto-approve."],
  ["62", "Assigned", "At least one assignment exists. Further assigns allowed; owner may monitor/review/cancel/archive."],
  ["65", "Cancelled", "Owner cancelled upcoming assignments (StartDateTime > now removed). Seeded by API support initializer."],
  ["66", "Archived", "Retired by owner; IsActive=false. Seeded by API support initializer."],
];

const approvalStatuses = [
  ["40", "Pending", "Awaiting SchoolAdmin/PortalAdmin approval. Set on create and duplicate. (Renamed from legacy 'Draft' by the initializer.)"],
  ["44", "Approved", "Ready to assign. ParentPrivate reaches this on publish; Teacher quiz after admin approval."],
  ["45", "Rejected", "Rejected by SchoolAdmin/PortalAdmin; ApprovedBy cleared. Seeded by API support initializer."],
];

const deprecatedLookups = [
  ["QuizApprovalStatus", "41 Under Teacher Review / 42 Under AI Review", "Review is a per-attempt concept (QuizAttemptStatus + QuizReview), not a quiz-approval state. Deactivated."],
  ["QuizApprovalStatus", "43 Cancelled", "Cancellation lives on the lifecycle (65). Deactivated."],
  ["QuizLifecycleStatus", "63 In Progress: / 64 Completed", "Per-student progress — one quiz has many students, each at a different point. Lives on attempts (81/82/85) and computed list status. Deactivated."],
];

const attemptStatuses = [
  ["80", "Started", "Existing lookup; current start flow writes InProgress directly."],
  ["81", "InProgress", "Student started; draft answers may be saved. Canonical fallback is now 81."],
  ["82", "Submitted", "Answers submitted and auto-scored. Canonical fallback is now 82."],
  ["83", "AutoSubmitted", "Existing lookup; UI auto-submit currently calls normal submit, so this is not written."],
  ["84", "Expired", "Existing lookup; current service blocks outside-window attempts but does not transition attempts to Expired."],
  ["85", "Reviewed", "Teacher/Parent finalized subjective review; results released."],
];

const resultStatuses = [
  ["20", "Expired", "Existing result state; current assignment/attempt services do not automatically write it."],
  ["21", "Completed", "Existing result state; reporting reads it, but submit does not progress assignment result status."],
  ["22", "Under Review", "Existing result state; UI derives Pending Review but assignment result is not automatically progressed."],
  ["23", "In Progress", "Existing result state; assignment result is not automatically progressed on attempt start."],
  ["24", "Not Attempted", "Canonical initial assignment result. Mapped by AssignedResultNames."],
  ["25", "Up Coming", "Existing spelling retained as an alias; list status is primarily computed from dates."],
];

const quizTypes = [
  ["1", "Practice", "Teacher", "School quiz type; admin approval required before assign."],
  ["2", "Assessment", "Teacher", "School quiz type; admin approval required before assign."],
  ["3", "Competition", "Teacher", "School quiz type; admin approval required before assign."],
  ["4", "Surprise", "Teacher", "School quiz type; admin approval required before assign."],
  ["5", "ParentPrivate", "Parent", "Required by parent flow; seeded by API support initializer. Auto-approved on publish and excluded from admin queue."],
];

const lifecycle = [
  ["Create (Teacher/Parent)", "Not Assigned + Pending", "Title and instructions required. Parent type forced to ParentPrivate; Teacher uses school types."],
  ["Update metadata / questions", "Unchanged", "Only Not Assigned or Published, not Archived, and no started assignment (StartDateTime ≤ now or any attempt exists)."],
  ["Publish (Teacher)", "Published (Approval stays Pending)", "≥1 question required. Does not auto-approve."],
  ["Publish (Parent)", "Published + Approved", "≥1 question. Auto-approves; ApprovedBy = parent user."],
  ["Approve (SchoolAdmin / PortalAdmin)", "Approval=Approved", "Not parent-private; not already Approved. SchoolAdmin limited to own school."],
  ["Reject (SchoolAdmin / PortalAdmin)", "Approval=Rejected", "Must be pending; not parent-private. Reason returned in API but not persisted."],
  ["Assign", "Assigned", "Lifecycle Published or Assigned; not Archived; ≥1 question; Teacher quizzes must be Approved."],
  ["Cancel upcoming", "Cancelled", "Deletes only assignments with StartDateTime > now. Fails if none upcoming."],
  ["Archive", "Archived + Inactive", "From Published / Assigned / Cancelled. Not Assigned quizzes must be deleted instead."],
  ["Delete", "Soft-deleted", "Not Assigned only, and quiz must have zero assignments."],
  ["Duplicate", "New Not Assigned + Pending", "Source not Archived; ≥1 question. Title truncated + \" (Copy)\"."],
];

const permissions = [
  ["Create / edit / publish / duplicate / archive own quizzes", "No", "No", "No", "Own", "Own", "No"],
  ["Delete own Not Assigned (no assignments)", "No", "No", "No", "Own", "Own", "No"],
  ["Assign / cancel / allow-retry / monitor / review", "No", "No", "No", "Own", "Own", "No"],
  ["Approve / reject teacher quizzes", "Yes", "Own school", "No*", "No", "No", "No"],
  ["List pending-approval queue", "Yes", "Yes", "No*", "No", "No", "No"],
  ["Take attempts / save draft / submit", "No", "No", "No", "No", "No", "Yes"],
  ["View attempt result", "No", "No", "No", "No", "Linked child", "Own"],
  ["Reports (summary / rankings / performance)", "Yes", "School", "No", "Own quizzes", "No", "History self"],
];

const questionRules = [
  ["Inline create", "Creates Approved bank question scoped to quiz school/campus, Visibility=Campus, MarkFullyApproved + Active. Class/Subject/Topic/Difficulty taken from quiz. Trail: Created + Endorsed."],
  ["Attach from bank", "Requires Active + Approved status + ApprovedBy + Visibility=Public + class/subject match + not already linked + marks > 0."],
  ["Edit question on quiz", "Caller must own the quiz AND be the question CreatedBy. Recalculates totals."],
  ["Remove from quiz", "Deletes QuizQuestion link; if caller created the question, deactivates it. Recalculates totals."],
  ["Allowed types", "Single Choice (100), Multiple Choice (101), True/False (102), Fill in the Blanks (103). Descriptive (104) blocked."],
  ["Shuffle", "Quiz-level ShuffleQuestions / ShuffleOptions (DB default true; create form UI defaults false). Per-question ShuffleOptions exists but attempt uses quiz-level only."],
];

const quizAudiences = [
  [
    "One student",
    "Teacher / Parent",
    "Now",
    "Creates one quiz_assignment row for a single student. Teacher: campus student. Parent: linked child. API mode: one (not yet in Assign dialog UI).",
  ],
  [
    "Group of students",
    "Teacher / Parent",
    "Now",
    "Expands student_group_members for a group owned by the assigner. API mode: group.",
  ],
  [
    "Parent’s child",
    "Parent",
    "Now",
    "One linked child, selected linked children, all linked children, or a parent-owned child group. ParentPrivate quizzes cannot target unrelated students. API modes: one / selected / allLinked / group.",
  ],
  [
    "Class",
    "Teacher",
    "Now",
    "All students in the teacher’s campus for a grade/class. API mode: allInGrade (UI: allingrade). Scope is campus + grade, not whole school.",
  ],
  [
    "Section",
    "Teacher",
    "Planned",
    "Class + section (e.g. Class 1 Section A, Class 1 Section B). Students already store section; assign-by-section mode is not implemented yet.",
  ],
  [
    "School",
    "SchoolAdmin / PortalAdmin (or Teacher with school-wide permission)",
    "Planned",
    "All active students in one school (all campuses). Not implemented; current teacher assign is campus-scoped.",
  ],
  [
    "Multiple schools",
    "PortalAdmin",
    "Planned",
    "Cross-school competitions / platform events. Requires multi-school targeting and broader visibility rules. Not implemented.",
  ],
  [
    "Public platform audience",
    "PortalAdmin",
    "Planned",
    "Open/self-start for permitted platform students without a private assignment list. Not implemented; today students only see quizzes with an assignment row.",
  ],
];

const assignmentModes = [
  ["one", "Teacher / Parent", "Audience: One student / Parent’s child. API only — not in Assign dialog UI."],
  ["selected", "Teacher / Parent", "Audience: selected students or selected parent children; out-of-scope IDs skipped."],
  ["group", "Teacher / Parent", "Audience: Group of students / parent child group owned by the assigner."],
  ["allInGrade", "Teacher", "Audience: Class (campus + grade). UI: allingrade."],
  ["allLinked", "Parent", "Audience: Parent’s child — all linked children. API only — not in Assign dialog UI."],
];

const audienceVisibilityRules = [
  "A student may only see quizzes that are assigned to them, or (later) available to their permitted audience (school / multi-school / public).",
  "v1 rule (current code): student list and detail require a quiz_assignment row for that student. No open catalog yet.",
  "ParentPrivate quizzes may only target the parent’s linked children or the parent’s own child groups — never unrelated students, whole school, multi-school, or public.",
  "Teacher quizzes may only target students inside the teacher’s school + campus scope (today). School-wide / multi-school / public are future PortalAdmin (or elevated) audiences.",
  "Assignment always materializes per-student quiz_assignment rows at assign time (even when the audience is Class/Group). Later public audience may use a different visibility model.",
];

const attemptRules = [
  "Student role only for start / draft / submit.",
  "Assignment required; quiz IsActive; now within [StartDateTime, EndDateTime].",
  "If an InProgress attempt exists → resume (no new attempt).",
  "New start blocked when ExistingAttemptCount ≥ AllowedAttempts.",
  "DeviceId required (non-empty).",
  "Time limit returned to client; UI countdown + auto-submit. Not enforced server-side.",
  "Draft save: InProgress only; last answer wins per question.",
  "Submit scores then MarkSubmitted. Cannot resubmit.",
];

const scoring = [
  ["Single Choice / TrueFalse", "First selected option; full marks if IsCorrect, else 0."],
  ["Multiple Choice", "Exact set match of correct option IDs → full marks; else 0."],
  ["Fill in the Blanks", "Match any accepted answer (case / partial / min-max length) OR correct option text (case-insensitive). If AllowTeacherReview → subjective for review masking. If AllowAiReview → AI stub comment."],
  ["Descriptive / free text", "Marks 0 on auto-score; treated as subjective if present."],
];

const reviewRules = [
  "Pending reviews: owned quizzes with IsReviewRequired, assignment not review-done, attempt Submitted.",
  "RequiresReview per question: Descriptive OR (Fill + AllowTeacherReview + submitted text).",
  "Mark answers: awarded marks in [0, MaxMarks]; not if already finalized.",
  "Finalize: all RequiresReview questions with text must have human feedback; attempt → Reviewed; assignment.IsReviewDone = true.",
  "Score masking on submit: if IsReviewRequired AND review not done AND subjective answers → obtained/percentage shown as 0, status \"Pending Review\".",
  "Score masking on get-result: if IsReviewRequired AND !IsReviewDone → mask (stricter than submit path).",
  "AI review is a text stub only (no external grading).",
];

const apiMap = [
  ["GET /api/quizzes", "Role-scoped list (Student assigned; Parent linked∪own; Teacher campus; Admin list)."],
  ["POST /api/quizzes", "Create Not Assigned + Pending (Teacher/Parent)."],
  ["PUT /api/quizzes/{id}", "Update metadata while editable."],
  ["DELETE /api/quizzes/{id}", "Soft-delete Not Assigned with no assignments."],
  ["GET /api/quizzes/{id}/manage", "Owner manage view with questions."],
  ["POST /api/quizzes/{id}/publish", "Teacher → Published+Pending; Parent → Published+Approved."],
  ["POST /api/quizzes/{id}/approve|reject", "SchoolAdmin/PortalAdmin approval gate."],
  ["POST /api/quizzes/{id}/assign", "Create assignments; lifecycle → Assigned."],
  ["POST /api/quizzes/{id}/cancel", "Remove upcoming assignments; lifecycle → Cancelled."],
  ["POST /api/quizzes/{id}/archive", "Archive Published/Assigned/Cancelled."],
  ["POST /api/quizzes/{id}/duplicate", "Deep-copy to new Not Assigned + Pending."],
  ["POST .../assignments/{id}/allow-retry", "After review finalized; ExtraAttempts (+1 default)."],
  ["GET/POST/PUT/DELETE .../questions*", "Inline create, attach bank, edit, remove."],
  ["POST .../attempts", "Student start/resume."],
  ["PUT .../attempts/{id}/draft", "Student save draft answers."],
  ["POST .../attempts/{id}/submit", "Student submit + auto-score."],
  ["GET .../attempts/{id}/result", "Student own or Parent linked child."],
  ["GET .../monitoring", "Owner progress board."],
  ["GET/PUT .../review|answers + finalize-review", "Subjective marking and release."],
  ["GET /api/quizzes/pending-approval", "SchoolAdmin/PortalAdmin queue."],
  ["GET /api/reports/*", "Summary, performance, rankings, student quiz history."],
];

const scenarios = [
  [
    "QZ-01",
    "Teacher create → publish → approve → assign",
    "Teacher creates a Practice quiz, adds questions, publishes; SchoolAdmin approves; Teacher assigns to selected students.",
    "Lifecycle Not Assigned→Published→Assigned. Approval Pending→Approved. Students see the quiz only after assignment and within the window.",
  ],
  [
    "QZ-02",
    "Teacher cannot assign before approval",
    "Teacher publishes then tries to assign without admin approval.",
    "Assign rejected until Approval=Approved.",
  ],
  [
    "QZ-03",
    "Parent private auto-approve",
    "Parent creates and publishes a quiz with ≥1 question.",
    "Lifecycle Published, Approval Approved immediately; never appears in pending-approval queue.",
  ],
  [
    "QZ-04",
    "Edit lock after assignment starts",
    "Owner tries to edit metadata/questions after StartDateTime ≤ now or an attempt exists.",
    "Forbidden. Editable only Not Assigned/Published with no started assignment.",
  ],
  [
    "QZ-05",
    "Bank attach requires Public",
    "Teacher attaches a Campus/School-endorsed (non-Public) bank question.",
    "Rejected. Only PortalAdmin-published Public + Active + Approved questions attach.",
  ],
  [
    "QZ-06",
    "Inline question is quiz-ready",
    "Owner adds an inline question on a Not Assigned quiz.",
    "Question created Approved+Active+Campus; linked with marks; totals recalculated. Not bank-picker eligible (needs Public).",
  ],
  [
    "QZ-07",
    "Student attempt window and resume",
    "Student starts, leaves, returns within window with InProgress attempt.",
    "Resume same attempt; no new attempt consumed.",
  ],
  [
    "QZ-08",
    "Attempt limit",
    "Student already has AllowedAttempts completed attempts and tries again.",
    "Start blocked until owner Allow Retry after review (ExtraAttempts).",
  ],
  [
    "QZ-09",
    "Auto-score objective + mask subjective",
    "Quiz IsReviewRequired with Fill(AllowTeacherReview) answers; student submits.",
    "Objective items scored; obtained/percentage masked as Pending Review until finalize.",
  ],
  [
    "QZ-10",
    "Finalize review releases results",
    "Teacher marks all RequiresReview items and finalizes.",
    "Attempt→Reviewed; IsReviewDone=true; student/parent see real scores.",
  ],
  [
    "QZ-11",
    "Cancel upcoming only",
    "Owner cancels a quiz that has future and past assignments.",
    "Only StartDateTime > now removed; lifecycle Cancelled; past assignments remain.",
  ],
  [
    "QZ-12",
    "Archive vs delete",
    "Owner archives a Not Assigned quiz; owner deletes a Not Assigned quiz with no assignments.",
    "Archive of Not Assigned fails (must delete). Delete of Not Assigned succeeds. Published/Assigned may archive.",
  ],
  [
    "QZ-13",
    "Duplicate",
    "Owner duplicates a quiz with questions.",
    "New Not Assigned + Pending; questions deep-copied; title ends with \" (Copy)\".",
  ],
  [
    "QZ-14",
    "Parent child visibility",
    "Parent opens linked child's attempt result and quiz history.",
    "Allowed for linked children only. Unlinked student → forbidden.",
  ],
  [
    "QZ-15",
    "CampusAdmin approval gap",
    "CampusAdmin opens /admin/quiz-approvals and tries approve/reject.",
    "UI may show the page; APIs require SchoolAdmin/PortalAdmin — CampusAdmin is denied.",
  ],
  [
    "QZ-16",
    "Student only sees permitted audience",
    "Student A is assigned a quiz; Student B in same class is not assigned.",
    "Student A sees the quiz. Student B does not. Section/School/Public audiences remain planned and must not leak visibility without an explicit assign or permitted-audience rule.",
  ],
  [
    "QZ-17",
    "Parent cannot assign outside linked children",
    "Parent tries to assign ParentPrivate quiz to an unrelated student or whole school.",
    "Rejected. Parent audience is limited to linked children / parent-owned child groups.",
  ],
];

const checklist = [
  "Teacher create starts Not Assigned + Pending; Parent create forces ParentPrivate.",
  "Teacher publish needs ≥1 question and leaves Approval=Pending; Parent publish auto-Approves.",
  "Teacher assign requires Approval=Approved; Parent assign does not need school approval.",
  "Student sees only assigned quizzes (or later permitted audience); ParentPrivate never targets school/public.",
  "Supported audiences now: one student, selected, group, class (allInGrade), parent’s child / all linked. Section, school, multi-school, public are planned.",
  "Editable only Not Assigned/Published, not Archived, and no started assignment.",
  "Bank attach requires Public + Active + Approved + ApprovedBy + class/subject match.",
  "Inline questions are Approved+Campus+Active and usable on that quiz only for bank eligibility rules.",
  "Descriptive type blocked for authoring.",
  "Student attempts require assignment, active quiz, window, DeviceId, and attempt quota.",
  "InProgress resumes; time limit is client-enforced only.",
  "Scoring: single/TF one correct; multi exact set; Fill accepted-answer rules.",
  "IsReviewRequired + subjective → masked until finalize-review.",
  "Allow-retry only after IsReviewDone; adds ExtraAttempts.",
  "Cancel removes only future assignments.",
  "Archive sets Archived + Inactive; Not Assigned must be deleted.",
  "Duplicate creates Not Assigned + Pending copy with questions.",
  "CampusAdmin has no quiz manage/approve API capability.",
  "Fill answers hidden from students before submission (attempt payload).",
  "Reports available to Teacher (own), SchoolAdmin (school), PortalAdmin (all).",
];

const knownGaps = [
  "Attempt Started / AutoSubmitted / Expired and result Expired / Under Review / In Progress are present but not automatically transitioned by current services.",
  "UI question add/edit/remove shown only while Not Assigned; API still allows Published until assignment starts.",
  "Assign modes one and allLinked exist in API but not in the Assign dialog UI.",
  "Audience Section / School / Multiple schools / Public platform are documented as planned; only one, selected, group, class (allInGrade), and parent-child targets exist today.",
  "ShuffleQuestions / ShuffleOptions / IsReviewRequired: DB defaults true; create form defaults false / false / false.",
  "Time limit enforced in UI only (not server-side).",
  "Reject reason returned in API response but not persisted on the quiz.",
  "AI review is a stub comment only.",
  "CampusAdmin can open quiz-approvals UI; approve/reject APIs deny CampusAdmin.",
  "Teacher list API returns campus-active quizzes; \"mine only\" is a client-side filter.",
  "Assignment QuizResultStatus is set at create and not progressed to Completed/Reviewed in submit services.",
  "Per-question ShuffleOptions unused at attempt time (quiz-level only).",
  "No quiz-related notifications.",
  "Approve endpoint relies on service-layer role checks (reject has controller Roles attribute).",
];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function htmlTable(headers, rows) {
  return `<table><thead><tr>${headers
    .map((header) => `<th>${escapeHtml(header)}</th>`)
    .join("")}</tr></thead><tbody>${rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`,
    )
    .join("")}</tbody></table>`;
}

function htmlList(items) {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>RankUp Education — Quizzes Business &amp; QA Guide</title>
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
    <h1>RankUp Education — Quizzes Business &amp; QA Guide</h1>
    <p class="subtitle">Intended rules for quiz lifecycle, approval, questions, assignment, student attempts, review, roles, APIs, and QA.</p>
    <div class="meta">
      <span class="chip">Quiz module v1</span>
      <span class="chip">26 Jul 2026</span>
      <span class="chip">Teacher + Parent owners</span>
      <span class="chip">SchoolAdmin / PortalAdmin approval</span>
    </div>
  </header>

  <div class="ok"><strong>Canonical model:</strong> Quizzes are owned by <strong>Teacher</strong> or <strong>Parent</strong>. Teachers create school quizzes (Practice / Assessment / Competition / Surprise) that publish into a pending-approval queue; only after <strong>SchoolAdmin</strong> or <strong>PortalAdmin</strong> approve can they be assigned. Parents create <strong>ParentPrivate</strong> quizzes that auto-approve on publish and assign to linked children. Students take attempts only through assignments. Subjective answers can require teacher/parent review before scores are released.</div>

  <div class="note"><strong>Clean two-dimension model:</strong> a quiz has exactly two stored statuses — <strong>Lifecycle</strong> (what state the quiz definition is in: Not Assigned → Published → Assigned → Cancelled / Archived) and <strong>Approval</strong> (the school gate: Pending → Approved / Rejected). Per-student progress is never stored on the quiz row; it lives on attempts (InProgress 81 / Submitted 82 / Reviewed 85) and computed list statuses. The initializer renames approval 40 'Draft' → 'Pending', seeds ParentPrivate (5), Rejected (45), Cancelled (65), Archived (66), and deactivates the overlapping legacy rows (41, 42, 43, 63, 64).</div>
  <div class="note"><strong>Terminology:</strong> code and UI may still say “draft quiz” as a shorthand for the editable lifecycle state. The stored lookup name is <strong>Not Assigned (60)</strong>. Approval never uses the word Draft — the pending gate is <strong>Pending (40)</strong>.</div>

  <h2>1. Lifecycle statuses</h2>
  ${htmlTable(["ID", "Lifecycle", "Meaning"], lifecycleStatuses)}

  <h2>2. Approval statuses</h2>
  ${htmlTable(["ID", "Approval", "Meaning"], approvalStatuses)}
  <h3>Deprecated / deactivated lookup rows</h3>
  ${htmlTable(["Type", "Rows", "Why deactivated"], deprecatedLookups)}

  <h2>3. Attempt and result statuses</h2>
  <h3>QuizAttemptStatus</h3>
  ${htmlTable(["ID", "Attempt status", "Meaning"], attemptStatuses)}
  <h3>QuizResultStatus</h3>
  ${htmlTable(["ID", "Result status", "Meaning"], resultStatuses)}

  <h2>4. Quiz types</h2>
  ${htmlTable(["ID", "Type", "Creator", "Rules"], quizTypes)}

  <h2>5. Lifecycle and transitions</h2>
  ${htmlTable(["Action", "Result", "State changes / guards"], lifecycle)}
  <div class="note"><strong>Editable window:</strong> metadata and questions may change only while lifecycle is <strong>Not Assigned</strong> or <strong>Published</strong>, the quiz is not Archived, and no assignment has started (StartDateTime ≤ now or any attempt exists). Assigned / Cancelled / Archived are not editable.</div>

  <h2>6. Role permissions</h2>
  ${htmlTable(
    ["Action", "PortalAdmin", "SchoolAdmin", "CampusAdmin", "Teacher", "Parent", "Student"],
    permissions,
  )}
  <p><em>*CampusAdmin:</em> no quiz manage/approve/attempt API access. The Web admin quiz-approvals route may render for CampusAdmin, but approve/reject APIs deny the role.</p>
  <div class="note"><strong>Ownership:</strong> manage actions require the caller to own the quiz (<code>CreatedBy</code> = user id). Teachers also need matching school + campus. Parents stamp school/campus from a linked child context.</div>

  <h2>7. Questions on a quiz</h2>
  ${htmlTable(["Topic", "Rule"], questionRules)}
  <h3>Type validation</h3>
  ${htmlList([
    "Single Choice: ≥2 options; exactly 1 correct.",
    "Multiple Choice: ≥2 options; ≥1 correct.",
    "True/False: exactly True and False; exactly 1 correct.",
    "Fill in the Blanks: ≥1 accepted answer (inline option texts become accepted answers with case-insensitive, non-partial defaults).",
    "Marks must be > 0; question text required.",
    "Totals recalculated after add / attach / update / remove / duplicate.",
  ])}

  <h2>8. Quiz Audience</h2>
  <p>A quiz may be assigned to one of the following audiences. The student should only see quizzes assigned to them or available to their permitted audience.</p>
  ${htmlTable(["Audience", "Who may assign", "Status", "Rules"], quizAudiences)}
  ${htmlList(audienceVisibilityRules)}
  <h3>Assign API modes (current implementation)</h3>
  ${htmlTable(["Mode", "Who", "Audience"], assignmentModes)}
  ${htmlList([
    "Prerequisites: Published or Assigned; not Archived; ≥1 question; Teacher quizzes Approved.",
    "EndAt > StartAt; AllowedAttempts > 0.",
    "Existing (quiz, student) assignment → skip; if all skipped → validation error.",
    "Cancel: hard-delete future assignments only; set lifecycle Cancelled.",
    "Allow retry: review must be finalized; attempt count ≥ allowed; ExtraAttempts += 1 (default); IsReviewDone=false. Archived blocked.",
  ])}

  <h2>9. Student attempt flow</h2>
  ${htmlList(attemptRules)}
  <h3>Auto-scoring</h3>
  ${htmlTable(["Type", "Rule"], scoring)}

  <h2>10. Review and results release</h2>
  ${htmlList(reviewRules)}

  <h2>11. Parent and student visibility</h2>
  ${htmlList([
    "Parent list = assignments of linked children ∪ quizzes they created.",
    "Parent may review/finalize only their own quizzes; may view linked-child results and quiz history.",
    "Student sees only quizzes with an assignment row; detail requires assignment. Future public/school audiences may broaden this — see §8 Quiz Audience.",
    "Results masked while review required and not done.",
    "Rankings / performance / summary: Teacher (own), SchoolAdmin (school), PortalAdmin (all) — not students/parents.",
  ])}

  <h2>12. Validation and limits</h2>
  ${htmlList([
    "Title required; DB max 100. Duplicate truncates to 92 + \" (Copy)\".",
    "Description DB max 500 (not required empty-check in app).",
    "Instructions required; DB max 1000.",
    "Class / Subject / Topic / Difficulty required on create (UI); difficulty Easy/Medium/Hard (2001–2003).",
    "TimeLimitMinutes optional; no server min/max; client countdown only.",
    "Quiz AllowedAttempts optional on metadata; assignment AllowedAttempts must be > 0.",
    "Question marks > 0; publish/assign/duplicate need ≥1 question; no hard max count.",
    "Submitted text DB max 1000.",
    "Domain defaults: ShuffleQuestions/Options=true, IsReviewRequired=true. Create form: shuffle false, review required false, time 30, attempts 1.",
  ])}

  <h2>13. API transition map</h2>
  ${htmlTable(["Endpoint", "Business effect"], apiMap)}

  <h2>14. UI routes</h2>
  ${htmlList([
    "/quizzes — Teacher/Parent list, New, Assignments, Pending reviews.",
    "/quizzes/new, /quizzes/:id/edit — create/update form.",
    "/quizzes/:id — manage: add Q / publish / delete (Not Assigned); assign / duplicate / archive / cancel / retry / monitor (Published/Assigned).",
    "/quizzes/:id/monitoring — progress board.",
    "/quizzes/assignments — cross-quiz assignment board.",
    "/quizzes/reviews/pending and review workspace — mark + finalize.",
    "/admin/quiz-approvals — SchoolAdmin/PortalAdmin (CampusAdmin UI-only gap).",
    "/student/quizzes* — detail, attempt (timer auto-submit), result.",
    "/parent/quiz-dashboard, children history/result — parent flows.",
    "/reports — Teacher / SchoolAdmin / PortalAdmin analytics.",
  ])}

  <h2>15. QA scenarios</h2>
  ${scenarios
    .map(
      ([id, title, steps, expected]) =>
        `<div class="scenario"><strong>${escapeHtml(id)} — ${escapeHtml(title)}</strong><p><b>Steps:</b> ${escapeHtml(steps)}</p><p><b>Expected:</b> ${escapeHtml(expected)}</p></div>`,
    )
    .join("")}

  <h2>16. Verification checklist</h2>
  ${htmlList(checklist.map((item) => `☐ ${item}`))}

  <h2>17. Known gaps, stubs, and optional work</h2>
  ${htmlList(knownGaps)}

  <footer>Generated by docs/build_quiz_business_qa.mjs. Edit the generator and rerun <code>npm run build:quiz-qa</code>. Related: <code>04_RankUp_Questions_Business_QA</code> for bank eligibility and question approval.</footer>
</main>
</body>
</html>`;

function docParagraph(text, options = {}) {
  return new Paragraph({
    spacing: { after: 100 },
    ...options,
    children: [new TextRun({ text, size: 21, ...options.run })],
  });
}

function docHeading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({
    heading: level,
    spacing: { before: 220, after: 100 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: level === HeadingLevel.TITLE ? 34 : level === HeadingLevel.HEADING_1 ? 28 : 24,
        color: level === HeadingLevel.TITLE ? "0F172A" : "2563EB",
      }),
    ],
  });
}

function docBullet(text) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 60 },
    children: [new TextRun({ text, size: 21 })],
  });
}

function docCell(text, header = false) {
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text: String(text),
            bold: header,
            size: 17,
          }),
        ],
      }),
    ],
  });
}

function docTable(headers, rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((header) => docCell(header, true)),
      }),
      ...rows.map(
        (row) =>
          new TableRow({
            children: row.map((value) => docCell(value)),
          }),
      ),
    ],
  });
}

const docChildren = [
  docHeading("RankUp Education — Quizzes Business & QA Guide", HeadingLevel.TITLE),
  docParagraph("Current implemented rules · 26 Jul 2026", {
    run: { italics: true, color: "475569" },
  }),
  docParagraph(
    "Canonical model: Quizzes are owned by Teacher or Parent. Teachers create school quizzes that publish into a pending-approval queue; only after SchoolAdmin or PortalAdmin approve can they be assigned. Parents create ParentPrivate quizzes that auto-approve on publish and assign to linked children. Students take attempts only through assignments. Subjective answers can require teacher/parent review before scores are released.",
    { run: { bold: true, color: "166534" } },
  ),
  docParagraph(
    "Clean two-dimension model: Lifecycle (Not Assigned 60 → Published 61 → Assigned 62 → Cancelled 65 / Archived 66) and Approval (Pending 40 → Approved 44 / Rejected 45). Per-student progress lives on attempts (81/82/85), never on the quiz row. Initializer renames 40 Draft → Pending, seeds 5/45/65/66, deactivates 41/42/43/63/64.",
    { run: { bold: true, color: "92400E" } },
  ),
  docParagraph(
    "Terminology: “draft quiz” in code/UI means lifecycle Not Assigned (60). Approval Pending is 40 — never named Draft.",
    { run: { bold: true, color: "92400E" } },
  ),

  docHeading("1. Lifecycle statuses"),
  docTable(["ID", "Lifecycle", "Meaning"], lifecycleStatuses),

  docHeading("2. Approval statuses"),
  docTable(["ID", "Approval", "Meaning"], approvalStatuses),
  docHeading("Deprecated / deactivated lookup rows", HeadingLevel.HEADING_2),
  docTable(["Type", "Rows", "Why deactivated"], deprecatedLookups),

  docHeading("3. Attempt and result statuses"),
  docHeading("QuizAttemptStatus", HeadingLevel.HEADING_2),
  docTable(["ID", "Attempt status", "Meaning"], attemptStatuses),
  docHeading("QuizResultStatus", HeadingLevel.HEADING_2),
  docTable(["ID", "Result status", "Meaning"], resultStatuses),

  docHeading("4. Quiz types"),
  docTable(["ID", "Type", "Creator", "Rules"], quizTypes),

  docHeading("5. Lifecycle and transitions"),
  docTable(["Action", "Result", "State changes / guards"], lifecycle),
  docParagraph(
    "Editable only while Not Assigned or Published, not Archived, and no started assignment.",
    { run: { bold: true, color: "92400E" } },
  ),

  docHeading("6. Role permissions"),
  docTable(
    ["Action", "PortalAdmin", "SchoolAdmin", "CampusAdmin", "Teacher", "Parent", "Student"],
    permissions,
  ),
  docParagraph(
    "CampusAdmin has no quiz manage/approve API access. Ownership required for manage actions.",
    { run: { bold: true, color: "92400E" } },
  ),

  docHeading("7. Questions on a quiz"),
  docTable(["Topic", "Rule"], questionRules),
  ...[
    "Single Choice: ≥2 options; exactly 1 correct.",
    "Multiple Choice: ≥2 options; ≥1 correct.",
    "True/False: exactly 2 options; exactly 1 correct.",
    "Fill: ≥1 accepted answer; Descriptive blocked.",
    "Totals recalculated after mutations.",
  ].map(docBullet),

  docHeading("8. Quiz Audience"),
  docParagraph(
    "A quiz may be assigned to: One student, Group of students, Parent’s child, Class, Section, School, Multiple schools, or Public platform audience. Students only see quizzes assigned to them or available to their permitted audience.",
  ),
  docTable(["Audience", "Who may assign", "Status", "Rules"], quizAudiences),
  ...audienceVisibilityRules.map(docBullet),
  docHeading("Assign API modes (current implementation)", HeadingLevel.HEADING_2),
  docTable(["Mode", "Who", "Audience"], assignmentModes),
  ...[
    "Published/Assigned; not Archived; ≥1 question; Teacher Approved.",
    "EndAt > StartAt; AllowedAttempts > 0.",
    "Cancel removes future assignments only.",
    "Allow-retry after finalize adds ExtraAttempts.",
  ].map(docBullet),

  docHeading("9. Student attempt flow"),
  ...attemptRules.map(docBullet),
  docHeading("Auto-scoring", HeadingLevel.HEADING_2),
  docTable(["Type", "Rule"], scoring),

  docHeading("10. Review and results release"),
  ...reviewRules.map(docBullet),

  docHeading("11. Parent and student visibility"),
  ...[
    "Parent list = linked-child assignments ∪ own quizzes.",
    "Student sees only assigned quizzes (v1). See §8 for future audiences.",
    "Results masked while review pending.",
    "Reports: Teacher own / SchoolAdmin school / PortalAdmin all.",
  ].map(docBullet),

  docHeading("12. Validation and limits"),
  ...[
    "Title required (max 100); instructions required (max 1000).",
    "Difficulty Easy/Medium/Hard (2001–2003).",
    "Time limit client-enforced only.",
    "Publish/assign/duplicate need ≥1 question.",
  ].map(docBullet),

  docHeading("13. API transition map"),
  docTable(["Endpoint", "Business effect"], apiMap),

  docHeading("14. UI routes"),
  ...[
    "/quizzes manage routes for Teacher/Parent.",
    "/admin/quiz-approvals for SchoolAdmin/PortalAdmin.",
    "/student/quizzes* for attempts and results.",
    "/parent/quiz-dashboard and child history/result.",
    "/reports for analytics.",
  ].map(docBullet),

  docHeading("15. QA scenarios"),
  ...scenarios.flatMap(([id, title, steps, expected]) => [
    docHeading(`${id} — ${title}`, HeadingLevel.HEADING_2),
    docParagraph(`Steps: ${steps}`),
    docParagraph(`Expected: ${expected}`, { run: { bold: true, color: "166534" } }),
  ]),

  docHeading("16. Verification checklist"),
  ...checklist.map((item) => docBullet(`☐ ${item}`)),

  docHeading("17. Known gaps, stubs, and optional work"),
  ...knownGaps.map(docBullet),
];

const document = new Document({
  sections: [{ children: docChildren }],
});

writeFileSync(join(__dirname, "05_RankUp_Quiz_Business_QA.html"), html);
writeFileSync(
  join(__dirname, "05_RankUp_Quiz_Business_QA.docx"),
  await Packer.toBuffer(document),
);

console.log("Rebuilt Quizzes Business & QA HTML and DOCX.");
