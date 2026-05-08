---
name: Playwright config and project structure for Helpdesk
description: Key config decisions in playwright.config.ts and the overall e2e directory layout
type: project
---

## playwright.config.ts location
Repo root: `/Users/volde/Documents/learning/Helpdesk/playwright.config.ts`

## Projects
Two Playwright projects:
1. `setup` — matches `*.setup.ts`, runs auth setup, writes storageState files. No dependencies.
2. `chromium` — Desktop Chrome, depends on `setup`.

## webServer
- Backend: `bun --env-file .env.test src/index.ts` in `./server`, health check at `http://localhost:3001/health`
- Frontend: `API_PORT=3001 bun run dev -- --port 5173` in `./client`, health check at `http://localhost:5173`
- `reuseExistingServer: !process.env.CI`

## env
`dotenv.config({ path: 'server/.env.test' })` at top of config — loads test DB URL, PORT=3001, BETTER_AUTH_SECRET, etc.

## e2e directory layout
```
e2e/
  global-setup.ts        seeds admin + agent users
  fixtures/
    auth.ts              TEST_USERS, storageState paths, loginViaUI helper
    index.ts             re-exports
  pages/
    LoginPage.ts
    NavbarComponent.ts
    HomePage.ts
  tests/
    auth/
      auth.setup.ts      writes storageState for admin + agent
      login.spec.ts      full auth test suite
playwright/
  .auth/                 gitignored — admin.json, agent.json written at runtime
```

**Why:** The `setup` project dependency pattern ensures storageState is always fresh before any test runs, even on CI with `retries: 2`.
