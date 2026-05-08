import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
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
})
