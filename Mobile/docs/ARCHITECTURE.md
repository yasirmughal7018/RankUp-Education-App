# Mobile Architecture

RankUp Education uses feature-based Clean Architecture.

```text
lib/
  app/                 app shell, router, theme, localization, environment
  core/                shared API, storage, network, permissions, widgets
  features/
    authentication/
      data/            remote/local data sources, DTOs, repository implementations
      domain/          entities, repository contracts, use cases
      presentation/    controllers, providers, pages, widgets
    student_dashboard/
    parent_dashboard/
    teacher_dashboard/
    quizzes/
    worksheets/
    discussions/
    rankings/
    ai_assistant/
    messaging/
```

## Rules

- Widgets do not call APIs directly.
- Features depend inward: presentation -> domain -> data contracts.
- Shared services live in `core`.
- API-backed repositories can replace mock repositories without changing UI code.
- Sensitive identifiers such as CNIC and B-Form are verification data only and must be masked in UI.

## MVP Flow

1. App starts in `main.dart`.
2. Environment is loaded from Dart defines.
3. `GoRouter` checks authentication state.
4. Mock login creates a role-specific session.
5. The router opens the Student, Parent, or Teacher dashboard.
