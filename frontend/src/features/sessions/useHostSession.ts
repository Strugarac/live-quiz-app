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

/**
 * Per-question totals come from the results endpoint, which has no state guard and so
 * answers mid-session as well as after the session has ended.
 */
async function fetchBreakdown(
  sessionId: UUID,
  matches: (question: QuestionBreakdown) => boolean,
  signal?: AbortSignal,
): Promise<QuestionBreakdown | undefined> {
  try {
    const results = await sessionApi.results(sessionId, signal)
    return results.questions.find(matches)
  } catch {
    // Non-essential detail; the reveal still shows the correct answers and the total
    // carried by QUESTION_CLOSED.
    return undefined
  }
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
      // Opening the console on a question that is already closed: no QUESTION_CLOSED
      // broadcast is coming, so its totals have to be fetched rather than counted from
      // live events. Without this a reload during a reveal would report 0 answers.
      const index = session.currentQuestionIndex
      const breakdown =
        session.state === 'ACTIVE' && !session.questionOpen && index !== null
          ? await fetchBreakdown(sessionId, (question) => question.questionIndex === index, signal)
          : undefined
      return { session, quiz, participants, breakdown }
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
      // Per-question state belongs to the question that is OPEN, so it resets when a
      // lifecycle call opens one. Closing must KEEP the count: it is the final tally for
      // the question now being revealed, and the QUESTION_CLOSED broadcast carrying the
      // authoritative total is deferred to after commit, so it often lands before this
      // response does — zeroing here would wipe it and show 0 answered.
      answerCount: updated.questionOpen ? 0 : current.answerCount,
      reveal: updated.questionOpen ? undefined : current.reveal,
      breakdown: updated.questionOpen ? undefined : current.breakdown,
    }))
  }, [])

  /** Pulls per-option counts for a just-closed question out of the results endpoint. */
  const loadBreakdown = useCallback(
    async (questionId: UUID) => {
      const match = await fetchBreakdown(
        sessionId,
        (question) => question.questionId === questionId,
      )
      if (match) {
        setLive((current) => ({ ...current, breakdown: match }))
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

  // The breakdown fetched at load only applies while the console is still on the question it
  // was fetched for; once the host advances, live events are the source again.
  const loadedBreakdown =
    loaded?.breakdown && loaded.breakdown.questionIndex === session?.currentQuestionIndex
      ? loaded.breakdown
      : undefined
  const breakdown = live.breakdown ?? loadedBreakdown
  // While a question is closed the breakdown holds the same authoritative total as
  // QUESTION_CLOSED, and it is the only source available after a reload or a reconnect.
  const answerCount =
    session && !session.questionOpen && breakdown ? breakdown.answerCount : live.answerCount

  return {
    session,
    quiz,
    currentQuestion,
    participants,
    participantCount: live.participantCount ?? participants.length,
    answerCount,
    leaderboard: live.leaderboard,
    reveal: live.reveal,
    breakdown,
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
