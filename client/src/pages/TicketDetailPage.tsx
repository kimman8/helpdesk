import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { ArrowLeft } from 'lucide-react'
import { TicketStatus, TicketCategory } from '@helpdesk/core'
import Navbar from '../components/Navbar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

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

interface Agent {
  id: string
  name: string | null
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

function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: () =>
      axios.get<Agent[]>('/api/tickets/agents', { withCredentials: true }).then((r) => r.data),
  })
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: ticket, isLoading, error } = useTicket(id!)
  const { data: agents = [] } = useAgents()

  async function handlePatch(data: Record<string, unknown>) {
    await axios.patch(`/api/tickets/${id}`, data, { withCredentials: true })
    queryClient.invalidateQueries({ queryKey: ['tickets', id] })
    queryClient.invalidateQueries({ queryKey: ['tickets'] })
  }

  function handleAssign(value: string | null) {
    if (value === null) return
    handlePatch({ assignedTo: value === 'unassigned' ? null : value })
  }

  return (
    <div className="min-h-screen bg-muted/40">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-10">
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
              <p className="text-sm text-muted-foreground mt-1">
                From {ticket.fromName ?? ticket.fromEmail}
                {ticket.fromName && <span className="text-muted-foreground/60"> · {ticket.fromEmail}</span>}
                <span className="text-muted-foreground/60"> · {formatDate(ticket.createdAt)}</span>
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
              {/* Left — conversation */}
              <div className="space-y-3">
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
              </div>

              {/* Right — properties */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Properties
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Select value={ticket.status} onValueChange={(v) => v && handlePatch({ status: v })}>
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
                    <Select value={ticket.category} onValueChange={(v) => v && handlePatch({ category: v })}>
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
                        <SelectValue />
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
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}
