import { ApiError } from './apiTransport'

export function formatApiError(error: unknown): string {
  if (error instanceof ApiError) {
    const fields = Object.entries(error.fieldErrors).flatMap(([name, value]) =>
      (Array.isArray(value) ? value : [value]).map((message) => name + ': ' + message),
    )
    return fields.length ? error.message + ' ' + fields.join(' ') : error.message
  }
  if (error instanceof Error) return error.message
  return 'The API request could not be completed.'
}
