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

Select the environment with Dart defines:

```powershell
flutter run --dart-define=APP_ENV=development --dart-define=API_BASE_URL=https://localhost:5001/api
```

Supported values: `development`, `test`, `staging`, and `production`.

## Mock Login

Use the role selector on the login screen to enter the app as:

- Student
- Parent
- Teacher

When backend APIs are ready, replace `MockAuthRepository` with an API-backed repository in `lib/features/authentication/data/repositories`.
