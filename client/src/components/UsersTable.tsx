import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Role } from '@helpdesk/core'
import { Pencil, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import EditUserModal from './EditUserModal'
import DeleteUserModal from './DeleteUserModal'

interface User {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
  banned: boolean | null
  banReason: string | null
}

export default function UsersTable() {
  const queryClient = useQueryClient()
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['users'],
    queryFn: () =>
      axios.get<User[]>('/api/users', { withCredentials: true }).then((res) => res.data),
  })

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">All users</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground px-6 py-8">Loading…</p>
          ) : error ? (
            <p className="text-sm text-destructive px-6 py-8">{(error as Error).message}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell className="text-muted-foreground font-mono text-sm">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === Role.ADMIN ? 'default' : 'secondary'}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.banned ? (
                          <Badge variant="destructive">Banned</Badge>
                        ) : (
                          <Badge variant="outline">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm font-mono tabular-nums">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setEditingUser(user)}
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Edit {user.name}</span>
                        </Button>
                        {user.role !== Role.ADMIN && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setDeletingUser(user)}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete {user.name}</span>
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {editingUser && (
        <EditUserModal
          open={!!editingUser}
          onOpenChange={(v) => { if (!v) setEditingUser(null) }}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['users'] })}
          user={editingUser}
        />
      )}

      {deletingUser && (
        <DeleteUserModal
          open={!!deletingUser}
          onOpenChange={(v) => { if (!v) setDeletingUser(null) }}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ['users'] })}
          user={deletingUser}
        />
      )}
    </>
  )
}
