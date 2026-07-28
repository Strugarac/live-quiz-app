/**
 * Hand-mirrored backend DTOs. Kept as string-literal unions rather than TS enums
 * because tsconfig sets `erasableSyntaxOnly`, which forbids `enum`.
 *
 * Source of truth: com.livequiz.backend.quiz.dto / .domain
 */

export type UUID = string

export type QuizType = 'STATIC' | 'FLEXIBLE'

export type QuestionType = 'SINGLE_CHOICE' | 'MULTI_CHOICE' | 'FREE_TEXT'

export type FieldRequirement = 'REQUIRED' | 'OPTIONAL' | 'HIDDEN'

export interface QuizConfigDto {
  /**
   * Legacy field: the backend's ParticipantRegistrationValidator never reads it,
   * because a participant's email is always required (it is the identity anchor
   * for the university auth planned in Step 8). Sent as REQUIRED for honesty.
   */
  emailRequirement: FieldRequirement
  personalNumberRequirement: FieldRequirement
  nameRequirement: FieldRequirement
  surnameRequirement: FieldRequirement
  facultyRequirement: FieldRequirement
  /** false => the round's data can be cleared after the session ends. */
  saveStatistics: boolean
  /** false => participant identities are wiped when the session ends. */
  saveParticipants: boolean
}

export interface OptionResponse {
  id: UUID
  orderIndex: number
  text: string | null
  imageUrl: string | null
  correct: boolean
}

export interface QuestionResponse {
  id: UUID
  orderIndex: number
  text: string | null
  imageUrl: string | null
  type: QuestionType
  options: OptionResponse[]
}

export interface QuizResponse {
  id: UUID
  title: string
  description: string | null
  type: QuizType
  config: QuizConfigDto
  questions: QuestionResponse[]
  createdAt: string
}

export interface QuizSummary {
  id: UUID
  title: string
  type: QuizType
  questionCount: number
  /** Sessions hosted from this quiz; deleting the quiz deletes them and their results. */
  sessionCount: number
  createdAt: string
}

export interface OptionRequest {
  text: string | null
  imageUrl: string | null
  correct: boolean
}

export interface QuestionRequest {
  text: string | null
  imageUrl: string | null
  type: QuestionType
  options: OptionRequest[]
}

export interface CreateQuizRequest {
  title: string
  description: string | null
  type: QuizType
  config: QuizConfigDto
  questions?: QuestionRequest[]
}

export interface UpdateQuizRequest {
  title: string
  description: string | null
  type: QuizType
  config: QuizConfigDto
}

// ---------------------------------------------------------------------------
// Live sessions — com.livequiz.backend.session.dto / .participant.dto / .scoring.dto
// ---------------------------------------------------------------------------

export type SessionState = 'LOBBY' | 'ACTIVE' | 'ENDED'

export interface SessionResponse {
  id: UUID
  quizId: UUID
  quizTitle: string
  state: SessionState
  joinToken: string
  /** Full URL participants open; the backend builds it from app.join-base-url. */
  joinUrl: string
  /** null until the session is started. */
  currentQuestionIndex: number | null
  questionOpen: boolean
  questionCount: number
  createdAt: string
  startedAt: string | null
  endedAt: string | null
}

export interface CreateSessionRequest {
  quizId: UUID
}

export interface ParticipantResponse {
  id: UUID
  token: string
  sessionId: UUID
  email: string
  name: string | null
  surname: string | null
  personalNumber: string | null
  faculty: string | null
}

export interface LeaderboardRow {
  participantId: UUID
  label: string
  score: number
  correctCount: number
  /** Competition ranking: ties share a rank and the next distinct score skips. */
  rank: number
}

export interface LeaderboardPayload {
  sessionId: UUID
  rows: LeaderboardRow[]
}

export interface OptionBreakdown {
  optionId: UUID
  text: string | null
  correct: boolean
  chosenCount: number
}

export interface FreeTextEntry {
  participantLabel: string
  text: string
}

export interface QuestionBreakdown {
  questionId: UUID
  questionIndex: number
  text: string | null
  type: QuestionType
  answerCount: number
  /** Both are 0 for FREE_TEXT: those answers are collected, not graded. */
  correctCount: number
  incorrectCount: number
  options: OptionBreakdown[]
  freeTextResponses: FreeTextEntry[]
}

export interface SessionResultsResponse {
  sessionId: UUID
  quizTitle: string
  state: SessionState
  endedAt: string | null
  participantCount: number
  questionCount: number
  saveStatistics: boolean
  saveParticipants: boolean
  leaderboard: LeaderboardRow[]
  questions: QuestionBreakdown[]
}

// ---------------------------------------------------------------------------
// Public join flow — com.livequiz.backend.participant.dto
// ---------------------------------------------------------------------------

/** Which registration fields this session asks for. `email` is always REQUIRED. */
export interface ParticipantFieldsDto {
  email: FieldRequirement
  name: FieldRequirement
  surname: FieldRequirement
  personalNumber: FieldRequirement
  faculty: FieldRequirement
}

export interface JoinInfoResponse {
  sessionId: UUID
  quizTitle: string
  /** Joining is only allowed in LOBBY. */
  state: SessionState
  fields: ParticipantFieldsDto
}

export interface JoinRequest {
  email: string
  name: string | null
  surname: string | null
  personalNumber: string | null
  faculty: string | null
}

/** com.livequiz.backend.common.web.ApiError */
export interface ApiErrorBody {
  timestamp: string
  status: number
  error: string
  message: string
  path: string
  fieldErrors: Array<{ field: string; message: string }> | null
}
