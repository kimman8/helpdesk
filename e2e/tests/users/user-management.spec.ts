/**
 * User Management e2e tests — DB round-trips and API contract only.
 *
 * Modal rendering, form field pre-population, validation errors, and
 * cancel/close flows are all covered by component tests (Vitest + RTL):
 *   CreateUserModal.test.tsx, EditUserModal.test.tsx, DeleteUserModal.test.tsx
 *
 * What we verify here:
 *  1. Real seeded data appears in the table (DB read)
 *  2. GET /api/users shape (API contract)
 *  3. Creating a user via the UI persists to the DB (DB write)
 *  4. Editing a user via the UI persists to the DB (DB write)
 *  5. Deleting a user via the UI removes it from the DB (DB delete)
 */

import { test, expect } from '@playwright/test'
import { adminStorageState, TEST_USERS } from '../../fixtures/auth'
import { UsersPage } from '../../pages/UsersPage'

test.use({ storageState: adminStorageState })

function uniqueEmail(label: string): string {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 9999)}`
  return `test-${label}-${suffix}@example.com`
}

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

async function deleteUserViaApi(
  page: import('@playwright/test').Page,
  userId: string,
): Promise<void> {
  const response = await page.request.delete(`/api/users/${userId}`)
  expect([204, 404]).toContain(response.status())
}

// ---------------------------------------------------------------------------
// 1 + 2. DB read and API contract
// ---------------------------------------------------------------------------

test.describe('Read — users table', () => {
  test('table loads and displays the seeded admin and agent rows', async ({ page }) => {
    const usersPage = new UsersPage(page)
    await usersPage.goto()
    await usersPage.waitForTableLoaded()

    await usersPage.expectRowVisible(TEST_USERS.admin.name)
    await usersPage.expectRowVisible(TEST_USERS.agent.name)
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
// 3. Create — form submission persists to DB
// ---------------------------------------------------------------------------

test.describe('Create — new user', () => {
  test('submitting the form creates the user and shows their row in the table', async ({
    page,
  }) => {
    const name = 'New Test User'
    const email = uniqueEmail('create')

    const usersPage = new UsersPage(page)
    await usersPage.goto()
    await usersPage.waitForTableLoaded()
    await usersPage.openCreateModal()

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

    await expect(page.getByRole('dialog')).not.toBeVisible()
    await usersPage.expectRowVisible(name)

    await deleteUserViaApi(page, created.id)
  })
})

// ---------------------------------------------------------------------------
// 4. Edit — save persists to DB
// ---------------------------------------------------------------------------

test.describe('Edit — update user', () => {
  let editUserId: string
  let editUserName: string

  test.beforeEach(async ({ page }) => {
    await page.goto('/users')
    editUserName = `Edit Target ${Date.now()}`
    const created = await createUserViaApi(page, editUserName, uniqueEmail('edit'))
    editUserId = created.id
  })

  test.afterEach(async ({ page }) => {
    await deleteUserViaApi(page, editUserId)
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

    await expect(page.getByRole('dialog')).not.toBeVisible()
    await usersPage.expectRowVisible(newName)
    await usersPage.expectRowGone(editUserName)

    editUserName = newName
  })
})

// ---------------------------------------------------------------------------
// 5. Delete — confirmation persists to DB
// ---------------------------------------------------------------------------

test.describe('Delete — remove user', () => {
  let deleteUserId: string
  let deleteUserName: string

  test.beforeEach(async ({ page }) => {
    await page.goto('/users')
    deleteUserName = `Delete Target ${Date.now()}`
    const created = await createUserViaApi(page, deleteUserName, uniqueEmail('delete'))
    deleteUserId = created.id
  })

  test.afterEach(async ({ page }) => {
    await deleteUserViaApi(page, deleteUserId)
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

    await expect(page.getByRole('dialog')).not.toBeVisible()
    await usersPage.expectRowGone(deleteUserName)
  })
})
