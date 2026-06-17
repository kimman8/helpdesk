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

const TICKET = {
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

const TICKET_ASSIGNED = { ...TICKET, assignedTo: 'agent-1', assignedUser: { name: 'Alice Agent' } }

const TICKET_WITH_MESSAGES = {
  ...TICKET,
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
  mock.onGet('/api/tickets/ticket-1').reply(200, TICKET)
  mock.onGet('/api/tickets/agents').reply(200, AGENTS)
  mock.onPatch('/api/tickets/ticket-1').reply(200, TICKET)
})

afterEach(() => {
  mock.restore()
})

function renderPage(ticketId = 'ticket-1') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/tickets/${ticketId}`]}>
        <Routes>
          <Route path="/tickets/:id" element={<TicketDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

async function waitForTicket() {
  await waitFor(() =>
    expect(screen.getByRole('heading', { name: 'My printer is on fire' })).toBeInTheDocument()
  )
}

describe('TicketDetailPage', () => {
  it('shows a skeleton loading state initially', () => {
    renderPage()
    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0)
  })

  it('renders the ticket subject as the page heading', async () => {
    renderPage()
    await waitForTicket()
  })

  it('renders the sender name and email', async () => {
    renderPage()
    await waitFor(() => expect(screen.getByText(/John Customer/)).toBeInTheDocument())
    expect(screen.getByText(/customer@example\.com/)).toBeInTheDocument()
  })

  it('shows an error when the ticket request fails', async () => {
    mock.onGet('/api/tickets/ticket-1').reply(500)
    renderPage()
    await waitFor(() =>
      expect(screen.getByText(/request failed with status code 500/i)).toBeInTheDocument()
    )
  })

  describe('status', () => {
    it('shows the current status as the selected option', async () => {
      const user = userEvent.setup()
      renderPage()
      await waitForTicket()
      await user.click(screen.getByRole('combobox', { name: 'Status' }))
      await waitFor(() =>
        expect(screen.getByRole('option', { name: 'Open', selected: true })).toBeInTheDocument()
      )
    })

    it('sends a PATCH request with the new status when changed', async () => {
      const user = userEvent.setup()
      renderPage()
      await waitForTicket()
      await user.click(screen.getByRole('combobox', { name: 'Status' }))
      await waitFor(() => expect(screen.getByRole('option', { name: 'Resolved' })).toBeInTheDocument())
      await user.click(screen.getByRole('option', { name: 'Resolved' }))
      await waitFor(() => expect(mock.history.patch.length).toBe(1))
      expect(JSON.parse(mock.history.patch[0].data)).toEqual({ status: 'RESOLVED' })
    })

    it('lists all three status options', async () => {
      const user = userEvent.setup()
      renderPage()
      await waitForTicket()
      await user.click(screen.getByRole('combobox', { name: 'Status' }))
      await waitFor(() => expect(screen.getByRole('option', { name: 'Open' })).toBeInTheDocument())
      expect(screen.getByRole('option', { name: 'Resolved' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Closed' })).toBeInTheDocument()
    })
  })

  describe('category', () => {
    it('shows the current category as the selected option', async () => {
      const user = userEvent.setup()
      renderPage()
      await waitForTicket()
      await user.click(screen.getByRole('combobox', { name: 'Category' }))
      await waitFor(() =>
        expect(screen.getByRole('option', { name: 'Technical Question', selected: true })).toBeInTheDocument()
      )
    })

    it('sends a PATCH request with the new category when changed', async () => {
      const user = userEvent.setup()
      renderPage()
      await waitForTicket()
      await user.click(screen.getByRole('combobox', { name: 'Category' }))
      await waitFor(() => expect(screen.getByRole('option', { name: 'Refund Request' })).toBeInTheDocument())
      await user.click(screen.getByRole('option', { name: 'Refund Request' }))
      await waitFor(() => expect(mock.history.patch.length).toBe(1))
      expect(JSON.parse(mock.history.patch[0].data)).toEqual({ category: 'REFUND_REQUEST' })
    })

    it('lists all three category options', async () => {
      const user = userEvent.setup()
      renderPage()
      await waitForTicket()
      await user.click(screen.getByRole('combobox', { name: 'Category' }))
      await waitFor(() => expect(screen.getByRole('option', { name: 'General Question' })).toBeInTheDocument())
      expect(screen.getByRole('option', { name: 'Technical Question' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Refund Request' })).toBeInTheDocument()
    })
  })

  describe('assignment', () => {
    it('shows "Unassigned" as the selected option when no agent is assigned', async () => {
      const user = userEvent.setup()
      renderPage()
      await waitForTicket()
      await user.click(screen.getByRole('combobox', { name: 'Assigned To' }))
      await waitFor(() =>
        expect(screen.getByRole('option', { name: /unassigned/i, selected: true })).toBeInTheDocument()
      )
    })

    it('shows the assigned agent as the selected option when a ticket is assigned', async () => {
      mock.onGet('/api/tickets/ticket-1').reply(200, TICKET_ASSIGNED)
      const user = userEvent.setup()
      renderPage()
      await waitForTicket()
      await user.click(screen.getByRole('combobox', { name: 'Assigned To' }))
      await waitFor(() =>
        expect(screen.getByRole('option', { name: 'Alice Agent', selected: true })).toBeInTheDocument()
      )
    })

    it('populates the dropdown with agents from the API', async () => {
      const user = userEvent.setup()
      renderPage()
      await waitForTicket()
      await user.click(screen.getByRole('combobox', { name: 'Assigned To' }))
      await waitFor(() => expect(screen.getByRole('option', { name: 'Alice Agent' })).toBeInTheDocument())
      expect(screen.getByRole('option', { name: 'Bob Agent' })).toBeInTheDocument()
    })

    it('sends a PATCH request with the agent id when an agent is selected', async () => {
      const user = userEvent.setup()
      renderPage()
      await waitForTicket()
      await user.click(screen.getByRole('combobox', { name: 'Assigned To' }))
      await waitFor(() => expect(screen.getByRole('option', { name: 'Alice Agent' })).toBeInTheDocument())
      await user.click(screen.getByRole('option', { name: 'Alice Agent' }))
      await waitFor(() => expect(mock.history.patch.length).toBe(1))
      expect(JSON.parse(mock.history.patch[0].data)).toEqual({ assignedTo: 'agent-1' })
    })

    it('sends a PATCH request with null when "Unassigned" is selected', async () => {
      mock.onGet('/api/tickets/ticket-1').reply(200, TICKET_ASSIGNED)
      mock.onPatch('/api/tickets/ticket-1').reply(200, TICKET)
      const user = userEvent.setup()
      renderPage()
      await waitForTicket()
      await user.click(screen.getByRole('combobox', { name: 'Assigned To' }))
      await waitFor(() => expect(screen.getByRole('option', { name: /unassigned/i })).toBeInTheDocument())
      await user.click(screen.getByRole('option', { name: /unassigned/i }))
      await waitFor(() => expect(mock.history.patch.length).toBe(1))
      expect(JSON.parse(mock.history.patch[0].data)).toEqual({ assignedTo: null })
    })
  })

  describe('messages', () => {
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

    it('renders the correct number of message cards', async () => {
      mock.onGet('/api/tickets/ticket-1').reply(200, TICKET_WITH_MESSAGES)
      renderPage()
      await waitFor(() => expect(screen.getByText('Hello, my printer is on fire!')).toBeInTheDocument())
      expect(screen.getAllByText(/Agent|John Customer|Alice Agent/).length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('reply form', () => {
    beforeEach(() => {
      mock.onPost('/api/tickets/ticket-1/replies').reply(201, {})
    })

    it('renders the reply textarea and submit button after the ticket loads', async () => {
      renderPage()
      await waitForTicket()
      expect(screen.getByLabelText('Reply body')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Send Reply' })).toBeInTheDocument()
    })

    it('shows a validation error when submitted with an empty body', async () => {
      const user = userEvent.setup()
      renderPage()
      await waitForTicket()
      await user.click(screen.getByRole('button', { name: 'Send Reply' }))
      expect(screen.getByText('Reply cannot be empty')).toBeInTheDocument()
      expect(mock.history.post.length).toBe(0)
    })

    it('shows a validation error when the body is whitespace only', async () => {
      const user = userEvent.setup()
      renderPage()
      await waitForTicket()
      await user.type(screen.getByLabelText('Reply body'), '   ')
      await user.click(screen.getByRole('button', { name: 'Send Reply' }))
      expect(screen.getByText('Reply cannot be empty')).toBeInTheDocument()
      expect(mock.history.post.length).toBe(0)
    })

    it('posts the reply body to the correct endpoint on success', async () => {
      const user = userEvent.setup()
      renderPage()
      await waitForTicket()
      await user.type(screen.getByLabelText('Reply body'), 'Thanks for reaching out.')
      await user.click(screen.getByRole('button', { name: 'Send Reply' }))
      await waitFor(() => expect(mock.history.post.length).toBe(1))
      expect(mock.history.post[0].url).toBe('/api/tickets/ticket-1/replies')
      expect(JSON.parse(mock.history.post[0].data)).toEqual({ body: 'Thanks for reaching out.' })
    })

    it('clears the textarea after a successful submission', async () => {
      const user = userEvent.setup()
      renderPage()
      await waitForTicket()
      await user.type(screen.getByLabelText('Reply body'), 'Thanks for reaching out.')
      await user.click(screen.getByRole('button', { name: 'Send Reply' }))
      await waitFor(() => expect(screen.getByLabelText('Reply body')).toHaveValue(''))
    })

    it('shows "Sending…" and disables the button while the request is pending', async () => {
      mock.onPost('/api/tickets/ticket-1/replies').reply(() => new Promise(() => {}))
      const user = userEvent.setup()
      renderPage()
      await waitForTicket()
      await user.type(screen.getByLabelText('Reply body'), 'Hello')
      await user.click(screen.getByRole('button', { name: 'Send Reply' }))
      await waitFor(() => expect(screen.getByText('Sending…')).toBeInTheDocument())
      expect(screen.getByText('Sending…').closest('button')).toBeDisabled()
    })

    it('shows an error message when the POST fails', async () => {
      mock.onPost('/api/tickets/ticket-1/replies').reply(500)
      const user = userEvent.setup()
      renderPage()
      await waitForTicket()
      await user.type(screen.getByLabelText('Reply body'), 'Hello')
      await user.click(screen.getByRole('button', { name: 'Send Reply' }))
      await waitFor(() =>
        expect(screen.getByText('Failed to send reply. Please try again.')).toBeInTheDocument()
      )
    })
  })
})
