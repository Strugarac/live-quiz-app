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
  /**
   * true => no right or wrong answers. Options carry no correct flag, nothing is graded,
   * and the session has no scoring or leaderboard — for discussion and surveys.
   */
  surveyMode: boolean
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
  /** FLEXIBLE lets the host choose each question and add questions while running. */
  quizType: QuizType
  /** The quiz has no right answers: no scoring, no leaderboard. */
  surveyMode: boolean
  /** Identities are not collected: participants join as guests and stay anonymous. */
  saveParticipants: boolean
  /** False means ending the session deletes its answers and participants. */
  saveStatistics: boolean
  state: SessionState
  joinToken: string
  /** Full URL participants open; the backend builds it from app.join-base-url. */
  joinUrl: string
  /**
   * Position of the current question in the quiz, or null when none is selected — which
   * for a flexible session includes the gap between starting and the host's first pick.
   */
  currentQuestionIndex: number | null
  /**
   * Questions already presented, in presentation order. Subtract from the quiz to get
   * what is still available to ask; a question added mid-session is simply not in here.
   */
  askedQuestionIds: UUID[]
  questionOpen: boolean
  questionCount: number
  /** Zero once the results have been cleared, which is what "no results" means. */
  participantCount: number
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
  /** How this participant is named on screen; "Participant N" in an anonymous session. */
  label: string
  /** Null in an anonymous session, along with every other identity field. */
  email: string | null
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

/**
 * One participant's answer to one question. The label is anonymity-aware exactly like
 * the leaderboard's — an anonymous session sends "Participant N" and no identity at all.
 * `correct` is null when nothing was graded (survey mode, or a free-text question).
 */
export interface ParticipantAnswerEntry {
  participantId: UUID
  participantLabel: string
  selectedOptionIds: UUID[]
  freeText: string | null
  correct: boolean | null
  points: number
  responseTimeMs: number | null
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
  /** Who answered what, in join order. Empty once the results have been discarded. */
  participantAnswers: ParticipantAnswerEntry[]
}

export interface SessionResultsResponse {
  sessionId: UUID
  quizTitle: string
  state: SessionState
  endedAt: string | null
  participantCount: number
  /**
   * How many questions these results cover. A flexible session reports only the questions
   * it actually asked, and `questions` below holds those in the order they were asked.
   */
  questionCount: number
  /** How many the quiz holds in total; larger than `questionCount` when some were never asked. */
  quizQuestionCount: number
  /** No right answers were scored: leaderboard is empty and correct counts are all 0. */
  surveyMode: boolean
  saveStatistics: boolean
  saveParticipants: boolean
  leaderboard: LeaderboardRow[]
  questions: QuestionBreakdown[]
}

// ---------------------------------------------------------------------------
// Public join flow — com.livequiz.backend.participant.dto
// ---------------------------------------------------------------------------

/**
 * Which registration fields this session asks for. `email` is REQUIRED unless the session
 * is anonymous, where every field — email included — comes back HIDDEN.
 */
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
  /** The quiz keeps no identities: joining asks for nothing at all. */
  anonymous: boolean
  fields: ParticipantFieldsDto
}

export interface JoinRequest {
  /** Null only when the session is anonymous. */
  email: string | null
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
