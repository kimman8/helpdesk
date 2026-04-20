import { execSync } from 'child_process'
import path from 'path'

const serverDir = path.resolve(__dirname, '../server')
const env = { ...process.env }

export default async function globalSetup() {
  execSync('bunx prisma migrate deploy', { cwd: serverDir, env, stdio: 'inherit' })
  execSync('bun prisma/seed.ts', { cwd: serverDir, env, stdio: 'inherit' })
}
