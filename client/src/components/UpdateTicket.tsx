import { TicketStatus, TicketCategory, type TicketData } from '@helpdesk/core'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface Agent {
  id: string
  name: string | null
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

interface Props {
  ticket: TicketData
  agents: Agent[]
  onPatch: (data: Record<string, unknown>) => void
}

export default function UpdateTicket({ ticket, agents, onPatch }: Props) {
  function handleAssign(value: string | null) {
    if (value === null) return
    onPatch({ assignedTo: value === 'unassigned' ? null : value })
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Properties
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Status</p>
          <Select value={ticket.status} onValueChange={(v) => v && onPatch({ status: v })}>
            <SelectTrigger className="h-8 text-xs w-full" aria-label="Status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TicketStatus.OPEN}>Open</SelectItem>
              <SelectItem value={TicketStatus.RESOLVED}>Resolved</SelectItem>
              <SelectItem value={TicketStatus.CLOSED}>Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Category</p>
          <Select value={ticket.category} onValueChange={(v) => v && onPatch({ category: v })}>
            <SelectTrigger className="h-8 text-xs w-full" aria-label="Category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TicketCategory.GENERAL_QUESTION}>General Question</SelectItem>
              <SelectItem value={TicketCategory.TECHNICAL_QUESTION}>Technical Question</SelectItem>
              <SelectItem value={TicketCategory.REFUND_REQUEST}>Refund Request</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Assigned To</p>
          <Select value={ticket.assignedTo ?? 'unassigned'} onValueChange={handleAssign}>
            <SelectTrigger className="h-8 text-xs w-full" aria-label="Assigned To">
              <SelectValue>
                {ticket.assignedTo
                  ? (ticket.assignedUser?.name ?? ticket.assignedTo)
                  : <span className="italic text-muted-foreground">Unassigned</span>}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="unassigned">
                <span className="italic text-muted-foreground">Unassigned</span>
              </SelectItem>
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  {agent.name ?? agent.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="border-t pt-4 space-y-2 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Created</span>
            <span>{formatDate(ticket.createdAt)}</span>
          </div>
          <div className="flex justify-between">
            <span>Updated</span>
            <span>{formatDate(ticket.updatedAt)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
