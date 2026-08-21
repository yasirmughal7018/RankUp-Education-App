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
  ["60", "Draft", "Initial editable state. Visible only to the owner and PortalAdmin. Owner may edit metadata/questions, publish, duplicate, or hard-delete when there are no assignments."],
  ["61", "Published", "Published for assignment. Visibility by school/campus/portal scope; Public audience → everyone can view and assign. Teacher quizzes still require approval gate; ParentPrivate auto-approves."],
  ["62", "Assigned", "At least one assignment row exists. Assigned students can take the quiz. Further assigns allowed; owner may monitor/review/cancel upcoming/archive."],
  ["63", "Archived", "Soft-retired when assignments exist (IsActive=false). Same school/campus/portal visibility rules as Published. Hard-deleted instead when there are no assignments."],
];

const approvalStatuses = [
  ["40", "Pending", "Awaiting school/campus review (or portal). Set when a Teacher publishes/resubmits. Create/duplicate also start here for teachers."],
  ["41", "SchoolApproved", "First-tier approve by SchoolAdmin or CampusAdmin. Waiting for PortalAdmin final approval."],
  ["42", "Approved", "Final approve by PortalAdmin (or ParentPrivate on publish). Required before Teacher/SchoolAdmin/PortalAdmin assignment."],
  ["43", "Rejected", "Denied by SchoolAdmin, CampusAdmin, or PortalAdmin. Rejection reason required. Cannot be approved until the teacher resubmits to Pending."],
];

const deprecatedLookups = [
  ["QuizApprovalStatus", "44 / 45 / 46 (legacy Approved / Rejected / SchoolApproved)", "Remapped onto 42 / 43 / 41 and deactivated by the API support initializer."],
  ["QuizLifecycleStatus", "64 Completed / 65 Cancelled / 66 (legacy Archived)", "Completed/Cancelled are not quiz-definition states. Old Archived (66) remapped to 63. Per-student progress lives on attempts (81/82/85) and QuizResultStatus (20–25)."],
];

const attemptStatuses = [
  ["80", "Started", "Existing lookup; current start flow writes InProgress directly."],
  ["81", "InProgress", "Student started; draft answers may be saved. Canonical fallback is now 81."],
  ["82", "Submitted", "Manual submit + auto-score. Canonical fallback is now 82."],
  ["83", "AutoSubmitted", "Written when submit carries IsAutoSubmit=true (UI/server time-budget expiry). Server also enforces TimeLimitMinutes with grace."],
  ["84", "Expired", "Written by ExpireOverdueUnattemptedAsync when an InProgress attempt’s assignment EndDateTime has passed; also blocked on start outside the window."],
  ["85", "Reviewed", "Teacher/Parent finalized subjective review; results released."],
];

const resultStatuses = [
  ["20", "Expired", "Written when EndDateTime passed with no completed attempt (unattempted or overdue InProgress). ExpireOverdue runs on student list and assign list."],
  ["21", "Completed", "Written on submit when review is not pending (no subjective / review already done)."],
  ["22", "Under Review", "Written on submit when IsReviewRequired and subjective answers exist (IsReviewDone=false)."],
  ["23", "In Progress", "Written when the student starts an attempt that is not yet submitted."],
  ["24", "Not Attempted", "Initial assignment result when StartAt ≤ now and the student has not started. Also promoted from Up Coming when the window opens."],
  ["25", "Up Coming", "Written on assign when StartAt > now. Promoted to Not Attempted when StartAt arrives (no attempt yet)."],
];

const quizAssignmentFields = [
  ["Id", "Primary key."],
  ["QuizId", "Quiz being assigned."],
  ["StudentId", "Target student. One row per (quiz, student). Group/class assign expands to multiple rows."],
  ["AssignedById", "Teacher or Parent who created the assignment. Students do not assign quizzes in the current model."],
  ["StudentGroupId", "Optional. Set when the row was created via a group expand; still one row per student."],
  ["StartDateTime", "Availability window start for this student."],
  ["EndDateTime", "Availability window end; must be after StartDateTime."],
  ["AllowedAttempts", "Attempt quota for this assignment (> 0). Increased by Allow Retry (ExtraAttempts)."],
  ["QuizResultStatus", "Per-assignment result lookup (see meanings below). Initial value is typically Not Attempted (24) or Up Coming (25)."],
  ["IsReviewDone", "True after teacher/parent finalize-review for this student’s subjective answers. Reset to false on Allow Retry."],
  ["CreatedDate", "When the assignment row was created."],
  ["ModifiedDate", "Updated on review finalize / retry grant."],
];

const assignmentResultMeanings = [
  ["Up Coming (25)", "StartDateTime is in the future for this student."],
  ["Not Attempted (24)", "Window is open (or ready) and this student has not started. Prefer this name over “Not Started”."],
  ["In Progress (23)", "This student has an InProgress attempt."],
  ["Under Review (22)", "This student’s attempt is Submitted and subjective review is pending (IsReviewDone=false)."],
  ["Expired (20)", "EndDateTime passed without a completed attempt for this student."],
  ["Completed (21)", "This student’s attempt cycle is done (submitted and, if required, reviewed)."],
];

const assignmentStatusConflicts = [
  [
    "Result status means “no student / one of the students”",
    "Per-assignment only",
    "QuizResultStatus is stored on each quiz_assignment row (one student). Aggregate board status (how many children started) is computed in monitoring UI, not stored as this field.",
  ],
  [
    "Assigned by student",
    "Teacher or Parent only",
    "AssignedById is the managing owner. Students take attempts; they do not create assignments.",
  ],
  [
    "Under Review = quiz under AI/teacher review",
    "This student’s review pending",
    "School quiz approval is separate (Pending → SchoolApproved → Approved). Under Review here means subjective marking for this assignment after submit.",
  ],
  [
    "Not Started vs Not Attempted",
    "Use Not Attempted (24)",
    "Lookup name is Not Attempted; “Not Started” is an acceptable UI synonym only.",
  ],
];

const quizTypes = [
  ["1", "Practice", "Teacher", "Learning-oriented school quiz. Admin approval before assign. Intended: flexible attempts / optional time / answers may show after submit (type-specific UX still soft)."],
  ["2", "Assessment", "Teacher", "Assigned assessment with due window; may have limited time; visible to selected audience after assign. Admin approval before assign."],
  ["3", "Competition", "Teacher", "Class/school/inter-school competition intent: fixed schedule, strict attempts. Device lock (all quiz types) + FocusLoss≥5 / Paste≥3 draft lockout (all types). Admin approval before assign."],
  ["4", "Surprise", "Teacher", "Hidden from students until StartDateTime (no advance notice); availability window ≤24h; StartAt ≤ now+24h; ≤1 attempt. Assign notifications deferred until the window opens. Admin approval before assign. Broader PortalAdmin/AI-only authorship is future policy."],
  ["5", "ParentPrivate", "Parent", "Private parent quiz. Auto-approved on publish; excluded from admin queue; assign only to linked children / parent groups."],
];

const lifecycle = [
  ["Create (Teacher/Parent)", "Draft + Pending", "Title required. Parent type forced to ParentPrivate; Teacher uses school types. Topic/Difficulty/School/Campus may be optional by role."],
  ["Update metadata / questions", "Unchanged", "Only Draft or Published, not Archived, and no started assignment (StartDateTime ≤ now or any attempt exists)."],
  ["Publish (Teacher)", "Published + Pending", "≥1 question. (Re)queues Pending — also recovers Rejected quizzes."],
  ["Publish (SchoolAdmin / CampusAdmin)", "Published + SchoolApproved", "≥1 question. Skips Pending; first-tier school approve."],
  ["Publish (PortalAdmin / Parent)", "Published + Approved", "≥1 question. ParentPrivate auto-approves; PortalAdmin final-approves."],
  ["School approve (SchoolAdmin / CampusAdmin)", "Approval=SchoolApproved", "Only from Pending. Rejected cannot be approved. CampusAdmin limited to own campus; SchoolAdmin to own school."],
  ["Portal approve (PortalAdmin)", "Approval=Approved", "From Pending or SchoolApproved. Rejected cannot be approved until teacher resubmits."],
  ["Reject (SchoolAdmin / CampusAdmin / PortalAdmin)", "Approval=Rejected", "From Pending or SchoolApproved. Reason required. Fully Approved quizzes cannot be rejected."],
  ["Assign", "Assigned", "Lifecycle Published or Assigned; not Archived; ≥1 question; Teacher/School/Portal quizzes must be final Approved (not SchoolApproved alone)."],
  ["Cancel upcoming", "Assigned or Published", "Deletes only assignments with StartDateTime > now. Restores Assigned if rows remain, else Published. Never uses Cancelled lifecycle."],
  ["Archive", "Deleted or Archived", "No assignments → hard delete. Has assignments → Archived + Inactive. Draft quizzes must be deleted instead."],
  ["Unarchive", "Published or Assigned", "Restores Assigned if any assignments exist, else Published; IsActive=true."],
  ["Delete", "Hard-deleted", "Draft only, and quiz must have zero assignments/attempts."],
  ["Duplicate", "New Draft + Pending", "Source not Archived; ≥1 question. Title truncated + \" (Copy)\"."],
];

const permissions = [
  ["Create / edit / publish / duplicate / archive own quizzes", "Yes*", "Yes*", "No*", "Own", "Own", "No"],
  ["Delete own Draft (no assignments)", "Yes*", "Yes*", "No", "Own", "Own", "No"],
  ["Assign / cancel / allow-retry / monitor / review", "Yes", "School", "No*", "Own", "Own", "No"],
  ["Approve / reject teacher quizzes", "Yes (final)", "School → SchoolApproved", "Campus → SchoolApproved", "No", "No", "No"],
  ["List pending-approval queue", "Yes (+ SchoolApproved)", "Pending in school", "Pending in campus", "No", "No", "No"],
  ["List / view Draft quizzes", "All", "Own drafts only", "Own drafts only", "Own", "Own", "No"],
  ["Take attempts / save draft / submit", "No", "No", "No", "No", "No", "Yes"],
  ["View attempt result", "No", "No", "No", "No", "Linked child", "Own"],
  ["Reports (summary / rankings / performance)", "Yes", "School", "No", "Own quizzes", "No", "History self"],
];

const questionRules = [
  ["Inline create", "Creates Approved bank question scoped to quiz school/campus, Visibility=Campus, MarkFullyApproved + Active. Class/Subject/Topic/Difficulty taken from quiz. Trail: Created + Endorsed."],
  ["Attach from bank", "Requires Active + Approved status + ApprovedBy + Visibility=Public + class/subject match + not already linked + marks > 0."],
  ["Edit question on quiz", "Caller must own the quiz AND be the question CreatedBy. Recalculates totals."],
  ["Remove from quiz", "Deletes QuizQuestion link; if caller created the question, deactivates it. Recalculates totals."],
  ["Allowed types", "Create (web, mobile, Excel import, quiz inline, API): Single Choice (100), Multiple Choice (101), True/False (102), Fill in the Blanks (103), Descriptive (104), Matching (106), Ordering (107). File Upload (105) and Media (108) are hidden on create; existing rows still work on attempts. File Upload MVP stores a pasted link/path in SubmittedText (no binary blob upload yet)."],
  ["Shuffle", "Quiz-level ShuffleQuestions / ShuffleOptions. At attempt start, options shuffle when quiz.ShuffleOptions AND link.ShuffleOptions are both true (per-question can opt out)."],
];

const importantBusinessRules = [
  ["A quiz can contain many questions", "Yes", "Quiz → QuizQuestion → Question."],
  ["A question can belong to many quizzes", "Yes", "Same bank question may be attached to multiple quizzes via separate QuizQuestion rows. Reverse list: GET /api/questions/{id}/quizzes (question detail Used in quizzes)."],
  ["QuizQuestion manages the many-to-many", "Yes", "Link table owns DisplayOrder, Marks, ShuffleOptions, CreatedAt."],
  ["Question order belongs to QuizQuestion", "Yes", "DisplayOrder is per quiz link, not on the bank question."],
  ["Quiz-specific marks belong to QuizQuestion", "Yes", "Copied from question marks on attach/create; may be overwritten per quiz. Totals recalculate from link marks."],
  ["Choice options belong to the question", "Yes", "question_options are bank-question owned; quizzes do not duplicate option rows."],
  ["Random/shuffled quizzes store exact questions shown", "Yes", "QuizAttemptQuestion freezes QuestionId, DisplayOrder, Marks, QuestionText; options snapshotted on QuizAttemptQuestionOption."],
  ["Student answers stored per attempt", "Yes", "QuizAttemptAnswer rows hang off QuizAttemptQuestion."],
  ["Multiple-choice selected answers stored separately", "Yes", "Each selected option is a QuizAttemptAnswer with QuestionOptionId; free text uses SubmittedText."],
  ["Descriptive / file answers may need teacher or AI review", "Covered", "Descriptive always gets an AI suggestion on submit (shown on review UI) and requires teacher/parent finalize when answered. File Upload (link/path MVP) requires teacher review. Fill with AllowTeacherReview / AllowAiReview. Binary file storage/upload is not built yet."],
];

const quizQuestionFields = [
  ["QuizId", "Parent quiz."],
  ["QuestionId", "Bank question linked into the quiz."],
  ["DisplayOrder", "Order of the question within this quiz."],
  ["Marks", "Quiz-specific marks (copied from question; may be overwritten)."],
  ["ShuffleOptions", "Per-link option shuffle flag; AND’d with quiz-level ShuffleOptions at attempt start."],
  ["CreatedAt", "When the link was created."],
];

const quizAudiences = [
  [
    "One student",
    "Teacher / Parent",
    "Now",
    "Creates one quiz_assignment row for a single student. Teacher: campus student. Parent: linked child. API mode: one.",
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
    "Now",
    "Campus + grade + section. API mode: allInSection. Materializes one quiz_assignment row per student (AudienceScope stays Assigned).",
  ],
  [
    "School",
    "SchoolAdmin / PortalAdmin",
    "Now",
    "All active students in one school (all campuses). API mode: allInSchool. Materializes per-student rows; AudienceScope stays Assigned — does NOT open the student catalog.",
  ],
  [
    "Multiple schools",
    "PortalAdmin",
    "Now",
    "Cross-school targeting via SchoolIds. API mode: multiSchool. Materializes per-student rows; AudienceScope stays Assigned.",
  ],
  [
    "Public platform audience",
    "PortalAdmin",
    "Now",
    "Only Public sets AudienceScope=Public (open catalog). Students see Public quizzes without a private assignment row; start may still create an assignment. School/section/multi modes must never set Public.",
  ],
];

const assignmentModes = [
  ["one", "Teacher / Parent / Admin", "Audience: One student / Parent’s child."],
  ["selected", "Teacher / Parent / Admin", "Audience: selected students or selected parent children; out-of-scope IDs skipped."],
  ["group", "Teacher / Parent", "Audience: Group of students / parent child group owned by the assigner."],
  ["allInGrade", "Teacher", "Audience: Class (campus + grade). UI: allingrade."],
  ["allInSection", "Teacher", "Audience: Section (campus + grade + section)."],
  ["allInSchool", "SchoolAdmin / PortalAdmin", "Audience: School — materializes rows; does not open catalog."],
  ["multiSchool", "PortalAdmin", "Audience: Multiple schools — materializes rows; does not open catalog."],
  ["public", "PortalAdmin", "Audience: Public platform catalog (AudienceScope=Public)."],
  ["allLinked", "Parent", "Audience: Parent’s child — all linked children."],
];

const audienceVisibilityRules = [
  "A student may see (1) quizzes with a quiz_assignment row for them, and/or (2) quizzes with AudienceScope=Public in the open catalog.",
  "School / multi-school / section / class assign create materialized rows and keep AudienceScope=Assigned. Only Public is open-catalog — prevents school-audience leakage into the student catalog.",
  "ParentPrivate quizzes may only target the parent’s linked children or the parent’s own child groups — never unrelated students, whole school, multi-school, or public.",
  "Teacher assign is campus-scoped (grade/section/group/selected). School-wide is SchoolAdmin/PortalAdmin; multi-school and public are PortalAdmin.",
  "Student list filters Public catalog with AudienceScope == \"Public\" and now within [AudienceStartAt, AudienceEndAt]; SetAudienceAccess maps any non-Public scope to Assigned.",
];

const studentAttemptFlow = [
  ["1", "Student opens quiz details", "Covered", "/student/quizzes detail; assignment row or Public catalog quiz."],
  ["2", "System checks eligibility", "Covered", "Assignment (or Public window), quiz IsActive, now within window, attempt quota, DeviceId, optional instructions ack."],
  ["3", "Student reads instructions", "Covered", "When Instructions are set, start requires InstructionsAcknowledged=true (API + student detail checkbox)."],
  ["4", "Student starts the quiz", "Covered", "POST .../attempts starts a new attempt or resumes an InProgress one."],
  ["5", "Attempt start time is recorded", "Covered", "QuizAttempt.StartedDate set on Begin."],
  ["6", "Questions are displayed", "Covered", "From the QuizAttemptQuestion snapshot in DisplayOrder (shuffled at start when enabled); content + marks frozen."],
  ["7", "Answers are saved automatically", "Covered", "Web: debounce + interval + visibility/pagehide autosave via draft endpoint; flush before submit/cancel. Mobile mirrors draft saves."],
  ["8", "Student moves between questions where permitted", "Covered", "Free: no order constraints. Sequential + Locked: web/mobile require current question answered before Next; server also enforces Sequential/Locked on draft/submit (Locked additionally blocks editing earlier answers after advancing)."],
  ["9", "Student may mark questions for review", "Covered", "IsMarkedForReview on draft/submit; navigator groups marked questions."],
  ["10", "Student submits manually", "Covered", "POST .../attempts/{id}/submit auto-scores then MarkSubmitted; resubmission blocked."],
  ["11", "System auto-submits when time expires", "Covered", "Client auto-submit with IsAutoSubmit=true → AutoSubmitted (83). Server rejects over-budget submits (grace for auto-submit)."],
  ["12", "The attempt status is updated", "Covered", "InProgress (81) → Submitted (82) or AutoSubmitted (83) → Reviewed (85) after finalize. Expired (84) via overdue job."],
  ["13", "Objective answers checked automatically", "Covered", "Single/TrueFalse first option; Multiple exact set; Fill accepted-answer rules."],
  ["14", "Descriptive answers go to AI or teacher review", "Covered", "Descriptive: AI suggestion on submit + teacher finalize when answered. File Upload (link/path) requires teacher review. Fill + AllowTeacherReview / AllowAiReview (OpenAI or heuristic)."],
  ["15", "Student sees the permitted review screen", "Covered", "Full results after submit (or after teacher review when IsReviewRequired). ReviewDisplayMode modes are retired."],
  ["16", "Parent/Teacher/AI finalize marks and feedback", "Covered", "Mark answers + finalize-review → attempt Reviewed, assignment IsReviewDone=true. AI suggests; teacher confirms when required."],
  ["17", "Student views own quiz history", "Covered", "/student/history (web) and Mobile /reports or Quizzes history; GET /reports/students/{id}/quiz-history scoped to own profileId (History self — not full analytics)."],
];

const timeManagementModes = [
  ["No time limit", "Covered", "Quiz.TimeLimitMinutes is optional/null. Attempt page shows no countdown; student may take as long as the assignment window allows."],
  ["Total quiz time limit", "Covered", "Stored as Quiz.TimeLimitMinutes. Create starts with null; recalculated as ceil(Σ EstimatedTimeSeconds / 60) when questions are added/updated/removed/attached. Metadata update preserves and refreshes that derived value (no manual field)."],
  ["Time limit per question", "Covered", "EstimatedTimeSeconds enforced at draft/submit: late answers ignored / capped; hard per-question timer in attempt UI."],
  ["Fixed availability window", "Covered", "QuizAssignment.StartDateTime / EndDateTime gate start, resume, and submit. Outside the window the attempt is blocked or Expired."],
];

const timeManagementAppBehaviors = [
  ["Show remaining time", "Covered", "Student attempt page countdown from TimeLimitMinutes × 60 minus elapsed since StartedDate."],
  ["Warn when time is low", "Covered", "At ≤5 min: dismissible banner. At ≤60s: urgent (red) countdown chip, modal dialog, and short alert (web beep; mobile system sound + haptic). Per-question timer turns amber at ≤10s. Autosave: 1.2s debounce + 15s interval + Save now (web + mobile)."],
  ["Auto-submit on expiry", "Covered", "Client submits with IsAutoSubmit=true → AutoSubmitted (83). Server enforces TimeLimitMinutes with grace for auto-submit path."],
  ["Save answers before auto-submission", "Covered", "Autosave flush runs before submit/auto-submit (web + mobile)."],
  ["Prevent reopening after expiry unless allowed", "Covered", "Assignment window expiry blocks/expires attempts. Allow Retry grants ExtraAttempts after review; does not reopen EndDateTime by itself."],
];

const timeManagementGaps = [];

const attemptRules = [
  "Student role only for start / draft / submit.",
  "Assignment required; quiz IsActive; now within [StartDateTime, EndDateTime].",
  "If an InProgress attempt exists → resume (no new attempt).",
  "New start blocked when ExistingAttemptCount ≥ AllowedAttempts.",
  "DeviceId required (non-empty).",
  "Time limit returned to client; UI countdown + auto-submit. Server enforces TimeLimitMinutes (with grace for IsAutoSubmit) and assignment EndDateTime.",
  "On start: create QuizAttempt and snapshot QuizAttemptQuestion rows (text, marks, options; shuffled order when ShuffleQuestions is on).",
  "Draft save: InProgress only; answers stored on QuizAttemptAnswer linked to QuizAttemptQuestion; last answer wins per question; IsMarkedForReview supported; NavigationMode + integrity thresholds enforced.",
  "Multiple-choice selections are stored as separate answer rows (QuestionOptionId), not only as free text.",
  "Submit scores then MarkSubmitted (Submitted or AutoSubmitted). Cannot resubmit.",
  "Subjective review finalizes to Reviewed; do not use Under Teacher/AI Review as attempt StatusId values.",
  "Offline: ClientSyncId + IsOfflineAttempt; POST .../attempts/{id}/sync replays queued draft/submit after reconnect. Start/resume: clients persist the InProgress attempt shell after an online start so students can reopen offline; new starts still require the network. On reconnect, clients re-hit POST .../attempts (resume) then flush the draft/submit queue.",
  "Anti-cheat: Device lock on all quiz types; all types block further drafts after FocusLoss≥5 or Paste≥3 (submit still allowed).",
];

const quizAttemptFields = [
  ["Id", "Primary key."],
  ["QuizId", "Quiz definition being attempted."],
  ["StudentId", "Student taking the attempt."],
  ["AttemptNumber", "1-based attempt ordinal for this student on this quiz (API name). Entity property AttemptNumber maps to DB column number_of_question_attempt (legacy name — not question count)."],
  ["StatusId", "QuizAttemptStatus: Started (80), InProgress (81), Submitted (82), AutoSubmitted (83), Expired (84), Reviewed (85). Start writes InProgress; overdue InProgress → Expired."],
  ["StartedDate", "When the attempt began / resumed."],
  ["SubmittedDate", "When submitted (or placeholder until submit)."],
  ["TimeSpentSeconds", "Elapsed time recorded on the attempt."],
  ["DeviceId", "Required non-empty device identifier. Web and mobile persist a stable per-install id (not a shared platform constant) so device lock separates browsers/devices for every quiz type."],
  ["IsOfflineAttempt", "True when the attempt was started/synced from an offline queue."],
  ["ClientSyncId", "Idempotency key for offline sync; unique per student when set."],
  ["FocusLossCount", "Anti-cheat telemetry: browser focus/visibility losses."],
  ["ClipboardPasteCount", "Anti-cheat telemetry: paste events into answers."],
  ["QuizReviewId", "Optional link to a quiz_reviews row when an attempt-level review record is used."],
  ["ObtainedMarks", "Scored / reviewed obtained marks."],
  ["Percentage", "Derived from obtained ÷ total marks."],
];

const quizAttemptQuestionFields = [
  ["Id", "Primary key."],
  ["QuizAttemptId", "Parent attempt."],
  ["QuestionId", "Bank question shown on this attempt."],
  ["DisplayOrder", "Exact order presented to the student (preserved even when ShuffleQuestions is on)."],
  ["Marks", "Frozen quiz-specific marks at attempt start — later QuizQuestion/bank mark edits do not change historical scoring."],
  ["QuestionText", "Frozen question stem at attempt start."],
  ["IsMarkedForReview", "Student mark-for-review flag."],
  ["TimeSpentSeconds", "Per-question elapsed time (capped by EstimatedTimeSeconds when hard timer rejects late answers)."],
  ["QuizReviewId", "Optional link to quiz_reviews for per-question teacher/parent/AI feedback."],
];

const attemptSnapshotReasons = [
  "Different students may receive different question orders (and later different subsets if random selection is added).",
  "The exact question order must be preserved for resume, submit, and review screens.",
  "Later edits to the quiz’s QuizQuestion list must not rewrite an old attempt’s presented set/order.",
  "Review screens must show the original attempt questions in the original order.",
  "Question marks and text/options are frozen on QuizAttemptQuestion / QuizAttemptQuestionOption at start.",
  "Answers are stored per attempt via QuizAttemptAnswer → QuizAttemptQuestion (option id and/or submitted text).",
];

const attemptStatusConflicts = [
  [
    "Under Teacher Review / Under AI Review as attempt Status",
    "Rejected for StatusId",
    "Teacher/AI review is modeled by quiz_reviews (+ assignment IsReviewDone) and attempt status Submitted → Reviewed. Do not add Under Teacher/AI Review as QuizAttemptStatus values.",
  ],
  [
    "Completed as attempt Status",
    "Use Submitted / Reviewed",
    "“Completed” is a student-list / result concept, not a QuizAttemptStatus lookup. After submit use Submitted (82) or AutoSubmitted (83); after finalize use Reviewed (85).",
  ],
  [
    "Full content freeze (question text/options)",
    "Covered today",
    "QuizAttemptQuestion stores QuestionId, DisplayOrder, Marks, QuestionText; options snapshotted on QuizAttemptQuestionOption. Historical review shows frozen content.",
  ],
];

const scoring = [
  ["Single Choice / TrueFalse", "First selected option; full marks if IsCorrect, else 0."],
  ["Multiple Choice", "Exact set match of correct option IDs → full marks; else 0."],
  ["Fill in the Blanks", "Match any accepted answer (case / partial / min-max length) OR correct option text (case-insensitive). If AllowTeacherReview → subjective for review masking. If AllowAiReview → OpenAI or heuristic suggestion."],
  ["Descriptive / free text", "Marks 0 on auto-score; always subjective when answered; AI suggestion written to QuizReview.AiReviewComment on submit; teacher finalize required."],
  ["File Upload", "MVP: student pastes a file URL/path into SubmittedText (no binary blob upload/storage). Marks 0 on auto-score; RequiresReview like Descriptive when answered."],
  ["Matching", "selectedOptionIds = right option ids in left order; exact sequence match awards full marks. Authoring UI edits pairs; storage remains lefts-then-rights (even count ≥4). Option shuffle disabled."],
  ["Ordering", "selectedOptionIds = option ids in correct order; exact sequence match awards full marks."],
  ["Media", "Scored like Single Choice. Each option requires OptionImageUrl (caption text optional); image snapped onto QuizAttemptQuestionOption."],
];

const reviewRules = [
  "Pending reviews: owned quizzes with IsReviewRequired, assignment not review-done, attempt Submitted/AutoSubmitted.",
  "RequiresReview per question: Descriptive OR File Upload OR (Fill + AllowTeacherReview + submitted text).",
  "Mark answers: awarded marks in [0, MaxMarks]; not if already finalized.",
  "Finalize: all RequiresReview questions with text must have human feedback; attempt → Reviewed; assignment.IsReviewDone = true.",
  "Score masking uses QuizReviewDisplay.Resolve on submit and get-result (Full when review is done / not required; hidden while IsReviewRequired and not IsReviewDone).",
  "ReviewDisplayMode modes are retired; create/update always persist Full. Bools never OR’d with type defaults.",
  "AI review: Descriptive always; Fill when AllowAiReview. OpenAI when configured, else heuristic. AI comment shown on teacher review screen; teacher still finalizes when required.",
];

const apiMap = [
  ["GET /api/quizzes", "Role-scoped list (Student assigned ∪ Public; Parent linked∪own; Teacher own∪Public; SchoolAdmin school; CampusAdmin campus; PortalAdmin all). Drafts: owner + PortalAdmin only."],
  ["POST /api/quizzes", "Create Draft + Pending (Teacher/Parent). Type defaults applied for nullables; explicit bools preserved."],
  ["PUT /api/quizzes/{id}", "Update metadata while editable (Draft/Published, no started assignment)."],
  ["DELETE /api/quizzes/{id}", "Hard-delete Draft with no assignments/attempts."],
  ["GET /api/quizzes/{id}/manage", "Owner manage view with questions (PortalAdmin may open any; drafts hidden from non-owner School/CampusAdmin)."],
  ["POST /api/quizzes/{id}/publish", "Teacher → Published+Pending; School/CampusAdmin → Published+SchoolApproved; Portal/Parent → Published+Approved."],
  ["POST /api/quizzes/{id}/approve", "School/Campus → SchoolApproved from Pending; Portal → Approved from Pending or SchoolApproved. Rejected blocked."],
  ["POST /api/quizzes/{id}/reject", "School/Campus/Portal reject Pending or SchoolApproved; reason required."],
  ["POST /api/quizzes/{id}/assign", "Create assignments (Upcoming if StartAt>now); lifecycle → Assigned. Modes include section/school/multi/public."],
  ["POST /api/quizzes/{id}/cancel", "Remove upcoming assignments; restore Assigned or Published."],
  ["POST /api/quizzes/{id}/archive", "No assignments → hard delete; else Archived + Inactive."],
  ["POST /api/quizzes/{id}/unarchive", "Restore Published or Assigned."],
  ["POST /api/quizzes/{id}/duplicate", "Deep-copy to new Draft + Pending."],
  ["POST .../assignments/{id}/allow-retry", "After review finalized; ExtraAttempts (+1 default)."],
  ["GET /api/questions/{id}/quizzes", "Question-manage: quizzes currently using this bank question (same CanView as question detail)."],
  ["GET/POST/PUT/DELETE .../questions*", "Inline create, attach bank, edit, remove; TimeLimitMinutes recalculated from EstimatedTimeSeconds."],
  ["POST .../attempts", "Student start/resume; instructions ack gate when Instructions set."],
  ["PUT .../attempts/{id}/draft", "Student save draft answers (+ mark-for-review / per-question time)."],
  ["POST .../attempts/{id}/submit", "Student submit + auto-score; IsAutoSubmit → AutoSubmitted; shared Full / review-pending mask."],
  ["POST .../attempts/{id}/sync", "Offline queue replay (ClientSyncId idempotency)."],
  ["GET .../attempts/{id}/result", "Student own or Parent linked child; same mask rule as submit."],
  ["GET .../monitoring", "Owner progress board (incl. integrity signals where available)."],
  ["GET/PUT .../review|answers + finalize-review", "Subjective marking and release."],
  ["GET /api/quizzes/pending-approval", "SchoolAdmin/CampusAdmin/PortalAdmin queue."],
  ["GET /api/notifications*", "In-app quiz notifications (bell); not admin-only."],
  ["GET /api/reports/*", "Summary, performance, rankings, student quiz history."],
];

const scenarios = [
  [
    "QZ-01",
    "Teacher create → publish → approve → assign",
    "Teacher creates a Practice quiz, adds questions, publishes; SchoolAdmin approves; Teacher assigns to selected students.",
    "Lifecycle Draft→Published→Assigned. Approval Pending→SchoolApproved→Approved. Students see the quiz only after assignment and within the window.",
  ],
  [
    "QZ-02",
    "Teacher cannot assign before final approval",
    "Teacher publishes then tries to assign without portal Approved (SchoolApproved alone is not enough).",
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
    "Forbidden. Editable only Draft/Published with no started assignment.",
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
    "Owner adds an inline question on a Draft quiz.",
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
    "Quiz IsReviewRequired with Fill(AllowTeacherReview) answers; student submits then reloads result.",
    "Objective items scored; submit and get-result both use QuizReviewDisplay.Resolve — Pending Review until finalize when IsReviewRequired.",
  ],
  [
    "QZ-10",
    "Finalize review releases results",
    "Teacher marks all RequiresReview items and finalizes.",
    "Attempt→Reviewed; IsReviewDone=true; student/parent see full scores/answers once review is done.",
  ],
  [
    "QZ-11",
    "Cancel upcoming only",
    "Owner cancels a quiz that has future and past assignments.",
    "Only StartDateTime > now removed; lifecycle restored to Assigned or Published; past assignments remain.",
  ],
  [
    "QZ-12",
    "Archive vs delete",
    "Owner archives a Draft quiz; owner deletes a Draft quiz with no assignments; owner archives a quiz that already has assignments.",
    "Archive of Draft fails (must delete). Delete of Draft succeeds. With assignments → soft Archived; with no assignments → hard delete.",
  ],
  [
    "QZ-13",
    "Duplicate",
    "Owner duplicates a quiz with questions.",
    "New Draft + Pending; questions reused/linked; title ends with \" (Copy)\".",
  ],
  [
    "QZ-14",
    "Parent child visibility",
    "Parent opens linked child's attempt result and quiz history.",
    "Allowed for linked children only. Unlinked student → forbidden.",
  ],
  [
    "QZ-15",
    "Two-tier approve and CampusAdmin",
    "SchoolAdmin school-approves Pending; CampusAdmin school-approves campus Pending; PortalAdmin final-approves SchoolApproved; Rejected cannot be approved.",
    "Pending → SchoolApproved → Approved. CampusAdmin queue is campus-scoped. Rejected stays Rejected until teacher resubmits to Pending.",
  ],
  [
    "QZ-16",
    "Student only sees permitted audience",
    "Student A is assigned (or Public catalog in window); Student B is neither assigned nor Public-eligible.",
    "Student A sees the quiz. Student B does not. School/section/multi assign must not open catalog (AudienceScope stays Assigned). Public catalog is window-filtered.",
  ],
  [
    "QZ-17",
    "Parent cannot assign outside linked children",
    "Parent tries to assign ParentPrivate quiz to an unrelated student or whole school.",
    "Rejected. Parent audience is limited to linked children / parent-owned child groups.",
  ],
  [
    "QZ-18",
    "Time limit countdown and auto-submit",
    "Student starts a quiz with TimeLimitMinutes set; waits until remaining time hits zero.",
    "Countdown is shown; client auto-submits with IsAutoSubmit → AutoSubmitted (83). Server enforces minute budget with grace.",
  ],
  [
    "QZ-19",
    "No time limit still respects availability window",
    "Student starts a quiz with TimeLimitMinutes null after EndDateTime has passed.",
    "No countdown UI, but start/submit is still rejected; overdue InProgress attempts transition to Expired (84).",
  ],
  [
    "QZ-20",
    "Upcoming assign then promote",
    "Teacher assigns with StartAt in the future; later StartAt arrives with no attempt.",
    "Assignment QuizResultStatus starts as Up Coming (25); ExpireOverdueUnattemptedAsync promotes to Not Attempted (24) when the window opens.",
  ],
  [
    "QZ-21",
    "Create defaults preserve bools",
    "Client creates a Practice quiz with ShuffleQuestions=false while type default is also false/true variants.",
    "ApplyCreateDefaults never OR’s bools with type defaults — explicit client bools win; only nullables (attempts/nav) fall back; TimeLimitMinutes stays null until questions; ReviewDisplayMode always Full.",
  ],
];

const checklist = [
  "Teacher create starts Draft + Pending; Parent create forces ParentPrivate.",
  "Teacher publish needs ≥1 question and leaves Approval=Pending; School/Campus publish → SchoolApproved; Portal/Parent publish → Approved.",
  "Teacher assign requires final Approval=Approved (SchoolApproved alone is not enough); Parent assign does not need school approval.",
  "Student sees assigned quizzes and Public catalog only; school/section/multi never set AudienceScope=Public.",
  "Supported audiences: one, selected, group, class (allInGrade), section, school, multi-school, public (PortalAdmin), parent child / allLinked.",
  "QuizAssignment is one row per student with AssignedById, optional StudentGroupId, window, AllowedAttempts, QuizResultStatus, IsReviewDone.",
  "QuizResultStatus is per student (Up Coming / Not Attempted / In Progress / Under Review / Expired / Completed) — student list prefers DB name over calculator.",
  "Assign with StartAt > now writes Up Coming; overdue job promotes Upcoming → Not Attempted and expires past-window rows / InProgress attempts.",
  "Editable only Draft/Published, not Archived, and no started assignment (Edit settings + /edit route gated).",
  "Draft visibility: owner + PortalAdmin only. SchoolAdmin sees school Published/Assigned/Archived (+ Public); CampusAdmin sees campus (+ Public).",
  "Bank attach requires Public + Active + Approved + ApprovedBy + class/subject match.",
  "Inline questions are Approved+Campus+Active and usable on that quiz only for bank eligibility rules.",
  "Descriptive (104), Matching (106), and Ordering (107) authoring enabled on web and mobile (bank + quiz inline). File Upload (105) and Media (108) are hidden on every create path; existing rows still work on attempts.",
  "Student attempts require assignment (or Public window), active quiz, window, DeviceId, attempt quota, and instructions ack when set.",
  "InProgress resumes; TimeLimitMinutes enforced client + server; AutoSubmitted on IsAutoSubmit.",
  "Time management: Σ EstimatedTimeSeconds → TimeLimitMinutes on question changes; per-question hard timer; assignment window; low-time banner (≤5m) + modal/audio at ≤60s (web + mobile).",
  "On attempt start, QuizAttemptQuestion freezes text/marks/options/order; answers store per attempt.",
  "Scoring: single/TF one correct; multi exact set; Fill accepted-answer rules.",
  "Shared Full / review-pending mask on submit and get-result until finalize when required.",
  "ApplyCreateDefaults: nullable fallbacks only; bools never OR’d.",
  "Allow-retry only after IsReviewDone; adds ExtraAttempts.",
  "Cancel removes only future assignments and restores Assigned or Published (never Cancelled lifecycle).",
  "Archive: no assignments → hard delete; has assignments → Archived + Inactive. Draft must be deleted.",
  "Duplicate creates Draft + Pending copy with questions.",
  "CampusAdmin may school-approve/reject campus Pending quizzes and list campus (+ Public) quizzes.",
  "SchoolAdmin/PortalAdmin may create quizzes; School/Campus publish → SchoolApproved; Portal publish → Approved.",
  "Rejected cannot be approved by anyone until teacher re-publish resets to Pending. Reject reason required.",
  "Teacher list API returns own quizzes (CreatedBy) ∪ Public; client mine toggle remains for admins.",
  "Fill answers hidden from students before submission (attempt payload).",
  "Quiz notifications (submit/auto-submit/etc.) via in-app bell.",
  "Offline sync via ClientSyncId + POST .../sync (web + mobile).",
  "RejectionReason is persisted and returned on manage detail + approval queue.",
  "Integrity draft lockout freezes further answer mutations on submit (score last saved draft).",
  "Reports available to Teacher (own), SchoolAdmin (school), PortalAdmin (all). Students get History self via /student/history (web) and /reports or Quizzes history (mobile) — not full summary/rankings/performance.",
];

const knownGaps = [
  "Matching MVP: pair-row authoring UI (web); mobile uses labeled L/R option slots. Storage is even option counts (lefts first, then rights). Option shuffle is disabled for Matching/Ordering.",
  "File Upload (105) and Media (108) remain hidden on every create path; attempts accept binary upload (wwwroot) or pasted URL in SubmittedText. Dedicated review download UX is not built yet.",
  "Practice post-submit teaching UX remains soft (type defaults only; no Practice-specific post-submit flow).",
  "Surprise PortalAdmin/AI-only authorship is future policy — teachers may still create Surprise quizzes today.",
  "Automated QZ-01–QZ-21 full-stack E2E (Playwright + test DB) is not built — workflow rules are covered by unit/scenario tests only.",
  "AI review uses OpenAI when configured; otherwise heuristic fallback (not a required OpenAI path).",
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
      <span class="chip">2 Aug 2026</span>
      <span class="chip">Teacher + Parent owners</span>
      <span class="chip">SchoolAdmin / CampusAdmin / PortalAdmin approval</span>
    </div>
  </header>

  <div class="ok"><strong>Canonical model:</strong> Quizzes are owned by <strong>Teacher</strong> or <strong>Parent</strong>. Teachers create school quizzes that publish into a two-tier approval gate: <strong>SchoolAdmin/CampusAdmin → SchoolApproved</strong>, then <strong>PortalAdmin → Approved</strong> before assign. Parents create <strong>ParentPrivate</strong> quizzes that auto-approve on publish. Students take attempts via assignment rows and/or <strong>Public</strong> catalog quizzes. Subjective answers can require teacher/parent review before scores are released.</div>

  <div class="note"><strong>Clean two-dimension model:</strong> a quiz has exactly two stored statuses — <strong>Lifecycle</strong> (Draft 60 → Published 61 → Assigned 62 → Archived 63) and <strong>Approval</strong> (Pending 40 → SchoolApproved 41 → Approved 42 / Rejected 43). Per-student progress is never stored on the quiz row; it lives on attempts (InProgress 81 / Submitted 82 / AutoSubmitted 83 / Expired 84 / Reviewed 85) and assignment QuizResultStatus (20–25). The initializer remaps legacy approval/lifecycle IDs and deactivates retired rows (approval 44–46; lifecycle 64–66).</div>
  <div class="note"><strong>Terminology:</strong> lifecycle <strong>Draft (60)</strong> is the initial editable state (legacy DB name “Not Assigned” is renamed by the initializer). Approval <strong>Pending (40)</strong> is the school gate — not a lifecycle Draft.</div>

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
  <div class="note"><strong>Editable window:</strong> metadata and questions may change only while lifecycle is <strong>Draft</strong> or <strong>Published</strong>, the quiz is not Archived, and no assignment has started (StartDateTime ≤ now or any attempt exists). Assigned / Archived are not editable.</div>

  <h2>6. Role permissions</h2>
  ${htmlTable(
    ["Action", "PortalAdmin", "SchoolAdmin", "CampusAdmin", "Teacher", "Parent", "Student"],
    permissions,
  )}
  <p><em>*CampusAdmin:</em> may list campus quizzes (+ Public), school-approve/reject Pending quizzes in campus, and view the pending queue. Full create/manage/assign remains Teacher/SchoolAdmin/PortalAdmin/Parent.</p>
  <p><em>*Admin create:</em> SchoolAdmin/PortalAdmin may create quizzes (PortalAdmin school/campus optional; SchoolAdmin campus optional). School/Campus publish → SchoolApproved; Portal publish → Approved.</p>
  <div class="note"><strong>Ownership / scope:</strong> Teacher and Parent manage actions require owning the quiz (<code>CreatedBy</code> = user id). <strong>Draft</strong> is visible only to owner + PortalAdmin. SchoolAdmin sees school-wide Published/Assigned/Archived (+ Public); CampusAdmin sees own campus (+ Public). PortalAdmin sees all.</div>

  <h2>7. Questions on a quiz</h2>
  ${htmlTable(["Topic", "Rule"], questionRules)}
  <h3>Important business rules</h3>
  ${htmlTable(["Rule", "Covered", "Detail"], importantBusinessRules)}
  <h3>QuizQuestion link fields</h3>
  ${htmlTable(["Field", "Meaning"], quizQuestionFields)}
  <h3>Type validation</h3>
  ${htmlList([
    "Single Choice: ≥2 options; exactly 1 correct.",
    "Multiple Choice: ≥2 options; ≥1 correct.",
    "True/False: exactly True and False; exactly 1 correct.",
    "Fill in the Blanks: ≥1 accepted answer with optional AllowAiReview / AllowTeacherReview (inline authoring uses the same accepted-answer editor as the bank; legacy option-text payloads still convert with flags off).",
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
    "Prerequisites: Published or Assigned; not Archived; ≥1 question; Teacher quizzes final Approved.",
    "EndAt > StartAt; AllowedAttempts > 0.",
    "Existing (quiz, student) assignment → skip; if all skipped → validation error.",
    "Cancel: hard-delete future assignments only; restore lifecycle Assigned or Published (never Cancelled).",
    "Allow retry: review must be finalized; attempt count ≥ allowed; ExtraAttempts += 1 (default); IsReviewDone=false. Archived blocked.",
  ])}
  <h3>QuizAssignment table</h3>
  <p>Each assignment grants one student access to one quiz within a window and attempt limit. Group/class audiences expand into many rows.</p>
  ${htmlTable(["Field", "Meaning"], quizAssignmentFields)}
  <h3>Quiz Result Status meanings (per assignment)</h3>
  ${htmlTable(["Status", "Meaning"], assignmentResultMeanings)}
  <h3>Assignment corrections vs older drafts</h3>
  ${htmlTable(["Older draft idea", "Canonical rule", "Why"], assignmentStatusConflicts)}
  <div class="note"><strong>Status progression:</strong> assign writes Up Coming (25) when StartAt &gt; now, else Not Attempted (24). Start → In Progress (23). Submit → Under Review (22) or Completed (21). ExpireOverdueUnattemptedAsync promotes Upcoming → Not Attempted, expires past-window unattempted rows, and marks overdue InProgress attempts Expired (84). Student list prefers the stored QuizResultStatusName over a client calculator.</div>

  <h2>9. Student attempt flow</h2>
  <h3>Step-by-step student journey</h3>
  <p>Status legend: <strong>Covered</strong> = implemented today; <strong>Partial</strong> = implemented with limitations; <strong>Planned</strong> = documented intent, not built yet.</p>
  ${htmlTable(["#", "Step", "Status", "Detail"], studentAttemptFlow)}
  <h3>Attempt rules</h3>
  ${htmlList(attemptRules)}
  <h3>QuizAttempt table</h3>
  <p>One row per student run. When questions are shuffled/randomized, the attempt owns the exact set/order shown via <code>QuizAttemptQuestion</code>.</p>
  ${htmlTable(["Field", "Meaning"], quizAttemptFields)}
  <h3>QuizAttemptQuestion (attempt-specific questions)</h3>
  <p>If questions are shuffled/randomized, save the exact questions shown to each student on the attempt.</p>
  ${htmlTable(["Field", "Meaning"], quizAttemptQuestionFields)}
  ${htmlList(attemptSnapshotReasons)}
  <h3>Status / snapshot corrections vs older drafts</h3>
  ${htmlTable(["Older draft idea", "Canonical rule", "Why"], attemptStatusConflicts)}
  <h3>Auto-scoring</h3>
  ${htmlTable(["Type", "Rule"], scoring)}

  <h2>10. Time Management</h2>
  <p>Status legend: <strong>Covered</strong> = implemented today; <strong>Partial</strong> = implemented with limitations; <strong>Gap</strong> = documented business intent, not built yet.</p>
  <h3>Quiz may have</h3>
  ${htmlTable(["Mode", "Status", "Detail"], timeManagementModes)}
  <h3>The app should</h3>
  ${htmlTable(["Behavior", "Status", "Detail"], timeManagementAppBehaviors)}
  <h3>Known time-management gaps</h3>
  ${htmlList(timeManagementGaps)}
  <div class="note"><strong>Hard clocks:</strong> assignment availability (<code>StartDateTime</code>–<code>EndDateTime</code>) and quiz minute budget (<code>TimeLimitMinutes</code>) are both server-enforced on submit (auto-submit gets a short grace). Per-question <code>EstimatedTimeSeconds</code> caps late answers.</div>

  <h2>11. Review and results release</h2>
  ${htmlList(reviewRules)}

  <h2>12. Parent and student visibility</h2>
  ${htmlList([
    "Parent list = assignments of linked children ∪ quizzes they created.",
    "Parent may review/finalize only their own quizzes; may view linked-child results and quiz history.",
    "Student sees assigned quizzes plus Public catalog (AudienceScope=Public and within audience window). School/section/multi assign stay Assigned — see §8.",
    "Results masked while review is pending (IsReviewRequired and not done); otherwise Full.",
    "Rankings / performance / summary: Teacher (own), SchoolAdmin (school), PortalAdmin (all) — not students/parents.",
  ])}

  <h2>13. Validation and limits</h2>
  ${htmlList([
    "Title required; DB max 100. Duplicate truncates to 92 + \" (Copy)\".",
    "Description DB max 500 (not required empty-check in app).",
    "Instructions required; DB max 1000. Non-empty instructions require InstructionsAcknowledged on start.",
    "Class / Subject / Topic / Difficulty required on create (UI); difficulty Easy/Medium/Hard (2001–2003).",
    "TimeLimitMinutes optional; derived from Σ EstimatedTimeSeconds on question changes (no manual create/edit field); server-enforced on submit.",
    "Quiz AllowedAttempts optional on metadata; assignment AllowedAttempts must be > 0.",
    "Question marks > 0; publish/assign/duplicate need ≥1 question; no hard max count.",
    "Submitted text DB max 1000.",
    "ApplyCreateDefaults: AllowedAttempts / navigation nullables fall back to type defaults; ReviewDisplayMode always Full; TimeLimitMinutes stays null until questions recalculate totals; ShuffleQuestions / ShuffleOptions / IsReviewRequired from client are never OR’d with defaults.",
  ])}

  <h2>14. API transition map</h2>
  ${htmlTable(["Endpoint", "Business effect"], apiMap)}

  <h2>15. UI routes</h2>
  ${htmlList([
    "/quizzes — Teacher/Parent list, New, Assignments, Pending reviews.",
    "/quizzes/new, /quizzes/:id/edit — create/update form.",
    "/quizzes/:id — manage: add Q / publish / delete (Draft); assign / duplicate / archive / unarchive / cancel / retry / monitor (Published/Assigned).",
    "/quizzes/:id/monitoring — progress board.",
    "/quizzes/assignments — cross-quiz assignment board.",
    "/quizzes/reviews/pending and review workspace — mark + finalize.",
    "/admin/quiz-approvals — SchoolAdmin/PortalAdmin only (CampusAdmin blocked in UI + API).",
    "/student/quizzes* — detail, attempt (timer auto-submit), result.",
    "/student/history — student self quiz history (Reports API; History self only — not full analytics).",
    "/parent/quiz-dashboard, children history/result — parent flows.",
    "/reports — Teacher / SchoolAdmin / PortalAdmin analytics.",
    "Mobile /quizzes (Teacher/Parent) — create, manage (inline types matching web Now list + Public+Active bank attach), publish, assign (role modes: section/grade/group/school/multi/public), duplicate/archive/cancel/allow-retry, pending reviews, mark + finalize.",
    "Mobile /quizzes/approvals — SchoolAdmin/PortalAdmin pending quiz approvals.",
    "Mobile /quizzes/monitoring/:quizId — assignment progress board.",
    "Mobile /reports (Student) + Quizzes history — GET /reports/students/{id}/quiz-history (History self).",
  ])}

  <h2>16. QA scenarios</h2>
  ${scenarios
    .map(
      ([id, title, steps, expected]) =>
        `<div class="scenario"><strong>${escapeHtml(id)} — ${escapeHtml(title)}</strong><p><b>Steps:</b> ${escapeHtml(steps)}</p><p><b>Expected:</b> ${escapeHtml(expected)}</p></div>`,
    )
    .join("")}

  <h2>17. Verification checklist</h2>
  ${htmlList(checklist.map((item) => `☐ ${item}`))}

  <h2>18. Known gaps, stubs, and optional work</h2>
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
  docParagraph("Current implemented rules · 2 Aug 2026", {
    run: { italics: true, color: "475569" },
  }),
  docParagraph(
    "Canonical model: Quizzes are owned by Teacher or Parent. Teachers publish into a two-tier approval gate (SchoolAdmin/CampusAdmin → SchoolApproved, PortalAdmin → Approved) before assign. Parents create ParentPrivate quizzes that auto-approve on publish. Students take attempts via assignment rows and/or Public catalog quizzes. Subjective answers can require teacher/parent review before scores are released.",
    { run: { bold: true, color: "166534" } },
  ),
  docParagraph(
    "Clean two-dimension model: Lifecycle (Draft 60 → Published 61 → Assigned 62 → Archived 63) and Approval (Pending 40 → SchoolApproved 41 → Approved 42 / Rejected 43). Per-student progress lives on attempts (81/82/85), never on the quiz row. Initializer remaps legacy IDs and deactivates retired rows (approval 44–46; lifecycle 64–66).",
    { run: { bold: true, color: "92400E" } },
  ),
  docParagraph(
    "Terminology: lifecycle Draft (60) is the initial editable state. Approval Pending (40) is the school gate — not a lifecycle Draft.",
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
    "Editable only while Draft or Published, not Archived, and no started assignment.",
    { run: { bold: true, color: "92400E" } },
  ),

  docHeading("6. Role permissions"),
  docTable(
    ["Action", "PortalAdmin", "SchoolAdmin", "CampusAdmin", "Teacher", "Parent", "Student"],
    permissions,
  ),
  docParagraph(
    "CampusAdmin may school-approve/reject campus Pending quizzes and list campus (+ Public). Drafts: owner + PortalAdmin only. SchoolAdmin = school scope; PortalAdmin = platform.",
    { run: { bold: true, color: "92400E" } },
  ),

  docHeading("7. Questions on a quiz"),
  docTable(["Topic", "Rule"], questionRules),
  docHeading("Important business rules", HeadingLevel.HEADING_2),
  docTable(["Rule", "Covered", "Detail"], importantBusinessRules),
  docHeading("QuizQuestion link fields", HeadingLevel.HEADING_2),
  docTable(["Field", "Meaning"], quizQuestionFields),
  ...[
    "Single Choice: ≥2 options; exactly 1 correct.",
    "Multiple Choice: ≥2 options; ≥1 correct.",
    "True/False: exactly 2 options; exactly 1 correct.",
    "Fill: ≥1 accepted answer (AllowAiReview / AllowTeacherReview configurable); Descriptive: free text (no options).",
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
    "Published/Assigned; not Archived; ≥1 question; Teacher final Approved.",
    "EndAt > StartAt; AllowedAttempts > 0.",
    "Cancel removes future assignments only; restore Assigned or Published.",
    "Allow-retry after finalize adds ExtraAttempts.",
  ].map(docBullet),
  docHeading("QuizAssignment table", HeadingLevel.HEADING_2),
  docParagraph(
    "Each assignment grants one student access to one quiz within a window and attempt limit. Group/class audiences expand into many rows.",
  ),
  docTable(["Field", "Meaning"], quizAssignmentFields),
  docHeading("Quiz Result Status meanings (per assignment)", HeadingLevel.HEADING_2),
  docTable(["Status", "Meaning"], assignmentResultMeanings),
  docHeading("Assignment corrections vs older drafts", HeadingLevel.HEADING_2),
  docTable(["Older draft idea", "Canonical rule", "Why"], assignmentStatusConflicts),
  docParagraph(
    "Status progression: assign writes Up Coming when StartAt > now else Not Attempted; start → In Progress; submit → Under Review or Completed; ExpireOverdue promotes Upcoming and expires past-window / overdue InProgress. Student list prefers stored QuizResultStatusName.",
    { run: { bold: true, color: "92400E" } },
  ),

  docHeading("9. Student attempt flow"),
  docHeading("Step-by-step student journey", HeadingLevel.HEADING_2),
  docParagraph(
    "Status legend: Covered = implemented today; Partial = implemented with limitations; Planned = documented intent, not built yet.",
  ),
  docTable(["#", "Step", "Status", "Detail"], studentAttemptFlow),
  docHeading("Attempt rules", HeadingLevel.HEADING_2),
  ...attemptRules.map(docBullet),
  docHeading("QuizAttempt table", HeadingLevel.HEADING_2),
  docParagraph(
    "One row per student run. When questions are shuffled/randomized, the attempt owns the exact set/order shown via QuizAttemptQuestion.",
  ),
  docTable(["Field", "Meaning"], quizAttemptFields),
  docHeading("QuizAttemptQuestion (attempt-specific questions)", HeadingLevel.HEADING_2),
  docParagraph(
    "If questions are shuffled/randomized, save the exact questions shown to each student on the attempt.",
  ),
  docTable(["Field", "Meaning"], quizAttemptQuestionFields),
  ...attemptSnapshotReasons.map(docBullet),
  docHeading("Status / snapshot corrections vs older drafts", HeadingLevel.HEADING_2),
  docTable(["Older draft idea", "Canonical rule", "Why"], attemptStatusConflicts),
  docHeading("Auto-scoring", HeadingLevel.HEADING_2),
  docTable(["Type", "Rule"], scoring),

  docHeading("10. Time Management"),
  docParagraph(
    "Status legend: Covered = implemented today; Partial = implemented with limitations; Gap = documented business intent, not built yet.",
  ),
  docHeading("Quiz may have", HeadingLevel.HEADING_2),
  docTable(["Mode", "Status", "Detail"], timeManagementModes),
  docHeading("The app should", HeadingLevel.HEADING_2),
  docTable(["Behavior", "Status", "Detail"], timeManagementAppBehaviors),
  docHeading("Known time-management gaps", HeadingLevel.HEADING_2),
  ...timeManagementGaps.map(docBullet),
  docParagraph(
    "Hard clocks: assignment StartDateTime–EndDateTime and TimeLimitMinutes are server-enforced on submit (auto-submit grace). Per-question EstimatedTimeSeconds caps late answers.",
    { run: { bold: true, color: "92400E" } },
  ),

  docHeading("11. Review and results release"),
  ...reviewRules.map(docBullet),

  docHeading("12. Parent and student visibility"),
  ...[
    "Parent list = linked-child assignments ∪ own quizzes.",
    "Student sees assigned quizzes plus Public catalog only (school/section/multi stay Assigned).",
    "Results masked while review is pending; otherwise Full.",
    "Reports: Teacher own / SchoolAdmin school / PortalAdmin all.",
  ].map(docBullet),

  docHeading("13. Validation and limits"),
  ...[
    "Title required (max 100); instructions required (max 1000); non-empty instructions require ack on start.",
    "Difficulty Easy/Medium/Hard (2001–2003).",
    "TimeLimitMinutes optional; derived from Σ EstimatedTimeSeconds on question changes (no manual create/edit field); server-enforced.",
    "ApplyCreateDefaults preserves explicit bools; AllowedAttempts/navigation/review nullables use type defaults; TimeLimitMinutes stays null until questions are added.",
    "Publish/assign/duplicate need ≥1 question.",
  ].map(docBullet),

  docHeading("14. API transition map"),
  docTable(["Endpoint", "Business effect"], apiMap),

  docHeading("15. UI routes"),
  ...[
    "/quizzes manage routes for Teacher/Parent.",
    "/admin/quiz-approvals for SchoolAdmin/PortalAdmin.",
    "/student/quizzes* for attempts and results.",
    "/student/history for student self quiz history (History self).",
    "/parent/quiz-dashboard and child history/result.",
    "/reports for Teacher/SchoolAdmin/PortalAdmin analytics.",
    "Mobile /quizzes (Teacher/Parent): create, manage (inline types matching web Now list + Public+Active bank attach), publish, role-scoped assign modes, duplicate/archive/cancel/allow-retry, pending reviews, mark + finalize.",
    "Mobile /quizzes/approvals and /quizzes/monitoring/:quizId for admin approval and monitoring.",
    "Mobile /reports (Student) + Quizzes history: student self quiz history.",
  ].map(docBullet),

  docHeading("16. QA scenarios"),
  ...scenarios.flatMap(([id, title, steps, expected]) => [
    docHeading(`${id} — ${title}`, HeadingLevel.HEADING_2),
    docParagraph(`Steps: ${steps}`),
    docParagraph(`Expected: ${expected}`, { run: { bold: true, color: "166534" } }),
  ]),

  docHeading("17. Verification checklist"),
  ...checklist.map((item) => docBullet(`☐ ${item}`)),

  docHeading("18. Known gaps, stubs, and optional work"),
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
