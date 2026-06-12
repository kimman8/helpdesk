import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import MockAdapter from 'axios-mock-adapter'
import axios from 'axios'
import TicketDetailPage from './TicketDetailPage'

vi.mock('../lib/auth-client', () => ({
  authClient: {
    useSession: () => ({
      data: { user: { name: 'Agent User', role: 'agent' } },
    }),
    signOut: vi.fn(),
  },
}))

const AGENTS = [
  { id: 'agent-1', name: 'Alice Agent' },
  { id: 'agent-2', name: 'Bob Agent' },
]

const TICKET_UNASSIGNED = {
  id: 'ticket-1',
  subject: 'My printer is on fire',
  status: 'OPEN',
  category: 'TECHNICAL_QUESTION',
  fromEmail: 'customer@example.com',
  fromName: 'John Customer',
  assignedTo: null,
  assignedUser: null,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T12:00:00.000Z',
  messages: [],
}

const TICKET_ASSIGNED = {
  ...TICKET_UNASSIGNED,
  assignedTo: 'agent-1',
  assignedUser: { name: 'Alice Agent' },
}

const TICKET_WITH_MESSAGES = {
  ...TICKET_UNASSIGNED,
  messages: [
    {
      id: 'msg-1',
      body: 'Hello, my printer is on fire!',
      fromEmail: 'customer@example.com',
      fromName: 'John Customer',
      isAgent: false,
      createdAt: '2024-01-15T10:00:00.000Z',
    },
    {
      id: 'msg-2',
      body: 'We are looking into this for you.',
      fromEmail: 'agent@helpdesk.com',
      fromName: 'Alice Agent',
      isAgent: true,
      createdAt: '2024-01-15T11:00:00.000Z',
    },
  ],
}

let mock: MockAdapter

beforeEach(() => {
  mock = new MockAdapter(axios)
  mock.onGet('/api/tickets/ticket-1').reply(200, TICKET_UNASSIGNED)
  mock.onGet('/api/tickets/agents').reply(200, AGENTS)
  mock.onPatch('/api/tickets/ticket-1').reply(200, TICKET_ASSIGNED)
})

afterEach(() => {
  mock.restore()
})

function renderPage(ticketId = 'ticket-1') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/tickets/${ticketId}`]}>
          <Routes>
            <Route path="/tickets/:id" element={<TicketDetailPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    ),
  }
}

describe('TicketDetailPage', () => {
  it('shows a loading state initially', () => {
    renderPage()
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('renders the ticket subject as the page heading', async () => {
    renderPage()
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'My printer is on fire' })).toBeInTheDocument()
    )
  })

  it('renders the status badge', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Open')).toBeInTheDocument())
  })

  it('renders the category', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('Technical Question')).toBeInTheDocument())
  })

  it('renders the sender name and email', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('John Customer')).toBeInTheDocument())
    expect(screen.getByText('customer@example.com')).toBeInTheDocument()
  })

  it('shows "Unassigned" as the selected option when no agent is assigned', async () => {
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument())
    await user.click(screen.getByRole('combobox'))
    await waitFor(() =>
      expect(screen.getByRole('option', { name: /unassigned/i, selected: true })).toBeInTheDocument()
    )
  })

  it('shows the assigned agent as the selected option when a ticket is assigned', async () => {
    mock.onGet('/api/tickets/ticket-1').reply(200, TICKET_ASSIGNED)
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => expect(screen.getByRole('combobox')).toBeInTheDocument())
    await user.click(screen.getByRole('combobox'))
    await waitFor(() =>
      expect(screen.getByRole('option', { name: 'Alice Agent', selected: true })).toBeInTheDocument()
    )
  })

  it('populates the dropdown with agents from the API', async () => {
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => expect(screen.getByText('My printer is on fire')).toBeInTheDocument())

    const trigger = screen.getByRole('combobox')
    await user.click(trigger)

    await waitFor(() => expect(screen.getByRole('option', { name: 'Alice Agent' })).toBeInTheDocument())
    expect(screen.getByRole('option', { name: 'Bob Agent' })).toBeInTheDocument()
  })

  it('sends a PATCH request with the agent id when an agent is selected', async () => {
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => expect(screen.getByText('My printer is on fire')).toBeInTheDocument())

    const trigger = screen.getByRole('combobox')
    await user.click(trigger)
    await waitFor(() => expect(screen.getByRole('option', { name: 'Alice Agent' })).toBeInTheDocument())
    await user.click(screen.getByRole('option', { name: 'Alice Agent' }))

    await waitFor(() => expect(mock.history.patch.length).toBe(1))
    expect(JSON.parse(mock.history.patch[0].data)).toEqual({ assignedTo: 'agent-1' })
  })

  it('sends a PATCH request with null when "Unassigned" is selected', async () => {
    mock.onGet('/api/tickets/ticket-1').reply(200, TICKET_ASSIGNED)
    mock.onPatch('/api/tickets/ticket-1').reply(200, TICKET_UNASSIGNED)
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => expect(screen.getByText('My printer is on fire')).toBeInTheDocument())

    const trigger = screen.getByRole('combobox')
    await user.click(trigger)
    await waitFor(() => expect(screen.getByRole('option', { name: /unassigned/i })).toBeInTheDocument())
    await user.click(screen.getByRole('option', { name: /unassigned/i }))

    await waitFor(() => expect(mock.history.patch.length).toBe(1))
    expect(JSON.parse(mock.history.patch[0].data)).toEqual({ assignedTo: null })
  })

  it('shows "No messages yet" when the ticket has no messages', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText('No messages yet.')).toBeInTheDocument())
  })

  it('renders each message body', async () => {
    mock.onGet('/api/tickets/ticket-1').reply(200, TICKET_WITH_MESSAGES)
    renderPage()
    await waitFor(() =>
      expect(screen.getByText('Hello, my printer is on fire!')).toBeInTheDocument()
    )
    expect(screen.getByText('We are looking into this for you.')).toBeInTheDocument()
  })

  it('shows an Agent badge on agent messages', async () => {
    mock.onGet('/api/tickets/ticket-1').reply(200, TICKET_WITH_MESSAGES)
    renderPage()
    await waitFor(() => expect(screen.getByText('Agent')).toBeInTheDocument())
  })

  it('shows the message count heading', async () => {
    mock.onGet('/api/tickets/ticket-1').reply(200, TICKET_WITH_MESSAGES)
    renderPage()
    await waitFor(() => expect(screen.getByText('Messages (2)')).toBeInTheDocument())
  })

  it('shows an error when the ticket request fails', async () => {
    mock.onGet('/api/tickets/ticket-1').reply(500)
    renderPage()
    await waitFor(() =>
      expect(screen.getByText(/request failed with status code 500/i)).toBeInTheDocument()
    )
  })
})
