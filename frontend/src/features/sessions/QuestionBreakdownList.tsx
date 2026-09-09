import { useId, useState } from 'react'
import type { ParticipantAnswerEntry, QuestionBreakdown, UUID } from '../../lib/api/types'
import { Badge, Card, CardHeader, ChevronIcon } from '../../components/ui/Feedback'
import { StackedShareBar, StatTile } from '../../components/ui/charts/StatTile'
import { chartColors } from '../../components/ui/charts/chartTheme'
import { QUESTION_TYPE_LABELS } from '../quizzes/quizLabels'

interface QuestionBreakdownListProps {
  questions: QuestionBreakdown[]
  surveyMode: boolean
  /** False when the session kept no identities, so every label here is "Participant N". */
  saveParticipants: boolean
}

/**
 * The questions, as a list you can read at a glance — number and title only. Opening one
 * is what costs screen space, and only for the question you actually asked about.
 *
 * One question is open at a time on purpose: with ten questions expanded the page is the
 * wall of text this list replaced.
 */
export function QuestionBreakdownList({
  questions,
  surveyMode,
  saveParticipants,
}: QuestionBreakdownListProps) {
  const [openId, setOpenId] = useState<UUID | null>(null)

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Questions"
        description="Pick a question to see how the room answered it."
      />
      <ul className="divide-y divide-slate-100">
        {/* Numbered by position in these results rather than by the question's place in the
            quiz: a flexible session arrives in the order the host asked, and "3" should mean
            the third question asked. The two coincide for a static quiz. */}
        {questions.map((question, index) => (
          <QuestionRow
            key={question.questionId}
            question={question}
            number={index + 1}
            surveyMode={surveyMode}
            saveParticipants={saveParticipants}
            open={openId === question.questionId}
            onToggle={() =>
              setOpenId((current) => (current === question.questionId ? null : question.questionId))
            }
          />
        ))}
      </ul>
    </Card>
  )
}

function QuestionRow({
  question,
  number,
  surveyMode,
  saveParticipants,
  open,
  onToggle,
}: {
  question: QuestionBreakdown
  number: number
  surveyMode: boolean
  saveParticipants: boolean
  open: boolean
  onToggle: () => void
}) {
  const panelId = useId()
  const graded = !surveyMode && question.type !== 'FREE_TEXT'

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-slate-50"
      >
        <ChevronIcon open={open} />
        <span className="w-6 shrink-0 text-sm font-bold text-slate-400 tabular-nums">
          {number}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-slate-800">
            {question.text ?? '(image only)'}
          </span>
          <span className="mt-0.5 block text-xs text-slate-500">
            {QUESTION_TYPE_LABELS[question.type]} · {question.answerCount} answers
          </span>
        </span>
        <span className="hidden shrink-0 gap-1.5 sm:flex">
          {graded ? (
            <>
              <Badge tone="green">{question.correctCount} correct</Badge>
              <Badge tone="brand">{question.incorrectCount} wrong</Badge>
            </>
          ) : (
            <Badge tone="slate">{surveyMode ? 'No right answer' : 'Not graded'}</Badge>
          )}
        </span>
      </button>

      {open && (
        <div id={panelId} className="border-t border-slate-100 bg-slate-50/60 px-5 py-4">
          <QuestionDetail
            question={question}
            surveyMode={surveyMode}
            saveParticipants={saveParticipants}
          />
        </div>
      )}
    </li>
  )
}

function QuestionDetail({
  question,
  surveyMode,
  saveParticipants,
}: {
  question: QuestionBreakdown
  surveyMode: boolean
  saveParticipants: boolean
}) {
  const graded = !surveyMode && question.type !== 'FREE_TEXT'
  const answered = question.correctCount + question.incorrectCount

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Answers" value={question.answerCount} />
        {graded ? (
          <StatTile
            label="Correct"
            value={`${answered === 0 ? 0 : Math.round((question.correctCount / answered) * 100)}%`}
            hint={`${question.correctCount} of ${answered}`}
          />
        ) : (
          <StatTile label="Type" value={QUESTION_TYPE_LABELS[question.type]} />
        )}
        <StatTile label="Average response" value={averageResponse(question.participantAnswers)} />
      </div>

      {graded && answered > 0 && (
        <StackedShareBar
          shares={[
            { label: 'correct', value: question.correctCount, color: chartColors.correct },
            { label: 'wrong', value: question.incorrectCount, color: chartColors.wrong },
          ]}
        />
      )}

      {question.type === 'FREE_TEXT' ? (
        <FreeTextResponses question={question} />
      ) : (
        <OptionDistribution question={question} surveyMode={surveyMode} />
      )}

      <ParticipantAnswers
        question={question}
        surveyMode={surveyMode}
        saveParticipants={saveParticipants}
      />
    </div>
  )
}

/**
 * Answer distribution, one row per option. Deliberately not a plotted bar chart: option
 * text runs long, and a row that carries the full wording beats an axis that truncates it.
 */
function OptionDistribution({
  question,
  surveyMode,
}: {
  question: QuestionBreakdown
  surveyMode: boolean
}) {
  const maxChosen = Math.max(1, ...question.options.map((option) => option.chosenCount))

  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold text-slate-500">Answer distribution</h3>
      <ul className="space-y-2">
        {question.options.map((option) => {
          const showCorrect = option.correct && !surveyMode
          return (
            <li
              key={option.optionId}
              className={`relative overflow-hidden rounded-lg px-3 py-2 ring-1 ring-inset ${
                showCorrect ? 'bg-emerald-50 ring-emerald-200' : 'bg-white ring-slate-200'
              }`}
            >
              <span
                aria-hidden="true"
                className={`absolute inset-y-0 left-0 ${
                  showCorrect ? 'bg-emerald-100' : 'bg-slate-100'
                }`}
                style={{ width: `${(option.chosenCount / maxChosen) * 100}%` }}
              />
              <div className="relative flex items-center justify-between gap-4 text-sm">
                <span className={showCorrect ? 'font-semibold text-emerald-900' : 'text-slate-700'}>
                  {showCorrect && <span aria-label="Correct answer">✓ </span>}
                  {option.text ?? '(image)'}
                </span>
                <span className="shrink-0 text-xs font-semibold text-slate-500">
                  {option.chosenCount}
                </span>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function FreeTextResponses({ question }: { question: QuestionBreakdown }) {
  if (question.freeTextResponses.length === 0) {
    return <p className="text-sm text-slate-500">No written answers were submitted.</p>
  }

  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold text-slate-500">Written answers</h3>
      <ul className="space-y-2">
        {question.freeTextResponses.map((entry, index) => (
          <li
            key={`${entry.participantLabel}-${index}`}
            className="rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200 ring-inset"
          >
            <span className="font-semibold text-slate-700">{entry.participantLabel}:</span>{' '}
            <span className="text-slate-600">{entry.text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Who answered what — the per-person view behind every count above it. */
function ParticipantAnswers({
  question,
  surveyMode,
  saveParticipants,
}: {
  question: QuestionBreakdown
  surveyMode: boolean
  saveParticipants: boolean
}) {
  if (question.participantAnswers.length === 0) {
    return null
  }

  const optionText = new Map(
    question.options.map((option) => [option.optionId, option.text ?? '(image)']),
  )
  const graded = !surveyMode && question.type !== 'FREE_TEXT'

  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold text-slate-500">Who answered what</h3>
      {!saveParticipants && (
        <p className="mb-2 text-xs text-slate-500">
          This session kept no identities, so answers are listed under anonymous labels.
        </p>
      )}
      <div className="overflow-x-auto rounded-lg bg-white ring-1 ring-slate-200 ring-inset">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
              <th scope="col" className="px-3 py-2 font-medium">
                Participant
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Answer
              </th>
              {graded && (
                <th scope="col" className="px-3 py-2 font-medium">
                  Result
                </th>
              )}
              {!surveyMode && (
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Points
                </th>
              )}
              <th scope="col" className="px-3 py-2 text-right font-medium">
                Time
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {question.participantAnswers.map((entry) => (
              <tr key={entry.participantId}>
                <td className="px-3 py-2 text-slate-700">{entry.participantLabel}</td>
                <td className="px-3 py-2 text-slate-600">{answerText(entry, optionText)}</td>
                {graded && (
                  <td className="px-3 py-2">
                    {entry.correct === null ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <Badge tone={entry.correct ? 'green' : 'brand'}>
                        {entry.correct ? 'Correct' : 'Wrong'}
                      </Badge>
                    )}
                  </td>
                )}
                {!surveyMode && (
                  <td className="px-3 py-2 text-right font-medium text-slate-700 tabular-nums">
                    {entry.points}
                  </td>
                )}
                <td className="px-3 py-2 text-right text-slate-500 tabular-nums">
                  {formatSeconds(entry.responseTimeMs)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function answerText(entry: ParticipantAnswerEntry, optionText: Map<UUID, string>) {
  if (entry.freeText) {
    return entry.freeText
  }
  if (entry.selectedOptionIds.length === 0) {
    return '—'
  }
  return entry.selectedOptionIds.map((id) => optionText.get(id) ?? '?').join(', ')
}

function formatSeconds(ms: number | null) {
  return ms === null ? '—' : `${(ms / 1000).toFixed(1)} s`
}

function averageResponse(answers: ParticipantAnswerEntry[]) {
  const times = answers
    .map((entry) => entry.responseTimeMs)
    .filter((ms): ms is number => ms !== null)
  if (times.length === 0) {
    return '—'
  }
  return formatSeconds(times.reduce((sum, ms) => sum + ms, 0) / times.length)
}
