import { useState } from 'react'
import type { UUID } from '../../lib/api/types'
import { Button } from '../../components/ui/Button'
import type { LiveQuestionView, QuestionClosedPayload } from '../../lib/ws/liveTypes'
import { optionColor, optionLetter } from './optionColors'

interface AnswerPanelProps {
  question: LiveQuestionView
  questionOpen: boolean
  reveal: QuestionClosedPayload | undefined
  ownSelection: UUID[]
  onSubmit: (optionIds: UUID[], freeText: string | null) => void
}

/**
 * The board of options, and the reveal once the question closes. JoinPage swaps in
 * SubmittedPanel for the one case this does not cover: answered while still open.
 */
export function AnswerPanel({
  question,
  questionOpen,
  reveal,
  ownSelection,
  onSubmit,
}: AnswerPanelProps) {
  const [selected, setSelected] = useState<UUID[]>([])
  const [freeText, setFreeText] = useState('')

  const revealed = reveal?.questionId === question.questionId ? reveal : undefined
  const locked = !questionOpen
  // A survey reveals that the question is over, not what the answer was.
  const gradedReveal = revealed !== undefined && !question.surveyMode
  const surveyReveal = revealed !== undefined && question.surveyMode

  const toggle = (optionId: UUID) => {
    setSelected((current) => {
      if (question.type === 'SINGLE_CHOICE') {
        return [optionId]
      }
      return current.includes(optionId)
        ? current.filter((id) => id !== optionId)
        : [...current, optionId]
    })
  }

  const canSubmit =
    !locked &&
    (question.type === 'FREE_TEXT' ? freeText.trim().length > 0 : selected.length > 0)

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {/* Counts what this session has shown, not the position in the quiz: a flexible
            quiz may open its questions in any order. */}
        Question {question.askedPosition} of {question.questionCount}
      </p>
      <h1 className="mt-1 text-xl font-bold text-slate-900">
        {question.text ?? 'Look at the image'}
      </h1>

      {question.imageUrl && (
        <img
          src={question.imageUrl}
          alt=""
          className="mt-3 max-h-56 w-full rounded-xl bg-slate-100 object-contain"
        />
      )}

      {revealed && <RevealBanner reveal={revealed} question={question} ownSelection={ownSelection} />}

      {question.type === 'FREE_TEXT' ? (
        <div className="mt-5">
          <textarea
            value={freeText}
            rows={4}
            maxLength={2000}
            disabled={locked}
            placeholder="Type your answer…"
            aria-label="Your answer"
            onChange={(event) => setFreeText(event.target.value)}
            className="block w-full rounded-xl bg-white px-4 py-3 text-base ring-1 ring-slate-300 ring-inset focus:ring-2 focus:ring-brand-600 disabled:bg-slate-100 disabled:text-slate-500"
          />
        </div>
      ) : (
        <ul className="mt-5 space-y-3">
          {question.options.map((option, index) => {
            const isSelected = selected.includes(option.id)
            const isCorrect = revealed?.correctOptionIds.includes(option.id)
            const wasPicked = ownSelection.includes(option.id)

            return (
              <li key={option.id}>
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => toggle(option.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-4 text-left text-base font-semibold text-white transition-all disabled:cursor-not-allowed ${
                    gradedReveal
                      ? isCorrect
                        ? 'bg-emerald-600'
                        : 'bg-slate-300 text-slate-600'
                      : `${optionColor(index).base} ${optionColor(index).hover}`
                  } ${isSelected && !revealed ? 'ring-4 ring-slate-900/20' : ''} ${
                    // A survey keeps every option in its own colour at reveal — greying them
                    // all out would read as "everyone got it wrong". Only the pick stands out.
                    surveyReveal && !wasPicked ? 'opacity-50' : ''
                  } ${locked && !revealed ? 'opacity-60' : ''}`}
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/25 text-sm">
                    {gradedReveal && isCorrect ? '✓' : optionLetter(index)}
                  </span>
                  <span className="min-w-0 flex-1">
                    {option.text ?? '(image)'}
                    {option.imageUrl && (
                      <img
                        src={option.imageUrl}
                        alt=""
                        className="mt-2 max-h-24 rounded-lg bg-white/20 object-contain"
                      />
                    )}
                  </span>
                  {revealed && wasPicked && (
                    <span className="shrink-0 text-xs font-bold uppercase">your pick</span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {!locked && (
        <Button
          variant="primary"
          disabled={!canSubmit}
          className="mt-5 w-full py-3 text-base"
          onClick={() =>
            onSubmit(
              question.type === 'FREE_TEXT' ? [] : selected,
              question.type === 'FREE_TEXT' ? freeText.trim() : null,
            )
          }
        >
          Submit answer
        </Button>
      )}

      {/* The snapshot replays the reveal after a reload, so a closed question should always
          arrive with one. This is the fallback for the case where it somehow does not. */}
      {!questionOpen && !revealed && (
        <p className="mt-5 rounded-xl bg-slate-100 px-4 py-3 text-center text-sm text-slate-600">
          This question is closed.
        </p>
      )}
    </div>
  )
}

function RevealBanner({
  reveal,
  question,
  ownSelection,
}: {
  reveal: QuestionClosedPayload
  question: LiveQuestionView
  ownSelection: UUID[]
}) {
  // A survey has no right answer, so there is nothing to be right or wrong about. Without
  // this the empty correct set would grade everyone as "Not quite".
  if (question.surveyMode) {
    return (
      <p className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-center text-sm text-slate-600">
        No right answer here — your professor is collecting what everyone thinks.
      </p>
    )
  }

  if (question.type === 'FREE_TEXT') {
    return (
      <p className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-center text-sm text-slate-600">
        Written answers are reviewed by your professor, not scored automatically.
      </p>
    )
  }

  if (ownSelection.length === 0) {
    return (
      <p className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-center text-sm font-semibold text-slate-600">
        You did not answer this one.
      </p>
    )
  }

  // Multiple choice is all-or-nothing: the picked set must match the correct set exactly.
  const correct = new Set(reveal.correctOptionIds)
  const wasRight =
    ownSelection.length === correct.size && ownSelection.every((id) => correct.has(id))

  return (
    <p
      className={`mt-4 rounded-xl px-4 py-3 text-center text-base font-bold ${
        wasRight ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
      }`}
    >
      {wasRight ? 'Correct!' : 'Not quite'}
    </p>
  )
}
