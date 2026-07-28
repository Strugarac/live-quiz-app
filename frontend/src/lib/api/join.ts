import { request } from './client'
import type { JoinInfoResponse, JoinRequest, ParticipantResponse } from './types'

/**
 * Mirrors PublicJoinController (/api/public/sessions/{joinToken}).
 *
 * These are the only unauthenticated endpoints the app calls; participants never have
 * a professor session.
 */
export const joinApi = {
  /** Works in any session state, so the page can explain why joining is closed. */
  info: (joinToken: string, signal?: AbortSignal) =>
    request<JoinInfoResponse>(`/public/sessions/${joinToken}`, { signal }),

  /** 409 if the session already started, or if this email already joined. */
  join: (joinToken: string, body: JoinRequest) =>
    request<ParticipantResponse>(`/public/sessions/${joinToken}/participants`, {
      method: 'POST',
      body,
    }),
}
