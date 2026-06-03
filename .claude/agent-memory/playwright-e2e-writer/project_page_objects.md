---
name: Page Object Model classes created for Helpdesk e2e tests
description: File locations and responsibilities of all POM classes written so far
type: project
---

## LoginPage — `e2e/pages/LoginPage.ts`
Wraps all interactions with /login: fill, submit, assert error states.
Methods: goto(), fillEmail(), fillPassword(), submit(), login(), expectEmailError(), expectPasswordError(), expectServerError(), expectNoServerError(), expectLoadingState()

## NavbarComponent — `e2e/pages/NavbarComponent.ts`
Wraps the shared header rendered inside authenticated pages.
Methods: expectUsersLinkVisible(), expectUsersLinkHidden(), expectSignOutVisible(), signOut(), expectUserName()
signOut() clicks the button and waits for waitForURL('/login') internally.

## HomePage — `e2e/pages/HomePage.ts`
Wraps the dashboard at /.
Methods: goto(), expectLoaded(), expectGreeting(firstName)

## UsersPage — `e2e/pages/UsersPage.ts`
Wraps /users, UsersTable, and the Create/Edit/Delete modals.
Methods: goto(), waitForTableLoaded(), rowByName(name), expectRowVisible(name), expectRowGone(name),
openCreateModal(), createUser(name, email, password),
openEditModal(name), editUserName(userId, newName), getEditModalNameValue(), getEditModalEmailValue(),
openDeleteModal(name), confirmDelete(userId)

**How to apply:** Import these classes directly in test specs. For new pages, create a new POM in `e2e/pages/` following the same pattern.
