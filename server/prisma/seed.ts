import 'dotenv/config'
import { auth } from '../src/lib/auth'
import prisma from '../src/lib/db'
import { Role } from '../src/constants/roles'

async function seed() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env')
  }

  const existing = await prisma.user.findUnique({ where: { email } })

  if (existing) {
    console.log('Admin user already exists, skipping.')
    return
  }

  console.log(`Seeding admin user: ${email}`)

  const result = await auth.api.createUser({
    body: {
      email,
      password,
      name: 'Admin',
      role: Role.ADMIN,
    },
  })

  console.log('Admin user created:', result.user.email)
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err.message)
    process.exit(1)
  })
