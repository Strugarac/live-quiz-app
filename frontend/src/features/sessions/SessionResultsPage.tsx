import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router'
import { sessionApi } from '../../lib/api/sessions'
import { useAction, useAsync } from '../../lib/useAsync'
import { Button } from '../../components/ui/Button'
import { ErrorBanner, Spinner } from '../../components/ui/Feedback'
import { ConfirmDialog } from '../../components/ui/Modal'
import { LeaderboardPanel } from './LeaderboardPanel'
import { QuestionBreakdownList } from './QuestionBreakdownList'
import { ResultsOverview } from './ResultsCharts'

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
            {data.participantCount} participants ·{' '}
            {/* A flexible session asks a subset, so say so rather than let the count look
                like the quiz shrank. */}
            {data.quizQuestionCount > data.questionCount
              ? `${data.questionCount} of ${data.quizQuestionCount} questions asked`
              : `${data.questionCount} questions`}
            {data.endedAt && ` · ended ${new Date(data.endedAt).toLocaleString()}`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Nothing left to put in a file once the answers are gone. */}
          {!cleared && (
            <Button pending={exportCsv.pending} onClick={() => void exportCsv.run()}>
              Export CSV
            </Button>
          )}
          {data.state === 'ENDED' && !cleared && (
            <Button variant="danger" onClick={() => setConfirmClear(true)}>
              Clear results
            </Button>
          )}
        </div>
      </div>

      {!data.saveParticipants && (
        <div className="mb-4 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700">
          This quiz was set to <strong>not keep participant identities</strong>, so nothing
          personal was collected — participants joined as guests and appear as anonymous labels
          below.
        </div>
      )}

      {!data.saveStatistics && (
        <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200 ring-inset">
          This quiz was set to <strong>not keep results and statistics</strong>, so its answers
          and participants were deleted when the session ended. Only the questions are left.
        </div>
      )}

      {exportCsv.error && (
        <div className="mb-4">
          <ErrorBanner error={exportCsv.error} />
        </div>
      )}

      {data.surveyMode && (
        <div className="mb-4 rounded-lg bg-slate-100 px-4 py-3 text-sm text-slate-700">
          This quiz ran in <strong>survey mode</strong>, so nothing was graded and no scores were
          kept. What follows is how the answers were distributed.
        </div>
      )}

      {/* Cleared results have nothing left to plot — the questions survive, the answers
          behind every one of these numbers do not. */}
      {!cleared && <ResultsOverview data={data} />}

      {/* Both panels stay closed until asked for: the charts above already answer the
          questions most people open this page with. A survey has no standings at all. */}
      <div className="space-y-4">
        {!data.surveyMode && (
          <LeaderboardPanel
            rows={data.leaderboard}
            title="Final standings"
            emptyHint="No scores were recorded for this session."
            collapsible
          />
        )}

        <QuestionBreakdownList
          questions={data.questions}
          surveyMode={data.surveyMode}
          saveParticipants={data.saveParticipants}
        />
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
