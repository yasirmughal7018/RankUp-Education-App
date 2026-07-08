# API Integration Guide

The mobile app expects the .NET API response shape below:

```json
{
  "success": true,
  "message": "Operation completed successfully.",
  "data": {},
  "errors": []
}
```

## Authentication Endpoints

Recommended MVP endpoints:

- `POST /auth/login`
- `POST /auth/password-reset/request`
- `POST /account-requests`
- `POST /auth/token/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /devices/register`

`USE_MOCKS` defaults to **false** (`AppEnvironment.fromDartDefines` in
`lib/app/environment.dart`). The app talks to the real API unless you opt in
to offline demo mode:

```powershell
flutter run --dart-define=USE_MOCKS=true
```

With mocks enabled, these local demo accounts work without the API:

| User | Username / ID | Password |
| --- | --- | --- |
| Student Demo | `student-demo` | `password` |
| Parent Demo | `parent-demo` | `password` |
| Teacher Demo | `teacher-demo` | `password` |

The mobile app has one common login screen for Student, Parent, and Teacher
accounts. It must not send a role during login. The backend must validate the
username and password, resolve the role from the database, and return the role
with the authenticated user.

Login request:

```json
{
  "username": "student-demo",
  "password": "password"
}
```

Login response data:

```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "user": {
    "id": "user-id",
    "username": "student-demo",
    "fullName": "Ayan Khan",
    "role": "Student",
    "profileId": "student-profile-id",
    "schoolId": "school-id",
    "campusId": "campus-id",
    "permissions": []
  }
}
```

JWT claims should include `userId`, `role`, `permissions`, `schoolId`, `campusId`, and `profileId`.

Password reset request:

```json
{
  "username": "student-demo"
}
```

Account access request:

```json
{
  "fullName": "Ayan Khan",
  "mobileNumber": "+923001234567",
  "emailAddress": "parent@example.com",
  "userType": "Student",
  "schoolCampusName": "RankUp Campus",
  "studentOrEmployeeId": "STU-001",
  "adminTarget": "School Admin",
  "reasonMessage": "Please create my account."
}
```

## Security Rules

- Create accounts from the admin system only; do not allow mobile registration.
- Treat account access requests as pending admin approvals, not automatic account creation.
- Use username/password login only; OTP is not required for mobile login.
- Store access and refresh tokens only in secure storage.
- Do not use CNIC or B-Form as passwords.
- Never log tokens, CNIC, B-Form, phone numbers, or private child data.
- Shared reports should use secure or expiring links.

## Question Bank Endpoints

Standalone question management under `/api/questions`.

| Action | Method | Route |
|--------|--------|-------|
| List questions | `GET` | `/api/questions?isActive=&subjectId=&classId=&pendingApprovalOnly=` |
| Pending approval queue | `GET` | `/api/questions/pending-approval` |
| Get question | `GET` | `/api/questions/{questionId}` |
| Create question | `POST` | `/api/questions` |
| Update question | `PUT` | `/api/questions/{questionId}` |
| Approve | `POST` | `/api/questions/{questionId}/approve` |
| AI approve (SuperAdmin) | `POST` | `/api/questions/{questionId}/approve-ai` |
| Reject | `POST` | `/api/questions/{questionId}/reject` |
| Activate | `POST` | `/api/questions/{questionId}/activate` |
| Deactivate | `POST` | `/api/questions/{questionId}/deactivate` |
| Delete | `DELETE` | `/api/questions/{questionId}` |

Workflow:

1. Teacher/parent creates a question → status **Pending**, `isActive = true`.
2. School admin approves → status **Approved**, sets `approvedBy`, `isAiApproved = false`.
3. Super admin AI-approves → status **Approved**, sets `approvedBy`, `isAiApproved = true`.
4. School admin rejects → status **Rejected**, `isActive = false`, `isAiApproved = false`.
5. Teacher edits an approved question → returns to **Pending**, clears approval and `isAiApproved`.
6. **Deactivate** hides a question from quizzes without deleting the row.
7. **Delete** permanently removes a question only when it is not linked to any quiz.

## Quiz Question Endpoints (Parent / Teacher)

Quiz-scoped question logic is separate from the question bank. Routes live under `/api/quizzes/{quizId}/questions`.

| Action | Method | Route |
|--------|--------|-------|
| List quiz questions | `GET` | `/api/quizzes/{quizId}/questions` |
| Add question to quiz | `POST` | `/api/quizzes/{quizId}/questions` |
| Attach from question bank | `POST` | `/api/quizzes/{quizId}/questions/from-bank` |
| Update quiz question | `PUT` | `/api/quizzes/{quizId}/questions/{questionId}` |
| Remove from quiz | `DELETE` | `/api/quizzes/{quizId}/questions/{questionId}` |

Attach-from-bank request body:

```json
{
  "questionId": 10,
  "marks": 2
}
```

`marks` is optional; when omitted the bank question marks are used.

Add/update request body:

```json
{
  "questionText": "Which fraction is equivalent to 1/2?",
  "questionType": "Single Choice",
  "marks": 2,
  "estimatedTimeSeconds": 45,
  "hint": "Reduce each option.",
  "explanation": "2/4 simplifies to 1/2.",
  "options": [
    { "optionText": "2/4", "isCorrect": true },
    { "optionText": "1/3", "isCorrect": false }
  ]
}
```

List response data:

```json
{
  "quizId": 1,
  "items": [
    {
      "questionId": 10,
      "questionText": "Which fraction is equivalent to 1/2?",
      "questionType": "Single Choice",
      "marks": 2,
      "displayOrder": 1,
      "hint": "Reduce each option.",
      "options": [
        { "optionId": 100, "optionText": "2/4", "isCorrect": true }
      ]
    }
  ]
}
```

Add/update/delete return the updated `ManageQuizResponse` (same shape as `GET /api/quizzes/{quizId}/manage`).

## Student Quiz Attempt Endpoints

Students use `/api/quizzes` for attempts.

| Action | Method | Route |
|--------|--------|-------|
| Start or resume | `POST` | `/api/quizzes/{quizId}/attempts` |
| Save draft answers | `PUT` | `/api/quizzes/{quizId}/attempts/{attemptId}/draft` |
| Submit attempt | `POST` | `/api/quizzes/{quizId}/attempts/{attemptId}/submit` |
| Get result / review | `GET` | `/api/quizzes/{quizId}/attempts/{attemptId}/result` |

### Start / resume

`POST /api/quizzes/{quizId}/attempts` with `{ "deviceId": "..." }` returns:

```json
{
  "attemptId": 1,
  "quizId": 10,
  "attemptNumber": 1,
  "timeLimitMinutes": 30,
  "startedAt": "2026-07-09T00:00:00Z",
  "resumed": true,
  "questions": [],
  "savedAnswers": [
    {
      "questionId": 100,
      "selectedOptionId": 201,
      "selectedOptionIds": [201, 202],
      "submittedText": null
    }
  ]
}
```

When `resumed` is true, Mobile hydrates local selections from `savedAnswers`.

### Draft save

`PUT /api/quizzes/{quizId}/attempts/{attemptId}/draft`:

```json
{
  "answers": [
    {
      "questionId": 100,
      "selectedOptionId": 201,
      "selectedOptionIds": [201, 202],
      "submittedText": null
    }
  ],
  "timeSpentSeconds": 45
}
```

Mobile debounces draft saves (~800ms) after answer changes.

### Multi-select answers

For multi-select questions, send **all** chosen ids in `selectedOptionIds`.
`selectedOptionId` remains for single-choice / true-false.
Submit uses the same answer shape as draft.

## Quiz manage / approval (teacher & admin)

| Action | Method | Route |
|--------|--------|-------|
| Pending quiz approval | `GET` | `/api/quizzes/pending-approval` |
| Reject quiz | `POST` | `/api/quizzes/{quizId}/reject` |

Reject body: `{ "reason": "optional" }`.

Mobile teacher MVP lists quizzes via `GET /api/quizzes` and shows a read-only summary.
Create/edit/assign/from-bank attach remain on web for this MVP.

## Product stub endpoints (empty lists today)

These authorized GETs return successful empty payloads so Mobile can wire UI
without failing. Full domain logic is not implemented yet.

| Feature | Method | Route |
| --- | --- | --- |
| Notifications | `GET` | `/api/notifications` |
| Attendance | `GET` | `/api/attendance/me` |
| Messaging | `GET` | `/api/messaging/threads` |
| Rewards | `GET` | `/api/rewards/me` |
| Competitions | `GET` | `/api/competitions` |
| Worksheets | `GET` | `/api/worksheets` |
| Device / push | `POST` | `/api/devices/register` |

### Offline sync & push (placeholders)

- **Offline sync:** `lib/core/synchronization/sync_queue.dart` holds an
  in-memory queue (`enqueue` / `processPending`). Persistence and API replay
  are not implemented.
- **Push:** `lib/core/notifications/notification_service.dart` registers a
  debug placeholder token via `/devices/register` after login. Firebase
  Messaging / local notification channels are still TODO.
