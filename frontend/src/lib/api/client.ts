import type { ApiErrorBody } from './types'

/**
 * The single HTTP entry point for the whole app.
 *
 * Step 8 (real university auth) should only need to touch this file: register a
 * token provider via `setAuthTokenProvider` and every request starts carrying
 * the credential. Nothing else in the app talks to `fetch` directly.
 */

const BASE_URL = '/api'

export class ApiError extends Error {
  readonly status: number
  readonly fieldErrors: Array<{ field: string; message: string }>

  constructor(status: number, message: string, fieldErrors: Array<{ field: string; message: string }> = []) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fieldErrors = fieldErrors
  }

  /** Validation message for a specific request field, if the backend flagged one. */
  fieldError(field: string): string | undefined {
    return this.fieldErrors.find((fe) => fe.field === field)?.message
  }
}

type TokenProvider = () => string | null

let authTokenProvider: TokenProvider = () => null

/** Step 8 seam: call once at startup with a function returning the current token. */
export function setAuthTokenProvider(provider: TokenProvider): void {
  authTokenProvider = provider
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface RequestOptions {
  method?: Method
  body?: unknown
  signal?: AbortSignal
}

async function toApiError(response: Response): Promise<ApiError> {
  let body: ApiErrorBody | null = null
  try {
    body = (await response.json()) as ApiErrorBody
  } catch {
    // Non-JSON error body (proxy failure, HTML error page); fall through.
  }
  return new ApiError(
    response.status,
    body?.message ?? `Request failed with status ${response.status}`,
    body?.fieldErrors ?? [],
  )
}

/** Performs a JSON request. Resolves to `undefined` for 204 responses. */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal } = options
  const headers = new Headers({ Accept: 'application/json' })
  if (body !== undefined) {
    headers.set('Content-Type', 'application/json')
  }

  const token = authTokenProvider()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      // Harmless today; lets Step 8 use an HttpOnly cookie instead of a token.
      credentials: 'include',
      signal,
    })
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') {
      throw cause
    }
    throw new ApiError(0, 'Cannot reach the server. Is the backend running on port 8080?')
  }

  if (!response.ok) {
    throw await toApiError(response)
  }
  if (response.status === 204) {
    return undefined as T
  }
  return (await response.json()) as T
}

/**
 * Uploads a single file as multipart/form-data.
 *
 * Content-Type is deliberately not set: the browser has to generate it so that it
 * includes the multipart boundary.
 */
export async function uploadFile<T>(path: string, file: File, field = 'file'): Promise<T> {
  const headers = new Headers({ Accept: 'application/json' })
  const token = authTokenProvider()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const form = new FormData()
  form.append(field, file)

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: form,
      credentials: 'include',
    })
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Is the backend running on port 8080?')
  }

  if (!response.ok) {
    throw await toApiError(response)
  }
  return (await response.json()) as T
}

/**
 * Triggers a browser download for an endpoint that returns a file (used by the
 * Step 7 CSV export in slice 9b). Kept here so the auth header stays in one place.
 */
export async function downloadFile(path: string, fallbackFilename: string): Promise<void> {
  const headers = new Headers()
  const token = authTokenProvider()
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${BASE_URL}${path}`, { headers, credentials: 'include' })
  if (!response.ok) {
    throw await toApiError(response)
  }

  const disposition = response.headers.get('Content-Disposition') ?? ''
  const match = /filename="?([^";]+)"?/i.exec(disposition)
  const blob = await response.blob()
  const url = URL.createObjectURL(blob)
  try {
    const link = document.createElement('a')
    link.href = url
    link.download = match?.[1] ?? fallbackFilename
    link.click()
  } finally {
    URL.revokeObjectURL(url)
  }
}
