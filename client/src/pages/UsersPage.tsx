import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import Navbar from '../components/Navbar'
import CreateUserModal from '../components/CreateUserModal'
import UsersTable from '../components/UsersTable'
import { Button } from '@/components/ui/button'

export default function UsersPage() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="min-h-screen bg-muted/40">
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Users</h1>
          <Button onClick={() => setModalOpen(true)}>New User</Button>
        </div>

        <UsersTable />
      </main>

      <CreateUserModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['users'] })}
      />
    </div>
  )
}
