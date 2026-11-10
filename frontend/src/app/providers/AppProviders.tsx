import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, type ReactNode } from 'react'
import { Toaster } from 'sonner'
import { useUiStore } from '../../stores/uiStore'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        const status = (error as { response?: { status?: number } }).response?.status
        if (status && [401, 403, 404, 422].includes(status)) return false
        return failureCount < 2
      },
    },
    mutations: { retry: false },
  },
})

export function AppProviders({ children }: { children: ReactNode }) {
  const theme = useUiStore((state) => state.theme)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.documentElement.style.colorScheme = theme
  }, [theme])

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster richColors closeButton position="top-right" theme={theme} />
    </QueryClientProvider>
  )
}

export { queryClient }
