import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import MockAdapter from 'axios-mock-adapter'
import axios from 'axios'
import TicketsTable from './TicketsTable'
import { TicketStatus, TicketCategory } from '@helpdesk/core'

const TICKETS = [
  {
    id: '1',
    subject: 'My order is broken',
    status: TicketStatus.OPEN,
    category: TicketCategory.GENERAL_QUESTION,
    fromEmail: 'alice@example.com',
    fromName: 'Alice Smith',
    assignedTo: 'u1',
    createdAt: '2024-06-01T10:00:00.000Z',
    assignedUser: { name: 'Bob Agent' },
  },
  {
    id: '2',
    subject: 'Refund please',
    status: TicketStatus.RESOLVED,
    category: TicketCategory.REFUND_REQUEST,
    fromEmail: 'carol@example.com',
    fromName: null,
    assignedTo: null,
    createdAt: '2024-06-02T09:00:00.000Z',
    assignedUser: null,
  },
  {
    id: '3',
    subject: 'Technical issue',
    status: TicketStatus.CLOSED,
    category: TicketCategory.TECHNICAL_QUESTION,
    fromEmail: 'dave@example.com',
    fromName: 'Dave',
    assignedTo: null,
    createdAt: '2024-06-03T08:00:00.000Z',
    assignedUser: null,
  },
]

let mock: MockAdapter

beforeEach(() => {
  mock = new MockAdapter(axios)
  mock.onGet('/api/tickets').reply(200, TICKETS)
})

afterEach(() => {
  mock.restore()
})

function renderTable() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TicketsTable />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('TicketsTable', () => {
  // ---------------------------------------------------------------------------
  // Loading / error / empty states
  // ---------------------------------------------------------------------------

  it('shows a loading state initially', () => {
    renderTable()
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('shows an empty state when no tickets are returned', async () => {
    mock.onGet('/api/tickets').reply(200, [])
    renderTable()
    await waitFor(() => expect(screen.getByText('No tickets yet')).toBeInTheDocument())
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows an error message when the request fails', async () => {
    mock.onGet('/api/tickets').reply(500)
    renderTable()
    await waitFor(() =>
      expect(screen.getByText(/request failed with status code 500/i)).toBeInTheDocument()
    )
  })

  // ---------------------------------------------------------------------------
  // Row content
  // ---------------------------------------------------------------------------

  it('renders a row for each ticket', async () => {
    renderTable()
    await waitFor(() => expect(screen.getByText('My order is broken')).toBeInTheDocument())
    expect(screen.getByText('Refund please')).toBeInTheDocument()
    expect(screen.getByText('Technical issue')).toBeInTheDocument()
  })

  it('shows the display name and email when fromName is present', async () => {
    renderTable()
    await waitFor(() => expect(screen.getByText('Alice Smith')).toBeInTheDocument())
    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
  })

  it('shows only the email when fromName is null', async () => {
    renderTable()
    await waitFor(() => expect(screen.getByText('carol@example.com')).toBeInTheDocument())
  })

  it('shows the assigned agent name', async () => {
    renderTable()
    await waitFor(() => expect(screen.getByText('Bob Agent')).toBeInTheDocument())
  })

  it('shows "Unassigned" when assignedUser is null', async () => {
    renderTable()
    await waitFor(() => expect(screen.getAllByText('Unassigned').length).toBeGreaterThan(0))
  })

  // ---------------------------------------------------------------------------
  // Status badges
  // ---------------------------------------------------------------------------

  it('shows "Open" badge for OPEN tickets', async () => {
    renderTable()
    await waitFor(() => expect(screen.getByText('Open')).toBeInTheDocument())
  })

  it('shows "Resolved" badge for RESOLVED tickets', async () => {
    renderTable()
    await waitFor(() => expect(screen.getByText('Resolved')).toBeInTheDocument())
  })

  it('shows "Closed" badge for CLOSED tickets', async () => {
    renderTable()
    await waitFor(() => expect(screen.getByText('Closed')).toBeInTheDocument())
  })

  // ---------------------------------------------------------------------------
  // Category labels
  // ---------------------------------------------------------------------------

  it('renders "General Question" for GENERAL_QUESTION', async () => {
    renderTable()
    await waitFor(() => expect(screen.getByText('General Question')).toBeInTheDocument())
  })

  it('renders "Refund Request" for REFUND_REQUEST', async () => {
    renderTable()
    await waitFor(() => expect(screen.getByText('Refund Request')).toBeInTheDocument())
  })

  it('renders "Technical Question" for TECHNICAL_QUESTION', async () => {
    renderTable()
    await waitFor(() => expect(screen.getByText('Technical Question')).toBeInTheDocument())
  })

  // ---------------------------------------------------------------------------
  // Sortable column headers
  // ---------------------------------------------------------------------------

  it('renders sort buttons for Subject, Status, Category, and Date headers', async () => {
    renderTable()
    await waitFor(() => expect(screen.getByText('My order is broken')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /subject/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /status/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /category/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /date/i })).toBeInTheDocument()
  })

  it('From and Assigned to headers are not sort buttons', async () => {
    renderTable()
    await waitFor(() => expect(screen.getByText('My order is broken')).toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /from/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /assigned to/i })).not.toBeInTheDocument()
  })

  it('clicking a sortable header sends the correct sortBy query param', async () => {
    const user = userEvent.setup()
    renderTable()
    await waitFor(() => expect(screen.getByText('My order is broken')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /subject/i }))

    await waitFor(() => {
      const lastGet = mock.history.get.at(-1)!
      expect(lastGet.params).toMatchObject({ sortBy: 'subject' })
    })
  })

  it('clicking a header twice reverses the sort direction', async () => {
    const user = userEvent.setup()
    renderTable()
    await waitFor(() => expect(screen.getByText('My order is broken')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /subject/i }))
    await waitFor(() => expect(mock.history.get.at(-1)!.params).toMatchObject({ sortBy: 'subject', sortDir: 'asc' }))

    await user.click(screen.getByRole('button', { name: /subject/i }))
    await waitFor(() => expect(mock.history.get.at(-1)!.params).toMatchObject({ sortBy: 'subject', sortDir: 'desc' }))
  })
})
