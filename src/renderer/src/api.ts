import type { ApiResult } from '../../shared/types'

/** Unwraps an IPC result; failures become Errors with a user-readable message. */
export async function unwrap<T>(promise: Promise<ApiResult<T>>): Promise<T> {
  const result = await promise
  if (!result.ok) throw new Error(result.error)
  return result.data
}

export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}
