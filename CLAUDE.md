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
- Roles: `admin` and `agent` (see `server/src/constants/roles.ts`)
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

## E2E Testing — Playwright
Use the `playwright-e2e-writer` agent to write tests. Setup details live in that agent's Project Context.
