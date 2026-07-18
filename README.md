# RankUp Education

Monorepo for the RankUp Education platform: Flutter mobile app, ASP.NET Core Web API, and React admin/teacher web client.

## Projects

| Project | Path | Stack | Purpose |
| --- | --- | --- | --- |
| **Mobile** | [`Mobile/`](Mobile/) | Flutter + Riverpod | Student, Parent, and Teacher mobile experience |
| **Web API** | [`WebApi/`](WebApi/) | .NET 10 ASP.NET Core | Shared REST API, auth, quizzes, directory, reports |
| **React** | [`React/`](React/) | React 19 + Vite + TanStack Query | Admin, teacher, parent, and student web UI |

## Prerequisites

- **.NET 10 SDK** — Web API
- **Node.js 20+** and **npm 10+** — React web app
- **Flutter** (stable) — Mobile app
- **PostgreSQL** — API persistence (see Web API appsettings)

## Quick start

### 1. Web API

```powershell
cd "D:\Projects\RankUp Education\WebApi"
dotnet run --project src/RankUpEducation.Api --launch-profile http
```

Default HTTP profile listens on **http://localhost:5255**.

More detail: [`WebApi/README.md`](WebApi/README.md)

### 2. React web app

```powershell
cd "D:\Projects\RankUp Education\React"
copy .env.example .env
npm install
npm run dev
```

App: **http://localhost:5173**  
API base (default): `http://localhost:5255/api`

- App docs: [`React/README.md`](React/README.md)
- Deploy checklist: [`React/docs/DEPLOYMENT.md`](React/docs/DEPLOYMENT.md)

### 3. Mobile (Flutter)

```powershell
cd "D:\Projects\RankUp Education\Mobile"
flutter pub get
flutter run
```

Android emulator API default: `http://10.0.2.2:5255/api`  
More detail: [`Mobile/README.md`](Mobile/README.md)

## CI

| Workflow | Triggers on | What it runs |
| --- | --- | --- |
| [`.github/workflows/react-ci.yml`](.github/workflows/react-ci.yml) | `React/**` | `npm ci`, lint, test, build |
| [`.github/workflows/webapi-ci.yml`](.github/workflows/webapi-ci.yml) | `WebApi/**` | `dotnet build` (Release) |
| [`.github/workflows/mobile-ci.yml`](.github/workflows/mobile-ci.yml) | `Mobile/**` | `flutter pub get`, analyze, test |

## Current platform notes

- **SchoolAdmin** can create schools (directory schools API + React admin UI).
- Directory supports **user CRUD** for students, teachers, and parents, with **pagination** on list endpoints.
- Product/API surface includes quiz, question-bank, reports, and related **stubs/endpoints** shared by Mobile and React.
- Mobile CI runs on `Mobile/**` path changes (see table above).
- Mobile modules for notifications, attendance, messaging, rewards, competitions, and worksheets call the stub APIs (empty lists until domain logic lands).
- Offline sync queue and push registration are **placeholders** (see `Mobile/docs/API_INTEGRATION.md`).
- Full multi-role E2E QA and remaining Mobile shells (goals, portfolio, AI, etc.) remain backlog.

## Roles

API-backed roles used across clients: `PortalAdmin`, `SchoolAdmin`, `Teacher`, `Student`, `Parent`.

## Repository layout

```text
RankUp Education/
├── Mobile/          Flutter app
├── WebApi/          .NET solution
├── React/           Vite React SPA
├── .github/         CI workflows
└── README.md        This file
```
