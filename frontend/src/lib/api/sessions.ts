import { downloadFile, request } from './client'
import type {
  CreateSessionRequest,
  LeaderboardPayload,
  ParticipantResponse,
  SessionResponse,
  SessionResultsResponse,
  UUID,
} from './types'

/**
 * Mirrors ProfessorSessionController (/api/professor/sessions) and
 * ProfessorParticipantController.
 *
 * The four lifecycle calls all return the updated session, so the console can apply
 * the response directly instead of waiting for the matching WebSocket broadcast.
 */
export const sessionApi = {
  create: (body: CreateSessionRequest) =>
    request<SessionResponse>('/professor/sessions', { method: 'POST', body }),

  list: (signal?: AbortSignal) => request<SessionResponse[]>('/professor/sessions', { signal }),

  get: (sessionId: UUID, signal?: AbortSignal) =>
    request<SessionResponse>(`/professor/sessions/${sessionId}`, { signal }),

  participants: (sessionId: UUID, signal?: AbortSignal) =>
    request<ParticipantResponse[]>(`/professor/sessions/${sessionId}/participants`, { signal }),

  start: (sessionId: UUID) =>
    request<SessionResponse>(`/professor/sessions/${sessionId}/start`, { method: 'POST' }),

  closeQuestion: (sessionId: UUID) =>
    request<SessionResponse>(`/professor/sessions/${sessionId}/close-question`, { method: 'POST' }),

  /** Closes the current question first if it is still open, then advances. */
  next: (sessionId: UUID) =>
    request<SessionResponse>(`/professor/sessions/${sessionId}/next`, { method: 'POST' }),

  end: (sessionId: UUID) =>
    request<SessionResponse>(`/professor/sessions/${sessionId}/end`, { method: 'POST' }),

  leaderboard: (sessionId: UUID, signal?: AbortSignal) =>
    request<LeaderboardPayload>(`/professor/sessions/${sessionId}/leaderboard`, { signal }),

  /** Works while the session is still running as well as after it has ended. */
  results: (sessionId: UUID, signal?: AbortSignal) =>
    request<SessionResultsResponse>(`/professor/sessions/${sessionId}/results`, { signal }),

  exportResultsCsv: (sessionId: UUID) =>
    downloadFile(`/professor/sessions/${sessionId}/results/export`, `results-${sessionId}.csv`),

  /** Deletes answers and participants, keeping the ended session. 409 unless ENDED. */
  discardResults: (sessionId: UUID) =>
    request<void>(`/professor/sessions/${sessionId}/results`, { method: 'DELETE' }),
}
