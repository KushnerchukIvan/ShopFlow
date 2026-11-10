import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginPage } from './LoginPage'
import { fetchCurrentUser, signIn } from '../../lib/api'

vi.mock('../../lib/api', () => ({
  fetchCurrentUser: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}))

const demoUser = { id: 1, name: 'ShopFlow Admin', email: 'admin@example.test', role: 'admin' as const, is_active: true }

function renderLogin() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<div>Dashboard workspace</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('LoginPage', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchCurrentUser).mockRejectedValue(new Error('Unauthenticated'))
  })

  it('renders the sign-in form for an unauthenticated visitor', async () => {
    renderLogin()

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Email address/)).toHaveValue('admin@example.test')
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.getByText('Demo accounts')).toBeInTheDocument()
  })

  it('signs in and redirects to the workspace', async () => {
    vi.mocked(signIn).mockResolvedValue(demoUser)
    const user = userEvent.setup()
    renderLogin()

    await user.click(await screen.findByRole('button', { name: 'Sign in' }))

    await waitFor(() => expect(signIn).toHaveBeenCalledWith('admin@example.test', 'ShopFlow!Demo2026'))
    expect(await screen.findByText('Dashboard workspace')).toBeInTheDocument()
  })

  it('shows a readable error for invalid credentials', async () => {
    vi.mocked(signIn).mockRejectedValue(new Error('The provided credentials are incorrect.'))
    const user = userEvent.setup()
    renderLogin()

    await user.click(await screen.findByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('The provided credentials are incorrect.')
    expect(screen.queryByText('Dashboard workspace')).not.toBeInTheDocument()
  })
})
