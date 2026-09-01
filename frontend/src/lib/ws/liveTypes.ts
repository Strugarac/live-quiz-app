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
  /** Position in the QUIZ — how the host console looks the question up. */
  questionIndex: number
  /** Position in THIS SESSION, 1-based: the "3" in "question 3 of 8". */
  askedPosition: number
  questionCount: number
  text: string | null
  imageUrl: string | null
  type: QuestionType
  /** No right answers in this quiz: nothing is ever marked correct and no score is kept. */
  surveyMode: boolean
  options: LiveOptionView[]
}

/**
 * The receiving participant's own answer to the question in the snapshot. Rides only on
 * the private user queue, so a reload can restore what this student picked.
 */
export interface OwnAnswerView {
  questionId: UUID
  selectedOptionIds: UUID[]
  freeText: string | null
  /** 1-based position in the order this question was answered. */
  ordinal: number
  /** Time from the question opening to this answer, or null if unknown. */
  responseTimeMs: number | null
}

/**
 * How this participant is doing, from questions that have already CLOSED — the open one
 * contributes nothing, since answers are only graded when the host closes a question.
 * That is what makes it safe to show while a question is still running.
 */
export interface OwnStandingView {
  score: number
  correctCount: number
  /** 1-based, out of SessionStatePayload.participantCount. */
  rank: number
}

export interface SessionStatePayload {
  sessionId: UUID
  state: SessionState
  currentQuestionIndex: number | null
  questionCount: number
  questionOpen: boolean
  participantCount: number
  question: LiveQuestionView | null
  /** How many have answered the current question. A count only, never a per-option split. */
  answerCount: number
  /** null when this participant has not answered the current question — or for the host. */
  ownAnswer: OwnAnswerView | null
  /** null until at least one earlier question has been asked and graded. */
  standing: OwnStandingView | null
  /** The reveal, once the question has closed; null while it is still open. Replays what
      the QUESTION_CLOSED broadcast carried, so a reload during the reveal keeps it. */
  reveal: QuestionClosedPayload | null
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
