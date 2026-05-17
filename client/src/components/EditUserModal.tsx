import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { editUserSchema, type EditUserInput } from '@helpdesk/core'
import { useMutation } from '@tanstack/react-query'
import axios from 'axios'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface User {
  id: string
  name: string
  email: string
}

interface EditUserModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  user: User
}

export default function EditUserModal({ open, onOpenChange, onSuccess, user }: EditUserModalProps) {
  const [serverError, setServerError] = useState<string | null>(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EditUserInput>({
    resolver: zodResolver(editUserSchema),
    defaultValues: { name: user.name, email: user.email, password: '' },
  })

  const mutation = useMutation({
    mutationFn: (data: EditUserInput) =>
      axios.patch(`/api/users/${user.id}`, data, { withCredentials: true }).then((res) => res.data),
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
      reset({ name: user.name, email: user.email, password: '' })
      setServerError(null)
      mutation.reset()
    }
    onOpenChange(value)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Name</Label>
            <Input id="name" aria-invalid={!!errors.name} {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" aria-invalid={!!errors.email} {...register('email')} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" aria-invalid={!!errors.password} {...register('password')} />
            <p className="text-xs text-muted-foreground">Leave blank to keep current password</p>
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>

          {serverError && <p className="text-sm text-destructive">{serverError}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
