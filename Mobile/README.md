# RankUp Education Mobile

Flutter mobile app architecture for RankUp Education. The app targets Android and iOS and supports Student, Parent, and Teacher roles from one shared codebase.

## Current Scope

- Feature-based Clean Architecture under `lib/features`
- Riverpod state management
- GoRouter role-based navigation
- Dio API client foundation for the .NET REST API
- Secure token storage foundation
- Offline synchronization placeholder
- Notification service placeholder
- English and Urdu localization foundation
- Common username/password login with backend-driven role routing
- Mock authentication for Student, Parent, and Teacher dashboards
- Starter tests

## Local Setup

```powershell
cd "D:\Projects\RankUp Education\Mobile"
flutter create --project-name rankup_education --org com.rankupeducation --platforms android,ios .
flutter pub get
flutter test
flutter run
```

`flutter create .` should be run in this folder to generate the native `android/` and `ios/` wrappers if they are not present yet.

## Environment

The Android emulator reaches your PC at `10.0.2.2`, not `localhost`.

```powershell
cd "D:\Projects\RankUp Education\Mobile"
flutter run
```

That default targets `http://10.0.2.2:5255/api` and uses the real API for login.

Start the Web API first:

```powershell
dotnet run --project WebApi/src/RankUpEducation.Api --launch-profile http
```

Optional overrides:

```powershell
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:5255/api --dart-define=USE_MOCKS=false
```

Supported values: `development`, `test`, `staging`, and `production`.

## Mock Login

Offline demo mode is disabled by default. To use local mock auth for the demo
accounts only, run with `--dart-define=USE_MOCKS=true`.

| User | Username / ID | Password | Result |
| --- | --- | --- | --- |
| Student Demo | `student-demo` | `password` | Mock only when `USE_MOCKS=true` |
| Parent Demo | `parent-demo` | `password` | Mock only when `USE_MOCKS=true` |
| Teacher Demo | `teacher-demo` | `password` | Mock only when `USE_MOCKS=true` |

With the default API mode, login always calls `POST /api/auth/login` on the
Web API. Use a real username/password from PostgreSQL.

The login screen also includes admin-assisted actions:

- `Forgot password?` sends a reset request to the account admin.
- `Request account access` sends a new-account request to the School Admin or
  Portal Admin for manual review.
