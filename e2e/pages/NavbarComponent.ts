import { type Page, type Locator, expect } from '@playwright/test'

/**
 * Component Object for the Navbar rendered inside authenticated pages.
 *
 * The navbar has no data-testid attributes. Selectors rely on:
 *  - The "Users" admin nav link: <Link to="/users">Users</Link>
 *  - The sign-out button: <Button>Sign out</Button> (visible text)
 *  - The brand: <span>Helpdesk</span>
 *  - The user name: <span>{session.user.name}</span> (hidden on small screens, visible on sm+)
 */
export class NavbarComponent {
  readonly page: Page

  readonly usersLink: Locator
  readonly signOutButton: Locator
  readonly brandName: Locator

  constructor(page: Page) {
    this.page = page

    this.usersLink = page.getByRole('link', { name: 'Users' })
    this.signOutButton = page.getByRole('button', { name: 'Sign out' })
    this.brandName = page.getByText('Helpdesk', { exact: true })
  }

  async expectUsersLinkVisible() {
    await expect(this.usersLink).toBeVisible()
  }

  async expectUsersLinkHidden() {
    await expect(this.usersLink).not.toBeVisible()
  }

  async expectSignOutVisible() {
    await expect(this.signOutButton).toBeVisible()
  }

  /**
   * Click "Sign out" and wait for the navigation to /login to complete.
   */
  async signOut() {
    await this.signOutButton.click()
    await this.page.waitForURL('/login')
  }

  /**
   * Assert the visible user name text in the navbar (hidden on small screens,
   * so the viewport must be ≥ sm breakpoint — Desktop Chrome satisfies this).
   */
  async expectUserName(name: string) {
    await expect(this.page.getByText(name, { exact: true })).toBeVisible()
  }
}
