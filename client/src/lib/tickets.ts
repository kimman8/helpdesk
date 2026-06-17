import { TicketStatus, TicketCategory } from '@helpdesk/core'
export type { Ticket } from '@helpdesk/core'

export interface TicketPage {
  data: Ticket[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}

export interface TicketFilters {
  status?: TicketStatus
  category?: TicketCategory
  search?: string
}

export const STATUS_VARIANT: Record<TicketStatus, 'default' | 'secondary' | 'outline'> = {
  [TicketStatus.OPEN]: 'default',
  [TicketStatus.RESOLVED]: 'secondary',
  [TicketStatus.CLOSED]: 'outline',
}

export const CATEGORY_LABEL: Record<TicketCategory, string> = {
  [TicketCategory.GENERAL_QUESTION]: 'General Question',
  [TicketCategory.TECHNICAL_QUESTION]: 'Technical Question',
  [TicketCategory.REFUND_REQUEST]: 'Refund Request',
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}
