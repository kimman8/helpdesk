import { Router } from 'express'
import { requireAuth } from '../middleware/requireAuth'
import prisma from '../lib/db'

const router = Router()

router.get('/', requireAuth, async (_req, res) => {
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
    orderBy: { createdAt: 'desc' },
  })
  res.json(tickets)
})

export default router
