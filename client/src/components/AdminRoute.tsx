import { Navigate } from 'react-router-dom'
import { authClient } from '../lib/auth-client'

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const { data, isPending } = authClient.useSession()

  if (isPending) {
    return <div className="min-h-screen flex items-center justify-center text-gray-400">Loading...</div>
  }

  if (!data) {
    return <Navigate to="/login" replace />
  }

  if (data.user.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
