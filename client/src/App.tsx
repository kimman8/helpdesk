import { Routes, Route, Navigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import LoginPage from './pages/LoginPage'
import Navbar from './components/Navbar'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'
import UsersPage from './pages/UsersPage'
import TicketsTable from './components/TicketsTable'
import { authClient } from './lib/auth-client'
import { Card, CardContent } from '@/components/ui/card'

interface TicketStats { open: number; resolved: number; closed: number; unassigned: number }

function useTicketStats() {
  return useQuery({
    queryKey: ['tickets', 'stats'],
    queryFn: () =>
      axios.get<TicketStats>('/api/tickets/stats', { withCredentials: true }).then((r) => r.data),
  })
}

function HomePage() {
  const { data: session } = authClient.useSession()
  const { data: stats, isLoading } = useTicketStats()

  const statCards = [
    { label: 'Open tickets', value: isLoading ? '—' : String(stats?.open ?? 0),       color: 'text-blue-600' },
    { label: 'Resolved',     value: isLoading ? '—' : String(stats?.resolved ?? 0),   color: 'text-green-600' },
    { label: 'Unassigned',   value: isLoading ? '—' : String(stats?.unassigned ?? 0), color: 'text-amber-600' },
  ]

  return (
    <div className="min-h-screen bg-muted/40">
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-bold">
            Good morning, {session?.user.name?.split(' ')[0] ?? 'there'} 👋
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Here's what's happening with your support queue.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {statCards.map((stat) => (
            <Card key={stat.label}>
              <CardContent className="pt-5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                <p className={`text-3xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <TicketsTable />
      </main>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users"
        element={
          <AdminRoute>
            <UsersPage />
          </AdminRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
