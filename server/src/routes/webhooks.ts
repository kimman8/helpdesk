import { Router } from 'express'
import multer from 'multer'
import crypto from 'crypto'
import prisma from '../lib/db'

const router = Router()
const upload = multer()

function verifySignature(key: string, timestamp: string, token: string, sig: string): boolean {
  const hmac = crypto.createHmac('sha256', key).update(timestamp + token).digest('hex')
  return hmac === sig
}

router.post('/email', upload.none(), async (req, res) => {
  const { timestamp, token, signature, sender, from, subject } = req.body
  const body: string = req.body['stripped-text'] ?? ''

  const key = process.env.MAILGUN_WEBHOOK_SIGNING_KEY ?? ''
  if (key && !verifySignature(key, timestamp, token, signature)) {
    res.status(401).end()
    return
  }

  const fromName = from?.match(/^(.+?)\s*</)?.[1]?.trim() ?? null
  const ticket = await prisma.ticket.create({
    data: { subject: subject ?? '(no subject)', fromEmail: sender, fromName },
  })
  await prisma.message.create({
    data: { ticketId: ticket.id, body, fromEmail: sender, fromName, isAgent: false },
  })

  res.status(200).end()
})

export default router
