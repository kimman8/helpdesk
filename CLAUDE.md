# Helpdesk — Project Memory

## Docs
Always use context7 (`mcp__context7__resolve-library-id` + `mcp__context7__query-docs`) to fetch up-to-date documentation before writing code that uses any library, framework, or tool (Express, Prisma, React, Vite, Tailwind, React Router, Bun, etc.).

## Stack
- **Frontend:** React + TypeScript + Vite + Tailwind CSS + React Router (`/client`)
- **Backend:** Node.js + Express + TypeScript, run with Bun (`/server`)
- **Database:** PostgreSQL + Prisma
- **Auth:** Database sessions (session token in DB, sent via cookie)
- **AI:** Claude API (claude-sonnet-4-6)
- **Email:** SendGrid or Mailgun (inbound webhook + outbound replies)
- **Deployment:** Docker + cloud provider (Railway, Fly.io, or AWS)

## Auth — Better Auth
- Library: `better-auth` with the `admin` plugin
- Server config: `server/src/lib/auth.ts` — Prisma adapter (PostgreSQL), email/password only, **sign-up disabled** (admin creates users manually via seed or admin API)
- Auth routes mounted at `/api/auth/*` via `toNodeHandler(auth)` — **must be registered before `express.json()`**
- Client: `createAuthClient()` in `client/src/lib/auth-client.ts`; use `authClient.useSession()` in React components
- Middleware:
  - `requireAuth` — rejects unauthenticated requests (401)
  - `requireAdmin` — additionally checks `session.user.role === Role.ADMIN` i.e. `'admin'` (403 otherwise)
- Roles: use the `Role` constant from `@helpdesk/core` — never use the raw strings `'admin'` or `'agent'` in logic (test fixtures are exempt)
- Env vars required: `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `TRUSTED_ORIGINS` (comma-separated)
- Session is stored in the DB and sent via cookie; Vite proxies `/api` → `http://localhost:3000`

## Data Fetching — Axios + TanStack Query
- Use **axios** for all HTTP requests (`withCredentials: true` for cookie-based auth)
- Use **TanStack Query** (`@tanstack/react-query`) for all server state in React components — no manual `useEffect`/`useState` for fetching
- `QueryClientProvider` is set up in `client/src/main.tsx`

## UI — shadcn/ui
- Installed in `/client` with style `base-nova`, base color `neutral`, Tailwind v4 mode
- Path alias `@/` → `client/src/` (configured in `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`)
- Components live in `src/components/ui/`. Add new ones with `npx shadcn@latest add <component>` from `/client`
- Use semantic tokens (`text-muted-foreground`, `bg-muted/40`, `text-destructive`, etc.) — avoid hardcoded `gray-*` classes
- Navbar is `bg-slate-900`; all other surfaces use shadcn `Card` and theme tokens

## Project Structure
```
/client   React frontend
/server   Express backend
/e2e      Playwright e2e tests
```

## Running the apps
```bash
bun run dev:server   # Express on port 3000
bun run dev:client   # Vite on port 5173
```

Use `~/.bun/bin/bun` if `bun` is not yet on PATH in the current shell.

## Component Testing — Vitest + React Testing Library
- **Runner:** Vitest (configured in `client/vite.config.ts`, environment: jsdom)
- **Libraries:** `@testing-library/react`, `@testing-library/jest-dom`, `axios-mock-adapter`
- **Setup file:** `client/src/test/setup.ts` — imports `@testing-library/jest-dom` matchers
- **Test files:** colocated with the page/component, named `*.test.tsx`
- **Reference pattern:** `client/src/pages/UsersPage.test.tsx`

### Writing tests
- Mock `axios` using `axios-mock-adapter` — do **not** use `vi.mock('axios')`
- Create a fresh `MockAdapter` and `QueryClient` per test (in `beforeEach` / inside `renderPage`)
- Call `mock.restore()` in `afterEach`
- Mock `authClient` via `vi.mock('../lib/auth-client', ...)` for any component that uses `useSession()`
- Wrap the component under test in `<QueryClientProvider>` and `<MemoryRouter>`
- Always set `retry: false` on the `QueryClient` in tests

### Running tests
```bash
cd client
bun run test          # single run
bun run test:watch    # watch mode
```

## Express Version & Async Error Handling
- The backend runs **Express 5**, which automatically forwards rejected promises to the error handler — do **not** wrap async route handlers in try/catch unless you need to handle a specific error case differently (e.g. returning 400 vs 500)

## Shared Package — `@helpdesk/core`
- Lives in `packages/core/src/` and is consumed by both client and server via `"workspace:*"`
- **Zod schemas belong here** — define them in `packages/core/src/schemas/`, export via `packages/core/src/index.ts`, and import as `import { mySchema } from '@helpdesk/core'` on both sides
- **Shared constants belong here** — e.g. `Role` lives in `packages/core/src/constants/roles.ts`; import as `import { Role } from '@helpdesk/core'` on both client and server
- The package exports raw TypeScript source (no build step); Bun and Vite both handle `.ts` directly
- Add new schemas or constants here whenever the same value is needed in client and server

## Forms — React Hook Form + Zod
- Use **react-hook-form** with **`zodResolver`** from `@hookform/resolvers/zod` for all forms
- Define a `z.object` schema, derive the type with `z.infer<typeof schema>`, pass `{ resolver: zodResolver(schema) }` to `useForm`
- Use `register`, `handleSubmit`, and `formState.errors` — no controlled `useState` for field values
- Call `reset()` from `useForm` when closing/clearing a form (e.g. on modal close)

## Backend Validation — Zod
- Use **Zod** for all request body validation in Express routes
- Define schemas at the top of the route file/handler; use `schema.safeParse(req.body)` and return `400` on failure
- Return the first issue message: `result.error.issues[0].message`

## E2E Testing — Playwright
Use the `playwright-e2e-writer` agent to write tests. Setup details live in that agent's Project Context.
