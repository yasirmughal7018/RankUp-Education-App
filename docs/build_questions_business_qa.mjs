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
    "Legacy only. Existing rows are migrated/read as PendingReview. Create and import never write Draft. Activity is never Active.",
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
    "Active only when Public",
    "Accepted into the bank. PortalAdmin approval publishes it: Visibility=Public, IsActive=true, quiz-usable by everyone. A CampusAdmin/SchoolAdmin approval is an endorsement: Visibility=Campus/School but IsActive=false and the audience stays restricted (creator + that creator's CampusAdmin/SchoolAdmin + PortalAdmin); it is not quiz-usable until PortalAdmin publishes it.",
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
    "Create / import by Teacher, Parent, CampusAdmin, SchoolAdmin",
    "PendingReview",
    "IsActive=false; Visibility=None; owner and organisation stamped from creator. Audience = creator + creator's CampusAdmin + creator's SchoolAdmin + PortalAdmin.",
  ],
  [
    "Create by PortalAdmin",
    "Approved",
    "Auto-published: Visibility=Public; IsActive=true; quiz-usable. No separate approval step.",
  ],
  [
    "Endorse by CampusAdmin",
    "Approved (endorsed, not published)",
    "A Teacher/Parent question in the same campus only. Visibility=Campus; IsActive=false; audience stays restricted; not quiz-usable; still needs PortalAdmin to publish.",
  ],
  [
    "Endorse by SchoolAdmin",
    "Approved (endorsed, not published)",
    "A Teacher/Parent/CampusAdmin question in the same school. Visibility=School; IsActive=false; audience stays restricted; not quiz-usable; still needs PortalAdmin to publish.",
  ],
  [
    "Publish by PortalAdmin",
    "Approved (published)",
    "Visibility=Public; IsActive=true; quiz-usable by all question-managing roles. Only PortalAdmin can publish.",
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
    "PortalAdmin deactivate / activate",
    "Approved (unchanged)",
    "Applies to a Published (Public) question. Deactivate sets IsActive=false (UI Activity=Inactive); activate sets IsActive=true. Endorsed, PendingReview, Rejected, and Archived stay Inactive and cannot be activated.",
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
  ["Browse/manage bank", "Yes", "Yes", "Yes", "Yes", "Yes", "No"],
  ["Create", "Yes", "Yes", "Yes", "Yes", "Yes", "No"],
  [
    "Edit/delete own PendingReview or Rejected",
    "Any",
    "Own",
    "Own",
    "Own",
    "Own",
    "No",
  ],
  ["Edit/delete Approved or endorsed", "Any", "No", "No", "No", "No", "No"],
  [
    "Approve a Teacher / Parent question",
    "Publish → Public",
    "Endorse (own school)",
    "Endorse (own campus)",
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
  ],
  [
    "Approve a SchoolAdmin question",
    "Publish → Public",
    "No",
    "No",
    "No",
    "No",
    "No",
  ],
  ["Publish (Public + Active)", "Yes", "No", "No", "No", "No", "No"],
  ["Activate/deactivate/archive", "Yes", "No", "No", "No", "No", "No"],
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
    "Not now",
    "Retained as a lookup/legacy type but hidden and rejected by create/import.",
  ],
];

const apiTransitions = [
  ["POST /api/questions", "Create as PendingReview"],
  ["POST /api/questions/import", "Validate/import as PendingReview only"],
  ["PUT /api/questions/{id}", "Update content; Rejected remains Rejected"],
  ["POST /api/questions/{id}/submit", "Rejected → PendingReview"],
  ["POST /api/questions/{id}/approve", "PendingReview → Approved + scoped visibility"],
  ["POST /api/questions/{id}/reject", "PendingReview → Rejected + reason"],
  ["POST /api/questions/{id}/activate", "Approved: IsActive=true"],
  ["POST /api/questions/{id}/deactivate", "Approved: IsActive=false"],
  ["POST /api/questions/{id}/archive", "→ Archived; IsActive=false"],
  ["POST /api/questions/{id}/unarchive", "Archived → Approved/PendingReview (Public also Active)"],
  ["DELETE /api/questions/{id}", "Delete if permitted and not quiz-linked"],
];

const scenarios = [
  [
    "Q-01",
    "Create starts pending",
    "Create as Teacher/Parent/CampusAdmin/SchoolAdmin.",
    "Status=PendingReview, IsActive=false, Visibility=None; audience = creator + creator's CampusAdmin/SchoolAdmin + PortalAdmin. Draft is never created.",
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
    "CampusAdmin approves an in-campus Teacher/Parent question.",
    "Status=Approved (endorsed), Visibility=Campus, IsActive=false; audience stays restricted; NOT quiz-usable; still awaits PortalAdmin to publish.",
  ],
  [
    "Q-03",
    "School endorsement (not published)",
    "SchoolAdmin approves an in-school Teacher/Parent/CampusAdmin question.",
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
    "Forbidden. A CampusAdmin question needs SchoolAdmin or PortalAdmin; a SchoolAdmin question needs PortalAdmin. Approver must be a higher tier than the creator; no self or same-tier approval.",
  ],
  [
    "Q-06",
    "Non-public isolation",
    "Another teacher in the same campus, a user in another campus/school, or an unrelated admin opens the bank.",
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
    "Non-PortalAdmin owner tries to edit/delete after approval/endorsement.",
    "Forbidden. PortalAdmin retains lifecycle and mutation control.",
  ],
  [
    "Q-11",
    "Excel import",
    "Upload valid/invalid rows, run dry-run, then confirm.",
    "Valid rows become PendingReview only; row errors are reported; import never approves or publishes.",
  ],
  [
    "Q-12",
    "Fill answer privacy",
    "Student starts a quiz containing Fill in the Blanks.",
    "Accepted/model answers are not returned before submission.",
  ],
];

const checklist = [
  "Create and import (Teacher/Parent/CampusAdmin/SchoolAdmin) always produce PendingReview, IsActive=false, Visibility=None.",
  "PortalAdmin-created questions are auto-published (Approved + Public + Active).",
  "Draft is inactive/legacy and never appears as a create/import choice.",
  "A PendingReview or endorsed (Campus/School) question is visible ONLY to its creator plus that creator's CampusAdmin, SchoolAdmin, and PortalAdmin — never peers or other orgs.",
  "Only PortalAdmin approval publishes a question (Approved + Public + Active + quiz-usable).",
  "CampusAdmin/SchoolAdmin approval is an endorsement: Status=Approved but IsActive=false, audience stays restricted, and it is NOT quiz-usable until PortalAdmin publishes it.",
  "Approver must be a higher tier than the creator; no self or same-tier approval (Teacher/Parent→Campus/School/Portal; CampusAdmin→School/Portal; SchoolAdmin→Portal only).",
  "Only a Published (Public) Approved question can be Active or Inactive; approve defaults to Active only for PortalAdmin publish.",
  "PortalAdmin may deactivate a Published question; UI shows Status=Approved and Activity=Inactive.",
  "Reject requires a reason and clears active/endorsement/visibility state.",
  "Editing Rejected does not auto-submit; explicit Submit returns it to PendingReview.",
  "Only PortalAdmin can publish, activate, deactivate, archive, or mutate approved/endorsed questions.",
  "Deactivate keeps QuestionStatus=Approved and only changes IsActive.",
  "Archived and inactive are not interchangeable: Archived is status; inactive is a flag.",
  "Quiz eligibility requires Approved + Public + IsActive + ApprovedBy (published by PortalAdmin).",
  "Question bank excludes Students; students receive questions only through quiz attempts.",
  "Single/Multi/True-False/Fill validation rules are enforced on create/update/import.",
  "Descriptive remains unavailable.",
  "Accepted answers are hidden from students before attempt submission.",
  "Deleting a quiz-linked question is blocked.",
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
      <span class="chip">25 Jul 2026</span>
      <span class="chip">PortalAdmin-only publish</span>
    </div>
  </header>

  <div class="ok"><strong>Canonical model:</strong> A question is usable — Public, Active, and quiz-eligible — only after <strong>PortalAdmin</strong> approves (publishes) it. A CampusAdmin/SchoolAdmin approval is an <em>endorsement</em>: it records review progress but keeps the question Inactive and restricted to its creator plus that creator's own CampusAdmin, SchoolAdmin, and PortalAdmin. QuestionStatus records workflow state; IsActive is true only for a Published (Public) question; Visibility records how far a question has been endorsed.</div>

  <div class="note"><strong>Spec status &amp; assumptions:</strong> This v2 model reflects the confirmed rules: (1) only PortalAdmin approval publishes/activates; (2) only Public questions are quiz-usable; (3) the approver must be a strictly higher tier than the creator (no self / same-tier approval), and any eligible higher tier may act independently. <strong>Assumption to confirm:</strong> a CampusAdmin/SchoolAdmin endorsement is recorded as Status=Approved with Visibility=Campus/School but IsActive=false and a restricted audience (it does not widen the audience to peers). Not yet implemented in code — awaiting your go-ahead.</div>

  <h2>1. Canonical status meanings</h2>
  ${htmlTable(["ID", "QuestionStatus", "Activity", "Meaning"], statuses)}
  <div class="note"><strong>Important:</strong> Active and Inactive are not QuestionStatus values. A question is Active only when a PortalAdmin has published it (Public). PendingReview, Rejected, Archived, and CampusAdmin/SchoolAdmin-endorsed questions are Inactive. When PortalAdmin deactivates a Published question, Status remains Approved and Activity shows Inactive. Archived is a distinct status, not the same as Inactive.</div>

  <h2>2. Lifecycle and transitions</h2>
  ${htmlTable(["Action", "Resulting status", "State changes"], lifecycle)}

  <h2>3. Status, activity, and visibility</h2>
  ${htmlTable(
    ["Concept", "Values", "Rule"],
    [
      ["QuestionStatus", "PendingReview / Approved / Rejected / Archived", "Workflow decision. Draft is legacy only."],
      ["IsActive (Activity)", "true / false", "true only for a Published (Public) Approved question. Endorsed (Campus/School) questions and all non-Approved statuses are Inactive. PortalAdmin may deactivate/activate a Published question; UI shows Active (blue) or Inactive (slate) separately from Status=Approved (green)."],
      ["Visibility", "None / Campus / School / Public", "None/Campus/School are all restricted to the creator + that creator's CampusAdmin/SchoolAdmin + PortalAdmin. Only Public (set by PortalAdmin) is broadly visible. Campus/School mark how far a question has been endorsed, not a wider audience."],
      ["ApprovedBy", "User ID or null", "Records the admin who last approved/endorsed. Quiz eligibility requires the publisher to be PortalAdmin (Public)."],
    ],
  )}

  <h2>4. Role permissions</h2>
  ${htmlTable(
    ["Action", "PortalAdmin", "SchoolAdmin", "CampusAdmin", "Teacher", "Parent", "Student"],
    permissions,
  )}
  <div class="note"><strong>Approval hierarchy:</strong> the approver must be a strictly higher tier than the creator — Teacher/Parent → CampusAdmin, SchoolAdmin, or PortalAdmin; CampusAdmin → SchoolAdmin or PortalAdmin; SchoolAdmin → PortalAdmin only. No self-approval and no same-tier approval. Any eligible higher tier may act independently (no forced sequential chain). PortalAdmin-created questions are auto-published.</div>

  <h2>5. Visibility rules</h2>
  ${htmlTable(
    ["Visibility", "Set by", "Audience"],
    [
      ["None (PendingReview)", "Create (Teacher/Parent/CampusAdmin/SchoolAdmin)", "Creator + creator's CampusAdmin + creator's SchoolAdmin + PortalAdmin. No peers, no other campuses/schools."],
      ["Campus (endorsed)", "CampusAdmin approval", "Same restricted audience as None — an endorsement marker only. Not broadened to campus peers; not quiz-usable."],
      ["School (endorsed)", "SchoolAdmin approval", "Same restricted audience as None. Not broadened to school peers; not quiz-usable."],
      ["Public (published)", "PortalAdmin approval", "All question-managing roles; quiz-usable everywhere."],
    ],
  )}
  <p>Only PortalAdmin publication (Public) widens the audience and activates the question. Campus/School are endorsement markers, not broader audiences. Approval occurs from PendingReview (or from an endorsed state, for PortalAdmin).</p>

  <h2>6. Quiz eligibility</h2>
  <p>A bank question is eligible for quiz use only when all are true:</p>
  ${htmlList([
    "QuestionStatus is Approved (legacy Approved aliases remain readable).",
    "Visibility is Public — i.e. published by PortalAdmin.",
    "IsActive is true.",
    "ApprovedBy (the PortalAdmin publisher) is present.",
  ])}
  <p>Endorsed (Campus/School) questions are NOT quiz-usable until PortalAdmin publishes them. PortalAdmin can deactivate a Published question: Status stays Approved, Activity shows Inactive, and it is removed from new quiz selection. Archiving changes status to Archived and forces Inactive.</p>

  <h2>7. Question types</h2>
  ${htmlTable(["ID", "Type", "Availability", "Validation"], questionTypes)}

  <h2>8. Excel import</h2>
  ${htmlList([
    "Web-only UI at /questions/import; available to question-managing roles.",
    "Dry run validates the workbook and returns all row errors.",
    "Confirm import creates valid rows as PendingReview only.",
    "A Status column cannot approve a question; import never creates Approved.",
    "Class, Subject, Topic, Type, and Difficulty accept supported names or canonical IDs.",
    "Choice types accept IsCorrectN and/or CorrectOption; Fill uses accepted-answer fields.",
  ])}

  <h2>9. API transition map</h2>
  ${htmlTable(["Endpoint", "Business effect"], apiTransitions)}

  <h2>10. UI presentation rules</h2>
  ${htmlList([
    "Question status filters are PendingReview, Approved, Rejected, and Archived.",
    "Active/Inactive filters represent IsActive. Meaningful Active/Inactive variation applies only to Approved questions; other statuses are always Inactive.",
    "Approved uses green; Active uses blue; Pending uses amber; Rejected uses red; Archived/Inactive use slate.",
    "When both are needed, show two concepts separately: e.g. Status=Approved and Activity=Inactive for a PortalAdmin-deactivated Approved question.",
    "Question-list rows navigate to detail; mutation and workflow actions live on the question detail page.",
  ])}

  <h2>11. QA scenarios</h2>
  ${scenarios
    .map(
      ([id, title, steps, expected]) =>
        `<div class="scenario"><strong>${escapeHtml(id)} — ${escapeHtml(title)}</strong><p><b>Steps:</b> ${escapeHtml(steps)}</p><p><b>Expected:</b> ${escapeHtml(expected)}</p></div>`,
    )
    .join("")}

  <h2>12. Verification checklist</h2>
  ${htmlList(checklist.map((item) => `☐ ${item}`))}

  <h2>13. Known compatibility and optional work</h2>
  ${htmlList([
    "Legacy status names Pending, UnderReview, Active, Published, and Declined remain readable for migrated data; new writes use canonical names/IDs.",
    "IsAiApproved is a legacy compatibility field, not a second approval gate.",
    "Delete remains blocked while a question is linked to a quiz; guided unlink-then-delete is optional.",
    "Workflow trail: every Create / Submit / Endorse / Publish / Reject / Modify / Activate / Deactivate / Archive / Unarchive appends a row to the generic app_approval table (entity_type 2) with actor, role, reason, and timestamp — for Teacher, CampusAdmin, SchoolAdmin, and PortalAdmin alike. The detail page shows it as Approval history. Pre-existing questions are seeded with Created + Endorsed/Published rows; old rejections are not attributed (rejector was never stored).",
    "External AI grading for Fill is future work; current AllowAiReview behavior is a review stub.",
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
  docParagraph("Current implemented rules · 25 Jul 2026", {
    run: { italics: true, color: "475569" },
  }),
  docParagraph(
    "Canonical model: A question is usable — Public, Active, and quiz-eligible — only after PortalAdmin approves (publishes) it. A CampusAdmin/SchoolAdmin approval is an endorsement that records review progress but keeps the question Inactive and restricted to its creator plus that creator's own CampusAdmin, SchoolAdmin, and PortalAdmin. QuestionStatus records workflow state; IsActive is true only for a Published (Public) question; Visibility records how far a question has been endorsed.",
    { run: { bold: true, color: "166534" } },
  ),
  docParagraph(
    "Spec status & assumptions: v2 model reflects confirmed rules — (1) only PortalAdmin publishes/activates; (2) only Public questions are quiz-usable; (3) the approver must be a strictly higher tier than the creator (no self / same-tier approval), and any eligible higher tier may act independently. Assumption to confirm: a CampusAdmin/SchoolAdmin endorsement is recorded as Status=Approved with Visibility=Campus/School but IsActive=false and a restricted audience. Not yet implemented in code — awaiting go-ahead.",
    { run: { bold: true, color: "92400E" } },
  ),

  docHeading("1. Canonical status meanings"),
  docTable(["ID", "QuestionStatus", "Activity", "Meaning"], statuses),
  docParagraph(
    "Important: Active and Inactive are not QuestionStatus values. PendingReview, Rejected, and Archived are always Inactive. Only Approved may be Active or Inactive. When PortalAdmin deactivates an Approved question, Status remains Approved and Activity shows Inactive. Archived is a distinct status, not the same as Inactive.",
    { run: { bold: true, color: "92400E" } },
  ),

  docHeading("2. Lifecycle and transitions"),
  docTable(["Action", "Resulting status", "State changes"], lifecycle),

  docHeading("3. Status, activity, and visibility"),
  docTable(
    ["Concept", "Values", "Rule"],
    [
      ["QuestionStatus", "PendingReview / Approved / Rejected / Archived", "Workflow decision. Draft is legacy only."],
      ["IsActive (Activity)", "true / false", "true only for a Published (Public) Approved question. Endorsed (Campus/School) and all non-Approved statuses are Inactive. PortalAdmin may deactivate/activate a Published question."],
      ["Visibility", "None / Campus / School / Public", "None/Campus/School are restricted to the creator + that creator's CampusAdmin/SchoolAdmin + PortalAdmin. Only Public (PortalAdmin) is broadly visible. Campus/School mark endorsement progress, not a wider audience."],
      ["ApprovedBy", "User ID or null", "Records the admin who last approved/endorsed. Quiz eligibility requires the publisher to be PortalAdmin (Public)."],
    ],
  ),

  docHeading("4. Role permissions"),
  docTable(
    ["Action", "PortalAdmin", "SchoolAdmin", "CampusAdmin", "Teacher", "Parent", "Student"],
    permissions,
  ),
  docParagraph(
    "Approval hierarchy: the approver must be a strictly higher tier than the creator — Teacher/Parent → CampusAdmin/SchoolAdmin/PortalAdmin; CampusAdmin → SchoolAdmin/PortalAdmin; SchoolAdmin → PortalAdmin only. No self or same-tier approval. Any eligible higher tier may act independently. PortalAdmin-created questions are auto-published.",
    { run: { bold: true, color: "92400E" } },
  ),

  docHeading("5. Visibility rules"),
  docTable(
    ["Visibility", "Set by", "Audience"],
    [
      ["None (PendingReview)", "Create (Teacher/Parent/CampusAdmin/SchoolAdmin)", "Creator + creator's CampusAdmin + creator's SchoolAdmin + PortalAdmin. No peers or other orgs."],
      ["Campus (endorsed)", "CampusAdmin approval", "Same restricted audience as None; endorsement marker only; not quiz-usable."],
      ["School (endorsed)", "SchoolAdmin approval", "Same restricted audience as None; endorsement marker only; not quiz-usable."],
      ["Public (published)", "PortalAdmin approval", "All question-managing roles; quiz-usable."],
    ],
  ),

  docHeading("6. Quiz eligibility"),
  ...[
    "QuestionStatus is Approved (legacy aliases remain readable).",
    "Visibility is Public — published by PortalAdmin.",
    "IsActive is true.",
    "ApprovedBy (the PortalAdmin publisher) is present.",
  ].map(docBullet),

  docHeading("7. Question types"),
  docTable(["ID", "Type", "Availability", "Validation"], questionTypes),

  docHeading("8. Excel import"),
  ...[
    "Web-only UI at /questions/import.",
    "Dry run returns all row errors.",
    "Confirm creates valid rows as PendingReview only; import never approves.",
    "Lookup names or canonical IDs are accepted where documented.",
  ].map(docBullet),

  docHeading("9. API transition map"),
  docTable(["Endpoint", "Business effect"], apiTransitions),

  docHeading("10. UI presentation rules"),
  ...[
    "Workflow Status and IsActive are separate concepts.",
    "Only Approved can be Active or Inactive; other statuses are always Inactive.",
    "Approved=green; Active=blue; Pending=amber; Rejected=red; Archived/Inactive=slate.",
    "Show Status=Approved and Activity=Inactive when PortalAdmin deactivates an Approved question.",
    "List rows open detail; actions live on the detail page.",
  ].map(docBullet),

  docHeading("11. QA scenarios"),
  ...scenarios.flatMap(([id, title, steps, expected]) => [
    docHeading(`${id} — ${title}`, HeadingLevel.HEADING_2),
    docParagraph(`Steps: ${steps}`),
    docParagraph(`Expected: ${expected}`, { run: { bold: true, color: "166534" } }),
  ]),

  docHeading("12. Verification checklist"),
  ...checklist.map((item) => docBullet(`☐ ${item}`)),

  docHeading("13. Known compatibility and optional work"),
  ...[
    "Legacy status aliases remain readable; new writes use canonical names/IDs.",
    "IsAiApproved is a legacy field, not a second gate.",
    "Delete is blocked while quiz-linked; guided unlink is optional.",
    "Workflow trail recorded in app_approval; shown as Approval history on question detail.",
    "External AI grading is future work.",
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
