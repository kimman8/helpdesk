import { Router } from 'express'
import { createUserSchema, editUserSchema, Role } from '@helpdesk/core'
import { auth } from '../lib/auth'
import { requireAdmin } from '../middleware/requireAuth'
import prisma from '../lib/db'

const router = Router()

router.get('/', requireAdmin, async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
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
  let created
  try {
    created = await auth.api.createUser({
      body: { name, email, password, role: 'user' },
    })
  } catch {
    res.status(400).json({ error: 'A user with that email already exists' })
    return
  }
  const user = await prisma.user.update({
    where: { id: created.user.id },
    data: { role: 'agent' },
  })
  res.status(201).json(user)
})

router.patch('/:id', requireAdmin, async (req, res) => {
  const result = editUserSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message })
    return
  }
  const { name, email, password } = result.data
  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { name, email },
    select: { id: true, name: true, email: true, role: true, createdAt: true, banned: true, banReason: true },
  })
  if (password) {
    await auth.api.setUserPassword({
      body: { userId: req.params.id, newPassword: password },
    })
  }
  res.json(user)
})

router.delete('/:id', requireAdmin, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id }, select: { role: true } })
  if (!user) { res.status(404).json({ error: 'User not found' }); return }
  if (user.role === Role.ADMIN) { res.status(403).json({ error: 'Admin users cannot be deleted' }); return }
  await prisma.$transaction([
    prisma.ticket.updateMany({ where: { assignedTo: req.params.id }, data: { assignedTo: null } }),
    prisma.user.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } }),
  ])
  res.status(204).end()
})

export default router
