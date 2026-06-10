import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/requireAuth'
import prisma from '../lib/db'

const router = Router()

const querySchema = z.object({
  sortBy:   z.enum(['subject', 'status', 'category', 'createdAt']).default('createdAt'),
  sortDir:  z.enum(['asc', 'desc']).default('desc'),
  status:   z.enum(['OPEN', 'RESOLVED', 'CLOSED']).optional(),
  category: z.enum(['GENERAL_QUESTION', 'TECHNICAL_QUESTION', 'REFUND_REQUEST']).optional(),
  search:   z.string().trim().optional(),
})

router.get('/', requireAuth, async (req, res) => {
  const { sortBy, sortDir, status, category, search } = querySchema.parse(req.query)
  const tickets = await prisma.ticket.findMany({
    where: {
      ...(status   ? { status }   : {}),
      ...(category ? { category } : {}),
      ...(search   ? {
        OR: [
          { subject:   { contains: search, mode: 'insensitive' } },
          { fromEmail: { contains: search, mode: 'insensitive' } },
          { fromName:  { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
    },
    select: {
      id: true,
      subject: true,
      status: true,
      category: true,
      fromEmail: true,
      fromName: true,
      assignedTo: true,
      createdAt: true,
      assignedUser: { select: { name: true } },
    },
    orderBy: { [sortBy]: sortDir },
  })
  res.json(tickets)
})

export default router
