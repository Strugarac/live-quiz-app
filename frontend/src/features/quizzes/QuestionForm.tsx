import { useState } from 'react'
import type { QuestionResponse, QuestionType, UUID } from '../../lib/api/types'
import { quizApi } from '../../lib/api/quizzes'
import { useAction } from '../../lib/useAsync'
import { Button } from '../../components/ui/Button'
import { SelectField, TextArea } from '../../components/ui/Field'
import { ErrorBanner } from '../../components/ui/Feedback'
import { ImagePicker } from '../../components/ui/ImagePicker'
import { QUESTION_TYPE_OPTIONS } from './quizLabels'
import {
  emptyDraft,
  newOption,
  validateDraft,
  draftToRequest,
  type DraftQuestion,
} from './questionValidation'

function toDraft(question: QuestionResponse): DraftQuestion {
  return {
    text: question.text ?? '',
    imageUrl: question.imageUrl ?? '',
    type: question.type,
    options: question.options.map((option, index) => ({
      key: `${option.id}-${index}`,
      text: option.text ?? '',
      imageUrl: option.imageUrl ?? '',
      correct: option.correct,
    })),
  }
}

interface QuestionFormProps {
  quizId: UUID
  /** Omit to create a new question. */
  question?: QuestionResponse
  onSaved: (saved: QuestionResponse) => void
  onCancel: () => void
}

export function QuestionForm({ quizId, question, onSaved, onCancel }: QuestionFormProps) {
  const [draft, setDraft] = useState<DraftQuestion>(() =>
    question ? toDraft(question) : emptyDraft(),
  )
  const [localError, setLocalError] = useState<string | undefined>()

  const save = useAction((body: Parameters<typeof quizApi.addQuestion>[1]) =>
    question
      ? quizApi.updateQuestion(quizId, question.id, body)
      : quizApi.addQuestion(quizId, body),
  )

  const patch = (changes: Partial<DraftQuestion>) => {
    setDraft((current) => ({ ...current, ...changes }))
    setLocalError(undefined)
  }

  const changeType = (type: QuestionType) => {
    // Going to free text drops the options; coming back needs a usable pair again.
    if (type === 'FREE_TEXT') {
      patch({ type })
      return
    }
    const options = draft.options.length >= 2 ? draft.options : [newOption(true), newOption()]
    // Single choice allows exactly one correct answer, so collapse any extras.
    if (type === 'SINGLE_CHOICE' && options.filter((o) => o.correct).length !== 1) {
      const firstCorrect = options.findIndex((o) => o.correct)
      const keep = firstCorrect === -1 ? 0 : firstCorrect
      patch({ type, options: options.map((o, i) => ({ ...o, correct: i === keep })) })
      return
    }
    patch({ type, options })
  }

  const patchOption = (key: string, changes: Partial<{ text: string; imageUrl: string }>) => {
    patch({
      options: draft.options.map((option) =>
        option.key === key ? { ...option, ...changes } : option,
      ),
    })
  }

  const toggleCorrect = (key: string) => {
    patch({
      options: draft.options.map((option) => {
        if (draft.type === 'SINGLE_CHOICE') {
          return { ...option, correct: option.key === key }
        }
        return option.key === key ? { ...option, correct: !option.correct } : option
      }),
    })
  }

  const removeOption = (key: string) => {
    patch({ options: draft.options.filter((option) => option.key !== key) })
  }

  const submit = async () => {
    const problem = validateDraft(draft)
    if (problem) {
      setLocalError(problem)
      return
    }
    const result = await save.run(draftToRequest(draft))
    if (result.ok) {
      onSaved(result.value)
    }
  }

  const isChoice = draft.type !== 'FREE_TEXT'

  return (
    <form
      className="space-y-5 rounded-xl bg-brand-50/40 p-5 ring-1 ring-brand-200 ring-inset"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
        <TextArea
          label="Question"
          value={draft.text}
          rows={2}
          maxLength={1000}
          autoFocus
          placeholder="What does ACID stand for?"
          onChange={(event) => patch({ text: event.target.value })}
        />
        <SelectField
          label="Answer type"
          value={draft.type}
          options={QUESTION_TYPE_OPTIONS}
          onChange={(event) => changeType(event.target.value as QuestionType)}
        />
      </div>

      <ImagePicker
        label="Question image (optional — a question needs text, an image, or both)"
        value={draft.imageUrl}
        onChange={(imageUrl) => patch({ imageUrl })}
      />

      {isChoice ? (
        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-slate-700">
            Options
            <span className="ml-2 font-normal text-slate-500">
              {draft.type === 'SINGLE_CHOICE'
                ? '— mark exactly one as correct'
                : '— mark every correct option; participants must select them all'}
            </span>
          </legend>

          {draft.options.map((option, index) => (
            <div
              key={option.key}
              className="flex items-start gap-3 rounded-lg bg-white p-3 ring-1 ring-slate-200 ring-inset"
            >
              <label className="mt-2 flex shrink-0 items-center gap-2 text-xs font-medium text-slate-600">
                <input
                  type={draft.type === 'SINGLE_CHOICE' ? 'radio' : 'checkbox'}
                  name="correct-option"
                  checked={option.correct}
                  onChange={() => toggleCorrect(option.key)}
                  className="size-4 accent-emerald-600"
                />
                Correct
              </label>

              <div className="flex-1 space-y-2">
                <input
                  type="text"
                  value={option.text}
                  maxLength={1000}
                  placeholder={`Option ${index + 1}`}
                  aria-label={`Option ${index + 1} text`}
                  onChange={(event) => patchOption(option.key, { text: event.target.value })}
                  className="block w-full rounded-md px-2.5 py-1.5 text-sm ring-1 ring-slate-300 ring-inset focus:ring-2 focus:ring-brand-600"
                />
                <ImagePicker
                  label={`Option ${index + 1} image (optional)`}
                  value={option.imageUrl}
                  compact
                  onChange={(imageUrl) => patchOption(option.key, { imageUrl })}
                />
              </div>

              <Button
                size="sm"
                variant="ghost"
                aria-label={`Remove option ${index + 1}`}
                disabled={draft.options.length <= 2}
                onClick={() => removeOption(option.key)}
                className="mt-1 text-slate-400 hover:text-red-600"
              >
                Remove
              </Button>
            </div>
          ))}

          <Button size="sm" onClick={() => patch({ options: [...draft.options, newOption()] })}>
            Add option
          </Button>
        </fieldset>
      ) : (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200 ring-inset">
          Free-text answers are collected but <strong>not graded</strong> — they score 0 points and
          show up verbatim in the session results.
        </p>
      )}

      {localError && (
        <p role="alert" className="text-sm font-medium text-red-600">
          {localError}
        </p>
      )}
      {save.error && <ErrorBanner error={save.error} />}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={save.pending}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" pending={save.pending}>
          {question ? 'Save question' : 'Add question'}
        </Button>
      </div>
    </form>
  )
}
