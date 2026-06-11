import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { ArrowLeft } from 'lucide-react'
import { TicketStatus, TicketCategory } from '@helpdesk/core'
import { STATUS_VARIANT, CATEGORY_LABEL } from '@/lib/tickets'
import Navbar from '../components/Navbar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface Message {
  id: string
  body: string
  fromEmail: string
  fromName: string | null
  isAgent: boolean
  createdAt: string
}

interface TicketDetail {
  id: string
  subject: string
  status: TicketStatus
  category: TicketCategory
  fromEmail: string
  fromName: string | null
  assignedTo: string | null
  assignedUser: { name: string } | null
  createdAt: string
  updatedAt: string
  messages: Message[]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

function useTicket(id: string) {
  return useQuery({
    queryKey: ['tickets', id],
    queryFn: () =>
      axios.get<TicketDetail>(`/api/tickets/${id}`, { withCredentials: true }).then((r) => r.data),
  })
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: ticket, isLoading, error } = useTicket(id!)

  return (
    <div className="min-h-screen bg-muted/40">
      <Navbar />
      <main className="max-w-3xl mx-auto px-6 py-10">
        <Button variant="ghost" size="sm" className="mb-6 -ml-1" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : error ? (
          <p className="text-sm text-destructive">{(error as Error).message}</p>
        ) : ticket ? (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold">{ticket.subject}</h1>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant={STATUS_VARIANT[ticket.status]}>
                  {ticket.status.charAt(0) + ticket.status.slice(1).toLowerCase()}
                </Badge>
                <span className="text-sm text-muted-foreground">{CATEGORY_LABEL[ticket.category]}</span>
              </div>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Details
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">From</p>
                  <p className="font-medium">{ticket.fromName ?? ticket.fromEmail}</p>
                  {ticket.fromName && <p className="text-xs text-muted-foreground">{ticket.fromEmail}</p>}
                </div>
                <div>
                  <p className="text-muted-foreground">Assigned to</p>
                  <p className="font-medium">{ticket.assignedUser?.name ?? <span className="italic text-muted-foreground">Unassigned</span>}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Created</p>
                  <p className="font-medium">{formatDate(ticket.createdAt)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Last updated</p>
                  <p className="font-medium">{formatDate(ticket.updatedAt)}</p>
                </div>
              </CardContent>
            </Card>

            {ticket.messages.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  Messages ({ticket.messages.length})
                </h2>
                {ticket.messages.map((msg) => (
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
                ))}
              </div>
            )}

            {ticket.messages.length === 0 && (
              <p className="text-sm text-muted-foreground italic">No messages yet.</p>
            )}
          </div>
        ) : null}
      </main>
    </div>
  )
}
