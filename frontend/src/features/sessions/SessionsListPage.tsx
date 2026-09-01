import { useCallback, useState } from 'react'
import { Link } from 'react-router'
import { sessionApi } from '../../lib/api/sessions'
import type { SessionResponse, SessionState } from '../../lib/api/types'
import { useAction, useAsync } from '../../lib/useAsync'
import { Badge, Card, EmptyState, ErrorBanner, Spinner } from '../../components/ui/Feedback'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/Modal'
import { formatDate } from '../quizzes/quizLabels'

const STATE_TONE: Record<SessionState, 'green' | 'brand' | 'slate'> = {
  ACTIVE: 'green',
  LOBBY: 'brand',
  ENDED: 'slate',
}

export function SessionsListPage() {
  const sessions = useAsync(useCallback((signal: AbortSignal) => sessionApi.list(signal), []))
  const [pendingDelete, setPendingDelete] = useState<SessionResponse | undefined>()

  const remove = useAction(sessionApi.remove)

  const confirmDelete = async () => {
    if (!pendingDelete) {
      return
    }
    const result = await remove.run(pendingDelete.id)
    if (result.ok) {
      setPendingDelete(undefined)
      // Drop the row locally and do NOT refetch. The delete succeeded, so the server's list
      // is this list minus that row; refetching cannot tell us anything new.
      //
      // Refetching here also made deleted sessions flash back onto the screen. The exact
      // cause was never pinned down — useAsync keeping the previous data while revalidating
      // is the likely suspect, but filtering that cached list first did not fix it. Not
      // refetching removes the window entirely. If the flash ever appears elsewhere, the
      // reload-after-mutation paths (such as copying a quiz) are where to look.
      sessions.setData((sessions.data ?? []).filter((row) => row.id !== pendingDelete.id))
    }
  }

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
                      {/* A running session has to be ended first, so offering Delete on it
                          would only ever produce a 409. */}
                      {session.state !== 'ACTIVE' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setPendingDelete(session)}
                          className="ml-3 text-red-600 hover:bg-red-50"
                        >
                          Delete
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete session"
        pending={remove.pending}
        confirmLabel="Delete session"
        message={
          <>
            <p>
              Delete the session of <strong>{pendingDelete?.quizTitle}</strong> from{' '}
              {pendingDelete && formatDate(pendingDelete.createdAt)}?
            </p>
            {pendingDelete?.state === 'ENDED' ? (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-amber-900 ring-1 ring-amber-200 ring-inset">
                Its participants, answers and leaderboard go with it — export the CSV from the
                results page first if you still need it.
              </p>
            ) : (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-amber-900 ring-1 ring-amber-200 ring-inset">
                Anyone already waiting in the lobby will be dropped, and the join code{' '}
                <strong>{pendingDelete?.joinToken}</strong> will stop working.
              </p>
            )}
            <p className="mt-2 text-slate-500">The quiz itself is not affected.</p>
            {remove.error && <p className="mt-3 font-medium text-red-600">{remove.error.message}</p>}
          </>
        }
        onConfirm={confirmDelete}
        onCancel={() => {
          setPendingDelete(undefined)
          remove.clearError()
        }}
      />
    </>
  )
}
