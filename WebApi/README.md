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
