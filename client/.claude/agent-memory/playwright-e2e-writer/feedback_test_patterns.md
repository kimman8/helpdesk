---
name: Validated test patterns for this codebase
description: Patterns confirmed to work in this Playwright suite — auth, API seeding, isolation
type: feedback
---

## Auth
Use `test.use({ storageState: adminStorageState })` at the describe block level. Never do inline UI login inside individual tests.

**Why:** storageState is set up once per run by auth.setup.ts; inline login would be slow and fragile.
**How to apply:** always import `adminStorageState`/`agentStorageState` from `../../fixtures/auth` and apply via `test.use`.

## API seeding — users
Use `page.request.post('/api/users', { data: { name, email, password } })` to create users. Returns a 201 with `{ id, name, email }` body. Clean up with `page.request.delete('/api/users/{id}')` in afterEach.

**Why:** no DELETE /api/tickets exists; for users we can and must clean up to avoid table pollution.
**How to apply:** always use unique email via `${Date.now()}-${Math.random()}` suffix; always delete in afterEach with [204, 404] accepted.

## API seeding — tickets
Use `page.request.post('/api/webhooks/email', { multipart: { ... } })` to create tickets. Returns 200 with empty body — no ID available. Assert on visible subject text in the UI instead.

**Why:** no DELETE /api/tickets endpoint exists; ticket rows persist between test runs.
**How to apply:** always use unique subjects (timestamp + random suffix). Assert on visible text, not IDs.

## Webhook default values (server-side)
- `category` defaults to `GENERAL_QUESTION` (Prisma schema default)
- `status` defaults to `OPEN`
- `subject` defaults to `(no subject)` if omitted
- `fromName` is parsed from `from` field display name; null if absent

## Empty state testing
The "No tickets yet" empty state is hard to guarantee against a real DB that accumulates tickets between runs. Use `page.route('**/api/tickets', ...)` to intercept and return `[]` — this lets the empty state be tested reliably without needing a clean DB.

**Why:** the mock approach is the only reliable way given no teardown for tickets.
**How to apply:** use `page.route` before `page.goto` so the intercept is registered first.

## Ordering test approach
For `createdAt DESC` ordering: create two tickets sequentially (both return 200 before next call starts), then compare `getBoundingClientRect().top` of the two rows. The newer row (second created) must have a smaller `top` value (rendered higher in the page).

**Why:** comparing DOM positions is more robust than assuming row indices when other tickets exist.
**How to apply:** always use `rowBySubject()` locators, not nth-row indices, for ordering assertions.
