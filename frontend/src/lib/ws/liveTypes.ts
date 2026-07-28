import type { QuestionType, SessionState, UUID } from '../api/types'

/**
 * The live protocol — com.livequiz.backend.live.dto.
 *
 * Destinations use DOTS, not slashes: RabbitMQ treats everything after /topic/ as an
 * AMQP routing key, so LiveTopics builds `/topic/session.{joinToken}` and appends
 * `.host` for the host-only channel.
 */

export const PARTICIPANT_TOPIC = (joinToken: string) => `/topic/session.${joinToken}`

export const HOST_TOPIC = (joinToken: string) => `/topic/session.${joinToken}.host`

/** Private replies (snapshots, per-client errors, answer acks). */
export const USER_QUEUE = '/user/queue/session'

/** Publish here to receive a SESSION_STATE snapshot on the user queue. */
export const REQUEST_STATE = '/app/session/state'

export const SUBMIT_ANSWER = '/app/session/answer'

export type LiveEventType =
  | 'SESSION_STATE'
  | 'QUESTION_OPENED'
  | 'QUESTION_CLOSED'
  | 'PARTICIPANT_JOINED'
  | 'ANSWER_RECEIVED'
  | 'ANSWER_ACCEPTED'
  | 'LEADERBOARD_UPDATED'
  | 'SESSION_ENDED'
  | 'ERROR'

export interface LiveEvent<T = unknown> {
  type: LiveEventType
  at: string
  payload: T
}

export interface LiveOptionView {
  id: UUID
  text: string | null
  imageUrl: string | null
}

/** What participants are shown; deliberately carries no correct-answer flags. */
export interface LiveQuestionView {
  questionId: UUID
  questionIndex: number
  questionCount: number
  text: string | null
  imageUrl: string | null
  type: QuestionType
  options: LiveOptionView[]
}

export interface SessionStatePayload {
  sessionId: UUID
  state: SessionState
  currentQuestionIndex: number | null
  questionCount: number
  questionOpen: boolean
  participantCount: number
  question: LiveQuestionView | null
  alreadyAnswered: boolean
}

/** The only event carrying correct answers, and it goes to participants at reveal time. */
export interface QuestionClosedPayload {
  questionId: UUID
  questionIndex: number
  correctOptionIds: UUID[]
  answerCount: number
  hasNextQuestion: boolean
}

export interface ParticipantJoinedPayload {
  /** null on the participant-facing copy of this event, which is count-only. */
  participantId: UUID | null
  label: string | null
  participantCount: number
}

export interface AnswerReceivedPayload {
  questionId: UUID
  questionIndex: number
  answerCount: number
  participantCount: number
}

export interface SessionEndedPayload {
  sessionId: UUID
  questionCount: number
  endedAt: string
}

export interface ErrorPayload {
  code: string
  message: string
}
