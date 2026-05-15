import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import MockAdapter from 'axios-mock-adapter'
import axios from 'axios'
import UsersPage from './UsersPage'

vi.mock('../lib/auth-client', () => ({
  authClient: {
    useSession: () => ({
      data: { user: { name: 'Admin User', role: 'admin' } },
    }),
    signOut: vi.fn(),
  },
}))

const USERS = [
  {
    id: '1',
    name: 'Alice Admin',
    email: 'alice@example.com',
    role: 'admin',
    createdAt: '2024-01-15T00:00:00.000Z',
    banned: null,
    banReason: null,
  },
  {
    id: '2',
    name: 'Bob Agent',
    email: 'bob@example.com',
    role: 'agent',
    createdAt: '2024-03-20T00:00:00.000Z',
    banned: true,
    banReason: 'Violated policy',
  },
]

let mock: MockAdapter

beforeEach(() => {
  mock = new MockAdapter(axios)
  mock.onGet('/api/users').reply(200, USERS)
  mock.onPost('/api/users').reply(201, {
    id: '3',
    name: 'New Person',
    email: 'new@example.com',
    role: 'user',
    createdAt: new Date().toISOString(),
    banned: null,
    banReason: null,
  })
})

afterEach(() => {
  mock.restore()
})

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('UsersPage', () => {
  it('shows a loading state initially', () => {
    renderPage()
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('renders the page heading', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Users' })).toBeInTheDocument())
  })

  it('renders a row for each user', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Alice Admin')).toBeInTheDocument())
    expect(screen.getByText('Bob Agent')).toBeInTheDocument()
  })

  it('displays user emails', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('alice@example.com')).toBeInTheDocument())
    expect(screen.getByText('bob@example.com')).toBeInTheDocument()
  })

  it('shows the correct role badge for each user', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Alice Admin')).toBeInTheDocument())
    const badges = screen.getAllByText(/^(admin|agent)$/)
    expect(badges.some((el) => el.textContent === 'admin')).toBe(true)
    expect(badges.some((el) => el.textContent === 'agent')).toBe(true)
  })

  it('shows Active badge for non-banned users', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Active')).toBeInTheDocument())
  })

  it('shows Banned badge for banned users', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Banned')).toBeInTheDocument())
  })

  it('shows an empty state when no users are returned', async () => {
    mock.onGet('/api/users').reply(200, [])
    renderPage()
    await waitFor(() => expect(screen.getByText('No users found.')).toBeInTheDocument())
  })

  it('shows an error message when the request fails', async () => {
    mock.onGet('/api/users').reply(500)
    renderPage()
    await waitFor(() =>
      expect(screen.getByText(/request failed with status code 500/i)).toBeInTheDocument()
    )
  })

  it('closes the modal when pressing Escape', async () => {
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => expect(screen.getByRole('button', { name: 'New User' })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'New User' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('closes the modal when clicking outside', async () => {
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => expect(screen.getByRole('button', { name: 'New User' })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'New User' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.click(document.querySelector('[data-slot="dialog-overlay"]')!)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('renders a "New User" button', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Alice Admin')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'New User' })).toBeInTheDocument()
  })

  it('opens the modal when "New User" is clicked', async () => {
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => expect(screen.getByRole('button', { name: 'New User' })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'New User' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toBeInTheDocument()
  })

  it('shows a validation error when name is too short', async () => {
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => expect(screen.getByRole('button', { name: 'New User' })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'New User' }))
    await user.type(screen.getByLabelText('Name'), 'ab')
    await user.type(screen.getByLabelText('Email'), 'test@test.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create user' }))
    expect(screen.getByText('Name must be at least 3 characters')).toBeInTheDocument()
    expect(mock.history.post.length).toBe(0)
  })

  it('shows a validation error when password is too short', async () => {
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => expect(screen.getByRole('button', { name: 'New User' })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'New User' }))
    await user.type(screen.getByLabelText('Name'), 'Valid Name')
    await user.type(screen.getByLabelText('Email'), 'test@test.com')
    await user.type(screen.getByLabelText('Password'), 'short')
    await user.click(screen.getByRole('button', { name: 'Create user' }))
    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument()
    expect(mock.history.post.length).toBe(0)
  })

  it('submits the form and closes the modal on success', async () => {
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => expect(screen.getByRole('button', { name: 'New User' })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'New User' }))
    await user.type(screen.getByLabelText('Name'), 'Valid Name')
    await user.type(screen.getByLabelText('Email'), 'new@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create user' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(mock.history.post.length).toBe(1)
    expect(JSON.parse(mock.history.post[0].data)).toEqual({
      name: 'Valid Name',
      email: 'new@example.com',
      password: 'password123',
    })
  })

  it('shows a server error when POST returns 400', async () => {
    mock.onPost('/api/users').reply(400, { error: 'Email already exists' })
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => expect(screen.getByRole('button', { name: 'New User' })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'New User' }))
    await user.type(screen.getByLabelText('Name'), 'Valid Name')
    await user.type(screen.getByLabelText('Email'), 'existing@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create user' }))
    await waitFor(() => expect(screen.getByText('Email already exists')).toBeInTheDocument())
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('disables the submit button while the request is pending', async () => {
    mock.onPost('/api/users').reply(() => new Promise(() => {}))
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => expect(screen.getByRole('button', { name: 'New User' })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'New User' }))
    await user.type(screen.getByLabelText('Name'), 'Valid Name')
    await user.type(screen.getByLabelText('Email'), 'new@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create user' }))
    await waitFor(() => expect(screen.getByText('Creating…')).toBeInTheDocument())
    expect(screen.getByText('Creating…').closest('button')).toBeDisabled()
  })
})
