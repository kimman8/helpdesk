import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface User {
  id: string
  name: string
}

interface DeleteUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  user: User
}

export default function DeleteUserModal({ open, onOpenChange, onSuccess, user }: DeleteUserModalProps) {
  const [serverError, setServerError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () =>
      axios.delete(`/api/users/${user.id}`, { withCredentials: true }),
    onSuccess: () => {
      onSuccess()
      handleOpenChange(false)
    },
    onError: (err: unknown) => {
      const message = axios.isAxiosError(err)
        ? (err.response?.data?.error ?? 'Something went wrong')
        : 'Something went wrong'
      setServerError(message)
    },
  })

  function handleOpenChange(value: boolean) {
    if (!value) {
      setServerError(null)
      mutation.reset()
    }
    onOpenChange(value)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete user</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete {user.name}? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {serverError && <p className="text-sm text-destructive">{serverError}</p>}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? 'Deleting…' : 'Delete user'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
