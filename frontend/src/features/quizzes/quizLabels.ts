import type {
  FieldRequirement,
  QuestionType,
  QuizConfigDto,
  QuizType,
} from '../../lib/api/types'

export const QUIZ_TYPE_LABELS: Record<QuizType, string> = {
  STATIC: 'Static',
  FLEXIBLE: 'Flexible',
}

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  SINGLE_CHOICE: 'Single choice',
  MULTI_CHOICE: 'Multiple choice',
  FREE_TEXT: 'Free text',
}

export const FIELD_REQUIREMENT_LABELS: Record<FieldRequirement, string> = {
  REQUIRED: 'Required',
  OPTIONAL: 'Optional',
  HIDDEN: 'Hidden',
}

export const QUIZ_TYPE_OPTIONS = (Object.keys(QUIZ_TYPE_LABELS) as QuizType[]).map((value) => ({
  value,
  label: QUIZ_TYPE_LABELS[value],
}))

export const QUESTION_TYPE_OPTIONS = (Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map(
  (value) => ({ value, label: QUESTION_TYPE_LABELS[value] }),
)

export const FIELD_REQUIREMENT_OPTIONS = (
  Object.keys(FIELD_REQUIREMENT_LABELS) as FieldRequirement[]
).map((value) => ({ value, label: FIELD_REQUIREMENT_LABELS[value] }))

/** The participant fields a professor can actually configure (email is always required). */
export const CONFIGURABLE_FIELDS = [
  { key: 'nameRequirement', label: 'First name' },
  { key: 'surnameRequirement', label: 'Surname' },
  { key: 'personalNumberRequirement', label: 'Student number' },
  { key: 'facultyRequirement', label: 'Faculty' },
] as const satisfies ReadonlyArray<{ key: keyof QuizConfigDto; label: string }>

export const DEFAULT_CONFIG: QuizConfigDto = {
  // Always REQUIRED: the backend's registration validator does not read this field,
  // it enforces email unconditionally as the identity anchor for university auth.
  emailRequirement: 'REQUIRED',
  nameRequirement: 'REQUIRED',
  surnameRequirement: 'REQUIRED',
  personalNumberRequirement: 'OPTIONAL',
  facultyRequirement: 'HIDDEN',
  saveStatistics: true,
  saveParticipants: true,
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}
