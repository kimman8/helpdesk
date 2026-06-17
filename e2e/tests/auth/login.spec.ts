/**
 * Authentication e2e tests — only what requires a real browser + server.
 *
 * Client-side validation (Zod/RHF), form rendering, navbar visibility per
 * role, and sign-out button presence are all covered by component tests
 * (Vitest + RTL) and do not belong here.
 *
 * What we verify here:
 *  1. Login form — happy paths (real Better Auth session created)
 *  2. Login form — wrong credentials (real server error from Better Auth)
 *  3. Already-authenticated redirect (real session in cookie)
 *  4. Session persistence — stays logged in after a full page reload
 *  5. Protected routes — unauthenticated users are redirected to /login
 *  6. Admin-only routes — agents are redirected to /, admins can access /users
 *  7. Sign out — session is destroyed; protected routes redirect again
 */

import { test, expect } from '@playwright/test'
import { adminStorageState, agentStorageState, TEST_USERS } from '../../fixtures/auth'
import { LoginPage } from '../../pages/LoginPage'
import { NavbarComponent } from '../../pages/NavbarComponent'
import { HomePage } from '../../pages/HomePage'

// ---------------------------------------------------------------------------
// 1. Login form — server interactions only
// ---------------------------------------------------------------------------

test.describe('Login form', () => {
  let loginPage: LoginPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
    await loginPage.goto()
  })

  test('admin can log in with valid credentials and is redirected to /', async ({ page }) => {
    const signInResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/auth/sign-in/email') && resp.status() === 200,
    )

    await loginPage.login(TEST_USERS.admin.email, TEST_USERS.admin.password)

    await signInResponsePromise
    await expect(page).toHaveURL('/')

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

  test('shows server error banner when password is incorrect', async ({ page }) => {
    const signInResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/auth/sign-in/email'),
    )

    await loginPage.login(TEST_USERS.admin.email, 'wrong-password')

    await signInResponsePromise

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
    await expect(loginPage.serverErrorBanner).toBeVisible()
  })

  test('server error banner is cleared when the user starts a new login attempt', async ({
    page,
  }) => {
    const firstResponse = page.waitForResponse((resp) =>
      resp.url().includes('/api/auth/sign-in/email'),
    )
    await loginPage.login(TEST_USERS.admin.email, 'wrong-password')
    await firstResponse
    await expect(loginPage.serverErrorBanner).toBeVisible()

    const secondResponse = page.waitForResponse((resp) =>
      resp.url().includes('/api/auth/sign-in/email'),
    )
    await loginPage.login(TEST_USERS.admin.email, TEST_USERS.admin.password)
    await secondResponse

    await expect(page).toHaveURL('/')
  })

  test('redirects an already-authenticated user away from /login to /', async ({ page }) => {
    await loginPage.login(TEST_USERS.admin.email, TEST_USERS.admin.password)
    await expect(page).toHaveURL('/')

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

    await expect(page).toHaveURL('/')
    const home = new HomePage(page)
    await home.expectGreeting('Admin')
  })

  test('agent session survives a full page reload', async ({ page, context }) => {
    await context.clearCookies()

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
  test('visiting / without a session redirects to /login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL('/login')
  })

  test('visiting /users without a session redirects to /login', async ({ page }) => {
    await page.goto('/users')
    await expect(page).toHaveURL('/login')
  })

  test('visiting an unknown route without a session redirects to /login', async ({ page }) => {
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
    await expect(page).toHaveURL('/')
    const home = new HomePage(page)
    await home.expectLoaded()
  })
})

// ---------------------------------------------------------------------------
// 5. Sign out — session destruction
// ---------------------------------------------------------------------------

test.describe('Sign out — admin', () => {
  test.use({ storageState: adminStorageState })

  test('clicking Sign out redirects to /login', async ({ page }) => {
    await page.goto('/')
    const navbar = new NavbarComponent(page)
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

    await page.goto('/')
    await expect(page).toHaveURL('/login')
  })

  test('after signing out, the user can log back in as a different role', async ({ page }) => {
    await page.goto('/')
    const navbar = new NavbarComponent(page)
    await navbar.signOut()
    await expect(page).toHaveURL('/login')

    const loginPage = new LoginPage(page)
    await loginPage.login(TEST_USERS.agent.email, TEST_USERS.agent.password)
    await expect(page).toHaveURL('/')

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
