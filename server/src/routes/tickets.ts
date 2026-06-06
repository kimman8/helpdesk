import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/requireAuth'
import prisma from '../lib/db'

const router = Router()

const sortSchema = z.object({
  sortBy: z.enum(['subject', 'status', 'category', 'createdAt']).default('createdAt'),
  sortDir: z.enum(['asc', 'desc']).default('desc'),
})

router.get('/', requireAuth, async (req, res) => {
  const { sortBy, sortDir } = sortSchema.parse(req.query)
  const tickets = await prisma.ticket.findMany({
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
