# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Flutter mobile app for RankUp Education, covering Student, Parent, Teacher, Coordinator, and admin (SchoolAdmin/CampusAdmin/PortalAdmin) roles from one codebase, on top of the same .NET Web API used by the React web client (`../WebApi`).

## Commands

```powershell
flutter pub get
flutter analyze
flutter test                                  # all tests
flutter test test/student_dashboard_test.dart # single test file
flutter run                                    # default: real API at http://10.0.2.2:5255/api (Android emulator)
```

Useful `--dart-define` overrides for `flutter run`:
- `API_BASE_URL=http://10.0.2.2:5255/api` — point at a different API host/port.
- `USE_MOCKS=true` — offline mock auth for demo accounts only (`student-demo`/`parent-demo`/`teacher-demo`, password `password`). Default mode always calls `POST /api/auth/login` against the real API with real PostgreSQL-backed credentials.
- `APP_ENV=development|test|staging|production`.

`10.0.2.2` is how the Android emulator reaches your host machine — `localhost` won't work from the emulator. Start the Web API first (`dotnet run --project ../WebApi/src/RankUpEducation.Api --launch-profile http`).

CI (`.github/workflows/mobile-ci.yml`) runs on `Mobile/**` changes: `flutter pub get` → `flutter analyze` → `flutter test`. All three must pass; run them locally before pushing.

If `android/`/`ios/` wrappers are ever missing, regenerate with `flutter create --project-name rankup_education --org com.rankupeducation --platforms android,ios .` from `Mobile/`.

## Architecture

Feature-first Clean Architecture under `lib/features/<feature>/`, same shape as the React app:

```
features/<feature>/
├── data/            datasources, models, repositories (implemented features only)
├── domain/          entities, repository interfaces, usecases (implemented features only)
└── presentation/
    ├── controllers/ or providers/   Riverpod state
    ├── pages/
    └── widgets/
```

State management is **Riverpod** (`flutter_riverpod`), navigation is **GoRouter** (`lib/app/router.dart`, role-based route access), networking is **Dio** (`lib/core/api/api_client.dart`). Entry point `lib/main.dart` builds `AppEnvironment.fromDartDefines()` and wraps the app in a `ProviderScope` override.

Shared/core code: `lib/core/api` (client + response envelope + exception mapping), `lib/core/auth`, `lib/core/permissions` (`ActionPermissionService`), `lib/core/lookups`, `lib/core/storage` (secure token store, device id), `lib/core/synchronization` (offline sync queue — currently a **placeholder**), `lib/core/notifications` (placeholder), `lib/core/network` (connectivity), `lib/core/widgets` (shared UI: empty states, stat cards, field labels).

### Feature maturity — not everything is real yet

Per `README.md`'s "Current platform notes": many feature directories here are **UI shells calling stub API endpoints that return empty lists** — there is no real domain logic behind them yet. Before implementing against one of these, verify against the actual `WebApi` controller rather than assuming the mobile stub reflects final behavior:
- Fully real / actively developed: `authentication`, `quizzes`, `parent_quizzes`, `questions`, `student_dashboard`, `teacher`, `parent`, `admin`, `reports`, `rankings`.
- Stub/placeholder-backed (per README): `notifications`, `attendance`, `messaging`, `rewards`, `competitions`, `worksheets`, and further-out shells like `career_guidance`, `goals`, `portfolio`, `ai_assistant`, `discussions`, `learning_path`, `search`, `sharing`, `support`.
- Offline sync queue (`core/synchronization/sync_queue.dart`) and push registration are explicitly placeholders — don't assume attempts/answers survive being fully offline yet beyond what `quizzes/data/local` already does for quiz attempts.

### Auth & roles

Common username/password login routes by backend-driven role. Roles: `PortalAdmin`, `SchoolAdmin`, `CampusAdmin`, `Teacher`, `Coordinator`, `Student`, `Parent` — assignments live in `app_user_roles` on the backend (a user can hold multiple, e.g. Parent+Teacher; Student/PortalAdmin are exclusive). `LockedPendingSchoolChange` login handling and school-change UI are **known gaps** on mobile (no UI for it yet) — check with the user before assuming this path works.

The login screen also has admin-assisted actions ("Forgot password?", "Request account access") that send requests for manual admin review rather than doing anything client-side.

### Quiz domain rules that apply here too (see `../.cursor/rules/quiz-*.mdc` and `../docs/05_RankUp_Quiz_Business_QA.html`)

The mobile quiz flow (student attempt with offline sync, teacher/parent manage, assignment board, monitoring, subjective review, admin approvals) must follow the same backend-enforced rules as web:
- **One attempt only** — no retry/reassign UI or allowed-attempts field; a student who already has an assignment row for a quiz cannot be re-assigned.
- **Approval ≠ publish** — School/CampusAdmin "approve" only reaches SchoolApproved; the quiz stays unpublished (not assignable) until PortalAdmin publishes it. Mobile's `/quizzes/approvals` (SchoolAdmin/PortalAdmin) reflects this, not a simple approve-and-go-live.
- **Quiz edit requests** — once a quiz is past Pending, mobile manage still needs to route edits through a request/grant flow rather than a raw update; per the QA doc this UI is a known gap on mobile today (API already rejects the raw edit), so don't assume an edit screen "just works" post-approval.
- **Partial-marks scoring** — when displaying calculated/awarded marks, always floor, never round (`Floor(MaxMarks × Correct/Total)`); for Matching/Ordering, selection lists are index-aligned slots — don't compact out empty/zero slots.
- **Result announcement timing** — while the assignment window is open, don't show marks/correctness; after the due date, show auto-graded-only "partial results"; only after the owner finalizes review show full results.
- **Published catalog is shared** — a Teacher/Coordinator/Parent's quiz list should include every published school-type quiz platform-wide, not just ones created by/for their own school.

Full detail (and the canonical status IDs) lives in `WebApi/CLAUDE.md` and the `.cursor/rules/quiz-*.mdc` files — treat those as the source of truth over any mobile-side assumption.

### `docs/RankUp_Flutter_Mobile_App.md` is the original spec, not current-state truth

That file (the original "Codex AI Development Handover" brief) describes a much larger feature set than what's live — gamification (points/levels/streaks/badges), a full AI learning assistant, career guidance, portfolios, discussion boards. `../docs/04_RankUp_Students_QA.html` §7/§11 explicitly documents that fake gamification and AI were **removed from live dashboards** (Web and Mobile alike) and that AI Assistant is a static UI with no backend. When a feature directory here (e.g. `ai_assistant`, `career_guidance`, `portfolio`, `goals`) looks unimplemented, that's very likely intentional per current product decisions, not a gap to silently fill in — confirm with the user before building out product behavior that contradicts the QA docs. Also: admin directory, companion role grant/remove, self-service role-request/remove, school-change admin queue, and password-reset Clear are **Web-only by product decision**, not pending mobile work — don't build them here without being asked.

## Related

- `docs/API_INTEGRATION.md` — API integration notes, including which modules are stubbed.
- `docs/ARCHITECTURE.md` — architecture detail beyond this file.
- Backend contract/business rules: `../WebApi/CLAUDE.md`.
- Web client (same backend, more complete feature parity today): `../React/CLAUDE.md`.
