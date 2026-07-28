import { useCallback, useEffect, useRef, useState } from 'react'
import type { SessionState, UUID } from '../../lib/api/types'
import { createLiveClient, type LiveClient, type LiveConnectionStatus } from '../../lib/ws/liveClient'
import {
  PARTICIPANT_TOPIC,
  SUBMIT_ANSWER,
  type ErrorPayload,
  type LiveEvent,
  type LiveQuestionView,
  type QuestionClosedPayload,
  type SessionStatePayload,
} from '../../lib/ws/liveTypes'

export interface ParticipantLiveState {
  sessionState: SessionState | undefined
  question: LiveQuestionView | null
  questionOpen: boolean
  alreadyAnswered: boolean
  participantCount: number
  /** Set at reveal, cleared when the next question opens. */
  reveal: QuestionClosedPayload | undefined
  /** What this participant picked, so the reveal can say whether they were right. */
  ownSelection: UUID[]
  error: string | undefined
}

const INITIAL: ParticipantLiveState = {
  sessionState: undefined,
  question: null,
  questionOpen: false,
  alreadyAnswered: false,
  participantCount: 0,
  reveal: undefined,
  ownSelection: [],
  error: undefined,
}

/**
 * The participant's live connection.
 *
 * Everything this screen shows arrives over STOMP: the SESSION_STATE snapshot on connect
 * (and on every reconnect) tells the participant where the session currently is, so a
 * phone that slept through two questions catches up on its own rather than showing stale
 * content. Answers go out over STOMP too, not REST.
 */
export function useParticipantSession(joinToken: string, participantToken: string | null) {
  const [live, setLive] = useState<ParticipantLiveState>(INITIAL)
  const [status, setStatus] = useState<LiveConnectionStatus>('connecting')
  // The client is an external object, not render data, so it belongs in a ref. Writing a
  // ref inside an effect is fine; only writing one during render is not.
  const clientRef = useRef<LiveClient | null>(null)

  const handleEvent = useCallback((event: LiveEvent) => {
    switch (event.type) {
      // Sent privately on connect, and again as the ack for an accepted answer.
      case 'SESSION_STATE':
      case 'ANSWER_ACCEPTED': {
        const payload = event.payload as SessionStatePayload
        setLive((current) => ({
          ...current,
          sessionState: payload.state,
          question: payload.question,
          questionOpen: payload.questionOpen,
          alreadyAnswered: payload.alreadyAnswered,
          participantCount: payload.participantCount,
          // A snapshot for a different question means the reveal no longer applies.
          reveal:
            current.reveal && current.reveal.questionId === payload.question?.questionId
              ? current.reveal
              : undefined,
          error: undefined,
        }))
        break
      }

      case 'QUESTION_OPENED': {
        const payload = event.payload as LiveQuestionView
        setLive((current) => ({
          ...current,
          sessionState: 'ACTIVE',
          question: payload,
          questionOpen: true,
          alreadyAnswered: false,
          reveal: undefined,
          ownSelection: [],
          error: undefined,
        }))
        break
      }

      case 'QUESTION_CLOSED': {
        const payload = event.payload as QuestionClosedPayload
        setLive((current) => ({ ...current, questionOpen: false, reveal: payload }))
        break
      }

      case 'PARTICIPANT_JOINED': {
        const payload = event.payload as { participantCount: number }
        setLive((current) => ({ ...current, participantCount: payload.participantCount }))
        break
      }

      case 'SESSION_ENDED': {
        setLive((current) => ({
          ...current,
          sessionState: 'ENDED',
          questionOpen: false,
          question: null,
        }))
        break
      }

      case 'ERROR': {
        const payload = event.payload as ErrorPayload
        // Errors here are nearly always a rejected answer, so undo the optimistic
        // "answered" flag rather than leaving the participant stuck on a dead screen.
        setLive((current) => ({ ...current, alreadyAnswered: false, error: payload.message }))
        break
      }

      default:
        break
    }
  }, [])

  useEffect(() => {
    if (!participantToken) {
      return
    }
    const created = createLiveClient({
      connectHeaders: { participantToken },
      topics: [PARTICIPANT_TOPIC(joinToken)],
      onEvent: handleEvent,
      onStatus: setStatus,
    })
    clientRef.current = created
    return () => {
      created.deactivate()
      clientRef.current = null
    }
  }, [joinToken, participantToken, handleEvent])

  /**
   * Optimistically marks the question answered. The server confirms with
   * ANSWER_ACCEPTED, or replies with ERROR — which puts the buttons back.
   */
  const submitAnswer = (questionId: UUID, optionIds: UUID[], freeText: string | null) => {
    const client = clientRef.current
    if (!client) {
      return
    }
    setLive((current) => ({
      ...current,
      alreadyAnswered: true,
      ownSelection: optionIds,
      error: undefined,
    }))
    client.publish(SUBMIT_ANSWER, { questionId, optionIds, freeText })
  }

  const clearError = () => setLive((current) => ({ ...current, error: undefined }))

  return { ...live, status, submitAnswer, clearError }
}
