---
name: Auth fixtures and storageState setup
description: How auth fixtures, storageState paths, and the setup project are structured for this Helpdesk codebase
type: project
---

StorageState files written to `playwright/.auth/admin.json` and `playwright/.auth/agent.json` (gitignored).

Auth fixture paths are defined in `e2e/fixtures/auth.ts` as `adminStorageState` and `agentStorageState` constants.

The `TEST_USERS` object in that file is the single source of truth for test credentials:
- admin@example.com / password123 / name "Admin" / role "admin"
- agent@example.com / password123 / name "Agent User" / role "agent"

The `loginViaUI` helper in `e2e/fixtures/auth.ts` fills the form and waits for `waitForURL('/')`.

The `auth.setup.ts` file at `e2e/tests/auth/auth.setup.ts` is matched by `testMatch: /.*\.setup\.ts/` in playwright.config.ts and runs in the `setup` project, which the `chromium` project depends on.

Global-setup (`e2e/global-setup.ts`) seeds both users: seed.ts handles admin via ADMIN_EMAIL env var, global-setup programmatically imports the Better Auth `auth` object from `server/src/lib/auth.ts` to call `auth.api.createUser` for the agent.

**Why:** Better Auth has `disableSignUp: true`, so users can only be created via the admin API. The seed script only handles the admin.

**How to apply:** When adding new test users, add them to `TEST_USERS` in `e2e/fixtures/auth.ts` and seed them in `e2e/global-setup.ts` via `auth.api.createUser`.
