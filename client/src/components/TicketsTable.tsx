import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { TicketStatus, TicketCategory } from '@helpdesk/core'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export interface Ticket {
  id: string
  subject: string
  status: TicketStatus
  category: TicketCategory
  fromEmail: string
  fromName: string | null
  assignedTo: string | null
  createdAt: string
  assignedUser: { name: string } | null
}

const STATUS_VARIANT: Record<TicketStatus, 'default' | 'secondary' | 'outline'> = {
  [TicketStatus.OPEN]: 'default',
  [TicketStatus.RESOLVED]: 'secondary',
  [TicketStatus.CLOSED]: 'outline',
}

const CATEGORY_LABEL: Record<TicketCategory, string> = {
  [TicketCategory.GENERAL_QUESTION]: 'General Question',
  [TicketCategory.TECHNICAL_QUESTION]: 'Technical Question',
  [TicketCategory.REFUND_REQUEST]: 'Refund Request',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function useTickets() {
  return useQuery({
    queryKey: ['tickets'],
    queryFn: () =>
      axios.get<Ticket[]>('/api/tickets', { withCredentials: true }).then((r) => r.data),
  })
}

export default function TicketsTable() {
  const { data: tickets = [], isLoading, error } = useTickets()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">All tickets</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <p className="text-sm text-muted-foreground px-6 py-8">Loading…</p>
        ) : error ? (
          <p className="text-sm text-destructive px-6 py-8">{(error as Error).message}</p>
        ) : tickets.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm font-medium">No tickets yet</p>
            <p className="text-sm text-muted-foreground mt-1">Tickets will appear here once emails come in.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>From</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Assigned to</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell className="font-medium">{ticket.subject}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {ticket.fromName ? (
                      <>
                        <span className="text-foreground">{ticket.fromName}</span>
                        <span className="block text-xs">{ticket.fromEmail}</span>
                      </>
                    ) : (
                      ticket.fromEmail
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[ticket.status]}>
                      {ticket.status.charAt(0) + ticket.status.slice(1).toLowerCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {CATEGORY_LABEL[ticket.category]}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {ticket.assignedUser?.name ?? <span className="italic">Unassigned</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(ticket.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
