import type { UUID } from '../../lib/api/types'
import type { LiveQuestionView, OwnStandingView } from '../../lib/ws/liveTypes'
import { optionColor, optionLetter } from './optionColors'

interface SubmittedPanelProps {
  question: LiveQuestionView
  ownSelection: UUID[]
  ownFreeText: string | null
  ownOrdinal: number | undefined
  ownResponseTimeMs: number | null
  answerCount: number
  participantCount: number
  standing: OwnStandingView | undefined
}

/** "1st", "2nd", "3rd", "4th"… for the order this participant answered in. */
function ordinalLabel(position: number) {
  const lastTwo = position % 100
  if (lastTwo >= 11 && lastTwo <= 13) {
    return `${position}th`
  }
  switch (position % 10) {
    case 1:
      return `${position}st`
    case 2:
      return `${position}nd`
    case 3:
      return `${position}rd`
    default:
      return `${position}th`
  }
}

/** Sub-10s answers are the interesting ones, so keep one decimal below a minute. */
function formatDuration(ms: number) {
  const seconds = ms / 1000
  return seconds < 60 ? `${seconds.toFixed(1)} s` : `${Math.floor(seconds / 60)} min ${Math.round(seconds % 60)} s`
}

/**
 * What a participant sees between submitting and the reveal.
 *
 * The other options are deliberately gone: once the answer is locked in there is nothing
 * left to do with them, and leaving a full board of choices on screen invites second-
 * guessing and lets the phone next door read them off. What stays is the question this
 * session is on, this participant's own answer, and a clear "you are done, wait" state.
 */
export function SubmittedPanel({
  question,
  ownSelection,
  ownFreeText,
  ownOrdinal,
  ownResponseTimeMs,
  answerCount,
  participantCount,
  standing,
}: SubmittedPanelProps) {
  const picked = question.options
    .map((option, index) => ({ option, index }))
    .filter(({ option }) => ownSelection.includes(option.id))

  // The snapshot restores the answer after a reload, so this is only a safety net for a
  // payload that says "answered" without saying with what — better than an empty card.
  const answerUnknown = question.type === 'FREE_TEXT' ? ownFreeText === null : picked.length === 0

  return (
    <div className="flex flex-1 flex-col">
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
          className="mt-3 max-h-40 w-full rounded-xl bg-slate-100 object-contain"
        />
      )}

      <section className="mt-6 rounded-2xl bg-white p-4 ring-1 ring-slate-200 ring-inset">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Your answer
        </h2>

        {answerUnknown ? (
          <p className="mt-2 text-sm text-slate-500">Your answer is in and counted.</p>
        ) : question.type === 'FREE_TEXT' ? (
          <p className="mt-2 whitespace-pre-wrap break-words text-base font-medium text-slate-900">
            {ownFreeText}
          </p>
        ) : (
          <ul className="mt-2 space-y-2">
            {picked.map(({ option, index }) => (
              <li
                key={option.id}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-left text-base font-semibold text-white ${optionColor(index).base}`}
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/25 text-sm">
                  {optionLetter(index)}
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
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Everything below is deliberately free of any hint about THIS question's answer:
          how many have answered, but never which options they picked. A student who has not
          answered yet can read a neighbour's phone, so nothing here may help them. */}
      <section className="mt-4 space-y-3">
        {participantCount > 0 && (
          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 ring-inset">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Answered
              </h2>
              <p className="text-sm font-semibold text-slate-700">
                {answerCount} of {participantCount}
              </p>
            </div>
            <div
              role="progressbar"
              aria-valuenow={answerCount}
              aria-valuemin={0}
              aria-valuemax={participantCount}
              aria-label="Participants who have answered"
              className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
            >
              <div
                className="h-full rounded-full bg-brand-600 transition-[width] duration-500"
                style={{ width: `${Math.min(100, (answerCount / participantCount) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {(ownOrdinal !== undefined || ownResponseTimeMs !== null) && (
          <p className="text-center text-sm text-slate-500">
            {ownOrdinal !== undefined && (
              <>
                You answered <span className="font-semibold text-slate-700">{ordinalLabel(ownOrdinal)}</span>
              </>
            )}
            {ownOrdinal !== undefined && ownResponseTimeMs !== null && ', in '}
            {ownResponseTimeMs !== null && (
              <span className="font-semibold text-slate-700">{formatDuration(ownResponseTimeMs)}</span>
            )}
          </p>
        )}

        {/* Only questions already closed and graded — the current one is worth nothing yet. */}
        {standing && (
          <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 ring-inset">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Your score so far
            </h2>
            <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
              <div>
                <dt className="text-xs text-slate-500">Points</dt>
                <dd className="text-lg font-bold text-slate-900">{standing.score}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Correct</dt>
                <dd className="text-lg font-bold text-slate-900">{standing.correctCount}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Rank</dt>
                <dd className="text-lg font-bold text-slate-900">
                  {standing.rank}
                  {participantCount > 0 && (
                    <span className="text-sm font-medium text-slate-400"> / {participantCount}</span>
                  )}
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-center text-xs text-slate-400">
              From the earlier questions — this one is not scored until it closes.
            </p>
          </div>
        )}
      </section>

      {/* Fills the rest of the screen so the wait reads as the state of the page, not as a
          footnote under the answer. */}
      <div
        role="status"
        className="flex flex-1 flex-col items-center justify-center py-8 text-center"
      >
        <span
          aria-hidden="true"
          className="size-10 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600"
        />
        <p className="mt-5 text-lg font-bold text-emerald-700">Answer submitted</p>
        <p className="mt-1 text-sm text-slate-500">
          Waiting for the others to finish — your professor closes the question when everyone is
          done.
        </p>
      </div>
    </div>
  )
}
