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
- `POST /auth/otp/verify`
- `POST /auth/token/refresh`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /devices/register`

JWT claims should include `userId`, `role`, `permissions`, `schoolId`, `campusId`, and `profileId`.

## Security Rules

- Store access and refresh tokens only in secure storage.
- Do not use CNIC or B-Form as passwords.
- Never log tokens, CNIC, B-Form, phone numbers, or private child data.
- Shared reports should use secure or expiring links.
