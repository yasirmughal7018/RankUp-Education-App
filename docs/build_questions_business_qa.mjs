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
    "Legacy only",
    "Retired from the product flow. Existing rows are migrated/read as PendingReview. Create and import never write Draft.",
  ],
  [
    "111",
    "PendingReview",
    "Inactive",
    "Waiting for scoped approval. Visibility=None. Owner may edit/delete; approver may approve or reject.",
  ],
  [
    "112",
    "Approved",
    "Active by default",
    "Accepted into the bank. Visibility is Campus, School, or Public. Non-PortalAdmin owners can no longer edit/delete.",
  ],
  [
    "113",
    "Rejected",
    "Inactive",
    "Rejected with a required reason. Visibility=None. Owner may edit, explicitly resubmit, or delete.",
  ],
  [
    "114",
    "Archived",
    "Inactive",
    "Retired by PortalAdmin and hidden from normal bank/quiz use.",
  ],
];

const lifecycle = [
  [
    "Create / Excel import",
    "PendingReview",
    "IsActive=false; Visibility=None; owner and organisation are stamped from creator.",
  ],
  [
    "Approve by CampusAdmin",
    "Approved",
    "Visibility=Campus; IsActive=true; only within the approver's campus scope.",
  ],
  [
    "Approve by SchoolAdmin",
    "Approved",
    "Visibility=School; IsActive=true; usable across that school's campuses.",
  ],
  [
    "Approve by PortalAdmin",
    "Approved",
    "Visibility=Public; IsActive=true; usable by all question-managing roles.",
  ],
  [
    "Reject by scoped approver",
    "Rejected",
    "Reason required (UI minimum 10 characters); IsActive=false; approval and visibility cleared.",
  ],
  [
    "Owner resubmits Rejected",
    "PendingReview",
    "Explicit Submit for review action; approval and visibility stay cleared.",
  ],
  [
    "PortalAdmin deactivate / activate",
    "Approved (unchanged)",
    "Only toggles IsActive. Deactivated is not a QuestionStatus.",
  ],
  [
    "PortalAdmin archive",
    "Archived",
    "IsActive=false; removed from normal bank/quiz use.",
  ],
];

const permissions = [
  ["Browse/manage bank", "Yes", "Yes", "Yes", "Yes", "Yes", "No"],
  ["Create", "Yes", "Yes", "Yes", "Yes", "Yes", "No"],
  [
    "Edit/delete PendingReview or Rejected",
    "Any",
    "Own",
    "Own",
    "Own",
    "Own",
    "No",
  ],
  ["Edit/delete Approved", "Any", "No", "No", "No", "No", "No"],
  [
    "Approve/reject PendingReview",
    "Any scope",
    "Own school",
    "Own campus",
    "No",
    "No",
    "No",
  ],
  ["Visibility produced by approval", "Public", "School", "Campus", "—", "—", "—"],
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
  ["DELETE /api/questions/{id}", "Delete if permitted and not quiz-linked"],
];

const scenarios = [
  [
    "Q-01",
    "Create starts pending",
    "Create as Teacher/Parent/CampusAdmin/SchoolAdmin/PortalAdmin.",
    "Status=PendingReview, IsActive=false, Visibility=None; Draft is never created.",
  ],
  [
    "Q-02",
    "Campus approval",
    "CampusAdmin approves an in-scope PendingReview question.",
    "Approved + Campus visibility + active. Other campuses cannot use it.",
  ],
  [
    "Q-03",
    "School approval",
    "SchoolAdmin approves an in-school PendingReview question.",
    "Approved + School visibility + active across that school's campuses.",
  ],
  [
    "Q-04",
    "Portal approval",
    "PortalAdmin approves PendingReview.",
    "Approved + Public visibility + active.",
  ],
  [
    "Q-05",
    "Reject and resubmit",
    "Approver rejects with reason; owner edits and submits for review.",
    "Rejected stays Rejected during edit, then explicit submit returns it to PendingReview.",
  ],
  [
    "Q-06",
    "Approved deactivation",
    "PortalAdmin deactivates an Approved question.",
    "Status remains Approved; IsActive=false; question is unavailable for new quiz use.",
  ],
  [
    "Q-07",
    "Archive",
    "PortalAdmin archives a question.",
    "Status=Archived; IsActive=false; hidden from normal bank/quiz use.",
  ],
  [
    "Q-08",
    "Ownership lock",
    "Non-PortalAdmin owner tries to edit/delete after approval.",
    "Forbidden. PortalAdmin retains lifecycle and mutation control.",
  ],
  [
    "Q-09",
    "Excel import",
    "Upload valid/invalid rows, run dry-run, then confirm.",
    "Valid rows become PendingReview only; row errors are reported; import never approves.",
  ],
  [
    "Q-10",
    "Fill answer privacy",
    "Student starts a quiz containing Fill in the Blanks.",
    "Accepted/model answers are not returned before submission.",
  ],
];

const checklist = [
  "Create and import always produce PendingReview, IsActive=false, Visibility=None.",
  "Draft is inactive/legacy and never appears as a create/import choice.",
  "Approve is allowed only from PendingReview and only within approver scope.",
  "CampusAdmin/SchoolAdmin/PortalAdmin approval produces Campus/School/Public visibility.",
  "Reject requires a reason and clears active/approval/visibility state.",
  "Editing Rejected does not auto-submit; explicit Submit returns it to PendingReview.",
  "Only PortalAdmin can activate, deactivate, archive, or mutate Approved questions.",
  "Deactivate keeps QuestionStatus=Approved and only changes IsActive.",
  "Archived and inactive are not interchangeable: Archived is status; inactive is a flag.",
  "Quiz eligibility requires Approved + IsActive + ApprovedBy + visible scope.",
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
    <p class="subtitle">Current implemented rules for question status, activity, visibility, permissions, import, and QA.</p>
    <div class="meta">
      <span class="chip">Current codebase</span>
      <span class="chip">25 Jul 2026</span>
      <span class="chip">Status and IsActive documented separately</span>
    </div>
  </header>

  <div class="ok"><strong>Canonical model:</strong> QuestionStatus records workflow state. IsActive independently controls whether an Approved question is usable. Visibility controls where an Approved question may be seen and used.</div>

  <h2>1. Canonical status meanings</h2>
  ${htmlTable(["ID", "QuestionStatus", "Default activity", "Meaning"], statuses)}
  <div class="note"><strong>Important:</strong> Active and Inactive are not QuestionStatus values. An Approved question can be active or inactive. Archived is a distinct status.</div>

  <h2>2. Lifecycle and transitions</h2>
  ${htmlTable(["Action", "Resulting status", "State changes"], lifecycle)}

  <h2>3. Status, activity, and visibility</h2>
  ${htmlTable(
    ["Concept", "Values", "Rule"],
    [
      ["QuestionStatus", "PendingReview / Approved / Rejected / Archived", "Workflow decision. Draft is legacy only."],
      ["IsActive", "true / false", "Soft quiz-use switch. PortalAdmin may toggle only on Approved."],
      ["Visibility", "None / Campus / School / Public", "Set on approval from approver role; cleared on reject/resubmit."],
      ["ApprovedBy", "User ID or null", "Set on Approve; required for quiz eligibility."],
    ],
  )}

  <h2>4. Role permissions</h2>
  ${htmlTable(
    ["Action", "PortalAdmin", "SchoolAdmin", "CampusAdmin", "Teacher", "Parent", "Student"],
    permissions,
  )}

  <h2>5. Visibility rules</h2>
  ${htmlTable(
    ["Approver", "Visibility", "Approved question audience"],
    [
      ["CampusAdmin", "Campus", "Question-managing roles in the same campus; SchoolAdmin of that school can also manage scope."],
      ["SchoolAdmin", "School", "Question-managing roles across all campuses in the same school."],
      ["PortalAdmin", "Public", "All question-managing roles."],
    ],
  )}
  <p>Already-Approved questions are not promoted from Campus → School → Public in v1. Approval occurs from PendingReview only.</p>

  <h2>6. Quiz eligibility</h2>
  <p>A bank question is eligible for quiz use only when all are true:</p>
  ${htmlList([
    "QuestionStatus is Approved (legacy Approved aliases remain readable).",
    "IsActive is true.",
    "ApprovedBy is present.",
    "Visibility is Campus, School, or Public and the viewer is within that scope.",
  ])}
  <p>Deactivating an Approved question keeps its status Approved but removes it from new quiz selection. Archiving changes status to Archived and also makes it inactive.</p>

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
    "Active/Inactive filters represent IsActive and must be visually separated from workflow status.",
    "Approved uses green; Active uses blue; Pending uses amber; Rejected uses red; Archived/Inactive use slate.",
    "When both are needed, show two concepts separately: e.g. Status=Approved and Activity=Inactive.",
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
    "A separate workflow audit log for Approve/Reject/Activate/Deactivate/Archive is optional and not part of the current status fields.",
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
    "Canonical model: QuestionStatus records workflow state. IsActive independently controls whether an Approved question is usable. Visibility controls where it may be seen and used.",
    { run: { bold: true, color: "166534" } },
  ),

  docHeading("1. Canonical status meanings"),
  docTable(["ID", "QuestionStatus", "Default activity", "Meaning"], statuses),
  docParagraph(
    "Important: Active and Inactive are not QuestionStatus values. An Approved question can be active or inactive. Archived is a distinct status.",
    { run: { bold: true, color: "92400E" } },
  ),

  docHeading("2. Lifecycle and transitions"),
  docTable(["Action", "Resulting status", "State changes"], lifecycle),

  docHeading("3. Status, activity, and visibility"),
  docTable(
    ["Concept", "Values", "Rule"],
    [
      ["QuestionStatus", "PendingReview / Approved / Rejected / Archived", "Workflow decision. Draft is legacy only."],
      ["IsActive", "true / false", "Soft quiz-use switch. PortalAdmin may toggle only on Approved."],
      ["Visibility", "None / Campus / School / Public", "Set on approval from approver role; cleared on reject/resubmit."],
      ["ApprovedBy", "User ID or null", "Set on Approve; required for quiz eligibility."],
    ],
  ),

  docHeading("4. Role permissions"),
  docTable(
    ["Action", "PortalAdmin", "SchoolAdmin", "CampusAdmin", "Teacher", "Parent", "Student"],
    permissions,
  ),

  docHeading("5. Visibility rules"),
  docTable(
    ["Approver", "Visibility", "Approved question audience"],
    [
      ["CampusAdmin", "Campus", "Same campus (plus SchoolAdmin management scope)."],
      ["SchoolAdmin", "School", "All campuses in the same school."],
      ["PortalAdmin", "Public", "All question-managing roles."],
    ],
  ),

  docHeading("6. Quiz eligibility"),
  ...[
    "QuestionStatus is Approved (legacy aliases remain readable).",
    "IsActive is true.",
    "ApprovedBy is present.",
    "Visibility is valid and the viewer is in scope.",
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
    "Approved=green; Active=blue; Pending=amber; Rejected=red; Archived/Inactive=slate.",
    "Show status and activity separately when both matter.",
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
    "Workflow audit log is optional.",
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
