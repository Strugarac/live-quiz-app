import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router'
import { sessionApi } from '../../lib/api/sessions'
import type { QuestionBreakdown } from '../../lib/api/types'
import { useAction, useAsync } from '../../lib/useAsync'
import { Button } from '../../components/ui/Button'
import { Badge, Card, CardHeader, ErrorBanner, Spinner } from '../../components/ui/Feedback'
import { ConfirmDialog } from '../../components/ui/Modal'
import { QUESTION_TYPE_LABELS } from '../quizzes/quizLabels'
import { LeaderboardPanel } from './LeaderboardPanel'

export function SessionResultsPage() {
  const { sessionId = '' } = useParams()
  const results = useAsync(
    useCallback((signal: AbortSignal) => sessionApi.results(sessionId, signal), [sessionId]),
  )
  const [confirmClear, setConfirmClear] = useState(false)

  const exportCsv = useAction(() => sessionApi.exportResultsCsv(sessionId))
  const clear = useAction(() => sessionApi.discardResults(sessionId))

  if (results.loading) {
    return <Spinner label="Loading results…" />
  }
  if (results.error) {
    return <ErrorBanner error={results.error} onRetry={results.reload} />
  }
  if (!results.data) {
    return null
  }

  const data = results.data
  const cleared = data.participantCount === 0

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/sessions" className="text-sm font-medium text-brand-700 hover:underline">
            ← All sessions
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{data.quizTitle}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {data.participantCount} participants · {data.questionCount} questions
            {data.endedAt && ` · ended ${new Date(data.endedAt).toLocaleString()}`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button pending={exportCsv.pending} onClick={() => void exportCsv.run()}>
            Export CSV
          </Button>
          {data.state === 'ENDED' && !cleared && (
            <Button variant="danger" onClick={() => setConfirmClear(true)}>
              Clear results
            </Button>
          )}
        </div>
      </div>

      {!data.saveParticipants && (
        <div className="mb-4 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700">
          This quiz was set to <strong>not keep participant identities</strong>, so names were wiped
          when the session ended. Participants appear as anonymous labels below.
        </div>
      )}

      {!data.saveStatistics && !cleared && (
        <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200 ring-inset">
          This quiz was set to <strong>not keep statistics</strong>. Nothing was deleted
          automatically so you can still export it — use “Clear results” once you are done.
        </div>
      )}

      {exportCsv.error && (
        <div className="mb-4">
          <ErrorBanner error={exportCsv.error} />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <LeaderboardPanel
          rows={data.leaderboard}
          title="Final standings"
          emptyHint="No scores were recorded for this session."
        />

        <div className="space-y-4">
          {data.questions.map((question) => (
            <QuestionBreakdownCard key={question.questionId} question={question} />
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="Clear results"
        confirmLabel="Clear results"
        pending={clear.pending}
        message={
          <>
            <p>
              Delete every answer and participant for this session? The session itself stays in your
              list, but its results and statistics are gone.
            </p>
            <p className="mt-2 text-slate-500">Export the CSV first if you still need the data.</p>
            {clear.error && <p className="mt-3 font-medium text-red-600">{clear.error.message}</p>}
          </>
        }
        onConfirm={async () => {
          const result = await clear.run()
          if (result.ok) {
            setConfirmClear(false)
            results.reload()
          }
        }}
        onCancel={() => {
          setConfirmClear(false)
          clear.clearError()
        }}
      />
    </>
  )
}

function QuestionBreakdownCard({ question }: { question: QuestionBreakdown }) {
  const maxChosen = Math.max(1, ...question.options.map((option) => option.chosenCount))

  return (
    <Card className="overflow-hidden">
      <CardHeader
        title={`${question.questionIndex + 1}. ${question.text ?? '(image only)'}`}
        description={`${QUESTION_TYPE_LABELS[question.type]} · ${question.answerCount} answers`}
        action={
          question.type === 'FREE_TEXT' ? (
            <Badge tone="amber">Not graded</Badge>
          ) : (
            <div className="flex gap-1.5">
              <Badge tone="green">{question.correctCount} correct</Badge>
              <Badge tone="slate">{question.incorrectCount} wrong</Badge>
            </div>
          )
        }
      />

      <div className="px-5 py-4">
        {question.type === 'FREE_TEXT' ? (
          question.freeTextResponses.length === 0 ? (
            <p className="text-sm text-slate-500">No written answers were submitted.</p>
          ) : (
            <ul className="space-y-2">
              {question.freeTextResponses.map((entry, index) => (
                <li
                  key={`${entry.participantLabel}-${index}`}
                  className="rounded-lg bg-slate-50 px-3 py-2 text-sm"
                >
                  <span className="font-semibold text-slate-700">{entry.participantLabel}:</span>{' '}
                  <span className="text-slate-600">{entry.text}</span>
                </li>
              ))}
            </ul>
          )
        ) : (
          <ul className="space-y-2">
            {question.options.map((option) => (
              <li
                key={option.optionId}
                className={`relative overflow-hidden rounded-lg px-3 py-2 ring-1 ring-inset ${
                  option.correct ? 'bg-emerald-50 ring-emerald-200' : 'bg-white ring-slate-200'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute inset-y-0 left-0 ${
                    option.correct ? 'bg-emerald-100' : 'bg-slate-100'
                  }`}
                  style={{ width: `${(option.chosenCount / maxChosen) * 100}%` }}
                />
                <div className="relative flex items-center justify-between gap-4 text-sm">
                  <span className={option.correct ? 'font-semibold text-emerald-900' : 'text-slate-700'}>
                    {option.correct && <span aria-label="Correct answer">✓ </span>}
                    {option.text ?? '(image)'}
                  </span>
                  <span className="shrink-0 text-xs font-semibold text-slate-500">
                    {option.chosenCount}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  )
}
