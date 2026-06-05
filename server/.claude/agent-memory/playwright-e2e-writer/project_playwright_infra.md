---
name: Playwright test infrastructure
description: Config file location, auth storageState paths, global setup, env file, webServer ports used by Playwright
type: project
---

- Config: `playwright.config.ts` at repo root — loads env from `server/.env.test` via dotenv
- `testDir`: `./e2e/tests`
- `globalSetup`: `./e2e/global-setup.ts` (seeds admin + agent users via Bun script)
- baseURL: `http://localhost:5173` (Vite dev server)
- Auth storageState files: `playwright/.auth/admin.json`, `playwright/.auth/agent.json`
- Auth fixtures exported from `e2e/fixtures/auth.ts`: `adminStorageState`, `agentStorageState`, `TEST_USERS`, `loginViaUI`
- Page objects in `e2e/pages/` — `UsersPage.ts` exists
- webServer ports: backend on 3001 (not 3000) in test env; frontend on 5173
- Backend test command: `bun --env-file .env.test src/index.ts` (run from `./server`)
- Frontend test command: `API_PORT=3001 bun run dev -- --port 5173` (run from `./client`)
- No `MAILGUN_WEBHOOK_SIGNING_KEY` in `server/.env.test` — HMAC verification is skipped at test runtime

**Why:** Ports differ from dev (3000) because `server/.env.test` overrides `PORT=3001` to avoid conflicts.
**How to apply:** Always use port 3001 when constructing direct backend URLs in tests; use baseURL (5173) for all Vite-proxied `/api/*` calls.
