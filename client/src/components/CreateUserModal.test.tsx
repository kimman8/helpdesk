import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import MockAdapter from 'axios-mock-adapter'
import axios from 'axios'
import CreateUserModal from './CreateUserModal'

const NEW_USER = {
  id: '3',
  name: 'New Person',
  email: 'new@example.com',
  role: 'agent',
  createdAt: new Date().toISOString(),
  banned: null,
  banReason: null,
}

let mock: MockAdapter

beforeEach(() => {
  mock = new MockAdapter(axios)
  mock.onPost('/api/users').reply(201, NEW_USER)
})

afterEach(() => {
  mock.restore()
})

function renderModal(props?: { open?: boolean; onOpenChange?: (v: boolean) => void; onSuccess?: () => void }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const onOpenChange = props?.onOpenChange ?? vi.fn()
  const onSuccess = props?.onSuccess ?? vi.fn()
  const open = props?.open ?? true

  render(
    <QueryClientProvider client={queryClient}>
      <CreateUserModal open={open} onOpenChange={onOpenChange} onSuccess={onSuccess} />
    </QueryClientProvider>
  )

  return { onOpenChange, onSuccess }
}

describe('CreateUserModal', () => {
  describe('rendering', () => {
    it('renders the dialog title', () => {
      renderModal()
      expect(screen.getByText('New User')).toBeInTheDocument()
    })

    it('renders Name, Email and Password fields', () => {
      renderModal()
      expect(screen.getByLabelText('Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
      expect(screen.getByLabelText('Password')).toBeInTheDocument()
    })

    it('renders Cancel and Create user buttons', () => {
      renderModal()
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Create user' })).toBeInTheDocument()
    })

    it('does not render when open is false', () => {
      renderModal({ open: false })
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  describe('validation', () => {
    it('shows an error when name is empty', async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole('button', { name: 'Create user' }))
      await waitFor(() =>
        expect(screen.getByText('Name must be at least 3 characters')).toBeInTheDocument()
      )
      expect(mock.history.post.length).toBe(0)
    })

    it('shows an error when name is too short', async () => {
      const user = userEvent.setup()
      renderModal()
      await user.type(screen.getByLabelText('Name'), 'ab')
      await user.type(screen.getByLabelText('Email'), 'test@test.com')
      await user.type(screen.getByLabelText('Password'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Create user' }))
      await waitFor(() =>
        expect(screen.getByText('Name must be at least 3 characters')).toBeInTheDocument()
      )
      expect(mock.history.post.length).toBe(0)
    })

    it('shows an error when email is empty', async () => {
      const user = userEvent.setup()
      renderModal()
      await user.type(screen.getByLabelText('Name'), 'Valid Name')
      await user.type(screen.getByLabelText('Password'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Create user' }))
      await waitFor(() =>
        expect(screen.getByText('Enter a valid email')).toBeInTheDocument()
      )
      expect(mock.history.post.length).toBe(0)
    })

    it('shows an error when password is too short', async () => {
      const user = userEvent.setup()
      renderModal()
      await user.type(screen.getByLabelText('Name'), 'Valid Name')
      await user.type(screen.getByLabelText('Email'), 'test@test.com')
      await user.type(screen.getByLabelText('Password'), 'short')
      await user.click(screen.getByRole('button', { name: 'Create user' }))
      await waitFor(() =>
        expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument()
      )
      expect(mock.history.post.length).toBe(0)
    })

    it('marks invalid fields with aria-invalid', async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole('button', { name: 'Create user' }))
      await waitFor(() =>
        expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true')
      )
      expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
      expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true')
    })

    it('clears validation errors when the field is corrected', async () => {
      const user = userEvent.setup()
      renderModal()
      await user.click(screen.getByRole('button', { name: 'Create user' }))
      await waitFor(() =>
        expect(screen.getByText('Name must be at least 3 characters')).toBeInTheDocument()
      )
      await user.type(screen.getByLabelText('Name'), 'Valid Name')
      await user.click(screen.getByRole('button', { name: 'Create user' }))
      await waitFor(() =>
        expect(screen.queryByText('Name must be at least 3 characters')).not.toBeInTheDocument()
      )
    })
  })

  describe('submission', () => {
    it('posts the correct data on valid submission', async () => {
      const user = userEvent.setup()
      renderModal()
      await user.type(screen.getByLabelText('Name'), 'Valid Name')
      await user.type(screen.getByLabelText('Email'), 'new@example.com')
      await user.type(screen.getByLabelText('Password'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Create user' }))
      await waitFor(() => expect(mock.history.post.length).toBe(1))
      expect(JSON.parse(mock.history.post[0].data)).toEqual({
        name: 'Valid Name',
        email: 'new@example.com',
        password: 'password123',
      })
    })

    it('calls onSuccess and closes the modal after successful submission', async () => {
      const user = userEvent.setup()
      const { onSuccess, onOpenChange } = renderModal()
      await user.type(screen.getByLabelText('Name'), 'Valid Name')
      await user.type(screen.getByLabelText('Email'), 'new@example.com')
      await user.type(screen.getByLabelText('Password'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Create user' }))
      await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce())
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })

    it('shows "Creating…" and disables the submit button while pending', async () => {
      mock.onPost('/api/users').reply(() => new Promise(() => {}))
      const user = userEvent.setup()
      renderModal()
      await user.type(screen.getByLabelText('Name'), 'Valid Name')
      await user.type(screen.getByLabelText('Email'), 'new@example.com')
      await user.type(screen.getByLabelText('Password'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Create user' }))
      await waitFor(() => expect(screen.getByText('Creating…')).toBeInTheDocument())
      expect(screen.getByText('Creating…').closest('button')).toBeDisabled()
    })

    it('shows a server error and keeps the modal open on 400', async () => {
      mock.onPost('/api/users').reply(400, { error: 'A user with that email already exists' })
      const user = userEvent.setup()
      const { onOpenChange } = renderModal()
      await user.type(screen.getByLabelText('Name'), 'Valid Name')
      await user.type(screen.getByLabelText('Email'), 'existing@example.com')
      await user.type(screen.getByLabelText('Password'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Create user' }))
      await waitFor(() =>
        expect(screen.getByText('A user with that email already exists')).toBeInTheDocument()
      )
      expect(onOpenChange).not.toHaveBeenCalledWith(false)
    })

    it('shows "Something went wrong" for unexpected server errors', async () => {
      mock.onPost('/api/users').reply(500)
      const user = userEvent.setup()
      renderModal()
      await user.type(screen.getByLabelText('Name'), 'Valid Name')
      await user.type(screen.getByLabelText('Email'), 'new@example.com')
      await user.type(screen.getByLabelText('Password'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Create user' }))
      await waitFor(() =>
        expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      )
    })

    it('re-enables the submit button after a server error', async () => {
      mock.onPost('/api/users').reply(400, { error: 'Email already exists' })
      const user = userEvent.setup()
      renderModal()
      await user.type(screen.getByLabelText('Name'), 'Valid Name')
      await user.type(screen.getByLabelText('Email'), 'existing@example.com')
      await user.type(screen.getByLabelText('Password'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Create user' }))
      await waitFor(() =>
        expect(screen.getByRole('button', { name: 'Create user' })).not.toBeDisabled()
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
      mock.onPost('/api/users').reply(400, { error: 'Email already exists' })
      const user = userEvent.setup()
      renderModal()
      await user.type(screen.getByLabelText('Name'), 'Valid Name')
      await user.type(screen.getByLabelText('Email'), 'existing@example.com')
      await user.type(screen.getByLabelText('Password'), 'password123')
      await user.click(screen.getByRole('button', { name: 'Create user' }))
      await waitFor(() => expect(screen.getByText('Email already exists')).toBeInTheDocument())
      await user.click(screen.getByRole('button', { name: 'Cancel' }))
      expect(screen.queryByText('Email already exists')).not.toBeInTheDocument()
    })
  })
})
