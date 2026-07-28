import { useCallback, useEffect, useState } from 'react'
import { quizApi } from '../../lib/api/quizzes'
import { sessionApi } from '../../lib/api/sessions'
import type {
  LeaderboardRow,
  ParticipantResponse,
  QuestionBreakdown,
  QuizResponse,
  SessionResponse,
  UUID,
} from '../../lib/api/types'
import { useAsync } from '../../lib/useAsync'
import { createLiveClient, type LiveConnectionStatus } from '../../lib/ws/liveClient'
import {
  HOST_TOPIC,
  PARTICIPANT_TOPIC,
  type AnswerReceivedPayload,
  type ErrorPayload,
  type LiveEvent,
  type LiveQuestionView,
  type ParticipantJoinedPayload,
  type QuestionClosedPayload,
  type SessionStatePayload,
} from '../../lib/ws/liveTypes'

export interface LobbyEntry {
  id: UUID
  label: string
}

/** Mirrors the backend's LiveMapper.label: full name when known, otherwise email. */
function labelOf(participant: ParticipantResponse): string {
  const full = [participant.name, participant.surname].filter(Boolean).join(' ').trim()
  return full || participant.email
}

interface LiveState {
  /** From live events; falls back to the loaded participant list until one arrives. */
  participantCount: number | undefined
  answerCount: number
  leaderboard: LeaderboardRow[]
  /** Set while a closed question is being revealed; cleared when the next one opens. */
  reveal: QuestionClosedPayload | undefined
  /** Per-option counts for the revealed question, fetched from the results endpoint. */
  breakdown: QuestionBreakdown | undefined
  /** Participants that joined while this console was open. */
  joined: LobbyEntry[]
  error: string | undefined
}

const EMPTY_LIVE: LiveState = {
  participantCount: undefined,
  answerCount: 0,
  leaderboard: [],
  reveal: undefined,
  breakdown: undefined,
  joined: [],
  error: undefined,
}

/**
 * Owns everything the host console needs.
 *
 * REST is the authority on session state: every lifecycle call returns the updated
 * session and its response is applied directly, so the console never waits on a
 * broadcast to reflect a button the professor just pressed. WebSocket events supply
 * what REST cannot — participants joining, answers arriving, the leaderboard — and
 * keep this tab correct if the session is driven from somewhere else.
 */
export function useHostSession(sessionId: UUID) {
  const load = useCallback(
    async (signal: AbortSignal) => {
      const session = await sessionApi.get(sessionId, signal)
      // The quiz gives the host what participants are never sent: which option is correct.
      const [quiz, participants] = await Promise.all([
        quizApi.get(session.quizId, signal),
        sessionApi.participants(sessionId, signal),
      ])
      return { session, quiz, participants }
    },
    [sessionId],
  )

  const bundle = useAsync(load)

  // Session changes are held as a patch over the loaded copy. Keeping them separate means
  // every update is a functional setState — no refs, no effects that write state.
  const [patch, setPatch] = useState<Partial<SessionResponse>>({})
  const [live, setLive] = useState<LiveState>(EMPTY_LIVE)
  const [status, setStatus] = useState<LiveConnectionStatus>('connecting')

  const loaded = bundle.data
  const session: SessionResponse | undefined = loaded ? { ...loaded.session, ...patch } : undefined
  const joinToken = loaded?.session.joinToken

  const applySession = useCallback((updated: SessionResponse) => {
    setPatch(updated)
    setLive((current) => ({
      ...current,
      // A lifecycle call may have closed or opened a question; drop per-question state.
      answerCount: updated.questionOpen ? current.answerCount : 0,
      reveal: updated.questionOpen ? undefined : current.reveal,
      breakdown: updated.questionOpen ? undefined : current.breakdown,
    }))
  }, [])

  /** Pulls per-option counts for a just-closed question out of the results endpoint. */
  const loadBreakdown = useCallback(
    async (questionId: UUID) => {
      try {
        const results = await sessionApi.results(sessionId)
        const match = results.questions.find((question) => question.questionId === questionId)
        setLive((current) => ({ ...current, breakdown: match }))
      } catch {
        // Non-essential detail; the reveal still shows the correct answers and totals.
      }
    },
    [sessionId],
  )

  const handleEvent = useCallback(
    (event: LiveEvent) => {
      switch (event.type) {
        case 'SESSION_STATE': {
          const payload = event.payload as SessionStatePayload
          setPatch((current) => ({
            ...current,
            state: payload.state,
            currentQuestionIndex: payload.currentQuestionIndex,
            questionOpen: payload.questionOpen,
            questionCount: payload.questionCount,
          }))
          setLive((current) => ({ ...current, participantCount: payload.participantCount }))
          break
        }

        case 'PARTICIPANT_JOINED': {
          const payload = event.payload as ParticipantJoinedPayload
          setLive((current) => ({
            ...current,
            participantCount: payload.participantCount,
            joined:
              payload.participantId && payload.label
                ? [
                    ...current.joined.filter((entry) => entry.id !== payload.participantId),
                    { id: payload.participantId, label: payload.label },
                  ]
                : current.joined,
          }))
          break
        }

        case 'ANSWER_RECEIVED': {
          const payload = event.payload as AnswerReceivedPayload
          setLive((current) => ({
            ...current,
            answerCount: payload.answerCount,
            participantCount: payload.participantCount,
          }))
          break
        }

        case 'QUESTION_OPENED': {
          const payload = event.payload as LiveQuestionView
          setPatch((current) => ({
            ...current,
            currentQuestionIndex: payload.questionIndex,
            questionOpen: true,
            state: 'ACTIVE',
          }))
          setLive((current) => ({
            ...current,
            answerCount: 0,
            reveal: undefined,
            breakdown: undefined,
          }))
          break
        }

        case 'QUESTION_CLOSED': {
          const payload = event.payload as QuestionClosedPayload
          setPatch((current) => ({ ...current, questionOpen: false }))
          setLive((current) => ({
            ...current,
            answerCount: payload.answerCount,
            reveal: payload,
          }))
          void loadBreakdown(payload.questionId)
          break
        }

        case 'LEADERBOARD_UPDATED': {
          const payload = event.payload as { rows: LeaderboardRow[] }
          setLive((current) => ({ ...current, leaderboard: payload.rows }))
          break
        }

        case 'SESSION_ENDED': {
          setPatch((current) => ({ ...current, state: 'ENDED', questionOpen: false }))
          break
        }

        case 'ERROR': {
          const payload = event.payload as ErrorPayload
          setLive((current) => ({ ...current, error: payload.message }))
          break
        }

        // ANSWER_ACCEPTED is a participant-only ack; hosts never receive it.
        default:
          break
      }
    },
    [loadBreakdown],
  )

  useEffect(() => {
    if (!joinToken) {
      return
    }
    const client = createLiveClient({
      // The interceptor authenticates a host by role + sessionId, resolving the professor
      // server-side. Step 8 adds a credential header here.
      connectHeaders: { role: 'HOST', sessionId },
      topics: [HOST_TOPIC(joinToken), PARTICIPANT_TOPIC(joinToken)],
      onEvent: handleEvent,
      onStatus: setStatus,
    })
    return () => client.deactivate()
  }, [joinToken, sessionId, handleEvent])

  const participants: LobbyEntry[] = loaded
    ? [
        ...loaded.participants.map((participant) => ({
          id: participant.id,
          label: labelOf(participant),
        })),
        ...live.joined.filter(
          (entry) => !loaded.participants.some((participant) => participant.id === entry.id),
        ),
      ]
    : []

  const quiz: QuizResponse | undefined = loaded?.quiz
  const currentQuestion =
    quiz && session?.currentQuestionIndex !== null && session?.currentQuestionIndex !== undefined
      ? quiz.questions[session.currentQuestionIndex]
      : undefined

  return {
    session,
    quiz,
    currentQuestion,
    participants,
    participantCount: live.participantCount ?? participants.length,
    answerCount: live.answerCount,
    leaderboard: live.leaderboard,
    reveal: live.reveal,
    breakdown: live.breakdown,
    liveError: live.error,
    status,
    loading: bundle.loading,
    error: bundle.error,
    reload: () => {
      setPatch({})
      setLive(EMPTY_LIVE)
      bundle.reload()
    },
    applySession,
    dismissLiveError: () => setLive((current) => ({ ...current, error: undefined })),
  }
}
