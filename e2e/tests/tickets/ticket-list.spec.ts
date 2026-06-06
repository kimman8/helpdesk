/**
 * Ticket list e2e tests — only what requires a real browser + server.
 *
 * UI rendering, badge labels, empty state, and category mappings are covered
 * by TicketsTable.test.tsx (Vitest + RTL).
 *
 * These tests verify:
 *  1. The table loads for an authenticated user (real session + real API call)
 *  2. A ticket created via the webhook appears in the table (DB round-trip)
 *  3. Tickets are ordered newest-first (server-side sort)
 *  4. GET /api/tickets returns the correct HTTP shape (API contract)
 */

import { test, expect } from '@playwright/test'
import { adminStorageState } from '../../fixtures/auth'
import { TicketsPage } from '../../pages/TicketsPage'

test.use({ storageState: adminStorageState })

function uniqueSubject(label: string): string {
  return `[e2e] ${label} ${Date.now()}-${Math.floor(Math.random() * 99999)}`
}

async function createTicketViaWebhook(
  page: import('@playwright/test').Page,
  subject: string,
): Promise<void> {
  const response = await page.request.post('/api/webhooks/email', {
    multipart: {
      sender: 'customer@example.com',
      from: 'Customer <customer@example.com>',
      subject,
      'stripped-text': 'Hello, I need help.',
      timestamp: String(Math.floor(Date.now() / 1000)),
      token: 'testtoken',
      signature: 'invalidsig',
    },
  })
  expect(response.status()).toBe(200)
}

// ---------------------------------------------------------------------------
// 1. Authenticated table load
// ---------------------------------------------------------------------------

test('navigating to / as an authenticated user shows the tickets table', async ({ page }) => {
  const ticketsPage = new TicketsPage(page)
  const responsePromise = ticketsPage.waitForTicketsResponse()
  await ticketsPage.goto()
  await responsePromise
  await expect(ticketsPage.tableCard).toBeVisible()
  await expect(ticketsPage.loadingText).not.toBeVisible()
})

// ---------------------------------------------------------------------------
// 2. DB round-trip — webhook-created ticket appears in the table
// ---------------------------------------------------------------------------

test('a ticket created via the inbound email webhook appears in the table', async ({ page }) => {
  const subject = uniqueSubject('webhook-roundtrip')
  await page.goto('/')
  await createTicketViaWebhook(page, subject)

  const ticketsPage = new TicketsPage(page)
  await ticketsPage.goto()
  await ticketsPage.waitForTableLoaded()
  await ticketsPage.expectRowVisible(subject)
})

// ---------------------------------------------------------------------------
// 3. Newest-first ordering (server-side sort)
// ---------------------------------------------------------------------------

test('tickets are ordered newest first', async ({ page }) => {
  await page.goto('/')
  const firstSubject = uniqueSubject('order-first')
  const secondSubject = uniqueSubject('order-second')

  await createTicketViaWebhook(page, firstSubject)
  await createTicketViaWebhook(page, secondSubject)

  const ticketsPage = new TicketsPage(page)
  await ticketsPage.goto()
  await ticketsPage.waitForTableLoaded()

  await ticketsPage.expectRowVisible(firstSubject)
  await ticketsPage.expectRowVisible(secondSubject)

  const firstTop = await ticketsPage.rowBySubject(firstSubject).evaluate((el) => el.getBoundingClientRect().top)
  const secondTop = await ticketsPage.rowBySubject(secondSubject).evaluate((el) => el.getBoundingClientRect().top)

  // secondSubject was created later → appears higher in the table (smaller top)
  expect(secondTop).toBeLessThan(firstTop)
})

// ---------------------------------------------------------------------------
// 4. API contract — GET /api/tickets shape
// ---------------------------------------------------------------------------

test('GET /api/tickets returns 200 and a valid ticket array', async ({ page }) => {
  await createTicketViaWebhook(page, uniqueSubject('api-contract'))

  const responsePromise = page.waitForResponse(
    (resp) => resp.url().includes('/api/tickets') && resp.request().method() === 'GET',
  )
  await page.goto('/')
  const response = await responsePromise

  expect(response.status()).toBe(200)
  const tickets = await response.json()
  expect(Array.isArray(tickets)).toBe(true)
  expect(tickets.length).toBeGreaterThan(0)

  const ticket = tickets[0]
  expect(ticket).toHaveProperty('id')
  expect(ticket).toHaveProperty('subject')
  expect(ticket).toHaveProperty('status')
  expect(ticket).toHaveProperty('category')
  expect(ticket).toHaveProperty('fromEmail')
  expect(ticket).toHaveProperty('createdAt')
})
