import type { QuestionBreakdown, QuestionResponse, SessionResponse } from '../../lib/api/types'
import { Badge, Card, CardHeader } from '../../components/ui/Feedback'
import { QUESTION_TYPE_LABELS } from '../quizzes/quizLabels'
import type { QuestionClosedPayload } from '../../lib/ws/liveTypes'

interface LiveQuestionPanelProps {
  session: SessionResponse
  question: QuestionResponse
  /**
   * Position in the session, 1-based — not the position in the quiz. A flexible session
   * may open question 5 first, and participants count what they have been shown.
   */
  position: number
  answerCount: number
  participantCount: number
  reveal: QuestionClosedPayload | undefined
  breakdown: QuestionBreakdown | undefined
}

/**
 * The question as the host sees it: correct answers are always visible here (the host
 * loaded the quiz definition), and once the question is closed each option also shows
 * how many participants picked it.
 */
export function LiveQuestionPanel({
  session,
  question,
  position,
  answerCount,
  participantCount,
  reveal,
  breakdown,
}: LiveQuestionPanelProps) {
  const closed = !session.questionOpen
  const chosenCounts = new Map(
    breakdown?.options.map((option) => [option.optionId, option.chosenCount]) ?? [],
  )
  const maxChosen = Math.max(1, ...[...chosenCounts.values()])

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title={`Question ${position} of ${session.questionCount}`}
        description={QUESTION_TYPE_LABELS[question.type]}
        action={
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900">
              {answerCount}
              <span className="text-base font-medium text-slate-400"> / {participantCount}</span>
            </p>
            <p className="text-xs text-slate-500">answered</p>
          </div>
        }
      />

      <div className="px-5 py-5">
        <div className="flex items-center gap-2">
          {session.questionOpen ? (
            <Badge tone="green">Accepting answers</Badge>
          ) : (
            <Badge tone="amber">Closed — answers revealed</Badge>
          )}
        </div>

        <p className="mt-3 text-xl font-semibold text-slate-900">
          {question.text ?? '(image only)'}
        </p>

        {question.imageUrl && (
          <img
            src={question.imageUrl}
            alt=""
            className="mt-4 max-h-72 rounded-lg bg-slate-50 object-contain ring-1 ring-slate-200 ring-inset"
          />
        )}

        {question.type === 'FREE_TEXT' ? (
          <div className="mt-5 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200 ring-inset">
            Written answers are collected but not graded — they score 0 and appear verbatim in the
            results.
            {closed && breakdown && breakdown.freeTextResponses.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {breakdown.freeTextResponses.map((entry, index) => (
                  <li key={`${entry.participantLabel}-${index}`} className="text-amber-900">
                    <span className="font-semibold">{entry.participantLabel}:</span> {entry.text}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <ul className="mt-5 space-y-2">
            {question.options.map((option) => {
              // Correct options are highlighted only after the question closes, so a
              // projector showing this screen does not give the answer away. A survey has
              // no correct option at all, whatever flags the quiz definition still carries.
              const showCorrect = closed && option.correct && !session.surveyMode
              const chosen = chosenCounts.get(option.id)

              return (
                <li
                  key={option.id}
                  className={`relative overflow-hidden rounded-lg px-4 py-3 ring-1 ring-inset ${
                    showCorrect
                      ? 'bg-emerald-50 ring-emerald-300'
                      : 'bg-white ring-slate-200'
                  }`}
                >
                  {closed && chosen !== undefined && (
                    <span
                      aria-hidden="true"
                      className={`absolute inset-y-0 left-0 ${
                        showCorrect ? 'bg-emerald-100' : 'bg-slate-100'
                      }`}
                      style={{ width: `${(chosen / maxChosen) * 100}%` }}
                    />
                  )}

                  <div className="relative flex items-center justify-between gap-4">
                    <span
                      className={`text-sm ${showCorrect ? 'font-semibold text-emerald-900' : 'text-slate-700'}`}
                    >
                      {showCorrect && <span aria-label="Correct answer">✓ </span>}
                      {option.text ?? '(image)'}
                    </span>
                    {closed && chosen !== undefined && (
                      <span className="shrink-0 text-xs font-semibold text-slate-500">
                        {chosen}
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {reveal && !reveal.hasNextQuestion && (
          <p className="mt-5 text-sm font-medium text-slate-600">
            That was the last question — end the session to publish the final results.
          </p>
        )}
      </div>
    </Card>
  )
}
