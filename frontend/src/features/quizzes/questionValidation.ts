import type { QuestionRequest, QuestionType } from '../../lib/api/types'

export interface DraftOption {
  /** Stable key for React lists; not sent to the backend. */
  key: string
  text: string
  imageUrl: string
  correct: boolean
}

export interface DraftQuestion {
  text: string
  imageUrl: string
  type: QuestionType
  options: DraftOption[]
}

let optionKeySeq = 0

export function newOption(correct = false): DraftOption {
  optionKeySeq += 1
  return { key: `opt-${optionKeySeq}`, text: '', imageUrl: '', correct }
}

/**
 * A survey starts with nothing marked correct. Pre-marking an option would be invisible —
 * the control that shows it is hidden in survey mode — and would later let the quiz be
 * switched back to scored with an arbitrary option silently standing as the right answer.
 */
export function emptyDraft(surveyMode = false): DraftQuestion {
  return {
    text: '',
    imageUrl: '',
    type: 'SINGLE_CHOICE',
    options: [newOption(!surveyMode), newOption()],
  }
}

/**
 * Client-side mirror of the backend's QuestionValidator, so the professor gets
 * the same rules immediately instead of a round-trip 400. The backend remains
 * the authority — its message is what gets displayed if these ever diverge.
 */
export function validateDraft(draft: DraftQuestion, surveyMode = false): string | undefined {
  if (!draft.text.trim() && !draft.imageUrl.trim()) {
    return 'A question must have text and/or an image'
  }

  if (draft.type === 'FREE_TEXT') {
    return undefined
  }

  if (draft.options.length < 2) {
    return 'Choice questions must have at least two options'
  }

  // A survey has no right answer, so the rules about which options are correct do not
  // apply. Everything else still does.
  if (!surveyMode) {
    const correctCount = draft.options.filter((option) => option.correct).length
    if (draft.type === 'SINGLE_CHOICE' && correctCount !== 1) {
      return 'Single-choice questions must have exactly one correct option'
    }
    if (draft.type === 'MULTI_CHOICE' && correctCount < 1) {
      return 'Multiple-choice questions must have at least one correct option'
    }
  }

  const everyOptionHasContent = draft.options.every(
    (option) => option.text.trim() || option.imageUrl.trim(),
  )
  if (!everyOptionHasContent) {
    return 'Every option must have text and/or an image'
  }

  return undefined
}

function orNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function draftToRequest(draft: DraftQuestion): QuestionRequest {
  return {
    text: orNull(draft.text),
    imageUrl: orNull(draft.imageUrl),
    type: draft.type,
    // Free-text questions must be sent with no options at all.
    options:
      draft.type === 'FREE_TEXT'
        ? []
        : draft.options.map((option) => ({
            text: orNull(option.text),
            imageUrl: orNull(option.imageUrl),
            correct: option.correct,
          })),
  }
}
