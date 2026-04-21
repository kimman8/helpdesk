/**
 * Auth fixtures — centralises the storageState paths and the login helper
 * used by the auth setup project.
 *
 * Usage in tests:
 *   import { test } from '../fixtures'
 *   // or directly:
 *   test.use({ storageState: adminStorageState })
 */

import { type Page } from '@playwright/test'

/** Paths where storageState JSON files are written by auth.setup.ts */
export const adminStorageState = 'playwright/.auth/admin.json' as const
export const agentStorageState = 'playwright/.auth/agent.json' as const

export const TEST_USERS = {
  admin: {
    email: 'admin@example.com',
    password: 'password123',
    name: 'Admin',
    role: 'admin',
    storageState: adminStorageState,
  },
  agent: {
    email: 'agent@example.com',
    password: 'password123',
    name: 'Agent User',
    role: 'agent',
    storageState: agentStorageState,
  },
} as const

/**
 * Log in via the UI login form and wait for the redirect to complete.
 * Returns the page so callers can chain further assertions.
 *
 * Prefer storageState for tests that just need an authenticated session.
 * Use this helper only inside *.setup.ts files.
 */
export async function loginViaUI(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/login')

  // Wait for the form to be interactive (session check complete)
  await page.getByLabel('Email address').waitFor({ state: 'visible' })

  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()

  // Successful login redirects to /
  await page.waitForURL('/')
}
