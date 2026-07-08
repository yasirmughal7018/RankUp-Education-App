# React Web App Deployment

Short checklist for shipping the RankUp Education React client.

## Before deploy

1. Confirm the Web API is reachable over **HTTPS** from the browser origin you will serve.
2. Configure CORS on the API to allow the production web origin (scheme + host + port).
3. Create production env vars (never commit `.env`):
   - `VITE_API_BASE_URL` — full API base including `/api` (example: `https://api.yourdomain.com/api`)
   - `VITE_APP_NAME` — optional display name
4. Run locally against the production-like API if possible:
   - `npm ci`
   - `npm run lint`
   - `npm run test`
   - `npm run build`

## Build

```powershell
cd "D:\Projects\RankUp Education\React"
copy .env.example .env   # then edit VITE_API_BASE_URL for production
npm ci
npm run build
```

Static output is written to `React/dist/`.

## Host

- Serve `dist/` from any static host (Azure Static Web Apps, S3+CloudFront, nginx, IIS, etc.).
- Configure SPA fallback so unknown paths rewrite to `index.html` (React Router).
- Prefer HTTPS for the web origin; mixed content will block API calls if the API is HTTPS-only.

## Post-deploy smoke checks

- [ ] Login / logout / token refresh
- [ ] Admin: registrations + directory
- [ ] Teacher: quizzes, monitoring, reviews, reports
- [ ] Parent: children, quiz history, attempt result
- [ ] Student: start attempt + view result
- [ ] Browser network tab shows requests to the expected `VITE_API_BASE_URL`

## Security notes

- Do not commit `.env` or secrets.
- Keep access tokens in browser storage only for trusted HTTPS origins.
- Rotate API credentials and review CORS allow-lists when domains change.
