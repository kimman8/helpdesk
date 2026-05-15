import { Router } from 'express'
import { createUserSchema } from '@helpdesk/core'
import { auth } from '../lib/auth'
import { requireAdmin } from '../middleware/requireAuth'
import prisma from '../lib/db'

const router = Router()

router.get('/', requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      banned: true,
      banReason: true,
    },
    orderBy: { createdAt: 'desc' },
  })
  res.json(users)
})

router.post('/', requireAdmin, async (req, res) => {
  const result = createUserSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message })
    return
  }
  const { name, email, password } = result.data
  const created = await auth.api.createUser({
    body: { name, email, password, role: 'user' },
  })
  const user = await prisma.user.update({
    where: { id: created.user.id },
    data: { role: 'agent' },
  })
  res.status(201).json(user)
})

export default router
