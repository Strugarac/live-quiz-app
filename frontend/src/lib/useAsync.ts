import { useCallback, useEffect, useMemo, useState } from 'react'
import { ApiError } from './api/client'

/** Normalises anything thrown by the api layer into an ApiError. */
export function asApiError(cause: unknown): ApiError {
  if (cause instanceof ApiError) {
    return cause
  }
  return new ApiError(0, cause instanceof Error ? cause.message : 'Unexpected error')
}

interface Result<T> {
  /** Identity of the load that produced this result; see `loading` below. */
  source: object | undefined
  data: T | undefined
  error: ApiError | undefined
}

/**
 * Loads data on mount and whenever `load` changes identity, aborting the
 * in-flight request when that happens or on unmount.
 *
 * `load` MUST be stable — wrap it in `useCallback`. A new function on every
 * render would re-trigger the request on every render.
 *
 * `loading` is derived by comparing the current load against the one that
 * produced the last result, rather than being set inside the effect: writing
 * state synchronously in an effect body causes a cascading re-render.
 */
export function useAsync<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [nonce, setNonce] = useState(0)
  const source = useMemo(() => ({ load, nonce }), [load, nonce])
  const [result, setResult] = useState<Result<T>>({
    source: undefined,
    data: undefined,
    error: undefined,
  })

  useEffect(() => {
    const controller = new AbortController()

    source.load(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) {
          setResult({ source, data, error: undefined })
        }
      },
      (cause: unknown) => {
        if (!controller.signal.aborted) {
          setResult({ source, data: undefined, error: asApiError(cause) })
        }
      },
    )

    return () => controller.abort()
  }, [source])

  const loading = result.source !== source

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  /** Replaces the cached value locally, without a refetch. */
  const setData = useCallback(
    (value: T) => setResult({ source, data: value, error: undefined }),
    [source],
  )

  return {
    // Previous data is kept while revalidating; a stale error is not.
    data: result.data,
    error: loading ? undefined : result.error,
    loading,
    reload,
    setData,
  }
}

/**
 * Wraps a mutation so components get `pending` / `error` without repeating
 * try/catch. Never throws — inspect the returned result.
 */
export function useAction<Args extends unknown[], Result>(
  action: (...args: Args) => Promise<Result>,
) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<ApiError | undefined>(undefined)

  // Intentionally not memoised: `action` usually closes over current form state,
  // and a stale closure here would submit stale values.
  const run = async (
    ...args: Args
  ): Promise<{ ok: true; value: Result } | { ok: false; error: ApiError }> => {
    setPending(true)
    setError(undefined)
    try {
      const value = await action(...args)
      return { ok: true, value }
    } catch (cause) {
      const apiError = asApiError(cause)
      setError(apiError)
      return { ok: false, error: apiError }
    } finally {
      setPending(false)
    }
  }

  return { run, pending, error, clearError: () => setError(undefined) }
}
