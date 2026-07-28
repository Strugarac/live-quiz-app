import { useMemo, type ReactNode } from 'react'
import { AuthContext, useAuth, type AuthState, type Professor } from './authContext'

/**
 * Deliberate stub, mirroring the backend's CurrentUserProvider seam.
 *
 * The backend currently answers every /api/professor/** request as the seeded
 * professor (HardcodedProfessorProvider), so there is no login screen yet.
 *
 * Step 8 (university auth) replaces the body of this provider: resolve the signed-in
 * professor from the backend, register the credential via `setAuthTokenProvider`, and
 * make `RequireAuth` redirect when there is no session. Callers of `useAuth()` and the
 * routes wrapped in `RequireAuth` should not need to change.
 */

const STUB_PROFESSOR: Professor = {
  displayName: 'Test Professor',
  email: 'professor@test.local',
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useMemo<AuthState>(() => ({ professor: STUB_PROFESSOR, loading: false }), [])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/** No-op guard today; becomes a redirect to the login flow in Step 8. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { professor, loading } = useAuth()
  if (loading || !professor) {
    return null
  }
  return <>{children}</>
}
