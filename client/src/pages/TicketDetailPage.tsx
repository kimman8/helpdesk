import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createReplySchema, type CreateReplyInput, type TicketData } from '@helpdesk/core'
import Navbar from '../components/Navbar'
import BackButton from '../components/BackButton'
import TicketDetail from '../components/TicketDetail'
import TicketDetailSkeleton from '../components/TicketDetailSkeleton'
import UpdateTicket, { type Agent } from '../components/UpdateTicket'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'

function useTicket(id: string) {
  return useQuery({
    queryKey: ['tickets', id],
    queryFn: () =>
      axios.get<TicketData>(`/api/tickets/${id}`, { withCredentials: true }).then((r) => r.data),
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
  const queryClient = useQueryClient()
  const { data: ticket, isLoading, error } = useTicket(id!)
  const { data: agents = [] } = useAgents()

  const { register, handleSubmit, reset, setValue, getValues, formState: { errors } } = useForm<CreateReplyInput>({
    resolver: zodResolver(createReplySchema),
    defaultValues: { body: '' },
  })

  const [isPolishing, setIsPolishing] = useState(false)
  const [polishError, setPolishError] = useState<string | null>(null)

  async function handlePolish() {
    const body = getValues('body').trim()
    if (!body) return
    setIsPolishing(true)
    setPolishError(null)
    try {
      const { data } = await axios.post<{ body: string }>(
        `/api/tickets/${id}/polish-reply`,
        { body },
        { withCredentials: true },
      )
      setValue('body', data.body, { shouldValidate: true })
    } catch {
      setPolishError('Failed to polish reply. Please try again.')
    } finally {
      setIsPolishing(false)
    }
  }

  const replyMutation = useMutation({
    mutationFn: (data: CreateReplyInput) =>
      axios.post(`/api/tickets/${id}/replies`, data, { withCredentials: true }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', id] })
      reset()
    },
  })

  async function handlePatch(data: Record<string, unknown>) {
    await axios.patch(`/api/tickets/${id}`, data, { withCredentials: true })
    queryClient.invalidateQueries({ queryKey: ['tickets', id] })
    queryClient.invalidateQueries({ queryKey: ['tickets'] })
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <BackButton />

        {isLoading ? (
          <TicketDetailSkeleton />
        ) : error ? (
          <p className="text-sm text-destructive">{(error as Error).message}</p>
        ) : ticket ? (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6 items-start">
            {/* Left — conversation */}
            <div className="space-y-3">
              <TicketDetail ticket={ticket} />

              <Card>
                <CardContent className="pt-4">
                  <form onSubmit={handleSubmit((data) => replyMutation.mutate(data))} className="space-y-3">
                    <Textarea
                      {...register('body')}
                      placeholder="Write a reply…"
                      rows={4}
                      className="resize-none text-sm"
                      aria-label="Reply body"
                    />
                    {errors.body && (
                      <p className="text-xs text-destructive">{errors.body.message}</p>
                    )}
                    {replyMutation.isError && (
                      <p className="text-xs text-destructive">Failed to send reply. Please try again.</p>
                    )}
                    {polishError && (
                      <p className="text-xs text-destructive">{polishError}</p>
                    )}
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handlePolish}
                        disabled={isPolishing || replyMutation.isPending}
                      >
                        {isPolishing ? 'Polishing…' : 'Polish'}
                      </Button>
                      <Button type="submit" size="sm" disabled={replyMutation.isPending || isPolishing}>
                        {replyMutation.isPending ? 'Sending…' : 'Send Reply'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Right — properties */}
            <UpdateTicket ticket={ticket} agents={agents} onPatch={handlePatch} />
          </div>
        ) : null}
      </main>
    </div>
  )
}
