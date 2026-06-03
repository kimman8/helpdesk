import 'dotenv/config'
import { auth } from '../src/lib/auth'
import prisma from '../src/lib/db'
import { Role } from '../src/constants/roles'

const email = 'agent@example.com'

const existing = await prisma.user.findUnique({ where: { email } })

if (existing) {
  if (existing.deletedAt) {
    await prisma.user.update({ where: { email }, data: { deletedAt: null } })
    console.log('Agent user was soft-deleted, restored.')
  } else {
    console.log('Agent user already exists, skipping.')
  }
} else {
  console.log(`Seeding agent user: ${email}`)
  const result = await auth.api.createUser({
    body: { email, password: 'password123', name: 'Agent User', role: Role.AGENT },
  })
  console.log('Agent user created:', result.user.email)
}
