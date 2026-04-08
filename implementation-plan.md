# Implementation Plan

## Phase 1 — Project Setup

- initialize monorepo structure (`/client`, `/server`)
- Initialize backend: Express + TypeScript
- Initialize frontend: React + TypeScript
- Set up PostgreSQL database

---

## Phase 2 — Database Schema

- Define Prisma models: `User`, `Session`, `Ticket`, `Message`, `KnowledgeBaseEntry`
- Run initial migration
- Seed script: create the default admin user

---

## Phase 3 — Authentication

**Backend**

- `POST /auth/login` — validate credentials, create session in DB, set cookie
- `POST /auth/logout` — destroy session
- Session middleware to protect routes
- Role-based middleware (admin only routes)

**Frontend**

- Login page
- Auth context (store current user, role)
- Protected routes (redirect to login if unauthenticated)
- Admin-only route guard

---

## Phase 4 — Ticket Management

**Backend**

- `GET /tickets` — list tickets with filtering (status, category) and sorting
- `GET /tickets/:id` — ticket detail with messages
- `POST /tickets` — create ticket manually
- `PATCH /tickets/:id` — update status, category, assigned agent

**Frontend**

- Ticket list page with filter and sort controls
- Ticket detail page (thread view of messages)
- Status update controls (open → resolved → closed)
- Create ticket form (manual entry)

---

## Phase 5 — User Management (Admin)

**Backend**

- `GET /users` — list all agents
- `POST /users` — create agent account
- `DELETE /users/:id` — deactivate agent

**Frontend**

- User management page (admin only)
- Create agent form
- Agent list with deactivate action

---

## Phase 6 — Email Integration

- Choose and configure SendGrid or Mailgun
- Set up inbound email webhook: `POST /webhooks/email`
- Parse inbound email → create `Ticket` + initial `Message`
- Detect reply threads (match by email subject/ticket ID) → append `Message` to existing ticket
- Send outbound reply via API when agent responds

---

## Phase 7 — AI Features

- Set up Claude API client (shared service)
- **Auto-classification** — on ticket creation, call Claude to assign category
- **AI summary** — generate a short summary of the ticket thread on demand
- **AI-suggested reply** — given ticket context + relevant knowledge base entries, suggest a reply
- Knowledge base CRUD: `GET/POST/PATCH/DELETE /knowledge-base` (admin only)
- Knowledge base management page (admin only)

---

## Phase 8 — Dashboard

**Backend**

- `GET /dashboard/stats` — counts by status, counts by category, recent activity

**Frontend**

- Dashboard page: ticket counts (open, resolved, closed)
- Breakdown by category
- Recent tickets list

---

## Phase 9 — Deployment

- Write `Dockerfile` for backend
- Write `Dockerfile` for frontend (with Nginx to serve static build)
- Production `docker-compose.yml`
- Configure cloud provider (Railway, Fly.io, or AWS)
- Set up environment variables in production
- Deploy and smoke test
