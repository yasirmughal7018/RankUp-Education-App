# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

.NET 10 ASP.NET Core backend for the RankUp Education platform. Shared REST API consumed by both the React admin/teacher web client (`../React`) and the Flutter mobile app (`../Mobile`). PostgreSQL persistence.

## Commands

```powershell
# Run the API (from WebApi/)
dotnet run --project src/RankUpEducation.Api --launch-profile http
# -> http://localhost:5255

# Build
dotnet build WebApi/src/RankUpEducation.Api/RankUpEducation.Api.csproj -c Release

# Run all tests
dotnet test tests/RankUpEducation.Application.Tests

# Run a single test class or method
dotnet test tests/RankUpEducation.Application.Tests --filter "FullyQualifiedName~QuizPartialCreditTests"
dotnet test tests/RankUpEducation.Application.Tests --filter "FullyQualifiedName~QuizPartialCreditTests.MethodName"
```

CI (`.github/workflows/webapi-ci.yml`) only runs `dotnet build` in Release on `WebApi/**` changes — it does not run tests, so run `dotnet test` locally before pushing changes that touch scoring/lifecycle/approval logic.

### Local secrets

`appsettings.json` / `appsettings.Development.json` are tracked with placeholders only (`CHANGE_ME`). Set real values with `dotnet user-secrets` (run from `src/RankUpEducation.Api`) or `ConnectionStrings__DefaultConnection` / `Jwt__SigningKey` env vars. Never commit real secrets.

## Architecture

Clean Architecture, layered as separate projects, with feature folders mirrored across layers (e.g. `Quizzes/`, `Directory/`, `Auth/` each appear in `Domain`, `Application`, `Contracts`, and `Infrastructure`):

- **`RankUpEducation.Domain`** — entities, enums, business rules. No framework dependencies.
- **`RankUpEducation.Application`** — use cases/services, validation, orchestration. This is where business rules live and where most unit tests target (`tests/RankUpEducation.Application.Tests`).
- **`RankUpEducation.Contracts`** — request/response DTOs shared conceptually with React and Flutter (they hand-maintain matching TS types / Dart models — there's no shared codegen).
- **`RankUpEducation.Infrastructure`** — EF Core (`RankUpDbContext`), repositories, entity configurations, auth infra.
- **`RankUpEducation.Integration`** — third-party adapters (Email, SMS, Push, FileStorage, ExternalApis). Many are stub/no-op implementations registered via `AddApiIntegrationFallbacks()` — check the actual implementation before assuming a channel really sends anything (e.g. password reset email/SMS/push are NoOp today).
- **`RankUpEducation.Api`** — controllers, middleware, filters, DI wiring (`Program.cs`).
- **`RankUpEducation.Common`** — cross-cutting configuration/validation/utilities shared by multiple layers.

DI is composed in `Program.cs` via `AddRankUpCommonConfiguration`, `AddApplication`, `AddInfrastructure`, `AddApiIntegrationFallbacks` — each is an extension method defined in that layer's own assembly. Add new services there, not directly in `Program.cs`.

### Schema management: no EF Migrations

There is **no `Migrations/` folder in active use** — schema is created/kept up to date at startup by `ApiSupportSchemaInitializer` (`Infrastructure/Persistence/ApiSupportSchemaInitializer.cs`), which runs raw SQL (`EnsureCreatedAsync`) before the app serves traffic (see `Program.cs`). When adding or changing a table/column/constraint/index/lookup value, **edit the schema initializer**, not `dotnet ef migrations add`. EF `Configurations/*Configuration.cs` classes still describe entity mapping for LINQ/EF Core queries but are not the source of schema truth for DDL.

### Auth & roles

- JWT bearer auth (`Jwt:SigningKey`/`Issuer`/`Audience`), tokens issued from `AuthController`/`Application/Auth`.
- Roles: `PortalAdmin`, `SchoolAdmin`, `CampusAdmin`, `Teacher`, `Coordinator`, `Student`, `Parent`. Stored in `app_user_roles`, **not** a column on `app_users`. Student and PortalAdmin are mutually exclusive with everything else; the others can combine (Parent+Teacher is the common case). Legacy "Tutor" accounts are remapped to Parent.
- The active session role is on the JWT / `refresh_tokens.active_role` ("Current" / "Acting as" in UI) — there is no `is_active` flag on individual role rows.
- Response envelope for every endpoint: `{ success, message, data, errors }` — keep this shape for new endpoints since both clients depend on it.

### Approvals: one shared table

Per `.cursor/rules/app-approval-table.mdc` (always-apply rule): **every** approval/review/workflow trail goes through the single `app_approval` table (`Approval` domain entity) keyed by `entity_type` (`ApprovalEntityType`) + `request_id`. Do not create per-feature approval tables (no `app_user_school_change_approval`, etc.) and do not add feature-specific FK columns to `app_approval` — use `request_id`. Two usage patterns:
- **Queue style** (registration, school change): one pending row per eligible approver, resolved via `MarkApproved`/`MarkRejected`.
- **Trail style** (question, quiz): append-only decided events via `Record*Event`.

New `ApprovalEntityType` values must be seeded in `lookups`, widen the `chk_app_approval_target` check constraint, and update indexes — all in `ApiSupportSchemaInitializer`.

### Quiz domain rules (frequently touched — see `.cursor/rules/quiz-*.mdc` and `docs/05_RankUp_Quiz_Business_QA.html`)

Approval and **publishing are separate permissions** — this is the single most common source of bugs here:

- **Lifecycle** (`QuizLifecycleStatus`): `60 Draft → 61 Published → 63 Archived` (62 `Assigned` is a **retired** lookup — legacy rows remap to Published; per-student assignment lives entirely on `quiz_assignment`, never on the quiz row). Draft covers WIP, submitted-pending, and post-approval-awaiting-publish alike — only **PortalAdmin** can move Draft → Published, and only after approval gates are met. Assign requires lifecycle **Published**, not "Approval=Approved" by itself.
- **Approval** (`QuizApprovalStatus`, exactly 4 rows): `40 Pending → 41 SchoolApproved → 42 Approved`, or `43 Rejected` (reason required). SchoolAdmin/CampusAdmin approval **never auto-publishes** — it only reaches SchoolApproved and lifecycle stays Draft. Routing depends on creator: Teacher/Coordinator → School or Campus admin approves (→ SchoolApproved) → PortalAdmin approves (→ Approved) → PortalAdmin publishes. SchoolAdmin/CampusAdmin/Parent-created quizzes **skip SchoolApproved entirely** — straight to PortalAdmin (Pending → Approved → Publish). Creator can never self-approve. Rejected quizzes can only be resubmitted (back to Pending) by the original creator — not by the admin who rejected them, not even PortalAdmin.
- **Published catalog is shared, not scoped**: once Published, a school-type quiz (Practice/Assessment/Competition/Surprise) is visible to **every** Teacher/Coordinator/SchoolAdmin/CampusAdmin/PortalAdmin/Parent regardless of creator or school — creator/school is metadata, not a visibility filter, for these staff roles. Students are the exception: they only see quizzes with an assignment row for them, or `AudienceScope=Public` within the audience window.
- **Quiz edit requests** (`app_quiz_edit_request` + `app_approval` entity_type `QuizEditRequest`=2106): once a quiz passes SchoolApproved/Approved/Published/Assigned, the owner can no longer edit in place — they must send a reasoned (≥10 char) edit request. Teacher/Coordinator requests queue to SchoolAdmin+CampusAdmin+PortalAdmin (any one grants); SchoolAdmin/CampusAdmin/Parent requests go to PortalAdmin only. PortalAdmin always edits in place, no request needed. Using a granted edit resets the quiz to Draft+Pending and cancels other pending requests for it — the owner must resubmit and, if it was published, get republished.
- **One attempt only**: every quiz allows exactly one attempt per assigned student — no "allowed attempts" field, no retry, no reassigning a student who already has a `QuizAssignment` row (the assign picker locks/skips them). Cancelling a future/unused assignment hard-deletes that row (that's not "reassign" — a fresh assignment afterward is a new row).
- **Auto-scoring / partial marks** (`QuizPartialCredit.Award`): applies only to Multiple Choice, Matching, Ordering. `CorrectPercentage = Floor((Correct/Total) × 100)`, `AwardedMarks = Floor(MaxMarks × Correct/Total)`. Always floor, never round. Single Choice/True-False/Media are all-or-nothing; Fill-in-Blanks needs a full accepted-answer match to auto-score (else goes to AI/teacher review); Descriptive/Essay/File Upload are never auto-marked. See the rule file for per-type component counting (MC = set semantics; Match/Order = index-aligned slots, keep zeros, never `Distinct()`).
- **Result announcement timing**: while the assignment window is open, nothing is announced (0%, no correct answers, no "View result" button); after the due date, auto-graded questions are announced ("Partial results"); after the owner finalizes review (`IsReviewDone`), everything is announced ("Completed") and the review page locks against further edits. Announcement instant = later of `SubmittedAt` and assignment `EndDateTime`.
- Optional-vs-required create fields (Topic/Difficulty always optional; School/Campus optional-but-role-scoped, persisted as `NULL` not `0`) — see `quiz-create-optional-fields.mdc` before changing the create/edit contract.

The quiz roadmap (`.cursor/plans/quiz_implementation_roadmap_3425b6fe.plan.md`) marks all 4 planned waves (marks snapshot, server time enforcement, result-status progression, attempt UX, audiences, type rules/AI review) as **completed** — treat quiz functionality as largely built; check `QuizService`/`QuizAssignService`/`QuizStatusCalculator` before assuming something is missing.

### Question bank approval is a *separate* model from quiz approval

Don't conflate the two. Question workflow (`docs/04_RankUp_Questions_Business_QA.html`) is `PendingReview(111) → Approved(112) / Rejected(113) / Archived(114)`, but the key rule is: **only PortalAdmin publishing sets `Visibility=Public` + `IsActive=true`** (the only state that's attachable to a quiz from the bank). A CampusAdmin/SchoolAdmin "approval" is just an *endorsement* (`Visibility=Campus/School`) — it stays `IsActive=false` and restricted to the creator's own admin chain; it does not widen the audience or make the question quiz-usable. The approver must be a strictly higher tier than the creator (no self- or same-tier approval). The one exception: a question created **inline on a quiz** (`POST /api/quizzes/{id}/questions`) is auto-`MarkFullyApproved` (Campus + Active) and skips PendingReview entirely, but is usable only on that quiz — it's still not Public/bank-eligible. CampusAdmin can create/endorse bank questions but **cannot** manage quizzes at all (no attach-from-bank, no inline create).

### Auth: role requests, companion grants, school-change lock

Beyond core login/JWT (above), there's a substantial self-service + admin layer, all **Web-only by explicit product decision** (not unfinished work) unless noted: self-service request for an additional Parent/Teacher/Coordinator role (`POST /api/auth/me/role-requests`, admin approves via `/api/auth/role-requests/{id}/approve`), directory "companion role" grant/remove from list overflow menus (`POST/DELETE /api/directory/{teachers|parents|coordinators}/{id}/roles/{role}` — Parent companion mutations on Teachers/Coordinators are **PortalAdmin-only**, School/CampusAdmin must not see them), and school/campus change requests that lock the account (`POST /api/auth/me/school-change`) until a scoped admin applies or rejects it via `/api/auth/school-changes/{id}/approve|reject`. Password reset supports both an emailed token and admin/parent "Clear" (`POST /api/auth/password-reset/clear`) — first completion wins, the other path then fails. Full detail: `docs/02_RankUp_Authentication_Logic.html` and `docs/03_RankUp_User_Creation_Approval_QA.html`.

### `docs/RankUp_Flutter_Mobile_App.md` is the original aspirational spec — not current-state truth

That file is the original "Codex AI Development Handover" brief and describes gamification (points/levels/streaks/badges), a full AI learning assistant, career guidance, portfolios, etc. Later QA docs explicitly say most of that was **deliberately not built or removed** — see `docs/04_RankUp_Students_QA.html` §7/§11 ("fake gamification intentionally removed from live Web/Mobile student dashboards", AI assistant is a static Mobile UI with no backend). When in doubt about whether a feature exists, trust the dated QA docs (`docs/0*_QA.html`) and the actual code over this spec file.

### Docs are part of the change, not an afterthought

`.cursor/rules/update-docs-with-every-change.mdc` (always-apply): when you change quiz/question/auth/registration business behavior, update the matching generator in `docs/build_*.mjs` (then rebuild) and the relevant `.cursor/rules/*.mdc` in the **same turn** — don't wait to be asked. If the user's message is itself a feature/spec prompt, save it verbatim to `docs/prompts/YYYY-MM-DD-slug.md` and add a row to `docs/prompts/README.md`.

## Related

- Business/QA reference docs: `../docs/0*_RankUp_*_QA.html` (auth, user approval, questions, quiz).
- React client expectations for this API: `../React/CLAUDE.md`, `../React/README.md`.
- Mobile client expectations: `../Mobile/CLAUDE.md`, `../Mobile/docs/API_INTEGRATION.md`.
