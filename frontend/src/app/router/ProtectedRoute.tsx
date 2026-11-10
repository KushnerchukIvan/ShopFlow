import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { LoadingScreen } from '../../components/ui'
import type { Role } from '../../types'

export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) return <LoadingScreen />
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />

  return <Outlet />
}

export function RequireRole({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const { user, isLoading } = useAuth()

  if (isLoading) return <LoadingScreen />
  if (!user || !roles.includes(user.role)) return <Navigate to="/" replace />

  return <>{children}</>
}
