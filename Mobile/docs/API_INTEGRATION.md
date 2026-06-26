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
