import axios from 'axios'
import { describe, expect, it } from 'vitest'
import { errorMessage, firstFieldError, toApiError } from './errors'

describe('API error handling', () => {
  it('extracts Laravel validation errors', () => {
    const error = new axios.AxiosError('Request failed', '422', undefined, undefined, {
      data: { message: 'Validation failed', errors: { sku: ['The SKU has already been taken.'] } },
      status: 422,
      statusText: 'Unprocessable Entity',
      headers: {},
      config: { headers: {} } as never,
    })

    const parsed = toApiError(error)
    expect(parsed.message).toBe('Validation failed')
    expect(parsed.status).toBe(422)
    expect(firstFieldError(parsed)).toBe('The SKU has already been taken.')
    expect(errorMessage(error)).toBe('The SKU has already been taken.')
  })

  it('falls back to the error message for non-Axios failures', () => {
    expect(toApiError(new Error('Network down')).message).toBe('Network down')
    expect(toApiError('unknown').message).toMatch(/Something went wrong/)
  })
})
