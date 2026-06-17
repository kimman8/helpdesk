import { type TicketData } from '@helpdesk/core'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

export default function TicketDetail({ ticket }: { ticket: TicketData }) {
  return (
    <>
      <div>
        <h1 className="text-2xl font-bold">{ticket.subject}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          From {ticket.fromName ?? ticket.fromEmail}
          {ticket.fromName && <span className="text-muted-foreground/60"> · {ticket.fromEmail}</span>}
          <span className="text-muted-foreground/60"> · {formatDate(ticket.createdAt)}</span>
        </p>
      </div>

      {ticket.messages.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No messages yet.</p>
      ) : (
        ticket.messages.map((msg) => (
          <Card key={msg.id} className={msg.isAgent ? 'border-primary/20 bg-primary/5' : undefined}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  {msg.fromName ?? msg.fromEmail}
                  {msg.isAgent && (
                    <Badge variant="outline" className="ml-2 text-xs">Agent</Badge>
                  )}
                </span>
                <span className="text-xs text-muted-foreground">{formatDate(msg.createdAt)}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
            </CardContent>
          </Card>
        ))
      )}
    </>
  )
}
