import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MockAdapter from 'axios-mock-adapter'
import axios from 'axios'
import EditUserModal from './EditUserModal'

const EXISTING_USER = {
  id: '1',
  name: 'Alice Admin',
  email: 'alice@example.com',
  role: 'admin',
  createdAt: '2024-01-15T00:00:00.000Z',
  banned: null,
  banReason: null,
}

let mock: MockAdapter

beforeEach(() => {
  mock = new MockAdapter(axios)
  mock.onPatch(`/api/users/${EXISTING_USER.id}`).reply(200, EXISTING_USER)
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
      <EditUserModal open={open} onOpenChange={onOpenChange} onSuccess={onSuccess} user={user} />
    </QueryClientProvider>
  )

  return { onOpenChange, onSuccess }
}

describe('EditUserModal', () => {
  describe('rendering', () => {
    it('renders the dialog title', () => {
      renderModal()
      expect(screen.getByText('Edit User')).toBeInTheDocument()
    })

    it('pre-populates name and email from the user prop', () => {
      renderModal()
      expect(screen.getByLabelText('Name')).toHaveValue(EXISTING_USER.name)
      expect(screen.getByLabelText('Email')).toHaveValue(EXISTING_USER.email)
    })

    it('renders the password field empty', () => {
      renderModal()
      expect(screen.getByLabelText('Password')).toHaveValue('')
    })

    it('shows helper text for the password field', () => {
      renderModal()
      expect(screen.getByText('Leave blank to keep current password')).toBeInTheDocument()
    })

    it('renders Cancel and Save changes buttons', () => {
      renderModal()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument()
    })

    it('does not render when open is false', () => {
      renderModal({ open: false })
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  describe('validation', () => {
    it('shows an error when name is too short', async () => {
      const user = userEvent.setup()
      renderModal()
      await user.clear(screen.getByLabelText('Name'))
      await user.type(screen.getByLabelText('Name'), 'ab')
      await user.click(screen.getByRole('button', { name: 'Save changes' }))
      await waitFor(() =>
        expect(screen.getByText('Name must be at least 3 characters')).toBeInTheDocument()
      )
      expect(mock.history.patch.length).toBe(0)
    })

    it('shows an error when password is provided but too short', async () => {
      const user = userEvent.setup()
      renderModal()
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'short' } })
      await user.click(screen.getByRole('button', { name: 'Save changes' }))
      await waitFor(() =>
        expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument()
      )
      expect(mock.history.patch.length).toBe(0)
    })

    it('does not show a password error when password is left blank', async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole('button', { name: 'Save changes' }))
      await waitFor(() => expect(mock.history.patch.length).toBe(1))
      expect(screen.queryByText('Password must be at least 8 characters')).not.toBeInTheDocument()
    })

    it('marks invalid fields with aria-invalid', async () => {
      const user = userEvent.setup()
      renderModal()
      await user.clear(screen.getByLabelText('Name'))
      await user.type(screen.getByLabelText('Name'), 'ab')
      await user.click(screen.getByRole('button', { name: 'Save changes' }))
      await waitFor(() =>
        expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true')
      )
    })
  })

  describe('submission', () => {
    it('patches the correct endpoint with name and email when password is blank', async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole('button', { name: 'Save changes' }))
      await waitFor(() => expect(mock.history.patch.length).toBe(1))
      expect(mock.history.patch[0].url).toBe(`/api/users/${EXISTING_USER.id}`)
      const body = JSON.parse(mock.history.patch[0].data)
      expect(body.name).toBe(EXISTING_USER.name)
      expect(body.email).toBe(EXISTING_USER.email)
      expect(body.password).toBeUndefined()
    })

    it('includes password in the request when provided', async () => {
      const user = userEvent.setup()
      renderModal()
      fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'newpassword123' } })
      await user.click(screen.getByRole('button', { name: 'Save changes' }))
      await waitFor(() => expect(mock.history.patch.length).toBe(1))
      const body = JSON.parse(mock.history.patch[0].data)
      expect(body.password).toBe('newpassword123')
    })

    it('calls onSuccess and closes the modal after successful submission', async () => {
      const user = userEvent.setup()
      const { onSuccess, onOpenChange } = renderModal()
      await user.click(screen.getByRole('button', { name: 'Save changes' }))
      await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce())
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('shows "Saving…" and disables the submit button while pending', async () => {
      mock.onPatch(`/api/users/${EXISTING_USER.id}`).reply(() => new Promise(() => {}))
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole('button', { name: 'Save changes' }))
      await waitFor(() => expect(screen.getByText('Saving…')).toBeInTheDocument())
      expect(screen.getByText('Saving…').closest('button')).toBeDisabled()
    })

    it('shows a server error and keeps the modal open on failure', async () => {
      mock.onPatch(`/api/users/${EXISTING_USER.id}`).reply(400, { error: 'Email already in use' })
      const user = userEvent.setup()
      const { onOpenChange } = renderModal()
      await user.click(screen.getByRole('button', { name: 'Save changes' }))
      await waitFor(() =>
        expect(screen.getByText('Email already in use')).toBeInTheDocument()
      )
      expect(onOpenChange).not.toHaveBeenCalledWith(false)
    })

    it('re-enables the submit button after a server error', async () => {
      mock.onPatch(`/api/users/${EXISTING_USER.id}`).reply(400, { error: 'Email already in use' })
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole('button', { name: 'Save changes' }))
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Save changes' })).not.toBeDisabled()
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
      mock.onPatch(`/api/users/${EXISTING_USER.id}`).reply(400, { error: 'Email already in use' })
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole('button', { name: 'Save changes' }))
      await waitFor(() => expect(screen.getByText('Email already in use')).toBeInTheDocument())
      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(screen.queryByText('Email already in use')).not.toBeInTheDocument()
    })
  })
})
