import { execSync } from 'child_process'
import path from 'path'

const serverDir = path.resolve(__dirname, '../server')
const env = { ...process.env }

export default async function globalSetup() {
  // Apply any pending migrations and seed the admin user (idempotent).
  execSync('bunx prisma migrate deploy', { cwd: serverDir, env, stdio: 'inherit' })
  execSync('bun prisma/seed.ts', { cwd: serverDir, env, stdio: 'inherit' })

  // Seed the agent user via the Better Auth admin API.
  // We do this programmatically rather than via the seed script so that
  // the seed script remains focused on the admin user only.
  const { auth } = await import(path.resolve(serverDir, 'src/lib/auth.ts'))

  const agentEmail = 'agent@example.com'
  const existing = await (await import(path.resolve(serverDir, 'src/lib/db.ts'))).default.user.findUnique({
    where: { email: agentEmail },
  })

  if (!existing) {
    await auth.api.createUser({
      body: {
        email: agentEmail,
        password: 'password123',
        name: 'Agent User',
        role: 'agent',
      },
    })
    console.log('Agent user seeded:', agentEmail)
  } else {
    console.log('Agent user already exists, skipping.')
  }
}
