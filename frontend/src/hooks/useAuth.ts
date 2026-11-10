import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchCurrentUser, signIn, signOut } from '../lib/api'
import type { Role, User } from '../types'

export const authKey = ['auth', 'user'] as const

export function useAuth() {
  const query = useQuery({
    queryKey: authKey,
    queryFn: fetchCurrentUser,
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  return {
    user: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    isAuthenticated: Boolean(query.data),
    refetch: query.refetch,
  }
}

export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => signIn(email, password),
    onSuccess: (user) => {
      queryClient.setQueryData(authKey, user)
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: signOut,
    onSettled: () => {
      queryClient.setQueryData(authKey, null)
      queryClient.clear()
    },
  })
}

export function hasRole(user: User | undefined, roles: Role[]): boolean {
  return Boolean(user && roles.includes(user.role))
}

export function canOperateInventory(user: User | undefined): boolean {
  return hasRole(user, ['admin', 'manager', 'warehouse_operator'])
}

export function canManageCatalog(user: User | undefined): boolean {
  return hasRole(user, ['admin', 'manager'])
}

export const roleLabels: Record<Role, string> = {
  admin: 'Administrator',
  manager: 'Manager',
  warehouse_operator: 'Warehouse operator',
  viewer: 'Viewer',
}
