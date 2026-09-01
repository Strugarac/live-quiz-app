import { useCallback, useEffect, useRef, useState } from 'react'
import type { SessionState, UUID } from '../../lib/api/types'
import { createLiveClient, type LiveClient, type LiveConnectionStatus } from '../../lib/ws/liveClient'
import {
  PARTICIPANT_TOPIC,
  SUBMIT_ANSWER,
  type AnswerReceivedPayload,
  type ErrorPayload,
  type LiveEvent,
  type LiveQuestionView,
  type OwnStandingView,
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
  /**
   * This participant's own answer to the current question: what the waiting screen shows
   * back, and what the reveal grades. Set optimistically on submit, and restored from the
   * server on every snapshot — so a reload mid-question does not lose it.
   */
  ownSelection: UUID[]
  ownFreeText: string | null
  /** Where this answer landed in the order people answered, and how long it took. */
  ownOrdinal: number | undefined
  ownResponseTimeMs: number | null
  /** How many have answered the current question; climbs live as the others submit. */
  answerCount: number
  /** Score, correct count and rank from earlier questions. Undefined on the first one. */
  standing: OwnStandingView | undefined
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
  ownFreeText: null,
  ownOrdinal: undefined,
  ownResponseTimeMs: null,
  answerCount: 0,
  standing: undefined,
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
        // The snapshot carries this participant's own answer, so a reload rebuilds it from
        // the server rather than from state this tab no longer has.
        const own = payload.ownAnswer
        setLive((current) => ({
          ...current,
          sessionState: payload.state,
          question: payload.question,
          questionOpen: payload.questionOpen,
          alreadyAnswered: own !== null,
          participantCount: payload.participantCount,
          // The snapshot carries the reveal too, so a reload during it keeps the correct
          // answers on screen instead of falling back to a bare closed question.
          reveal: payload.reveal ?? undefined,
          ownSelection: own?.selectedOptionIds ?? [],
          ownFreeText: own?.freeText ?? null,
          ownOrdinal: own?.ordinal,
          ownResponseTimeMs: own?.responseTimeMs ?? null,
          answerCount: payload.answerCount,
          standing: payload.standing ?? undefined,
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
          ownFreeText: null,
          ownOrdinal: undefined,
          ownResponseTimeMs: null,
          // Nobody has answered the question that just opened. The standing is left alone:
          // it describes the questions before this one, which have not changed.
          answerCount: 0,
          error: undefined,
        }))
        break
      }

      /**
       * Counts only — how many have answered, out of how many joined. Broadcast to
       * participants as well as the host so the waiting screen can watch the others finish.
       */
      case 'ANSWER_RECEIVED': {
        const payload = event.payload as AnswerReceivedPayload
        setLive((current) =>
          // A late event for a question the session has moved on from would rewind the count.
          current.question?.questionId === payload.questionId
            ? {
                ...current,
                answerCount: payload.answerCount,
                participantCount: payload.participantCount,
              }
            : current,
        )
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
        setLive((current) => ({
          ...current,
          alreadyAnswered: false,
          ownSelection: [],
          ownFreeText: null,
          ownOrdinal: undefined,
          ownResponseTimeMs: null,
          error: payload.message,
        }))
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
      ownFreeText: freeText,
      error: undefined,
    }))
    client.publish(SUBMIT_ANSWER, { questionId, optionIds, freeText })
  }

  const clearError = () => setLive((current) => ({ ...current, error: undefined }))

  return { ...live, status, submitAnswer, clearError }
}
