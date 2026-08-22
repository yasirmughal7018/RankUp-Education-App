# RankUp Education — React Web App

React web client for school administration, quiz management, directory, and reporting. This app connects to the existing **RankUp Education .NET Web API**.

## Tech Stack

| Layer | Technology |
| --- | --- |
| UI | React 19 + TypeScript |
| Build | Vite 7 |
| Routing | React Router 7 |
| Data fetching | TanStack Query 5 |
| Styling | Tailwind CSS 3 |
| Tests | Vitest + Testing Library + jsdom |
| API | Fetch-based client aligned with .NET response envelope |

## Project Structure

```text
React/
├── public/                 Static assets
├── docs/                   Deployment notes
├── src/
│   ├── app/                App shell, router, layout, environment
│   ├── core/               Shared API client, types, UI components
│   └── features/           Feature modules (auth, admin, directory, reports, ...)
├── .env.example            Environment variable template
├── index.html              Vite entry HTML
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

Architecture follows the same **feature-based Clean Architecture** used in the Flutter mobile app:

```text
features/<feature>/
├── data/
├── domain/
└── presentation/
    ├── components/
    ├── hooks/
    └── pages/
```

## Prerequisites

- **Node.js 20+** (LTS recommended)
- **npm 10+**
- Running **RankUp Education Web API** (default: `http://localhost:5255`)

## Getting Started

### 1. Install dependencies

```powershell
cd "D:\Projects\RankUp Education\React"
npm install
```

### 2. Configure environment

```powershell
copy .env.example .env
```

Default values:

```env
VITE_API_BASE_URL=http://localhost:5255/api
VITE_APP_NAME=RankUp Education
```

**Production notes**

- Always set `VITE_API_BASE_URL` to your public API base URL **including** `/api`.
- Never commit `.env` (it is gitignored). Use host/CI secrets instead.
- Serve the web app and API over **HTTPS** in production.
- Configure API **CORS** to allow the web origin.
- See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the deploy checklist.

### 3. Start development server

```powershell
npm run dev
```

App runs at: **http://localhost:5173**

### 4. Build for production

```powershell
npm run build
npm run preview
```

## Available Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm run test` | Run Vitest unit tests once |

## Current Pages

| Route | Access | Page |
| --- | --- | --- |
| `/` | Public | Home — project overview |
| `/login` | Guest only | Login — calls `POST /api/auth/login` |
| `/dashboard` | Authenticated | Role-based dashboard |
| `/admin` | PortalAdmin, SchoolAdmin, CampusAdmin | Administration overview |
| `/admin/registrations` | PortalAdmin, SchoolAdmin, CampusAdmin | Pending account requests |
| `/admin/directory/role-requests` | PortalAdmin, SchoolAdmin, CampusAdmin | Pending additional Parent/Teacher role requests |
| `/admin/directory` | PortalAdmin, SchoolAdmin | Directory overview |
| `/admin/directory/schools` | PortalAdmin, SchoolAdmin | Schools + campuses |
| `/admin/directory/students` | PortalAdmin, SchoolAdmin | Students search |
| `/admin/directory/teachers` | PortalAdmin, SchoolAdmin | Teachers search |
| `/admin/directory/parents` | PortalAdmin, SchoolAdmin | Parents + link/unlink students |
| `/reports` | PortalAdmin, SchoolAdmin, Teacher | Quiz summary, rankings, performance |
| `/questions` | Teacher, Parent, Coordinator, Tutor, SchoolAdmin, CampusAdmin, PortalAdmin | Question bank list |
| `/questions/new` | Teacher, Parent, Coordinator, Tutor, SchoolAdmin, CampusAdmin, PortalAdmin | Create question |
| `/questions/:id` | Teacher, Parent, Coordinator, Tutor, SchoolAdmin, CampusAdmin, PortalAdmin | Question detail |
| `/questions/:id/edit` | Teacher, Parent, Coordinator, Tutor, SchoolAdmin, CampusAdmin, PortalAdmin | Edit question |
| `/quizzes` | Teacher, Parent, Coordinator, Tutor, SchoolAdmin, CampusAdmin, PortalAdmin | Quiz list. Admins open Draft rows on `/quizzes/:id` to approve or reject |
| `/quizzes/new` | Teacher, Parent, Coordinator, Tutor, SchoolAdmin, PortalAdmin | Create quiz |
| `/quizzes/:id` | Teacher, Parent, Coordinator, Tutor, SchoolAdmin, PortalAdmin | Quiz detail, questions, publish, assign |
| `/quizzes/:id/edit` | Teacher, Parent, Coordinator, Tutor, SchoolAdmin, PortalAdmin | Edit quiz settings |
| `/quizzes/reviews/pending` | Teacher, Parent, Coordinator, Tutor, SchoolAdmin, PortalAdmin | Pending attempt reviews |
| `/quizzes/assignments` | Teacher, Parent, Coordinator, Tutor, SchoolAdmin, PortalAdmin | Assignment board overview |
| `/quizzes/:id/monitoring` | Teacher, Parent, Coordinator, Tutor, SchoolAdmin, PortalAdmin | Live quiz monitoring |
| `/quizzes/:id/attempts/:attemptId/review` | Teacher, Parent, Coordinator, Tutor, SchoolAdmin, PortalAdmin | Mark and finalize review |
| `/parent/quiz-dashboard` | Parent | Quiz stats, recent quizzes, linked children shortcuts |
| `/parent/children` | Parent | Linked children overview |
| `/parent/children/:studentId/history` | Parent | Child quiz history |
| `/parent/children/:studentId/quizzes/:quizId/attempts/:attemptId/result` | Parent | Child attempt result |
| `/teacher/students` | Teacher, Coordinator | Class roster and student groups |
| `/tutor/students` | Tutor | Linked students |
| `/tutor/students/:studentId/history` | Tutor | Linked student quiz history |
| `/student/quizzes` | Student | Assigned quiz list |
| `/student/quizzes/:id` | Student | Quiz detail and start attempt |
| `/student/quizzes/:id/attempts/:attemptId` | Student | Take quiz attempt |
| `/student/quizzes/:id/attempts/:attemptId/result` | Student | View attempt result |
| `/forgot-password` | Guest only | Request password reset |
| `/request-access` | Guest only | Request account access |
| `*` | Public | Not Found |

## TanStack Query

Server state is cached with `@tanstack/react-query`. The app is wrapped in `QueryClientProvider` via `src/app/AppQueryProvider.tsx`.

Feature hooks:

- `src/features/quizzes/presentation/hooks/useQuizQueries.ts`
- `src/features/questions/presentation/hooks/useQuestionQueries.ts`
- `src/features/student/presentation/hooks/useStudentQuizQueries.ts`
- `src/features/parent/presentation/hooks/useParentQueries.ts`
- `src/features/directory/presentation/hooks/useDirectoryQueries.ts`
- `src/features/reports/presentation/hooks/useReportQueries.ts`
- `src/core/hooks/useLookups.ts`

## Directory

List / search:

- `GET /api/directory/schools`
- `GET /api/directory/schools/{id}/campuses`
- `GET /api/directory/students?search=` (also `schoolId`, `campusId`, `grade`)
- `GET /api/directory/teachers?search=` (also `schoolId`, `campusId`)
- `GET /api/directory/parents?search=`
- `POST /api/directory/parents/{parentId}/students`
- `DELETE /api/directory/parents/{parentId}/students/{studentId}`

School / campus CRUD (Schools page):

- `POST /api/directory/schools` — create school (**PortalAdmin** only); body `{ name, code, isActive }`
- `PUT /api/directory/schools/{schoolId}` — update school (**PortalAdmin**, **SchoolAdmin**)
- `POST /api/directory/schools/{schoolId}/activate`
- `POST /api/directory/schools/{schoolId}/deactivate`
- `POST /api/directory/schools/{schoolId}/campuses` — body `{ name, address?, isActive }`
- `PUT /api/directory/campuses/{campusId}`
- `POST /api/directory/campuses/{campusId}/activate`
- `POST /api/directory/campuses/{campusId}/deactivate`

Students / Teachers / Parents pages keep Apply-button search and show the first **50** rows with a “Showing X of Y” caption.

## Reports

- `GET /api/reports/quiz-summary?from=&to=` — optional date range on the Reports page
- `GET /api/reports/quizzes/{id}/performance`
- `GET /api/reports/rankings?quizId=`
- `GET /api/reports/students/{id}/quiz-history`

Rankings and performance tables support client-side **CSV export** (see `src/core/utils/csv.ts`).

## Assignment Board

- `GET /api/quizzes/assignments?studentId=`
- Page: `/quizzes/assignments`
- Teacher tables show `studentName` from the API (fallback to student ID)

## Student Quiz Attempt (Web)

- `GET /api/quizzes/{id}` — quiz detail
- `POST /api/quizzes/{id}/attempts` — start attempt
- `POST /api/quizzes/{id}/attempts/{attemptId}/submit` — submit answers
- `GET /api/quizzes/{id}/attempts/{attemptId}/result` — view result (students and linked parents)

Timed attempts show a countdown and auto-submit when time expires. Answers are restored from `sessionStorage` if the page is refreshed during an attempt.

## Parent Quiz Dashboard

- Page: `/parent/quiz-dashboard`
- Uses `GET /api/quizzes` (parent manage scope) for stats and recent quizzes
- Shortcuts to `/parent/children`, `/quizzes/assignments`, and quiz manage
- Linked children list with history links (`GET /api/reports/students/{studentId}/quiz-history`)

## Parent Linked Students

- `GET /api/parents/me/students`
- Page: `/parent/children`
- Quiz history: `GET /api/reports/students/{studentId}/quiz-history`
- Assignment board supports `?studentId=` filtering

## Tutor Linked Students

- `GET /api/tutors/me/students` (link/unlink via tutor API)
- Pages: `/tutor/students`, `/tutor/students/:studentId/history`
- Tutors share quiz manage and assignment-board access with teachers (scoped to linked students for assign modes)

## Auth Extras

- `POST /api/auth/password-reset/request` — `/forgot-password`
- `POST /api/auth/register` — `/request-access`
- `POST /api/auth/switch-role` — multi-role session switch (user-menu **Acting as** toggle)
- `DELETE /api/auth/me/roles/{role}` — remove Parent/Teacher when another role remains (`/account`)
- `POST /api/auth/me/role-requests` — request additional Parent or Teacher
- `GET /api/auth/role-requests/pending` + approve/reject — `/admin/directory/role-requests`

## Quiz Monitoring & Review

- `GET /api/quizzes/reviews/pending`
- `GET /api/quizzes/{id}/monitoring`
- `GET /api/quizzes/{id}/attempts/{attemptId}/review`
- `PUT /api/quizzes/{id}/attempts/{attemptId}/answers`
- `POST /api/quizzes/{id}/attempts/{attemptId}/finalize-review`

## Authentication Flow

1. User submits username and password on `/login`.
2. App calls `POST /api/auth/login` and stores access + refresh tokens in `localStorage`.
3. On app load, stored tokens are validated with `GET /api/auth/me`.
4. Protected routes redirect unauthenticated users to `/login`.
5. On `401`, the app refreshes tokens via `POST /api/auth/token/refresh`.
6. Logout calls `POST /api/auth/logout` and clears local storage.

Supported roles from the API: `PortalAdmin`, `SchoolAdmin`, `CampusAdmin`, `Teacher`, `Coordinator`, `Tutor`, `Student`, `Parent`.

Multi-role: assignments live in `app_user_roles`. Session role is `CurrentUser.role` (Acting as / Current); full list is `CurrentUser.roles`. Student and PortalAdmin cannot combine with other roles. See `docs/02_RankUp_Authentication_Logic.html`.

## API Integration

The web app expects the same response shape as the mobile app:

```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": {},
  "errors": []
}
```

Shared types live in `src/core/api/types.ts`. Requests go through `src/core/api/apiClient.ts`.

## Lookups API

Dropdown selectors load values from:

- `GET /api/lookups?type=Class`
- `GET /api/lookups?type=Subject`
- `GET /api/lookups?type=Topic&parentId={subjectId}`
- `GET /api/lookups?type=DifficultyLevel`
- `GET /api/lookups/types`

React helpers live in `src/core/lookups/` and `src/core/components/LookupSelect.tsx`.

## CI

- React: `.github/workflows/react-ci.yml` — push/PR on `React/**` (`npm ci`, lint, test, build)
- Web API: `.github/workflows/webapi-ci.yml` — push/PR on `WebApi/**` (`dotnet build` Release)

## Related Projects

| Project | Path |
| --- | --- |
| Mobile (Flutter) | `../Mobile` |
| Web API (.NET) | `../WebApi` |
| Deployment checklist | [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) |
