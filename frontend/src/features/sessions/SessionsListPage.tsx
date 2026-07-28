import { useCallback } from 'react'
import { Link } from 'react-router'
import { sessionApi } from '../../lib/api/sessions'
import type { SessionState } from '../../lib/api/types'
import { useAsync } from '../../lib/useAsync'
import { Badge, Card, EmptyState, ErrorBanner, Spinner } from '../../components/ui/Feedback'
import { Button } from '../../components/ui/Button'
import { formatDate } from '../quizzes/quizLabels'

const STATE_TONE: Record<SessionState, 'green' | 'brand' | 'slate'> = {
  ACTIVE: 'green',
  LOBBY: 'brand',
  ENDED: 'slate',
}

export function SessionsListPage() {
  const sessions = useAsync(useCallback((signal: AbortSignal) => sessionApi.list(signal), []))

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Sessions</h1>
        <p className="mt-1 text-sm text-slate-500">
          Every session you have hosted. Start a new one from a quiz.
        </p>
      </div>

      {sessions.loading && <Spinner label="Loading sessions…" />}
      {sessions.error && <ErrorBanner error={sessions.error} onRetry={sessions.reload} />}

      {sessions.data?.length === 0 && (
        <EmptyState
          title="No sessions yet"
          description="Open a quiz and press “Start live session” to host one."
          action={
            <Link to="/quizzes">
              <Button variant="primary">Go to quizzes</Button>
            </Link>
          }
        />
      )}

      {sessions.data && sessions.data.length > 0 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">Quiz</th>
                  <th className="px-5 py-3 font-semibold">State</th>
                  <th className="px-5 py-3 font-semibold">Join code</th>
                  <th className="px-5 py-3 font-semibold">Questions</th>
                  <th className="px-5 py-3 font-semibold">Created</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.data.map((session) => (
                  <tr key={session.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-medium text-slate-800">{session.quizTitle}</td>
                    <td className="px-5 py-3">
                      <Badge tone={STATE_TONE[session.state]}>{session.state}</Badge>
                    </td>
                    <td className="px-5 py-3 font-mono text-slate-600">{session.joinToken}</td>
                    <td className="px-5 py-3 text-slate-600">{session.questionCount}</td>
                    <td className="px-5 py-3 text-slate-500">{formatDate(session.createdAt)}</td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      {session.state === 'ENDED' ? (
                        <Link
                          to={`/sessions/${session.id}/results`}
                          className="font-semibold text-brand-700 hover:underline"
                        >
                          Results
                        </Link>
                      ) : (
                        <Link
                          to={`/sessions/${session.id}`}
                          className="font-semibold text-brand-700 hover:underline"
                        >
                          Open console
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  )
}
