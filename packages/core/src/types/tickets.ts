import { TicketStatus, TicketCategory } from '../constants/tickets'

export interface Message {
  id: string
  body: string
  fromEmail: string
  fromName: string | null
  isAgent: boolean
  createdAt: string
}

export interface Ticket {
  id: string
  subject: string
  status: TicketStatus
  category: TicketCategory
  fromEmail: string
  fromName: string | null
  assignedTo: string | null
  assignedUser: { name: string } | null
  createdAt: string
}

export interface TicketData extends Ticket {
  updatedAt: string
  messages: Message[]
}
