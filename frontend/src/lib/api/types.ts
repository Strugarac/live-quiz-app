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

/** com.livequiz.backend.common.web.ApiError */
export interface ApiErrorBody {
  timestamp: string
  status: number
  error: string
  message: string
  path: string
  fieldErrors: Array<{ field: string; message: string }> | null
}
