/**
 * User Management e2e tests — happy paths for all CRUD operations on /users.
 *
 * All tests run as admin (storageState: adminStorageState).
 *
 * Test isolation strategy:
 *  - Read  — uses the seeded admin + agent rows; no state changes.
 *  - Create — creates a user with a timestamp-unique email, deletes via API after assertion.
 *  - Edit   — creates a fresh user in beforeEach via API, edits via UI, deletes via API in afterEach.
 *  - Delete — creates a fresh user in beforeEach via API, deletes via UI, asserts row is gone.
 *
 * Timestamps in email addresses guarantee no conflicts across parallel runs or
 * repeated local runs without a DB reset.
 */

import { test, expect } from '@playwright/test'
import { adminStorageState, TEST_USERS } from '../../fixtures/auth'
import { UsersPage } from '../../pages/UsersPage'

// ---------------------------------------------------------------------------
// All tests in this file require an admin session.
// ---------------------------------------------------------------------------
test.use({ storageState: adminStorageState })

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generate a unique email that won't collide between test runs.
 * Uses Date.now() + a random suffix for extra safety with parallel workers.
 */
function uniqueEmail(label: string): string {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 9999)}`
  return `test-${label}-${suffix}@example.com`
}

/**
 * Create a user directly via the API (bypasses the UI) and return the created
 * user object. `page.request` carries the admin session cookie from storageState.
 */
async function createUserViaApi(
  page: import('@playwright/test').Page,
  name: string,
  email: string,
): Promise<{ id: string; name: string; email: string }> {
  const response = await page.request.post('/api/users', {
    data: { name, email, password: 'TestPass123!' },
  })
  expect(response.status()).toBe(201)
  return response.json()
}

/**
 * Soft-delete a user directly via the API.
 */
async function deleteUserViaApi(
  page: import('@playwright/test').Page,
  userId: string,
): Promise<void> {
  const response = await page.request.delete(`/api/users/${userId}`)
  // 204 = deleted, 404 = already gone (test already deleted it) — both are fine
  expect([204, 404]).toContain(response.status())
}

// ---------------------------------------------------------------------------
// 1. Read — table loads and shows existing users
// ---------------------------------------------------------------------------

test.describe('Read — users table', () => {
  test('navigating to /users shows the page heading and table', async ({ page }) => {
    const usersPage = new UsersPage(page)
    await usersPage.goto()

    await expect(page).toHaveURL('/users')
    await expect(usersPage.heading).toBeVisible()
    await expect(usersPage.newUserButton).toBeVisible()
  })

  test('table loads and displays the seeded admin and agent rows', async ({ page }) => {
    const usersPage = new UsersPage(page)
    await usersPage.goto()
    await usersPage.waitForTableLoaded()

    // Both seeded users must appear in the table
    await usersPage.expectRowVisible(TEST_USERS.admin.name)
    await usersPage.expectRowVisible(TEST_USERS.agent.name)
  })

  test('admin row shows "admin" role badge and no delete button', async ({ page }) => {
    const usersPage = new UsersPage(page)
    await usersPage.goto()
    await usersPage.waitForTableLoaded()

    const adminRow = usersPage.rowByName(TEST_USERS.admin.name)
    await expect(adminRow.getByText('admin')).toBeVisible()
    // Admin rows must not have a delete button
    await expect(
      adminRow.getByRole('button', { name: `Delete ${TEST_USERS.admin.name}` }),
    ).not.toBeVisible()
  })

  test('agent row shows "agent" role badge and has both edit and delete buttons', async ({
    page,
  }) => {
    const usersPage = new UsersPage(page)
    await usersPage.goto()
    await usersPage.waitForTableLoaded()

    const agentRow = usersPage.rowByName(TEST_USERS.agent.name)
    await expect(agentRow.getByText('agent')).toBeVisible()
    await expect(
      page.getByRole('button', { name: `Edit ${TEST_USERS.agent.name}` }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: `Delete ${TEST_USERS.agent.name}` }),
    ).toBeVisible()
  })

  test('GET /api/users returns 200 and a non-empty array', async ({ page }) => {
    const responsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes('/api/users') &&
        resp.request().method() === 'GET' &&
        resp.status() === 200,
    )
    await page.goto('/users')
    const response = await responsePromise
    const users = await response.json()
    expect(Array.isArray(users)).toBe(true)
    expect(users.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// 2. Create — "New User" button → modal → user appears in table
// ---------------------------------------------------------------------------

test.describe('Create — new user modal', () => {
  test('clicking "New User" opens the create modal', async ({ page }) => {
    const usersPage = new UsersPage(page)
    await usersPage.goto()
    await usersPage.waitForTableLoaded()

    await usersPage.newUserButton.click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByRole('heading', { name: 'New User' })).toBeVisible()
    await expect(page.getByLabel('Name')).toBeVisible()
    await expect(page.getByLabel('Email')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Create user' })).toBeVisible()
  })

  test('submitting the form creates the user and shows their row in the table', async ({
    page,
  }) => {
    const name = 'New Test User'
    const email = uniqueEmail('create')

    const usersPage = new UsersPage(page)
    await usersPage.goto()
    await usersPage.waitForTableLoaded()

    await usersPage.openCreateModal()

    // Intercept the POST so we can grab the returned id for cleanup
    const responsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes('/api/users') &&
        resp.request().method() === 'POST' &&
        resp.status() === 201,
    )

    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Name').fill(name)
    await dialog.getByLabel('Email').fill(email)
    await dialog.getByLabel('Password').fill('TestPass123!')
    await dialog.getByRole('button', { name: 'Create user' }).click()

    const response = await responsePromise
    const created: { id: string } = await response.json()

    // Modal should close and the new row should be visible
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await usersPage.expectRowVisible(name)

    // Verify the row shows the agent role badge (all created users are agents)
    const newRow = usersPage.rowByName(name)
    await expect(newRow.getByText('agent')).toBeVisible()

    // Cleanup — soft-delete the created user so other tests aren't affected
    await deleteUserViaApi(page, created.id)
  })

  test('the modal closes without creating a user when Cancel is clicked', async ({ page }) => {
    const usersPage = new UsersPage(page)
    await usersPage.goto()
    await usersPage.waitForTableLoaded()

    await usersPage.openCreateModal()

    const dialog = page.getByRole('dialog')
    await dialog.getByLabel('Name').fill('Should Not Appear')
    await dialog.getByRole('button', { name: 'Cancel' }).click()

    await expect(page.getByRole('dialog')).not.toBeVisible()
    await usersPage.expectRowGone('Should Not Appear')
  })
})

// ---------------------------------------------------------------------------
// 3. Edit — pencil icon → pre-populated modal → row updates
// ---------------------------------------------------------------------------

test.describe('Edit — edit user modal', () => {
  let editUserId: string
  let editUserName: string
  let editUserEmail: string

  test.beforeEach(async ({ page }) => {
    await page.goto('/users')
    editUserName = `Edit Target ${Date.now()}`
    editUserEmail = uniqueEmail('edit')
    const created = await createUserViaApi(page, editUserName, editUserEmail)
    editUserId = created.id
  })

  test.afterEach(async ({ page }) => {
    await deleteUserViaApi(page, editUserId)
  })

  test('clicking the edit button opens a pre-populated modal', async ({ page }) => {
    const usersPage = new UsersPage(page)
    await usersPage.goto()
    await usersPage.waitForTableLoaded()

    await usersPage.openEditModal(editUserName)

    // Modal fields should be pre-populated with the current values
    expect(await usersPage.getEditModalNameValue()).toBe(editUserName)
    expect(await usersPage.getEditModalEmailValue()).toBe(editUserEmail)

    // Password is intentionally blank (optional — leave blank to keep current)
    expect(await page.getByRole('dialog').getByLabel('Password').inputValue()).toBe('')
  })

  test('saving a new name updates the row in the table', async ({ page }) => {
    const newName = `Renamed User ${Date.now()}`

    const usersPage = new UsersPage(page)
    await usersPage.goto()
    await usersPage.waitForTableLoaded()

    await usersPage.openEditModal(editUserName)

    const responsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/users/${editUserId}`) &&
        resp.request().method() === 'PATCH' &&
        resp.status() === 200,
    )

    const dialog = page.getByRole('dialog')
    const nameInput = dialog.getByLabel('Name')
    await nameInput.clear()
    await nameInput.fill(newName)
    await dialog.getByRole('button', { name: 'Save changes' }).click()

    await responsePromise

    // Modal should close; table should show the updated name
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await usersPage.expectRowVisible(newName)
    await usersPage.expectRowGone(editUserName)

    // Update the name so afterEach cleanup finds the row by id (not name)
    editUserName = newName
  })

  test('the modal closes without saving when Cancel is clicked', async ({ page }) => {
    const usersPage = new UsersPage(page)
    await usersPage.goto()
    await usersPage.waitForTableLoaded()

    await usersPage.openEditModal(editUserName)

    const dialog = page.getByRole('dialog')
    const nameInput = dialog.getByLabel('Name')
    await nameInput.clear()
    await nameInput.fill('Unsaved Name Change')
    await dialog.getByRole('button', { name: 'Cancel' }).click()

    await expect(page.getByRole('dialog')).not.toBeVisible()
    // Original name still in the table; unsaved name is not
    await usersPage.expectRowVisible(editUserName)
    await usersPage.expectRowGone('Unsaved Name Change')
  })
})

// ---------------------------------------------------------------------------
// 4. Delete — trash icon → confirmation modal → user removed from table
// ---------------------------------------------------------------------------

test.describe('Delete — delete user modal', () => {
  let deleteUserId: string
  let deleteUserName: string

  test.beforeEach(async ({ page }) => {
    await page.goto('/users')
    deleteUserName = `Delete Target ${Date.now()}`
    const email = uniqueEmail('delete')
    const created = await createUserViaApi(page, deleteUserName, email)
    deleteUserId = created.id
  })

  // afterEach is a safety net in case the test itself fails before deleting
  test.afterEach(async ({ page }) => {
    await deleteUserViaApi(page, deleteUserId)
  })

  test('clicking the delete button opens a confirmation modal with the user name', async ({
    page,
  }) => {
    const usersPage = new UsersPage(page)
    await usersPage.goto()
    await usersPage.waitForTableLoaded()

    await usersPage.openDeleteModal(deleteUserName)

    // The dialog description must mention the user's name
    await expect(page.getByRole('dialog')).toContainText(
      `Are you sure you want to delete ${deleteUserName}?`,
    )
    await expect(
      page.getByRole('dialog').getByRole('button', { name: 'Delete user' }),
    ).toBeVisible()
  })

  test('confirming deletion removes the user from the table', async ({ page }) => {
    const usersPage = new UsersPage(page)
    await usersPage.goto()
    await usersPage.waitForTableLoaded()

    await usersPage.openDeleteModal(deleteUserName)

    const responsePromise = page.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/users/${deleteUserId}`) &&
        resp.request().method() === 'DELETE' &&
        resp.status() === 204,
    )

    await page.getByRole('dialog').getByRole('button', { name: 'Delete user' }).click()

    await responsePromise

    // Modal should close; row must be gone from the table
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await usersPage.expectRowGone(deleteUserName)
  })

  test('the modal closes without deleting when Cancel is clicked', async ({ page }) => {
    const usersPage = new UsersPage(page)
    await usersPage.goto()
    await usersPage.waitForTableLoaded()

    await usersPage.openDeleteModal(deleteUserName)
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click()

    await expect(page.getByRole('dialog')).not.toBeVisible()
    // User must still be in the table
    await usersPage.expectRowVisible(deleteUserName)
  })
})
