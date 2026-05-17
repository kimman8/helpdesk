import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MockAdapter from 'axios-mock-adapter'
import axios from 'axios'
import DeleteUserModal from './DeleteUserModal'

const EXISTING_USER = {
  id: '1',
  name: 'Bob Agent',
}

let mock: MockAdapter

beforeEach(() => {
  mock = new MockAdapter(axios)
  mock.onDelete(`/api/users/${EXISTING_USER.id}`).reply(204)
})

afterEach(() => {
  mock.restore()
})

function renderModal(props?: {
  open?: boolean
  onOpenChange?: (v: boolean) => void
  onSuccess?: () => void
  user?: typeof EXISTING_USER
}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const onOpenChange = props?.onOpenChange ?? vi.fn()
  const onSuccess = props?.onSuccess ?? vi.fn()
  const open = props?.open ?? true
  const user = props?.user ?? EXISTING_USER

  render(
    <QueryClientProvider client={queryClient}>
      <DeleteUserModal open={open} onOpenChange={onOpenChange} onSuccess={onSuccess} user={user} />
    </QueryClientProvider>
  )

  return { onOpenChange, onSuccess }
}

describe('DeleteUserModal', () => {
  describe('rendering', () => {
    it('renders the dialog title', () => {
      renderModal()
      expect(screen.getByRole('heading', { name: 'Delete user' })).toBeInTheDocument()
    })

    it('renders the confirmation message with user name', () => {
      renderModal()
      expect(screen.getByText(/Are you sure you want to delete Bob Agent/)).toBeInTheDocument()
    })

    it('renders Cancel and Delete user buttons', () => {
      renderModal()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Delete user' })).toBeInTheDocument()
    })

    it('does not render when open is false', () => {
      renderModal({ open: false })
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  describe('submission', () => {
    it('sends DELETE to the correct endpoint on confirm', async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole('button', { name: 'Delete user' }))
      await waitFor(() => expect(mock.history.delete.length).toBe(1))
      expect(mock.history.delete[0].url).toBe(`/api/users/${EXISTING_USER.id}`)
    })

    it('calls onSuccess and closes the modal after successful deletion', async () => {
      const user = userEvent.setup()
      const { onSuccess, onOpenChange } = renderModal()
      await user.click(screen.getByRole('button', { name: 'Delete user' }))
      await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce())
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('shows "Deleting…" and disables the button while pending', async () => {
      mock.onDelete(`/api/users/${EXISTING_USER.id}`).reply(() => new Promise(() => {}))
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole('button', { name: 'Delete user' }))
      await waitFor(() => expect(screen.getByText('Deleting…')).toBeInTheDocument())
      expect(screen.getByText('Deleting…').closest('button')).toBeDisabled()
    })

    it('shows a server error and keeps the modal open on failure', async () => {
      mock.onDelete(`/api/users/${EXISTING_USER.id}`).reply(403, { error: 'Admin users cannot be deleted' })
      const user = userEvent.setup()
      const { onOpenChange } = renderModal()
      await user.click(screen.getByRole('button', { name: 'Delete user' }))
      await waitFor(() =>
        expect(screen.getByText('Admin users cannot be deleted')).toBeInTheDocument()
      )
      expect(onOpenChange).not.toHaveBeenCalledWith(false)
    })

    it('re-enables the delete button after a server error', async () => {
      mock.onDelete(`/api/users/${EXISTING_USER.id}`).reply(403, { error: 'Admin users cannot be deleted' })
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole('button', { name: 'Delete user' }))
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Delete user' })).not.toBeDisabled()
      )
    })
  })

  describe('cancel / reset', () => {
    it('calls onOpenChange(false) when Cancel is clicked', async () => {
      const user = userEvent.setup()
      const { onOpenChange } = renderModal()
      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('clears the server error when Cancel is clicked', async () => {
      mock.onDelete(`/api/users/${EXISTING_USER.id}`).reply(403, { error: 'Admin users cannot be deleted' })
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole('button', { name: 'Delete user' }))
      await waitFor(() => expect(screen.getByText('Admin users cannot be deleted')).toBeInTheDocument())
      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(screen.queryByText('Admin users cannot be deleted')).not.toBeInTheDocument()
    })
  })
})
