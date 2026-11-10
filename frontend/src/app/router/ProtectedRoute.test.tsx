import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProtectedRoute, RequireRole } from './ProtectedRoute'
import { useAuth } from '../../hooks/useAuth'
import type { Role } from '../../types'

vi.mock('../../hooks/useAuth', () => ({ useAuth: vi.fn() }))

const mockedUseAuth = vi.mocked(useAuth)

function authState(role?: Role) {
  return {
    user: role ? { id: 1, name: 'Test User', email: 'test@example.test', role, is_active: true } : undefined,
    isLoading: false,
    isError: false,
    isAuthenticated: Boolean(role),
    refetch: vi.fn(),
  }
}

describe('route guards', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects unauthenticated visitors to the login page', () => {
    mockedUseAuth.mockReturnValue(authState())
    render(
      <MemoryRouter initialEntries={['/private']}>
        <Routes>
          <Route path="/login" element={<div>Login screen</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/private" element={<div>Private screen</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Login screen')).toBeInTheDocument()
    expect(screen.queryByText('Private screen')).not.toBeInTheDocument()
  })

  it('renders the protected outlet for authenticated users', () => {
    mockedUseAuth.mockReturnValue(authState('viewer'))
    render(
      <MemoryRouter initialEntries={['/private']}>
        <Routes>
          <Route path="/login" element={<div>Login screen</div>} />
          <Route element={<ProtectedRoute />}>
            <Route path="/private" element={<div>Private screen</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Private screen')).toBeInTheDocument()
  })

  it('blocks routes that require a role the user does not have', () => {
    mockedUseAuth.mockReturnValue(authState('viewer'))
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/" element={<div>Home</div>} />
          <Route path="/admin" element={<RequireRole roles={['admin']}><div>Admin only</div></RequireRole>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.queryByText('Admin only')).not.toBeInTheDocument()
  })

  it('allows an administrator into admin routes', () => {
    mockedUseAuth.mockReturnValue(authState('admin'))
    render(
      <MemoryRouter initialEntries={['/admin']}>
        <Routes>
          <Route path="/" element={<div>Home</div>} />
          <Route path="/admin" element={<RequireRole roles={['admin']}><div>Admin only</div></RequireRole>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Admin only')).toBeInTheDocument()
  })
})
