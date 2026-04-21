/**
 * Auth setup — runs in the "setup" Playwright project (before all other
 * projects). Logs in as each role once and persists the authenticated
 * browser state to disk so subsequent tests can skip the login UI.
 *
 * Matches playwright.config.ts  testMatch: /.*\.setup\.ts/
 */

import { test as setup, expect } from '@playwright/test'
import { loginViaUI, TEST_USERS } from '../../fixtures/auth'

setup('authenticate as admin', async ({ page }) => {
  await loginViaUI(page, TEST_USERS.admin.email, TEST_USERS.admin.password)

  // Verify we reached the dashboard before persisting state
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('link', { name: 'Users' })).toBeVisible()

  await page.context().storageState({ path: TEST_USERS.admin.storageState })
})

setup('authenticate as agent', async ({ page }) => {
  await loginViaUI(page, TEST_USERS.agent.email, TEST_USERS.agent.password)

  await expect(page).toHaveURL('/')
  // Agents must NOT see the Users link
  await expect(page.getByRole('link', { name: 'Users' })).not.toBeVisible()

  await page.context().storageState({ path: TEST_USERS.agent.storageState })
})
