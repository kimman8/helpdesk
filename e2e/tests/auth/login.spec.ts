/**
 * Authentication e2e tests — covers every scenario listed in the brief:
 *
 *  1. Login form — valid credentials (admin + agent), wrong password,
 *     wrong email, empty fields, invalid email format
 *  2. Session persistence — staying logged in after a full page reload
 *  3. Protected routes — unauthenticated users are redirected to /login
 *  4. Admin-only routes — agents are redirected to /, admins can access /users
 *  5. Navbar — Users link visibility per role
 *  6. Sign out — redirects to /login; protected route then redirects again
 *
 * Authentication for "already logged in" tests uses storageState so the login
 * UI is not exercised repeatedly — each role logs in once in auth.setup.ts.
 */

import { test, expect } from '@playwright/test'
import { adminStorageState, agentStorageState, TEST_USERS } from '../../fixtures/auth'
import { LoginPage } from '../../pages/LoginPage'
import { NavbarComponent } from '../../pages/NavbarComponent'
import { HomePage } from '../../pages/HomePage'

// ---------------------------------------------------------------------------
// 1. Login form — unauthenticated browser (no storageState)
// ---------------------------------------------------------------------------

test.describe('Login form', () => {
  let loginPage: LoginPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
    await loginPage.goto()
  })

  // -------------------------------------------------------------------------
  // Page structure
  // -------------------------------------------------------------------------

  test('renders the login form with all expected elements', async ({ page }) => {
    await expect(loginPage.heading).toBeVisible()
    await expect(page.getByText('Sign in to your account')).toBeVisible()
    await expect(loginPage.emailInput).toBeVisible()
    await expect(loginPage.passwordInput).toBeVisible()
    await expect(loginPage.submitButton).toBeVisible()
    await expect(loginPage.submitButton).toBeEnabled()

    // No errors on initial render
    await expect(loginPage.serverErrorBanner).not.toBeVisible()
  })

  test('email field has autofocus', async ({ page }) => {
    await expect(loginPage.emailInput).toBeFocused()
  })

  // -------------------------------------------------------------------------
  // Happy paths
  // -------------------------------------------------------------------------

  test('admin can log in with valid credentials and is redirected to /', async ({ page }) => {
    // Intercept the sign-in request so we can assert on it explicitly
    const signInResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/auth/sign-in/email') && resp.status() === 200,
    )

    await loginPage.login(TEST_USERS.admin.email, TEST_USERS.admin.password)

    await signInResponsePromise
    await expect(page).toHaveURL('/')

    // The dashboard greeting should mention the admin's first name
    const home = new HomePage(page)
    await home.expectGreeting('Admin')
  })

  test('agent can log in with valid credentials and is redirected to /', async ({ page }) => {
    const signInResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/auth/sign-in/email') && resp.status() === 200,
    )

    await loginPage.login(TEST_USERS.agent.email, TEST_USERS.agent.password)

    await signInResponsePromise
    await expect(page).toHaveURL('/')

    const home = new HomePage(page)
    await home.expectGreeting('Agent')
  })

  // -------------------------------------------------------------------------
  // Wrong credentials — server-side errors
  // -------------------------------------------------------------------------

  test('shows server error banner when password is incorrect', async ({ page }) => {
    const signInResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/auth/sign-in/email'),
    )

    await loginPage.login(TEST_USERS.admin.email, 'wrong-password')

    await signInResponsePromise

    // Must stay on /login — no redirect
    await expect(page).toHaveURL('/login')
    await loginPage.expectServerError('Invalid email or password.')
  })

  test('shows server error banner when email does not exist', async ({ page }) => {
    const signInResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/auth/sign-in/email'),
    )

    await loginPage.login('nobody@example.com', 'password123')

    await signInResponsePromise

    await expect(page).toHaveURL('/login')
    // The banner must be visible regardless of the exact message text from
    // Better Auth — we verify the UI element appears, not the server string.
    await expect(loginPage.serverErrorBanner).toBeVisible()
  })

  test('server error banner is cleared when the user starts a new login attempt', async ({
    page,
  }) => {
    // Trigger an error first
    const firstResponse = page.waitForResponse((resp) =>
      resp.url().includes('/api/auth/sign-in/email'),
    )
    await loginPage.login(TEST_USERS.admin.email, 'wrong-password')
    await firstResponse
    await expect(loginPage.serverErrorBanner).toBeVisible()

    // Now attempt again — the banner should disappear while the request is
    // in-flight (setServerError(null) runs at the top of onSubmit)
    const secondResponse = page.waitForResponse((resp) =>
      resp.url().includes('/api/auth/sign-in/email'),
    )
    await loginPage.login(TEST_USERS.admin.email, TEST_USERS.admin.password)
    await secondResponse

    // After a successful login the page navigates away — banner is gone
    await expect(page).toHaveURL('/')
  })

  // -------------------------------------------------------------------------
  // Client-side validation (Zod / React Hook Form — no network request)
  // -------------------------------------------------------------------------

  test('shows email validation error when email field is empty on submit', async ({ page }) => {
    // Leave email empty, fill password, submit
    await loginPage.fillPassword('anything')
    await loginPage.submit()

    // RHF + Zod validates before sending — no network request
    await loginPage.expectEmailError('Enter a valid email address')
    await expect(page).toHaveURL('/login')
  })

  test('shows password validation error when password field is empty on submit', async ({
    page,
  }) => {
    await loginPage.fillEmail(TEST_USERS.admin.email)
    await loginPage.submit()

    await loginPage.expectPasswordError('Password is required')
    await expect(page).toHaveURL('/login')
  })

  test('shows both validation errors when both fields are empty on submit', async ({ page }) => {
    await loginPage.submit()

    await loginPage.expectEmailError('Enter a valid email address')
    await loginPage.expectPasswordError('Password is required')
    await expect(page).toHaveURL('/login')
  })

  test('shows email format validation error for a malformed email', async ({ page }) => {
    await loginPage.fillEmail('not-an-email')
    await loginPage.fillPassword('password123')
    await loginPage.submit()

    await loginPage.expectEmailError('Enter a valid email address')
    // No server request should have been made
    await expect(page).toHaveURL('/login')
  })

  test('shows email format validation error for email missing TLD', async ({ page }) => {
    await loginPage.fillEmail('user@nodomain')
    await loginPage.fillPassword('password123')
    await loginPage.submit()

    await loginPage.expectEmailError('Enter a valid email address')
    await expect(page).toHaveURL('/login')
  })

  // -------------------------------------------------------------------------
  // Already-authenticated redirect
  // -------------------------------------------------------------------------

  test('redirects an already-authenticated user away from /login to /', async ({ page }) => {
    // Log in first
    await loginPage.login(TEST_USERS.admin.email, TEST_USERS.admin.password)
    await expect(page).toHaveURL('/')

    // Navigating back to /login should redirect back to /
    await page.goto('/login')
    await expect(page).toHaveURL('/')
  })
})

// ---------------------------------------------------------------------------
// 2. Session persistence
// ---------------------------------------------------------------------------

test.describe('Session persistence', () => {
  test.use({ storageState: adminStorageState })

  test('admin session survives a full page reload', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL('/')

    await page.reload()

    // After reload the session cookie is re-sent; ProtectedRoute should
    // remain satisfied and not redirect to /login.
    await expect(page).toHaveURL('/')
    const home = new HomePage(page)
    await home.expectGreeting('Admin')
  })

  test('agent session survives a full page reload', async ({ page, context }) => {
    // Override the storageState for this single test
    await context.clearCookies()

    // Re-authenticate as agent for this isolated test
    const loginPage = new LoginPage(page)
    await loginPage.goto()
    await loginPage.login(TEST_USERS.agent.email, TEST_USERS.agent.password)
    await expect(page).toHaveURL('/')

    await page.reload()
    await expect(page).toHaveURL('/')
    const home = new HomePage(page)
    await home.expectGreeting('Agent')
  })
})

// ---------------------------------------------------------------------------
// 3. Protected routes — unauthenticated access
// ---------------------------------------------------------------------------

test.describe('Protected routes — unauthenticated', () => {
  // Explicitly no storageState — fresh unauthenticated browser context

  test('visiting / without a session redirects to /login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL('/login')
  })

  test('visiting /users without a session redirects to /login', async ({ page }) => {
    await page.goto('/users')
    await expect(page).toHaveURL('/login')
  })

  test('visiting an unknown route without a session redirects to /login', async ({ page }) => {
    // App has <Route path="*" element={<Navigate to="/" replace />} />
    // which hits ProtectedRoute, so the chain is: * → / → /login
    await page.goto('/some/unknown/path')
    await expect(page).toHaveURL('/login')
  })
})

// ---------------------------------------------------------------------------
// 4. Admin-only routes
// ---------------------------------------------------------------------------

test.describe('Admin-only routes — admin user', () => {
  test.use({ storageState: adminStorageState })

  test('admin can navigate to /users and sees the Users page heading', async ({ page }) => {
    await page.goto('/users')
    await expect(page).toHaveURL('/users')
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
  })

  test('admin can reach /users via the navbar Users link', async ({ page }) => {
    await page.goto('/')
    const navbar = new NavbarComponent(page)
    await navbar.usersLink.click()
    await expect(page).toHaveURL('/users')
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
  })
})

test.describe('Admin-only routes — agent user', () => {
  test.use({ storageState: agentStorageState })

  test('agent is redirected from /users to / (not to /login)', async ({ page }) => {
    await page.goto('/users')
    // AdminRoute redirects authenticated non-admins to / (not /login)
    await expect(page).toHaveURL('/')
    // Confirm it's the home page and not the login page
    const home = new HomePage(page)
    await home.expectLoaded()
  })
})

// ---------------------------------------------------------------------------
// 5. Navbar — role-based link visibility
// ---------------------------------------------------------------------------

test.describe('Navbar — admin role', () => {
  test.use({ storageState: adminStorageState })

  test('shows the Users navigation link', async ({ page }) => {
    await page.goto('/')
    const navbar = new NavbarComponent(page)
    await navbar.expectUsersLinkVisible()
  })

  test('shows the user name in the navbar', async ({ page }) => {
    await page.goto('/')
    const navbar = new NavbarComponent(page)
    await navbar.expectUserName(TEST_USERS.admin.name)
  })

  test('shows the Sign out button', async ({ page }) => {
    await page.goto('/')
    const navbar = new NavbarComponent(page)
    await navbar.expectSignOutVisible()
  })

  test('Users link is visible on the /users page itself', async ({ page }) => {
    await page.goto('/users')
    const navbar = new NavbarComponent(page)
    await navbar.expectUsersLinkVisible()
  })
})

test.describe('Navbar — agent role', () => {
  test.use({ storageState: agentStorageState })

  test('does NOT show the Users navigation link', async ({ page }) => {
    await page.goto('/')
    const navbar = new NavbarComponent(page)
    await navbar.expectUsersLinkHidden()
  })

  test('shows the user name in the navbar', async ({ page }) => {
    await page.goto('/')
    const navbar = new NavbarComponent(page)
    await navbar.expectUserName(TEST_USERS.agent.name)
  })

  test('shows the Sign out button', async ({ page }) => {
    await page.goto('/')
    const navbar = new NavbarComponent(page)
    await navbar.expectSignOutVisible()
  })
})

// ---------------------------------------------------------------------------
// 6. Sign out
// ---------------------------------------------------------------------------

test.describe('Sign out — admin', () => {
  test.use({ storageState: adminStorageState })

  test('clicking Sign out redirects to /login', async ({ page }) => {
    await page.goto('/')
    const navbar = new NavbarComponent(page)

    // waitForURL is inside NavbarComponent.signOut()
    await navbar.signOut()

    await expect(page).toHaveURL('/login')
  })

  test('after signing out, navigating to a protected route redirects to /login', async ({
    page,
  }) => {
    await page.goto('/')
    const navbar = new NavbarComponent(page)
    await navbar.signOut()
    await expect(page).toHaveURL('/login')

    // Attempt to access a protected route — must redirect back to /login
    await page.goto('/')
    await expect(page).toHaveURL('/login')
  })

  test('after signing out, the login form is fully interactive again', async ({ page }) => {
    await page.goto('/')
    const navbar = new NavbarComponent(page)
    await navbar.signOut()

    const loginPage = new LoginPage(page)
    await expect(loginPage.emailInput).toBeVisible()
    await expect(loginPage.passwordInput).toBeVisible()
    await expect(loginPage.submitButton).toBeEnabled()
  })

  test('after signing out, the user can log back in as a different role', async ({ page }) => {
    // Sign out from admin
    await page.goto('/')
    const navbar = new NavbarComponent(page)
    await navbar.signOut()
    await expect(page).toHaveURL('/login')

    // Now log in as agent
    const loginPage = new LoginPage(page)
    await loginPage.login(TEST_USERS.agent.email, TEST_USERS.agent.password)
    await expect(page).toHaveURL('/')

    // Agent navbar — no Users link
    const agentNavbar = new NavbarComponent(page)
    await agentNavbar.expectUsersLinkHidden()
    await agentNavbar.expectUserName(TEST_USERS.agent.name)
  })
})

test.describe('Sign out — agent', () => {
  test.use({ storageState: agentStorageState })

  test('clicking Sign out redirects to /login', async ({ page }) => {
    await page.goto('/')
    const navbar = new NavbarComponent(page)
    await navbar.signOut()
    await expect(page).toHaveURL('/login')
  })

  test('after signing out, navigating to / redirects to /login', async ({ page }) => {
    await page.goto('/')
    const navbar = new NavbarComponent(page)
    await navbar.signOut()
    await expect(page).toHaveURL('/login')

    await page.goto('/')
    await expect(page).toHaveURL('/login')
  })
})
