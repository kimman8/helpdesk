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

## Project Structure
```
/client   React frontend
/server   Express backend
```

## Running the apps
```bash
bun run dev:server   # Express on port 3000
bun run dev:client   # Vite on port 5173
```

Use `~/.bun/bin/bun` if `bun` is not yet on PATH in the current shell.
