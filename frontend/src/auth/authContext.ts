import { createContext, useContext } from 'react'

/**
 * Auth state shared by the console. Split out of AuthProvider.tsx so that file
 * only exports components (keeps Fast Refresh working).
 */

export interface Professor {
  displayName: string
  email: string
}

export interface AuthState {
  professor: Professor | undefined
  loading: boolean
}

export const AuthContext = createContext<AuthState | undefined>(undefined)

export function useAuth(): AuthState {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error('useAuth must be used inside <AuthProvider>')
  }
  return value
}
