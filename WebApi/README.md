# RankUp Education Web API

This folder contains the backend API solution for the RankUp Education mobile and web clients.

## Layers

- `RankUpEducation.Api`: ASP.NET Core host, controllers, middleware, filters, and HTTP configuration.
- `RankUpEducation.Common`: shared configuration rules, validation helpers, and utilities.
- `RankUpEducation.Contracts`: request and response contracts shared by Flutter, React, and the API.
- `RankUpEducation.Application`: use cases, validation, application interfaces, and orchestration.
- `RankUpEducation.Domain`: business entities, enums, and domain rules.
- `RankUpEducation.Infrastructure`: database persistence, repositories, unit of work, and authentication infrastructure.
- `RankUpEducation.Integration`: third-party services such as email, SMS, push notifications, file storage, and external APIs.

## Configuration and secrets

Tracked `appsettings.json` / `appsettings.Development.json` use **placeholders only**
(`Password=CHANGE_ME`, `Jwt:SigningKey=CHANGE_ME_...`). Do not commit real passwords
or production signing keys.

For local development, override secrets with either:

```powershell
cd "D:\Projects\RankUp Education\WebApi\src\RankUpEducation.Api"
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=localhost;Port=5432;Database=RankUpEducation;Username=postgres;Password=YOUR_LOCAL_PASSWORD"
dotnet user-secrets set "Jwt:SigningKey" "YOUR_LOCAL_DEV_SIGNING_KEY_AT_LEAST_32_CHARS"
```

Or environment variables (typical for staging/production):

- `ConnectionStrings__DefaultConnection`
- `Jwt__SigningKey`

See also [`React/docs/DEPLOYMENT.md`](../React/docs/DEPLOYMENT.md) for client-side env hygiene.
