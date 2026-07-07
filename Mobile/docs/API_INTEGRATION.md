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

The current mobile build keeps `USE_MOCKS` enabled and uses local dummy data.
These demo accounts are available until the real API is connected:

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

## Quiz Question Endpoints (Parent / Teacher)

Question CRUD lives under `/api/questions`, not under `/api/quizzes`.

| Action | Method | Route |
|--------|--------|-------|
| List quiz questions | `GET` | `/api/questions/quiz/{quizId}` |
| Add question to quiz | `POST` | `/api/questions/quiz/{quizId}` |
| Update quiz question | `PUT` | `/api/questions/quiz/{quizId}/{questionId}` |
| Remove from quiz | `DELETE` | `/api/questions/quiz/{quizId}/{questionId}` |

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

Students still use `/api/quizzes` for attempts. Questions for an attempt are returned when starting:

- `POST /api/quizzes/{quizId}/attempts` → includes `questions[]` in the start response
- `POST /api/quizzes/{quizId}/attempts/{attemptId}/submit`
- `GET /api/quizzes/{quizId}/attempts/{attemptId}/result`
