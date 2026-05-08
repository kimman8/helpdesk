---
name: Selector patterns for Helpdesk UI components
description: ARIA-first selectors used for LoginPage, Navbar, HomePage — no data-testid attributes exist yet
type: project
---

## LoginPage (/login)
- Email input: `page.getByLabel('Email address')` — Label htmlFor="email"
- Password input: `page.getByLabel('Password')` — Label htmlFor="password"
- Submit button: `page.getByRole('button', { name: /^Sign in$/ })`
- Field-level errors: `page.locator('p.text-xs.text-destructive')` (first = email, last = password)
- Server error banner: `page.locator('div.bg-destructive\\/10')`
- Heading: `page.getByRole('heading', { name: 'Helpdesk' })`

## Navbar (shared across authenticated pages)
- Users link (admin only): `page.getByRole('link', { name: 'Users' })`
- Sign out button: `page.getByRole('button', { name: 'Sign out' })`
- Brand: `page.getByText('Helpdesk', { exact: true })`
- User name: `page.getByText(name, { exact: true })` — hidden on small screens, visible at sm+ breakpoint (Desktop Chrome passes)

## HomePage (/)
- Greeting: `page.getByRole('heading', { name: /Good morning,/ })`
- Empty state: `page.getByText('No tickets yet')`

## UsersPage (/users)
- Page heading: `page.getByRole('heading', { name: 'Users' })`

## Notes
- No data-testid attributes on any component as of initial e2e writing session
- The form uses `noValidate` so browser native validation is suppressed — Zod/RHF runs on submit
- Server backend runs on port 3001 in test environment (not 3000), Vite proxies /api → port 3001
- Sign-in API endpoint: `/api/auth/sign-in/email`
