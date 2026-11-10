import axios from 'axios'

export type ApiError = {
  message: string
  status?: number
  errors?: Record<string, string[]>
}

export function toApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string; errors?: Record<string, string[]> } | undefined
    return {
      message: data?.message ?? (error.response?.status === 0 ? 'The API is unreachable. Check that the backend is running.' : error.message),
      status: error.response?.status,
      errors: data?.errors,
    }
  }

  if (error instanceof Error) return { message: error.message }
  return { message: 'Something went wrong. Please try again.' }
}

export function firstFieldError(error: ApiError): string | undefined {
  if (!error.errors) return undefined
  const first = Object.values(error.errors)[0]
  return first?.[0]
}

export function errorMessage(error: unknown): string {
  const parsed = toApiError(error)
  return firstFieldError(parsed) ?? parsed.message
}
