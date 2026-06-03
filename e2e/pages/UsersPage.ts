import { type Page, type Locator, expect } from '@playwright/test'

/**
 * Page Object for /users — wraps interactions on the admin Users page,
 * the UsersTable, and the three modals (Create, Edit, Delete).
 *
 * Selectors are ARIA-first. There are no data-testid attributes on these
 * components, so we rely on:
 *  - Button visible/sr-only text ("New User", "Edit {name}", "Delete {name}")
 *  - Dialog titles ("New User", "Edit User", "Delete user")
 *  - Label htmlFor attributes for modal form inputs
 *  - Table cell text for row assertions
 */
export class UsersPage {
  readonly page: Page

  // Page-level
  readonly heading: Locator
  readonly newUserButton: Locator

  // Table
  readonly table: Locator
  readonly loadingText: Locator

  constructor(page: Page) {
    this.page = page

    this.heading = page.getByRole('heading', { name: 'Users' })
    this.newUserButton = page.getByRole('button', { name: 'New User' })
    this.table = page.getByRole('table')
    this.loadingText = page.getByText('Loading…')
  }

  async goto() {
    await this.page.goto('/users')
    // Wait for the table card to appear (heading is always rendered)
    await this.heading.waitFor({ state: 'visible' })
  }

  /**
   * Wait for the users table data to finish loading.
   * We wait for the Loading… text to disappear and the table to appear.
   */
  async waitForTableLoaded() {
    await expect(this.loadingText).not.toBeVisible()
    await expect(this.table).toBeVisible()
  }

  /**
   * Return the <tr> for the user whose Name cell matches the given name.
   */
  rowByName(name: string): Locator {
    return this.page.getByRole('row').filter({ hasText: name })
  }

  /**
   * Assert a row for the given name is visible in the table.
   */
  async expectRowVisible(name: string) {
    await expect(this.rowByName(name)).toBeVisible()
  }

  /**
   * Assert a row for the given name is NOT in the table.
   */
  async expectRowGone(name: string) {
    await expect(this.rowByName(name)).not.toBeVisible()
  }

  // ---------------------------------------------------------------------------
  // Create modal
  // ---------------------------------------------------------------------------

  /**
   * Open the Create modal by clicking "New User".
   */
  async openCreateModal() {
    await this.newUserButton.click()
    await expect(this.page.getByRole('dialog')).toBeVisible()
    await expect(this.page.getByRole('heading', { name: 'New User' })).toBeVisible()
  }

  /**
   * Fill the Create modal form and submit it.
   * Waits for the POST /api/users response before returning.
   */
  async createUser(name: string, email: string, password: string) {
    const responsePromise = this.page.waitForResponse(
      (resp) => resp.url().includes('/api/users') && resp.request().method() === 'POST' && resp.status() === 201,
    )

    const dialog = this.page.getByRole('dialog')
    await dialog.getByLabel('Name').fill(name)
    await dialog.getByLabel('Email').fill(email)
    await dialog.getByLabel('Password').fill(password)
    await dialog.getByRole('button', { name: 'Create user' }).click()

    await responsePromise
  }

  // ---------------------------------------------------------------------------
  // Edit modal
  // ---------------------------------------------------------------------------

  /**
   * Click the edit icon button for the row with the given user name.
   * The button has sr-only text "Edit {name}".
   */
  async openEditModal(name: string) {
    await this.page.getByRole('button', { name: `Edit ${name}` }).click()
    await expect(this.page.getByRole('dialog')).toBeVisible()
    await expect(this.page.getByRole('heading', { name: 'Edit User' })).toBeVisible()
  }

  /**
   * Overwrite the Name field in the open Edit modal and save.
   * Waits for the PATCH response before returning.
   */
  async editUserName(userId: string, newName: string) {
    const responsePromise = this.page.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/users/${userId}`) &&
        resp.request().method() === 'PATCH' &&
        resp.status() === 200,
    )

    const dialog = this.page.getByRole('dialog')
    const nameInput = dialog.getByLabel('Name')
    await nameInput.clear()
    await nameInput.fill(newName)
    await dialog.getByRole('button', { name: 'Save changes' }).click()

    await responsePromise
  }

  /**
   * Read the value currently shown in the Name input of the open Edit modal.
   */
  async getEditModalNameValue(): Promise<string> {
    return this.page.getByRole('dialog').getByLabel('Name').inputValue()
  }

  /**
   * Read the value currently shown in the Email input of the open Edit modal.
   */
  async getEditModalEmailValue(): Promise<string> {
    return this.page.getByRole('dialog').getByLabel('Email').inputValue()
  }

  // ---------------------------------------------------------------------------
  // Delete modal
  // ---------------------------------------------------------------------------

  /**
   * Click the delete icon button for the row with the given user name.
   * The button has sr-only text "Delete {name}".
   */
  async openDeleteModal(name: string) {
    await this.page.getByRole('button', { name: `Delete ${name}` }).click()
    await expect(this.page.getByRole('dialog')).toBeVisible()
    await expect(this.page.getByRole('heading', { name: 'Delete user' })).toBeVisible()
  }

  /**
   * Confirm the delete action and wait for the DELETE response.
   */
  async confirmDelete(userId: string) {
    const responsePromise = this.page.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/users/${userId}`) &&
        resp.request().method() === 'DELETE' &&
        resp.status() === 204,
    )

    await this.page.getByRole('dialog').getByRole('button', { name: 'Delete user' }).click()

    await responsePromise
  }
}
