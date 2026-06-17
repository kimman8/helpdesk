import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/requireAuth'
import { createReplySchema } from '@helpdesk/core'
import prisma from '../lib/db'
import type { TicketStatus, TicketCategory } from '../generated/prisma/enums'

const router = Router()

const querySchema = z.object({
  sortBy:   z.enum(['subject', 'status', 'category', 'createdAt']).default('createdAt'),
  sortDir:  z.enum(['asc', 'desc']).default('desc'),
  status:   z.enum(['OPEN', 'RESOLVED', 'CLOSED']).transform((v) => v as TicketStatus).optional(),
  category: z.enum(['GENERAL_QUESTION', 'TECHNICAL_QUESTION', 'REFUND_REQUEST']).transform((v) => v as TicketCategory).optional(),
  search:   z.string().trim().optional(),
  page:     z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

type ParsedQuery = z.infer<typeof querySchema>

function buildWhere({ status, category, search }: Pick<ParsedQuery, 'status' | 'category' | 'search'>) {
  return {
    ...(status   ? { status }   : {}),
    ...(category ? { category } : {}),
    ...(search   ? {
      OR: [
        { subject:   { contains: search, mode: 'insensitive' as const } },
        { fromEmail: { contains: search, mode: 'insensitive' as const } },
        { fromName:  { contains: search, mode: 'insensitive' as const } },
      ],
    } : {}),
  }
}

const SELECT = {
  id: true,
  subject: true,
  status: true,
  category: true,
  fromEmail: true,
  fromName: true,
  assignedTo: true,
  createdAt: true,
  assignedUser: { select: { name: true } },
} as const

router.get('/agents', requireAuth, async (_req, res) => {
  const agents = await prisma.user.findMany({
    where: { role: 'agent', deletedAt: null, banned: false },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })
  res.json(agents)
})

const patchSchema = z.object({
  assignedTo: z.string().nullable().optional(),
  status:     z.enum(['OPEN', 'RESOLVED', 'CLOSED']).transform((v) => v as TicketStatus).optional(),
  category:   z.enum(['GENERAL_QUESTION', 'TECHNICAL_QUESTION', 'REFUND_REQUEST']).transform((v) => v as TicketCategory).optional(),
})

router.patch('/:id', requireAuth, async (req, res) => {
  const result = patchSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message })
    return
  }

  const { assignedTo, status, category } = result.data

  if (assignedTo !== undefined && assignedTo !== null) {
    const agent = await prisma.user.findUnique({
      where: { id: assignedTo },
      select: { role: true, deletedAt: true },
    })
    if (!agent || agent.deletedAt || agent.role !== 'agent') {
      res.status(400).json({ error: 'Invalid agent' })
      return
    }
  }

  const ticket = await prisma.ticket.update({
    where: { id: req.params.id },
    data: {
      ...(assignedTo !== undefined ? { assignedTo } : {}),
      ...(status   !== undefined   ? { status }     : {}),
      ...(category !== undefined   ? { category }   : {}),
    },
    select: { ...SELECT, updatedAt: true },
  })

  res.json(ticket)
})

router.get('/stats', requireAuth, async (_req, res) => {
  const [open, resolved, closed, unassigned] = await Promise.all([
    prisma.ticket.count({ where: { status: 'OPEN' } }),
    prisma.ticket.count({ where: { status: 'RESOLVED' } }),
    prisma.ticket.count({ where: { status: 'CLOSED' } }),
    prisma.ticket.count({ where: { status: 'OPEN', assignedTo: null } }),
  ])
  res.json({ open, resolved, closed, unassigned })
})

router.get('/', requireAuth, async (req, res) => {
  const { sortBy, sortDir, status, category, search, page, pageSize } = querySchema.parse(req.query)
  const where = buildWhere({ status, category, search })

  const [data, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      select: SELECT,
      orderBy: { [sortBy]: sortDir },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.ticket.count({ where }),
  ])

  res.json({ data, total, page, pageSize, pageCount: Math.ceil(total / pageSize) })
})

router.get('/:id', requireAuth, async (req, res) => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: req.params.id },
    select: {
      ...SELECT,
      updatedAt: true,
      messages: {
        select: {
          id: true,
          body: true,
          fromEmail: true,
          fromName: true,
          isAgent: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' })
    return
  }

  res.json(ticket)
})

router.post('/:id/replies', requireAuth, async (req, res) => {
  const result = createReplySchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message })
    return
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: req.params.id },
    select: { id: true },
  })
  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' })
    return
  }

  const message = await prisma.message.create({
    data: {
      ticketId: req.params.id,
      body: result.data.body,
      fromEmail: req.user.email,
      fromName: req.user.name ?? null,
      isAgent: true,
    },
    select: { id: true, body: true, fromEmail: true, fromName: true, isAgent: true, createdAt: true },
  })

  res.status(201).json(message)
})

export default router
