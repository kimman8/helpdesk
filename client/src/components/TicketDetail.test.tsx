import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import TicketDetail from './TicketDetail'
import { TicketStatus, TicketCategory, type TicketData, type Message } from '@helpdesk/core'

const BASE_TICKET: TicketData = {
  id: 'ticket-1',
  subject: 'My printer is on fire',
  status: TicketStatus.OPEN,
  category: TicketCategory.TECHNICAL_QUESTION,
  fromEmail: 'customer@example.com',
  fromName: 'John Customer',
  assignedTo: null,
  assignedUser: null,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-15T12:00:00.000Z',
  messages: [],
}

function msg(overrides: Partial<Message> & { id: string; body: string }): Message {
  return {
    fromEmail: 'user@example.com',
    fromName: 'Some User',
    isAgent: false,
    createdAt: '2024-01-15T10:00:00.000Z',
    ...overrides,
  }
}

describe('TicketDetail', () => {
  describe('ticket header', () => {
    it('renders the subject as a heading', () => {
      render(<TicketDetail ticket={BASE_TICKET} />)
      expect(screen.getByRole('heading', { name: 'My printer is on fire' })).toBeInTheDocument()
    })

    it('shows the sender name when fromName is set', () => {
      render(<TicketDetail ticket={BASE_TICKET} />)
      expect(screen.getByText(/John Customer/)).toBeInTheDocument()
    })

    it('also shows the email as secondary info when fromName is set', () => {
      render(<TicketDetail ticket={BASE_TICKET} />)
      expect(screen.getByText(/customer@example\.com/)).toBeInTheDocument()
    })

    it('falls back to email in sender position when fromName is null', () => {
      render(<TicketDetail ticket={{ ...BASE_TICKET, fromName: null }} />)
      expect(screen.getByText(/customer@example\.com/)).toBeInTheDocument()
    })

    it('does not show the sender name when fromName is null', () => {
      render(<TicketDetail ticket={{ ...BASE_TICKET, fromName: null }} />)
      expect(screen.queryByText(/John Customer/)).not.toBeInTheDocument()
    })
  })

  describe('message thread — empty state', () => {
    it('shows "No messages yet." when messages is empty', () => {
      render(<TicketDetail ticket={BASE_TICKET} />)
      expect(screen.getByText('No messages yet.')).toBeInTheDocument()
    })

    it('hides the empty state once messages are present', () => {
      const ticket = { ...BASE_TICKET, messages: [msg({ id: 'm1', body: 'Hello' })] }
      render(<TicketDetail ticket={ticket} />)
      expect(screen.queryByText('No messages yet.')).not.toBeInTheDocument()
    })
  })

  describe('message thread — content', () => {
    it('renders the body of each message', () => {
      const ticket = {
        ...BASE_TICKET,
        messages: [
          msg({ id: 'm1', body: 'First message from customer' }),
          msg({ id: 'm2', body: 'Second message from agent', isAgent: true }),
        ],
      }
      render(<TicketDetail ticket={ticket} />)
      expect(screen.getByText('First message from customer')).toBeInTheDocument()
      expect(screen.getByText('Second message from agent')).toBeInTheDocument()
    })

    it('shows the sender name in the message header when fromName is set', () => {
      const ticket = { ...BASE_TICKET, messages: [msg({ id: 'm1', body: 'Hi', fromName: 'Alice Smith' })] }
      render(<TicketDetail ticket={ticket} />)
      expect(screen.getByText(/Alice Smith/)).toBeInTheDocument()
    })

    it('falls back to email in message header when fromName is null', () => {
      const ticket = {
        ...BASE_TICKET,
        messages: [msg({ id: 'm1', body: 'Hi', fromEmail: 'anon@example.com', fromName: null })],
      }
      render(<TicketDetail ticket={ticket} />)
      expect(screen.getByText(/anon@example\.com/)).toBeInTheDocument()
    })
  })

  describe('agent badge', () => {
    it('shows an "Agent" badge on agent messages', () => {
      const ticket = {
        ...BASE_TICKET,
        messages: [msg({ id: 'm1', body: 'Agent reply', isAgent: true })],
      }
      render(<TicketDetail ticket={ticket} />)
      expect(screen.getByText('Agent')).toBeInTheDocument()
    })

    it('does not show the "Agent" badge on customer messages', () => {
      const ticket = {
        ...BASE_TICKET,
        messages: [msg({ id: 'm1', body: 'Customer message', isAgent: false })],
      }
      render(<TicketDetail ticket={ticket} />)
      expect(screen.queryByText('Agent')).not.toBeInTheDocument()
    })

    it('shows the badge only on agent messages when both types are present', () => {
      const ticket = {
        ...BASE_TICKET,
        messages: [
          msg({ id: 'm1', body: 'Customer wrote this', isAgent: false }),
          msg({ id: 'm2', body: 'Agent wrote this', isAgent: true }),
        ],
      }
      render(<TicketDetail ticket={ticket} />)
      expect(screen.getAllByText('Agent').length).toBe(1)
    })
  })
})
