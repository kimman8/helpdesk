---
name: Webhook email endpoint tests
description: Patterns used for API-only Playwright tests against POST /api/webhooks/email (no page, multipart form-data, conditional skip for HMAC tests)
type: project
---

- Test file: `e2e/tests/webhooks/email-webhook.spec.ts`
- Uses the `request` fixture (unauthenticated `APIRequestContext`) — no storageState needed
- Sends multipart/form-data via `request.post('/api/webhooks/email', { multipart: { ... } })`
- The endpoint returns `200` with an empty body (`res.status(200).end()`) — assert `response.text() === ''`
- No `GET /api/tickets` exists yet — correctness verified purely via HTTP status code

HMAC skip pattern used:
```ts
test.skip(
  !process.env.MAILGUN_WEBHOOK_SIGNING_KEY,
  'reason string...',
)
```
This is placed inside the test body (not as a static `test.skip()` call) so the condition is evaluated at runtime from the loaded env.

**Why:** `server/.env.test` has no `MAILGUN_WEBHOOK_SIGNING_KEY`; the handler skips verification when the key is absent, making the 401 branch unreachable. Tests are skipped rather than removed so they activate automatically when the key is added to `.env.test`.
**How to apply:** Use this same runtime-conditional skip pattern for any test that requires a specific env var that is absent in the test environment.
