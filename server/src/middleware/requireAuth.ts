import { Request, Response, NextFunction } from 'express'
import { fromNodeHeaders } from 'better-auth/node'
import { auth } from '../lib/auth'
import { Role } from '@helpdesk/core'
import prisma from '../lib/db'

async function getValidSession(req: Request) {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) })
  if (!session) return null
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { deletedAt: true } })
  if (user?.deletedAt) return null
  return session
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = await getValidSession(req)

  if (!session) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  req.user = session.user
  req.session = session.session
  next()
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const session = await getValidSession(req)

  if (!session) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  if (session.user.role !== Role.ADMIN) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }

  req.user = session.user
  req.session = session.session
  next()
}
