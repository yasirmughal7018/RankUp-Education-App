/**
 * Rebuilds the Questions Business & QA Guide from current application rules.
 * Outputs:
 *   - docs/04_RankUp_Questions_Business_QA.html
 *   - docs/04_RankUp_Questions_Business_QA.docx
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

const statuses = [
  [
    "110",
    "Draft",
    "Always Inactive",
    "Legacy only (ID 110 still exists). Create and import never write Draft. Existing Draft rows stay Draft on read — they are not auto-migrated or remapped to PendingReview. Owners may still edit/delete them; the web UI treats Draft like Pending for filters. Activity is never Active.",
  ],
  [
    "111",
    "PendingReview",
    "Always Inactive",
    "Waiting for approval. Visibility=None, IsActive=false. Visible only to the creator and that creator's CampusAdmin, SchoolAdmin, and PortalAdmin. Owner may edit/delete; an eligible higher-tier admin may approve or reject.",
  ],
  [
    "112",
    "Approved",
    "Active when Public (bank), or Campus+Active if created inline on a quiz",
    "Accepted into the bank. PortalAdmin approval publishes it: Visibility=Public, IsActive=true, attachable from the bank picker. A CampusAdmin/SchoolAdmin bank endorsement: Visibility=Campus/School but IsActive=false; not bank-quiz-usable until PortalAdmin publishes. Exception: a question created inline on a quiz is MarkFullyApproved with Visibility=Campus and IsActive=true — it skips PendingReview and is usable on that quiz only, not via eligibleForQuizOnly.",
  ],
  [
    "113",
    "Rejected",
    "Always Inactive",
    "Rejected with a required reason by an eligible higher-tier approver. Visibility=None. Owner may edit, explicitly resubmit, or delete. Activity is always Inactive.",
  ],
  [
    "114",
    "Archived",
    "Always Inactive",
    "Retired by PortalAdmin and hidden from normal bank/quiz use. Activity is always Inactive.",
  ],
];

const lifecycle = [
  [
    "Create / import by Teacher, Coordinator, Tutor, Parent, CampusAdmin, SchoolAdmin",
    "PendingReview",
    "IsActive=false; Visibility=None; owner and organisation stamped from creator. Audience = creator + creator's CampusAdmin + creator's SchoolAdmin + PortalAdmin.",
  ],
  [
    "Create / import by PortalAdmin",
    "Approved",
    "Auto-published: Visibility=Public; IsActive=true; quiz-usable from the bank. No separate approval step.",
  ],
  [
    "Inline create on a quiz",
    "Approved (Campus + Active)",
    "POST /api/quizzes/{id}/questions. Skips bank PendingReview. MarkFullyApproved with Visibility=Campus and IsActive=true. Trail: Created + Endorsed. Usable on that quiz; not returned by eligibleForQuizOnly (not Public). Removing it from the quiz deactivates the bank row if the caller created it.",
  ],
  [
    "Endorse by CampusAdmin",
    "Approved (endorsed, not published)",
    "A Teacher/Coordinator/Tutor/Parent question in the same campus only. Visibility=Campus; IsActive=false; audience stays restricted; not quiz-usable; still needs PortalAdmin to publish.",
  ],
  [
    "Endorse by SchoolAdmin",
    "Approved (endorsed, not published)",
    "A Teacher/Coordinator/Tutor/Parent/CampusAdmin question in the same school. Visibility=School; IsActive=false; audience stays restricted; not quiz-usable; still needs PortalAdmin to publish.",
  ],
  [
    "Publish by PortalAdmin",
    "Approved (published)",
    "Visibility=Public; IsActive=true; attachable from the bank picker by quiz-managing roles (Teacher, Coordinator, Tutor, Parent, SchoolAdmin, PortalAdmin — not CampusAdmin). Only PortalAdmin can publish.",
  ],
  [
    "Reject by eligible approver",
    "Rejected",
    "Reason required (UI minimum 10 characters); IsActive=false; endorsement and visibility cleared.",
  ],
  [
    "Owner resubmits Rejected",
    "PendingReview",
    "Explicit Submit for review action; endorsement and visibility stay cleared.",
  ],
  [
    "Owner / PortalAdmin edits content",
    "Unchanged, or PendingReview after a granted Active edit",
    "Owners may edit while PendingReview or Rejected; PortalAdmin may edit any in place. Active questions are PortalAdmin-only to PUT. Other roles who can view send an edit request (reason min 10 chars); after PortalAdmin approves, the requester gets one grant. Using it records Modified + SubmittedForReview and returns the question to PendingReview (inactive) until it is published again.",
  ],
  [
    "PortalAdmin deactivate / activate",
    "Approved (unchanged)",
    "Applies to a Published (Public) bank question. Deactivate sets IsActive=false (UI Activity=Inactive); activate sets IsActive=true. Bank-endorsed (Campus/School, IsActive=false), PendingReview, Rejected, and Archived cannot be activated this way. Inline quiz questions (Campus + Active) are not Public, so this bank activate/deactivate path does not apply to them.",
  ],
  [
    "PortalAdmin archive",
    "Archived",
    "IsActive=false; removed from normal bank/quiz use. Visibility and ApprovedBy are preserved for Unarchive.",
  ],
  [
    "PortalAdmin unarchive",
    "Approved or PendingReview",
    "Restores an Archived question. Public → Approved + Active; Campus/School → Approved + Inactive; None → PendingReview + Inactive.",
  ],
];

const permissions = [
  ["Browse/manage bank", "Yes", "Yes", "Yes", "Yes", "Yes", "Yes", "Yes", "No"],
  ["Create", "Yes", "Yes", "Yes", "Yes", "Yes", "Yes", "Yes", "No"],
  [
    "Edit/delete own PendingReview or Rejected",
    "Any",
    "Own",
    "Own",
    "Own",
    "Own",
    "Own",
    "Own",
    "No",
  ],
  ["Edit/delete Approved or endorsed", "Any", "No", "No", "No", "No", "No", "No", "No"],
  [
    "Approve a Teacher / Coordinator / Tutor / Parent question",
    "Publish → Public",
    "Endorse (own school)",
    "Endorse (own campus)",
    "No",
    "No",
    "No",
    "No",
    "No",
  ],
  [
    "Approve a CampusAdmin question",
    "Publish → Public",
    "Endorse (own school)",
    "No (self / peer)",
    "No",
    "No",
    "No",
    "No",
    "No",
  ],
  [
    "Approve a SchoolAdmin question",
    "Publish → Public",
    "No",
    "No",
    "No",
    "No",
    "No",
    "No",
    "No",
  ],
  ["Publish (Public + Active)", "Yes", "No", "No", "No", "No", "No", "No", "No"],
  [
    "Manage quizzes / attach published bank questions / inline quiz create",
    "Yes",
    "Yes",
    "No",
    "Yes",
    "Yes",
    "Yes",
    "Yes",
    "No",
  ],
  ["Activate / deactivate / archive / unarchive", "Yes", "No", "No", "No", "No", "No", "No", "No"],
  [
    "View Approval history on detail",
    "Yes",
    "Yes (visible questions)",
    "Yes (visible questions)",
    "Yes (own + Public)",
    "Yes (own + Public)",
    "Yes (own + Public)",
    "Yes (own + Public)",
    "No",
  ],
];

const questionTypes = [
  ["100", "Single Choice", "Now", "At least 2 options; exactly 1 correct."],
  ["101", "Multiple Choice", "Now", "At least 2 options; at least 1 correct."],
  ["102", "True/False", "Now", "Exactly True and False; exactly 1 correct."],
  [
    "103",
    "Fill in the Blanks",
    "Now",
    "At least 1 accepted answer; accepted answers hidden before attempt submission.",
  ],
  [
    "104",
    "Descriptive",
    "Now",
    "Open text; no options required. Teacher/AI review on quiz attempts (see Quizzes QA).",
  ],
  [
    "105",
    "File Upload",
    "Hidden for now",
    "Not offered on web create, Mobile create, quiz inline, Excel import, or API create. Existing rows remain valid (update/attempt). Student pastes a file URL/path into SubmittedText — no binary blob upload/storage yet. No options required. Re-enable later.",
  ],
  [
    "106",
    "Matching",
    "Now",
    "Even option count (≥4); lefts first, then matching rights. Authoring uses pair rows (left ↔ right). Option shuffle disabled.",
  ],
  [
    "107",
    "Ordering",
    "Now",
    "At least 2 ordered items (top to bottom). Option shuffle disabled.",
  ],
  [
    "108",
    "Media",
    "Hidden for now",
    "Not offered on web create, Mobile create, quiz inline, Excel import, or API create. Existing rows remain valid (update/attempt). At least 2 options; each needs an image URL; exactly 1 correct. Re-enable later.",
  ],
];

const apiTransitions = [
  ["GET /api/questions", "Bank list. Query: isActive, subjectId, classId, pendingApprovalOnly, eligibleForQuizOnly. PortalAdmin: all. Others: own + Public + restricted non-Public for Campus/School admins (same creator-role lists as CanView). eligibleForQuizOnly = Public + Active + ApprovedBy."],
  ["GET /api/questions/pending-approval", "Approver queue: PendingReview, not own, org + creator-tier (CampusAdmin campus; SchoolAdmin school; PortalAdmin all). Same creator-role lists as list/GetById. Web Pending tile (Campus/School/Portal Admin) and Mobile both call this endpoint; Teachers still see own pending from GET /questions."],
  ["GET /api/questions/import-template", "Downloads rankup-questions-import-template.xlsx (no auth role beyond question-manage)."],
  ["GET /api/questions/{id}", "Detail with options/answers, creator/approver names, ApprovalHistory trail, and edit-request state (myEditRequest, hasApprovedEditGrant, pendingEditRequests for PortalAdmin). Forbidden if CanView is false."],
  ["GET /api/questions/{id}/quizzes", "Quizzes currently using this question (title, lifecycle, approval, marks, order). Same CanView as GetById. Soft-deleted quizzes omitted. Web: Used in quizzes on the question detail page."],
  ["POST /api/questions", "Create as PendingReview (PortalAdmin: auto-published). No submitForReview flag — create cannot save Draft. Trail: Created + Submitted/Published. Rejected items use POST /api/questions/{id}/submit."],
  ["POST /api/questions/import", "Same create path as POST /api/questions (max 200 rows, 10 MB): PendingReview for non–PortalAdmin; PortalAdmin auto-publishes each valid row; dryRun=true validates only; trail per created row"],
  ["PUT /api/questions/{id}", "Update content; trail: Modified. Rejected remains Rejected. Active: PortalAdmin in place; others need an unused grant — consuming it unpublishes to PendingReview (Modified + SubmittedForReview)."],
  ["POST /api/questions/{id}/edit-requests", "Non–PortalAdmin who can view an Active question sends a reason (min 10 chars). Queues PortalAdmin rows in app_approval (entity_type QuestionEditRequest = 2105)."],
  ["GET /api/questions/edit-requests", "PortalAdmin pending edit-request queue."],
  ["POST /api/questions/edit-requests/{id}/approve", "PortalAdmin grants a one-time edit to the requester."],
  ["POST /api/questions/edit-requests/{id}/reject", "PortalAdmin rejects with reason (min 10 chars)."],
  ["POST /api/questions/{id}/submit", "Rejected → PendingReview; trail: SubmittedForReview"],
  ["POST /api/questions/{id}/approve", "PendingReview → Approved + scoped visibility; PortalAdmin may also publish endorsed non-Public; trail: Endorsed or Published"],
  ["POST /api/questions/{id}/reject", "PendingReview → Rejected + reason (min 10 chars); trail: Rejected + reason"],
  ["POST /api/questions/{id}/activate", "Approved (Public): IsActive=true; trail: Activated"],
  ["POST /api/questions/{id}/deactivate", "Approved (Public): IsActive=false; trail: Deactivated"],
  ["POST /api/questions/{id}/archive", "→ Archived; IsActive=false; trail: Archived"],
  ["POST /api/questions/{id}/unarchive", "Archived → Approved/PendingReview (Public also Active); trail: Unarchived"],
  ["DELETE /api/questions/{id}", "Delete if permitted and not quiz-linked; application code removes that question's app_approval trail rows (no DB FK — request_id is polymorphic)"],
  ["GET /api/quizzes/{quizId}/questions", "Quiz-manage only (not CampusAdmin). Lists questions on the quiz."],
  ["POST /api/quizzes/{quizId}/questions", "Quiz-manage only (not CampusAdmin). Inline create: Campus + Active, skips bank PendingReview; usable on that quiz only (not eligibleForQuizOnly). Trail: Created + Endorsed."],
  ["POST /api/quizzes/{quizId}/questions/from-bank", "Quiz-manage only (not CampusAdmin). Attach a Public + Active + Approved bank question; quiz subject must match."],
  ["PUT /api/quizzes/{quizId}/questions/{questionId}", "Quiz-manage only. Updates inline question content when the caller created it; trail: Modified."],
  ["DELETE /api/quizzes/{quizId}/questions/{questionId}", "Quiz-manage only. Unlinks from the quiz; if the caller created the question, the bank row is deactivated."],
];

const trailEvents = [
  ["Created", "Question authored (bank create, import row, inline quiz create, quiz duplicate)", "Creator (any question-managing role)"],
  ["SubmittedForReview", "Sent (or resent) into the pending queue", "Creator; PortalAdmin may resubmit any"],
  ["Endorsed", "Approved with Campus/School visibility — recorded, still Inactive", "CampusAdmin / SchoolAdmin"],
  ["Published", "Approved as Public + Active + quiz-usable (incl. PortalAdmin auto-publish on create)", "PortalAdmin"],
  ["Rejected", "Refused with the stored reason shown in the trail", "Eligible higher-tier approver"],
  ["Modified", "Content/options/answers edited (bank edit, granted Active edit, or inline quiz edit)", "Owner, PortalAdmin, or the user with an unused edit grant"],
  ["Activated / Deactivated", "Published question switched on/off for quiz use", "PortalAdmin"],
  ["Archived / Unarchived", "Retired from the bank / restored to prior state", "PortalAdmin"],
];

const scenarios = [
  [
    "Q-01",
    "Create starts pending",
    "Create as Teacher/Coordinator/Tutor/Parent/CampusAdmin/SchoolAdmin.",
    "Status=PendingReview, IsActive=false, Visibility=None; audience = creator + creator's CampusAdmin/SchoolAdmin + PortalAdmin. Draft is never created (leftover Draft rows, if any, still read as Draft).",
  ],
  [
    "Q-01b",
    "PortalAdmin create auto-publishes",
    "PortalAdmin creates a question.",
    "Status=Approved, Visibility=Public, IsActive=true immediately; no separate approval step.",
  ],
  [
    "Q-02",
    "Campus endorsement (not published)",
    "CampusAdmin approves an in-campus Teacher/Coordinator/Tutor/Parent question.",
    "Status=Approved (endorsed), Visibility=Campus, IsActive=false; audience stays restricted; NOT quiz-usable; still awaits PortalAdmin to publish.",
  ],
  [
    "Q-03",
    "School endorsement (not published)",
    "SchoolAdmin approves an in-school Teacher/Coordinator/Tutor/Parent/CampusAdmin question.",
    "Status=Approved (endorsed), Visibility=School, IsActive=false; audience stays restricted; NOT quiz-usable; still awaits PortalAdmin to publish.",
  ],
  [
    "Q-04",
    "Portal publish",
    "PortalAdmin approves any pending or endorsed question.",
    "Status=Approved, Visibility=Public, IsActive=true; visible to all question-managing roles; quiz-usable.",
  ],
  [
    "Q-05",
    "Approver hierarchy / no self-approval",
    "CampusAdmin tries to approve their own or a peer campus's question; SchoolAdmin tries to approve their own question.",
    "Forbidden. Web and Mobile hide Endorse/Reject on the creator's own item (CampusAdmin/SchoolAdmin). API 403s if called anyway. A CampusAdmin question needs SchoolAdmin or PortalAdmin; a SchoolAdmin question needs PortalAdmin. Approver must be a higher tier than the creator; no self or same-tier approval.",
  ],
  [
    "Q-06",
    "Non-public isolation",
    "Another Teacher, Coordinator, Tutor, or Parent in the same campus, a user in another campus/school, or an unrelated admin opens the bank.",
    "A PendingReview or endorsed (Campus/School) question is NOT visible to them. Only Public (PortalAdmin-published) questions appear.",
  ],
  [
    "Q-07",
    "Reject and resubmit",
    "Eligible approver rejects with reason; owner edits and submits for review.",
    "Rejected stays Rejected during edit, then explicit submit returns it to PendingReview.",
  ],
  [
    "Q-08",
    "Published deactivation",
    "PortalAdmin deactivates a Published (Public) question.",
    "Status remains Approved; Activity shows Inactive (IsActive=false); unavailable for new quiz use. Endorsed and non-Approved statuses stay Inactive and cannot be activated.",
  ],
  [
    "Q-09",
    "Archive",
    "PortalAdmin archives a question.",
    "Status=Archived; IsActive=false; hidden from normal bank/quiz use. Visibility preserved.",
  ],
  [
    "Q-09b",
    "Unarchive",
    "PortalAdmin unarchives a previously archived question.",
    "Public restored as Approved + Active; Campus/School as Approved + Inactive; None as PendingReview.",
  ],
  [
    "Q-10",
    "Ownership lock",
    "Non-PortalAdmin owner tries to edit/delete after approval/endorsement (not Active, or Active without a grant).",
    "Forbidden. PortalAdmin retains lifecycle and mutation control. For Active questions, other roles request an edit instead of PUT.",
  ],
  [
    "Q-10b",
    "Active edit request",
    "Teacher/Coordinator/Tutor/Parent/CampusAdmin/SchoolAdmin views an Active Public question and sends an edit request with a valid reason. PortalAdmin approves; the requester saves a change.",
    "Request stored in app_question_edit_request; PortalAdmins queued in app_approval (entity_type 2105). After approve, PUT is allowed once: grant is consumed, question returns to PendingReview (Inactive, Visibility=None), trail Modified + SubmittedForReview.",
  ],
  [
    "Q-11",
    "Excel import (non–PortalAdmin)",
    "Teacher/Coordinator/Tutor/Parent/CampusAdmin/SchoolAdmin uploads valid/invalid rows, runs dry-run, then confirms.",
    "Valid rows become PendingReview only (IsActive=false, Visibility=None); row errors are reported. A Status column cannot approve.",
  ],
  [
    "Q-11b",
    "Excel import (PortalAdmin)",
    "PortalAdmin confirms a valid import.",
    "Each valid row is auto-published like PortalAdmin create: Status=Approved, Visibility=Public, IsActive=true. Import uses CreateAsync — it does not stay PendingReview.",
  ],
  [
    "Q-12",
    "Fill answer privacy",
    "Student starts a quiz containing Fill in the Blanks.",
    "Accepted/model answers are not returned before submission.",
  ],
  [
    "Q-13",
    "Approval history trail",
    "Teacher, Coordinator, or Tutor creates; CampusAdmin endorses; owner edits; PortalAdmin publishes, deactivates, archives, unarchives.",
    "Question detail shows every step in Approval history — actor name + role, action chip, timestamp, and the rejection reason when present — in chronological order for all roles.",
  ],
  [
    "Q-14",
    "Modified is recorded",
    "Owner edits a PendingReview/Rejected question (or their inline quiz question).",
    "A Modified event with the editor's name and role appears in the trail; status and visibility are unchanged.",
  ],
  [
    "Q-15",
    "Inline quiz question skips bank review",
    "A quiz manager adds a question inline on a quiz (POST /api/quizzes/{id}/questions), not from the bank picker.",
    "Status=Approved, Visibility=Campus, IsActive=true immediately (MarkFullyApproved). No PendingReview. Usable on that quiz. Not listed by GET /questions?eligibleForQuizOnly=true because it is not Public.",
  ],
  [
    "Q-15b",
    "See quizzes using a question",
    "Open a bank question detail and click Used in quizzes.",
    "GET /api/questions/{id}/quizzes lists every non-deleted quiz that includes the question. Quiz-managing roles can open the quiz; CampusAdmin sees the list without a quiz-manage link.",
  ],
  [
    "Q-16",
    "Campus/School see Coordinator and Tutor",
    "A Coordinator and a Tutor in the same campus create PendingReview questions. CampusAdmin opens the bank and pending-approval queue. SchoolAdmin does the same at school scope.",
    "CampusAdmin sees both (same campus). SchoolAdmin sees Coordinator/Tutor/Teacher/Parent/CampusAdmin pending in that school. List, pending-approval, and GetById use the same creator-role lists.",
  ],
  [
    "Q-17",
    "CampusAdmin cannot attach bank questions to quizzes",
    "CampusAdmin endorses a question; PortalAdmin publishes it Public+Active. CampusAdmin opens Quizzes to attach it or add an inline question.",
    "Forbidden. CampusAdmin may manage the question bank and endorse, and may school-approve quizzes, but cannot create/manage quizzes or call POST /api/quizzes/{id}/questions or from-bank attach. A Teacher/SchoolAdmin/PortalAdmin (or Coordinator/Tutor/Parent) must attach it.",
  ],
];

const checklist = [
  "Create and import (Teacher/Coordinator/Tutor/Parent/CampusAdmin/SchoolAdmin) always produce PendingReview, IsActive=false, Visibility=None.",
  "PortalAdmin create and import auto-publish (Approved + Public + Active). Import calls the same create path; a Status column cannot override that.",
  "PortalAdmin-created questions are auto-published (Approved + Public + Active).",
  "Draft (110) is leftover only: create/import never write it; GET still returns status Draft for old rows (not remapped to PendingReview); owners may still edit/delete those rows.",
  "A PendingReview or endorsed (Campus/School) question is visible ONLY to its creator plus that creator's CampusAdmin, SchoolAdmin, and PortalAdmin — never peers or other orgs.",
  "Only PortalAdmin approval publishes a question (Approved + Public + Active + quiz-usable).",
  "CampusAdmin/SchoolAdmin approval is an endorsement: Status=Approved but IsActive=false, audience stays restricted, and it is NOT quiz-usable until PortalAdmin publishes it.",
  "Approver must be a higher tier than the creator; no self or same-tier approval (Teacher/Coordinator/Tutor/Parent→Campus/School/Portal; CampusAdmin→School/Portal; SchoolAdmin→Portal only). Web and Mobile hide Endorse/Reject on the signed-in CampusAdmin/SchoolAdmin's own questions.",
  "Only a Published (Public) Approved bank question can be toggled Active/Inactive by PortalAdmin. Bank endorse leaves IsActive=false. Exception: inline quiz create sets Campus + IsActive=true without Public.",
  "PortalAdmin may deactivate a Published question; UI shows Status=Approved and Activity=Inactive.",
  "Reject requires a reason and clears active/endorsement/visibility state.",
  "Editing Rejected does not auto-submit; explicit Submit returns it to PendingReview.",
  "Only PortalAdmin can publish, activate, deactivate, archive, or mutate approved/endorsed questions.",
  "Deactivate keeps QuestionStatus=Approved and only changes IsActive.",
  "Archived and inactive are not interchangeable: Archived is status; inactive is a flag.",
  "Bank quiz eligibility (eligibleForQuizOnly / attach from bank) requires Approved + Public + IsActive + ApprovedBy (published by PortalAdmin). Inline-on-quiz questions are Campus + Active and are used on that quiz without being Public.",
  "Question bank excludes Students; students receive questions only through quiz attempts.",
  "Coordinator and Tutor have the same bank-create rights as Teacher/Parent: own + Public visibility, no endorse/publish.",
  "CampusAdmin list, pending-approval, and GetById include Teacher/Coordinator/Tutor/Parent in the same campus (not own). SchoolAdmin includes those plus CampusAdmin in the same school. Those three paths use the same creator-role lists.",
  "CampusAdmin can manage the question bank and endorse, but cannot manage quizzes: no quiz create, no inline question, no attach-from-bank. Quiz-managing roles are Teacher, Coordinator, Tutor, Parent, SchoolAdmin, and PortalAdmin. CampusAdmin may still school-approve campus quizzes.",
  "Single/Multi/True-False/Fill/Descriptive/Matching/Ordering are offered on web, Mobile, Excel import, quiz inline, and API create. File Upload and Media are rejected on those create paths; existing rows stay valid for update/attempt until re-enabled.",
  "File Upload is a link/path MVP (SubmittedText) — hidden on web create; binary blob upload, storage, and review download are not built yet.",
  "Accepted answers are hidden from students before attempt submission.",
  "Deleting a quiz-linked question is blocked.",
  "Question detail Used in quizzes lists those quizzes (GET /api/questions/{id}/quizzes) so you can see why delete is blocked.",
  "Deleting a question also deletes its app_approval trail rows in application code (entity_type=Question, request_id=question id). There is no database FK cascade.",
  "Every workflow action (create, submit, endorse, publish, reject, modify, activate, deactivate, archive, unarchive) appends an Approval history row with actor name + role + timestamp, for every role.",
  "Question detail always shows the Approval history panel; rejection reasons appear inline in the trail.",
  "Archive preserves Visibility/ApprovedBy; Unarchive restores Public → Approved+Active, Campus/School → Approved+Inactive, None → PendingReview.",
  "Created by / Approved by show user display names (FKs to app_users), not raw IDs.",
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
  <title>RankUp Education — Questions Business & QA Guide</title>
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
    <h1>RankUp Education — Questions Business &amp; QA Guide</h1>
    <p class="subtitle">Intended rules for question status, activity, visibility, role-based approval hierarchy, import, and QA.</p>
    <div class="meta">
      <span class="chip">Approval model v2</span>
      <span class="chip">26 Jul 2026</span>
      <span class="chip">PortalAdmin-only publish</span>
      <span class="chip">Approval history trail</span>
    </div>
  </header>

  <div class="ok"><strong>Canonical model:</strong> A <em>bank</em> question is usable from the picker — Public, Active, and quiz-eligible — only after <strong>PortalAdmin</strong> approves (publishes) it. A CampusAdmin/SchoolAdmin <em>bank</em> approval is an endorsement: it records review progress but keeps the question Inactive and restricted to its creator plus that creator's own CampusAdmin, SchoolAdmin, and PortalAdmin. <strong>Exception:</strong> a question created inline on a quiz is <code>MarkFullyApproved</code> with Visibility=Campus and IsActive=true; it skips PendingReview and is used on that quiz without being Public (it is not returned by <code>eligibleForQuizOnly</code>). QuestionStatus records workflow state; for the bank, IsActive is true only after PortalAdmin publish (or PortalAdmin create); Visibility records how far a question has been endorsed.</div>

  <div class="note"><strong>Spec status:</strong> This v2 model is <strong>implemented in code</strong>: (1) only PortalAdmin approval publishes/activates; (2) only Public questions are quiz-usable; (3) the approver must be a strictly higher tier than the creator (no self / same-tier approval), and any eligible higher tier may act independently; (4) a CampusAdmin/SchoolAdmin endorsement is recorded as Status=Approved with Visibility=Campus/School but IsActive=false and a restricted audience (it does not widen the audience to peers); (5) every workflow step is written to the <code>app_approval</code> trail and shown as Approval history on the question detail page.</div>

  <h2>1. Canonical status meanings</h2>
  ${htmlTable(["ID", "QuestionStatus", "Activity", "Meaning"], statuses)}
  <div class="note"><strong>Important:</strong> Active and Inactive are not QuestionStatus values. For the <em>bank</em>, a question is Active only when a PortalAdmin has published it (Public). Bank PendingReview, Rejected, Archived, leftover Draft, and CampusAdmin/SchoolAdmin-endorsed questions are Inactive. Inline quiz-created questions are the exception: Campus visibility and IsActive=true without Public. When PortalAdmin deactivates a Published bank question, Status remains Approved and Activity shows Inactive. Archived is a distinct status, not the same as Inactive. Leftover Draft rows are still returned as Draft — they are not read as PendingReview.</div>

  <h2>2. Lifecycle and transitions</h2>
  ${htmlTable(["Action", "Resulting status", "State changes"], lifecycle)}

  <h2>3. Status, activity, and visibility</h2>
  ${htmlTable(
    ["Concept", "Values", "Rule"],
    [
      ["QuestionStatus", "PendingReview / Approved / Rejected / Archived (+ leftover Draft)", "Workflow decision. Draft (110) is leftover only: still stored and returned as Draft, not remapped to PendingReview. Create/import never write it."],
      ["IsActive (Activity)", "true / false", "Bank: true only for a Published (Public) Approved question. Bank-endorsed (Campus/School) and all non-Approved statuses are Inactive. Exception: inline quiz create sets Campus + IsActive=true without Public. PortalAdmin may deactivate/activate a Published bank question; UI shows Active (blue) or Inactive (slate) separately from Status=Approved (green)."],
      ["Visibility", "None / Campus / School / Public", "None/Campus/School are all restricted to the creator + that creator's CampusAdmin/SchoolAdmin + PortalAdmin. Only Public (set by PortalAdmin) is broadly visible. Campus/School mark how far a question has been endorsed, not a wider audience."],
      ["ApprovedBy", "User ID or null", "Records the admin who last approved/endorsed. Quiz eligibility requires the publisher to be PortalAdmin (Public)."],
    ],
  )}

  <h2>4. Role permissions</h2>
  ${htmlTable(
    ["Action", "PortalAdmin", "SchoolAdmin", "CampusAdmin", "Teacher", "Coordinator", "Tutor", "Parent", "Student"],
    permissions,
  )}
  <div class="note"><strong>Approval hierarchy:</strong> the approver must be a strictly higher tier than the creator — Teacher/Coordinator/Tutor/Parent → CampusAdmin, SchoolAdmin, or PortalAdmin; CampusAdmin → SchoolAdmin or PortalAdmin; SchoolAdmin → PortalAdmin only. No self-approval and no same-tier approval. Web and Mobile hide Endorse/Reject on the signed-in CampusAdmin/SchoolAdmin's own questions. Any eligible higher tier may act independently (no forced sequential chain). PortalAdmin-created questions are auto-published. Coordinator and Tutor are bank creators like Teacher/Parent: they cannot endorse or publish.</div>
  <div class="note"><strong>CampusAdmin vs quizzes:</strong> CampusAdmin can browse/create/endorse in the question bank. CampusAdmin cannot manage quizzes (<code>QuizScopeResolver.RequireManageScope</code> excludes them), so they cannot attach a published bank question or create an inline quiz question. A Teacher, Coordinator, Tutor, Parent, SchoolAdmin, or PortalAdmin must put the question on a quiz. CampusAdmin may still school-approve quizzes in their campus (see Quizzes QA).</div>

  <h2>5. Visibility rules</h2>
  ${htmlTable(
    ["Visibility", "Set by", "Audience"],
    [
      ["None (PendingReview)", "Create (Teacher/Coordinator/Tutor/Parent/CampusAdmin/SchoolAdmin)", "Creator + creator's CampusAdmin + creator's SchoolAdmin + PortalAdmin. No peers, no other campuses/schools."],
      ["Campus (endorsed)", "CampusAdmin approval", "Same restricted audience as None — an endorsement marker only. Not broadened to campus peers; not quiz-usable."],
      ["School (endorsed)", "SchoolAdmin approval", "Same restricted audience as None. Not broadened to school peers; not quiz-usable."],
      ["Public (published)", "PortalAdmin approval", "Visible to all question-managing roles. Attachable onto quizzes by quiz-managing roles (not CampusAdmin)."],
    ],
  )}
  <p>For the bank, only PortalAdmin publication (Public) widens the audience and sets IsActive=true. Campus/School bank endorsements are markers, not broader audiences, and stay Inactive. Inline quiz create is the exception: Campus + IsActive=true without widening to Public. Bank approval occurs from PendingReview (or from an endorsed state, for PortalAdmin).</p>

  <h2>6. Quiz eligibility</h2>
  <p>A <strong>bank</strong> question is eligible to attach onto a quiz (<code>eligibleForQuizOnly</code>) only when all are true:</p>
  ${htmlList([
    "QuestionStatus is Approved (legacy Approved aliases remain readable).",
    "Visibility is Public — i.e. published by PortalAdmin.",
    "IsActive is true.",
    "ApprovedBy (the PortalAdmin publisher) is present.",
  ])}
  <p>Bank-endorsed (Campus/School, IsActive=false) questions are NOT attachable until PortalAdmin publishes them. PortalAdmin can deactivate a Published bank question: Status stays Approved, Activity shows Inactive, and it is removed from new bank selection. Archiving changes status to Archived and forces Inactive.</p>
  <p><strong>Who can attach:</strong> Teacher, Coordinator, Tutor, Parent, SchoolAdmin, and PortalAdmin. <strong>CampusAdmin cannot</strong> — they endorse in the bank only; they have no quiz manage/inline/from-bank APIs.</p>
  <p><strong>Inline exception:</strong> <code>POST /api/quizzes/{quizId}/questions</code> creates a question with <code>MarkFullyApproved</code> (Visibility=Campus, IsActive=true). It skips bank PendingReview and is used on that quiz immediately. It is not Public, so it does not appear in the bank picker. Removing it from the quiz deactivates the row when the caller created it.</p>

  <h2>7. Question types</h2>
  <p>Authoring is validated by <code>QuestionBankGuard</code> for bank create/update/import and quiz-inline questions. Types marked <strong>Now</strong> are offered on web create, Mobile create, quiz inline, Excel import, and API create. File Upload and Media are <strong>hidden for now</strong> on every create path; existing rows remain valid for update and quiz attempts.</p>
  ${htmlTable(["ID", "Type", "Availability", "Validation"], questionTypes)}

  <h2>8. Excel import</h2>
  ${htmlList([
    "Import UI: web at /questions/import; mobile Question Bank upload action. Available to question-managing roles.",
    "Import is limited to 200 rows per file; row 1 is the header.",
    "Dry run validates the workbook and returns all row errors.",
    "Confirm import uses the same create path: non–PortalAdmin rows are PendingReview only; PortalAdmin rows are auto-published (Approved + Public + Active).",
    "A Status column cannot choose Draft or override PortalAdmin auto-publish.",
    "Class, Subject, Topic, Type, and Difficulty accept supported names or canonical IDs.",
    "Offered types: Single Choice, Multiple Choice, True/False, Fill in the Blanks, Descriptive, Matching, Ordering. File Upload and Media rows are rejected.",
    "Choice types accept IsCorrectN and/or CorrectOption; Fill uses accepted-answer fields; Descriptive needs no options.",
  ])}

  <h2>9. API transition map</h2>
  <p>Bank routes are under <code>/api/questions</code> (question-managing roles). Quiz-inline and attach-from-bank routes are under <code>/api/quizzes/{quizId}/questions</code> and require quiz-manage roles — <strong>not CampusAdmin</strong>.</p>
  ${htmlTable(["Endpoint", "Business effect"], apiTransitions)}

  <h2>10. Approval history (workflow trail)</h2>
  <p>Every question carries a full audit trail in the generic <code>app_approval</code> table (<code>entity_type = 2102</code> Question, <code>request_id</code> = question id; user-registration rows share the same table with <code>entity_type = 2101</code> User). <code>request_id</code> is polymorphic (question / quiz / school-change) — there is no typed FK to <code>questions</code>. <code>entity_type</code> and <code>action</code> are lookup-backed (<code>ApprovalEntityType</code> / <code>ApprovalAction</code>). Each row stores the acting user (FK to <code>app_users</code>), the role they acted as, the action, an optional reason, and a timestamp. The question detail page always shows this panel — for Teacher, Coordinator, Tutor, Parent, CampusAdmin, SchoolAdmin, and PortalAdmin alike — with an actor card, role, colour-coded action chip, and the rejection reason inline.</p>
  ${htmlTable(["Event", "Meaning", "Recorded for"], trailEvents)}
  ${htmlList([
    "Inline quiz-created and quiz-duplicated questions record Created + Endorsed in one step and are Campus + Active (not Public).",
    "Pre-existing questions were seeded with Created plus Endorsed/Published rows derived from created_by / approved_by.",
    "Historical rejections are not attributed (the rejector was never stored before the trail existed); all new rejections are.",
    "Trail rows for that question are deleted in application code on question delete (entity_type=Question and request_id=question id). There is no database cascade because request_id is polymorphic.",
  ])}

  <h2>11. UI presentation rules</h2>
  ${htmlList([
    "Question status filters are PendingReview, Approved, Rejected, and Archived. Leftover Draft rows are grouped with Pending on the web list; they still display as Draft on detail.",
    "Active/Inactive filters represent IsActive. For the bank, meaningful Active/Inactive variation applies only to Public Approved questions. Inline quiz questions are Approved + Campus + Active without Public.",
    "Approved uses green; Active uses blue; Pending uses amber; Rejected uses red; Archived/Inactive use slate.",
    "When both are needed, show two concepts separately: e.g. Status=Approved and Activity=Inactive for a PortalAdmin-deactivated Approved question.",
    "Question-list rows navigate to detail; mutation and workflow actions live on the question detail page.",
    "The list shows a Time sec column (estimated seconds); on narrow viewports the React web list combines Marks / Time / Visibility in one line.",
    "The Subjects / Classes / Difficulties filter panel is hidden by default and toggled on demand.",
    "Detail shows metadata (status badges, class/subject/topic, marks, time, creator/approver names, visibility, org) before the question text; Created by / Approved by show display names, not IDs.",
    "Detail shows Endorsed and Quiz ready badges where applicable, and always shows the Approval history panel.",
    "Detail always has Used in quizzes: a dialog of GET /api/questions/{id}/quizzes. Quiz-managing roles can open each quiz; CampusAdmin sees the list only.",
    "Archived questions show an Unarchive action (PortalAdmin).",
  ])}

  <h2>12. QA scenarios</h2>
  ${scenarios
    .map(
      ([id, title, steps, expected]) =>
        `<div class="scenario"><strong>${escapeHtml(id)} — ${escapeHtml(title)}</strong><p><b>Steps:</b> ${escapeHtml(steps)}</p><p><b>Expected:</b> ${escapeHtml(expected)}</p></div>`,
    )
    .join("")}

  <h2>13. Verification checklist</h2>
  ${htmlList(checklist.map((item) => `☐ ${item}`))}

  <h2>14. Known compatibility and optional work</h2>
  ${htmlList([
    "Legacy status names Pending, UnderReview, Active, Published, and Declined remain readable for migrated data; new writes use canonical names/IDs. Draft (110) is not remapped on read — leftover rows stay Draft until edited or deleted.",
    "IsAiApproved is a legacy compatibility field, not a second approval gate. There is no /approve-ai route; QuestionAiApprovalValidator was unused and removed. Endorse/publish still set the flag for old clients.",
    "created_by / approved_by are bigint FKs to app_users; the API returns CreatedByName / ApprovedByName for display.",
    "Delete remains blocked while a question is linked to a quiz; guided unlink-then-delete is optional.",
    "File Upload binary blob upload/storage/download remains optional future work; current MVP is paste link/path into SubmittedText. File Upload and Media are hidden on every create path (web, Mobile, Excel import, API create, quiz inline); existing rows still work until re-enabled.",
    "Mobile Question Bank supports create, import, endorse/reject, activate/deactivate/archive, and Public+Active quiz-ready filtering; richer pair-row Matching editors remain web-first. Mobile create matches web: File Upload and Media are hidden.",
    "Coordinator and Tutor are bank creators like Teacher/Parent. CampusAdmin list/pending/GetById include Teacher/Coordinator/Tutor/Parent in the same campus; SchoolAdmin also includes CampusAdmin in the same school. CampusAdmin cannot manage quizzes or attach bank questions.",
    "External AI grading for Fill is future work; current AllowAiReview behavior is OpenAI when configured, else heuristic.",
  ])}

  <footer>Generated by docs/build_questions_business_qa.mjs. Edit the generator and rerun <code>npm run build:questions-qa</code>.</footer>
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
  docHeading("RankUp Education — Questions Business & QA Guide", HeadingLevel.TITLE),
  docParagraph("Current implemented rules · 26 Jul 2026", {
    run: { italics: true, color: "475569" },
  }),
  docParagraph(
    "Canonical model: A bank question is usable from the picker — Public, Active, and quiz-eligible — only after PortalAdmin approves (publishes) it. A CampusAdmin/SchoolAdmin bank approval is an endorsement that keeps the question Inactive and restricted. Exception: a question created inline on a quiz is MarkFullyApproved with Visibility=Campus and IsActive=true; it skips PendingReview and is used on that quiz without being Public (not returned by eligibleForQuizOnly). For the bank, IsActive is true only after PortalAdmin publish (or PortalAdmin create).",
    { run: { bold: true, color: "166534" } },
  ),
  docParagraph(
    "Spec status: v2 model is implemented in code — (1) only PortalAdmin publishes/activates; (2) only Public questions are quiz-usable; (3) the approver must be a strictly higher tier than the creator (no self / same-tier approval), and any eligible higher tier may act independently; (4) a CampusAdmin/SchoolAdmin endorsement is Status=Approved with Visibility=Campus/School but IsActive=false and a restricted audience; (5) every workflow step is written to the app_approval trail and shown as Approval history on question detail.",
    { run: { bold: true, color: "92400E" } },
  ),

  docHeading("1. Canonical status meanings"),
  docTable(["ID", "QuestionStatus", "Activity", "Meaning"], statuses),
  docParagraph(
    "Important: Active and Inactive are not QuestionStatus values. For the bank, PendingReview, Rejected, Archived, leftover Draft, and bank-endorsed Campus/School are always Inactive. Only Public Approved may be Active or Inactive via PortalAdmin. Leftover Draft rows stay Draft on read. Exception: inline quiz create is Campus + Active without Public.",
    { run: { bold: true, color: "92400E" } },
  ),

  docHeading("2. Lifecycle and transitions"),
  docTable(["Action", "Resulting status", "State changes"], lifecycle),

  docHeading("3. Status, activity, and visibility"),
  docTable(
    ["Concept", "Values", "Rule"],
    [
      ["QuestionStatus", "PendingReview / Approved / Rejected / Archived (+ leftover Draft)", "Workflow decision. Draft (110) is leftover only: still stored and returned as Draft, not remapped to PendingReview. Create/import never write it."],
      ["IsActive (Activity)", "true / false", "Bank: true only for a Published (Public) Approved question. Bank-endorsed (Campus/School) and all non-Approved statuses are Inactive. Exception: inline quiz create sets Campus + IsActive=true without Public. PortalAdmin may deactivate/activate a Published bank question."],
      ["Visibility", "None / Campus / School / Public", "None/Campus/School are restricted to the creator + that creator's CampusAdmin/SchoolAdmin + PortalAdmin. Only Public (PortalAdmin) is broadly visible. Campus/School mark endorsement progress, not a wider audience."],
      ["ApprovedBy", "User ID or null", "Records the admin who last approved/endorsed. Quiz eligibility requires the publisher to be PortalAdmin (Public)."],
    ],
  ),

  docHeading("4. Role permissions"),
  docTable(
    ["Action", "PortalAdmin", "SchoolAdmin", "CampusAdmin", "Teacher", "Coordinator", "Tutor", "Parent", "Student"],
    permissions,
  ),
  docParagraph(
    "Approval hierarchy: the approver must be a strictly higher tier than the creator — Teacher/Coordinator/Tutor/Parent → CampusAdmin/SchoolAdmin/PortalAdmin; CampusAdmin → SchoolAdmin/PortalAdmin; SchoolAdmin → PortalAdmin only. No self or same-tier approval. Web and Mobile hide Endorse/Reject on the signed-in CampusAdmin/SchoolAdmin's own questions. Any eligible higher tier may act independently. PortalAdmin-created questions are auto-published. Coordinator and Tutor are bank creators like Teacher/Parent: they cannot endorse or publish.",
    { run: { bold: true, color: "92400E" } },
  ),
  docParagraph(
    "CampusAdmin vs quizzes: CampusAdmin can browse/create/endorse in the question bank but cannot manage quizzes (RequireManageScope excludes them). They cannot attach a published bank question or create an inline quiz question. Teacher, Coordinator, Tutor, Parent, SchoolAdmin, and PortalAdmin can. CampusAdmin may still school-approve quizzes in their campus (see Quizzes QA).",
    { run: { bold: true, color: "92400E" } },
  ),

  docHeading("5. Visibility rules"),
  docTable(
    ["Visibility", "Set by", "Audience"],
    [
      ["None (PendingReview)", "Create (Teacher/Coordinator/Tutor/Parent/CampusAdmin/SchoolAdmin)", "Creator + creator's CampusAdmin + creator's SchoolAdmin + PortalAdmin. No peers or other orgs."],
      ["Campus (endorsed)", "CampusAdmin approval", "Same restricted audience as None; endorsement marker only; not quiz-usable."],
      ["School (endorsed)", "SchoolAdmin approval", "Same restricted audience as None; endorsement marker only; not quiz-usable."],
      ["Public (published)", "PortalAdmin approval", "Visible to all question-managing roles. Attachable onto quizzes by quiz-managing roles (not CampusAdmin)."],
    ],
  ),

  docHeading("6. Quiz eligibility"),
  docParagraph(
    "A bank question is eligible to attach onto a quiz (eligibleForQuizOnly) only when: Approved status, Visibility Public, IsActive true, and ApprovedBy (PortalAdmin publisher) is present. Bank-endorsed Campus/School questions stay Inactive and are not attachable until published.",
  ),
  docParagraph(
    "Inline exception: POST /api/quizzes/{quizId}/questions creates a question with MarkFullyApproved (Visibility=Campus, IsActive=true). It skips bank PendingReview and is used on that quiz immediately. It is not Public, so it does not appear in the bank picker. Removing it from the quiz deactivates the row when the caller created it. CampusAdmin cannot call this endpoint or attach-from-bank.",
  ),

  docHeading("7. Question types"),
  docParagraph(
    "Authoring is validated by QuestionBankGuard for bank create/update/import and quiz-inline questions. Types marked Now are offered on web create, Mobile create, quiz inline, Excel import, and API create. File Upload and Media are hidden for now on every create path; existing rows remain valid for update and quiz attempts.",
  ),
  docTable(["ID", "Type", "Availability", "Validation"], questionTypes),

  docHeading("8. Excel import"),
  ...[
    "Import UI: web at /questions/import; mobile Question Bank upload action.",
    "Import is limited to 200 rows per file; row 1 is the header.",
    "Dry run returns all row errors.",
    "Confirm uses the same create path: non–PortalAdmin rows are PendingReview; PortalAdmin rows auto-publish.",
    "A Status column cannot choose Draft or override PortalAdmin auto-publish.",
    "Lookup names or canonical IDs are accepted where documented.",
    "Offered types: Single Choice, Multiple Choice, True/False, Fill in the Blanks, Descriptive, Matching, Ordering. File Upload and Media rows are rejected.",
    "Choice types use IsCorrectN/CorrectOption; Fill uses accepted answers; Descriptive needs no options.",
  ].map(docBullet),

  docHeading("9. API transition map"),
  docParagraph(
    "Bank routes are under /api/questions (question-managing roles). Quiz-inline and attach-from-bank routes are under /api/quizzes/{quizId}/questions and require quiz-manage roles — not CampusAdmin.",
  ),
  docTable(["Endpoint", "Business effect"], apiTransitions),

  docHeading("10. Approval history (workflow trail)"),
  docParagraph(
    "Every question carries a full audit trail in the generic app_approval table (entity_type=2102 Question, request_id = question id; user-registration rows share the table with entity_type=2101 User). request_id is polymorphic (question / quiz / school-change) — there is no typed FK to questions. entity_type and action are lookup-backed (ApprovalEntityType / ApprovalAction). Each row stores the acting user (FK to app_users), the role they acted as, the action, an optional reason, and a timestamp. The question detail page always shows this panel for every question-managing role (Teacher, Coordinator, Tutor, Parent, CampusAdmin, SchoolAdmin, PortalAdmin), with actor name, role, colour-coded action chip, and the rejection reason inline.",
  ),
  docTable(["Event", "Meaning", "Recorded for"], trailEvents),
  ...[
    "Inline quiz-created and quiz-duplicated questions record Created + Endorsed in one step and are Campus + Active (not Public).",
    "Pre-existing questions were seeded with Created plus Endorsed/Published rows.",
    "Historical rejections are not attributed; all new rejections are.",
    "Trail rows for that question are deleted in application code on question delete (entity_type=Question and request_id=question id). There is no database cascade because request_id is polymorphic.",
  ].map(docBullet),

  docHeading("11. UI presentation rules"),
  ...[
    "Workflow Status and IsActive are separate concepts.",
    "Leftover Draft (110) rows stay Draft on read; the web list groups them with Pending.",
    "Only Public Approved bank questions can be toggled Active/Inactive by PortalAdmin; other bank statuses are Inactive. Inline quiz questions are Campus + Active without Public.",
    "Approved=green; Active=blue; Pending=amber; Rejected=red; Archived/Inactive=slate.",
    "Show Status=Approved and Activity=Inactive when PortalAdmin deactivates an Approved question.",
    "List rows open detail; actions live on the detail page.",
    "List shows a Time sec column; on narrow React viewports Marks / Time / Visibility share one line.",
    "Subjects / Classes / Difficulties filter panel is hidden by default.",
    "Detail shows metadata before the question text; Created by / Approved by show display names.",
    "Detail always shows the Approval history panel; Archived questions offer Unarchive (PortalAdmin).",
  ].map(docBullet),

  docHeading("12. QA scenarios"),
  ...scenarios.flatMap(([id, title, steps, expected]) => [
    docHeading(`${id} — ${title}`, HeadingLevel.HEADING_2),
    docParagraph(`Steps: ${steps}`),
    docParagraph(`Expected: ${expected}`, { run: { bold: true, color: "166534" } }),
  ]),

  docHeading("13. Verification checklist"),
  ...checklist.map((item) => docBullet(`☐ ${item}`)),

  docHeading("14. Known compatibility and optional work"),
  ...[
    "Legacy status aliases remain readable; new writes use canonical names/IDs. Draft (110) is not remapped on read — leftover rows stay Draft until edited or deleted.",
    "IsAiApproved is a legacy field, not a second gate. There is no /approve-ai route; the unused QuestionAiApprovalValidator was removed.",
    "created_by / approved_by are bigint FKs to app_users; the API returns display names.",
    "Delete is blocked while quiz-linked; guided unlink is optional.",
    "File Upload binary blob upload/storage/download remains optional; MVP is paste link/path into SubmittedText. File Upload and Media are hidden on every create path (web, Mobile, Excel import, API create, quiz inline); existing rows still work until re-enabled.",
    "Mobile Question Bank supports create/import/endorse/publish lifecycle and Public+Active quiz-ready filtering; richer Matching pair-row editors remain web-first. Mobile create matches web: File Upload and Media are hidden.",
    "Coordinator and Tutor are bank creators like Teacher/Parent. CampusAdmin list/pending/GetById include Teacher/Coordinator/Tutor/Parent in the same campus; SchoolAdmin also includes CampusAdmin in the same school. CampusAdmin cannot manage quizzes or attach bank questions.",
    "External AI grading for Fill is future work; AllowAiReview uses OpenAI when configured, else heuristic.",
  ].map(docBullet),
];

const document = new Document({
  sections: [{ children: docChildren }],
});

writeFileSync(join(__dirname, "04_RankUp_Questions_Business_QA.html"), html);
writeFileSync(
  join(__dirname, "04_RankUp_Questions_Business_QA.docx"),
  await Packer.toBuffer(document),
);

console.log("Rebuilt Questions Business & QA HTML and DOCX.");
