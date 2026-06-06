---
name: E2E test infrastructure overview
description: Auth fixtures, page objects, and test file locations for the Helpdesk Playwright suite
type: project
---

## Auth fixtures
- `e2e/fixtures/auth.ts` — exports `adminStorageState`, `agentStorageState`, `TEST_USERS`, and `loginViaUI`
- `e2e/fixtures/index.ts` — re-exports everything from auth.ts
- Storage state paths: `playwright/.auth/admin.json`, `playwright/.auth/agent.json`
- Test credentials: admin@example.com / password123, agent@example.com / password123
- Auth setup file: `e2e/tests/auth/auth.setup.ts`

## Page objects created
- `e2e/pages/LoginPage.ts` — login form interactions
- `e2e/pages/NavbarComponent.ts` — shared navbar helpers
- `e2e/pages/HomePage.ts` — greeting + empty-state locators (minimal, no table/stats)
- `e2e/pages/UsersPage.ts` — full CRUD POM for /users (reference pattern)
- `e2e/pages/TicketsPage.ts` — tickets table POM for / (stat cards, table, rows, ordering)

## Test specs
- `e2e/tests/auth/login.spec.ts`
- `e2e/tests/users/user-management.spec.ts` — CRUD happy paths for /users
- `e2e/tests/webhooks/email-webhook.spec.ts` — POST /api/webhooks/email API tests
- `e2e/tests/tickets/ticket-list.spec.ts` — home page ticket table tests

**Why:** tracking what exists avoids duplicating page objects or missing existing helpers.
**How to apply:** before writing a new page object or spec, check this list first.
