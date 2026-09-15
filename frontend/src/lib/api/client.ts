import type { ApiErrorBody } from './types'

/**
 * The single HTTP entry point for the whole app.
 *
 * Step 8 (real university auth) should only need to touch this file: register a
 * token provider via `setAuthTokenProvider` and every request starts carrying
 * the credential. Nothing else in the app talks to `fetch` directly.
 */

// Vite's `base` ends with a slash: '/api' in development, '/livequiz/api' on the server.
const BASE_URL = `${import.meta.env.BASE_URL}api`

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

/**
 * What to show when the backend sent no message of its own — a proxy failure, an HTML
 * error page, a filter rejecting the request before it reached a controller. The status
 * code stays on the ApiError for callers that branch on it; it is not something to put in
 * front of a professor mid-lecture.
 */
function fallbackMessage(status: number): string {
  if (status === 404) {
    return 'That is no longer there. Try going back and reloading the page.'
  }
  if (status === 401 || status === 403) {
    return 'You are not allowed to do that.'
  }
  if (status >= 500) {
    return 'The server had a problem. Please try again.'
  }
  return 'Something went wrong. Please try again.'
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
    body?.message ?? fallbackMessage(response.status),
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
