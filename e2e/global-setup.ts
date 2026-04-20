import { execSync } from 'child_process'
import path from 'path'

export default async function globalSetup() {
  execSync('bunx prisma migrate deploy', {
    cwd: path.resolve(__dirname, '../server'),
    env: { ...process.env },
    stdio: 'inherit',
  })
}
