import { type Page, type Locator, expect } from '@playwright/test'

/**
 * Page Object for / (dashboard / home).
 *
 * The home page shows:
 *  - A personalised greeting: "Good morning, {firstName} 👋"
 *  - Three stat cards: "Open tickets", "Resolved today", "Unassigned"
 *  - An empty-state card: "No tickets yet"
 *  - The shared Navbar (see NavbarComponent)
 */
export class HomePage {
  readonly page: Page
  readonly greeting: Locator
  readonly emptyState: Locator

  constructor(page: Page) {
    this.page = page

    // Greeting heading text starts with "Good morning," — use regex to match
    // regardless of the time-of-day prefix the app might choose in the future.
    this.greeting = page.getByRole('heading', { name: /Good morning,/ })

    this.emptyState = page.getByText('No tickets yet')
  }

  async goto() {
    await this.page.goto('/')
    await this.expectLoaded()
  }

  async expectLoaded() {
    await expect(this.page).toHaveURL('/')
    await expect(this.greeting).toBeVisible()
  }

  async expectGreeting(firstName: string) {
    await expect(this.greeting).toContainText(firstName)
  }
}
