import { type Page, type Locator, expect } from '@playwright/test'

/**
 * Page Object for /login — wraps all locators and actions on the login form.
 *
 * Selectors use ARIA-first approach:
 *  - Labels are rendered with <Label htmlFor="email"> / <Label htmlFor="password">
 *    so getByLabel() works without data-testid.
 *  - The submit button text is "Sign in" / "Signing in..." (disabled state).
 *  - Validation messages are <p> tags with the destructive text colour.
 *  - The server error banner is a <div> that contains the error text inside a <p>.
 */
export class LoginPage {
  readonly page: Page

  // Form fields
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly submitButton: Locator

  // Error elements
  readonly emailError: Locator
  readonly passwordError: Locator
  readonly serverErrorBanner: Locator

  // Brand
  readonly heading: Locator

  constructor(page: Page) {
    this.page = page

    this.emailInput = page.getByLabel('Email address')
    this.passwordInput = page.getByLabel('Password')
    this.submitButton = page.getByRole('button', { name: /^Sign in$/ })

    // Zod/RHF field-level errors — rendered as <p> immediately after the input
    this.emailError = page.locator('p.text-xs.text-destructive').first()
    this.passwordError = page.locator('p.text-xs.text-destructive').last()

    // Server-side error banner rendered when authClient.signIn returns an error
    this.serverErrorBanner = page.locator('div.bg-destructive\\/10')

    this.heading = page.getByRole('heading', { name: 'Helpdesk' })
  }

  async goto() {
    await this.page.goto('/login')
    // Wait for the session check to finish so the form is visible
    await this.emailInput.waitFor({ state: 'visible' })
  }

  async fillEmail(email: string) {
    await this.emailInput.fill(email)
  }

  async fillPassword(password: string) {
    await this.passwordInput.fill(password)
  }

  async submit() {
    await this.submitButton.click()
  }

  /**
   * Convenience: fill both fields and click submit.
   */
  async login(email: string, password: string) {
    await this.fillEmail(email)
    await this.fillPassword(password)
    await this.submit()
  }

  /**
   * Assert the submit button enters its loading state ("Signing in..." + disabled).
   * This is transient so we only check it if the caller needs it.
   */
  async expectLoadingState() {
    await expect(this.submitButton).toBeDisabled()
    await expect(this.submitButton).toContainText('Signing in...')
  }

  async expectEmailError(message: string) {
    await expect(this.emailError).toBeVisible()
    await expect(this.emailError).toHaveText(message)
  }

  async expectPasswordError(message: string) {
    await expect(this.passwordError).toBeVisible()
    await expect(this.passwordError).toHaveText(message)
  }

  async expectServerError(message: string) {
    await expect(this.serverErrorBanner).toBeVisible()
    await expect(this.serverErrorBanner).toContainText(message)
  }

  async expectNoServerError() {
    await expect(this.serverErrorBanner).not.toBeVisible()
  }
}
