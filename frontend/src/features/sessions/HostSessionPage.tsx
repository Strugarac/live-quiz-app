import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { sessionApi } from '../../lib/api/sessions'
import type { SessionResponse, UUID } from '../../lib/api/types'
import { useAction } from '../../lib/useAsync'
import { Button } from '../../components/ui/Button'
import { Badge, Card, ErrorBanner, Spinner } from '../../components/ui/Feedback'
import { ConfirmDialog, Modal } from '../../components/ui/Modal'
import { useStalledConnection } from '../../lib/ws/useStalledConnection'
import { QuestionForm } from '../quizzes/QuestionForm'
import { ConnectionStatus } from './ConnectionStatus'
import { LeaderboardPanel } from './LeaderboardPanel'
import { LiveQuestionPanel } from './LiveQuestionPanel'
import { LobbyPanel } from './LobbyPanel'
import { QuestionPickerPanel } from './QuestionPickerPanel'
import { useHostSession } from './useHostSession'

export function HostSessionPage() {
  const { sessionId = '' } = useParams()
  const host = useHostSession(sessionId)

  if (host.loading) {
    return <Spinner label="Loading session…" />
  }
  if (host.error) {
    return <ErrorBanner error={host.error} onRetry={host.reload} />
  }
  if (!host.session || !host.quiz) {
    return null
  }

  return <HostConsole host={host} />
}

type Host = ReturnType<typeof useHostSession>

function HostConsole({ host }: { host: Host }) {
  const navigate = useNavigate()
  const session = host.session as SessionResponse
  const [confirmEnd, setConfirmEnd] = useState(false)
  const [addingQuestion, setAddingQuestion] = useState(false)
  const [openingId, setOpeningId] = useState<UUID | undefined>(undefined)
  const stalled = useStalledConnection(host.status)

  const start = useAction(() => sessionApi.start(session.id))
  const closeQuestion = useAction(() => sessionApi.closeQuestion(session.id))
  const next = useAction(() => sessionApi.next(session.id))
  const end = useAction(() => sessionApi.end(session.id))
  const openQuestion = useAction((questionId: UUID) =>
    sessionApi.openQuestion(session.id, questionId),
  )

  const run = async (action: { run: () => Promise<{ ok: boolean; value?: SessionResponse }> }) => {
    const result = await action.run()
    if (result.ok && result.value) {
      host.applySession(result.value)
    }
    return result.ok
  }

  const askQuestion = async (questionId: UUID) => {
    setOpeningId(questionId)
    const result = await openQuestion.run(questionId)
    if (result.ok) {
      host.applySession(result.value)
    }
    setOpeningId(undefined)
  }

  const actionError =
    start.error ?? closeQuestion.error ?? next.error ?? openQuestion.error ?? end.error
  // A flexible quiz has no "next" — the host chooses each question, so the picker replaces
  // the button. Whether anything is left to ask is a fact about what has been asked, not
  // about position, which is what makes a question added mid-session count.
  const flexible = session.quizType === 'FLEXIBLE'
  const hasRemaining = host.remainingQuestions.length > 0

  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to="/sessions" className="text-sm font-medium text-brand-700 hover:underline">
            ← All sessions
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{session.quizTitle}</h1>
          <div className="mt-2 flex items-center gap-3">
            <Badge
              tone={
                session.state === 'ACTIVE' ? 'green' : session.state === 'LOBBY' ? 'brand' : 'slate'
              }
            >
              {session.state}
            </Badge>
            {/* The console behaves differently for a flexible quiz, so say which this is. */}
            {flexible && <Badge tone="amber">Flexible</Badge>}
            <ConnectionStatus status={host.status} />
          </div>
        </div>

        {/* Ending is offered in LOBBY too: a session nobody joined still has to be
            closable, otherwise its quiz can never be deleted. */}
        {session.state !== 'ENDED' && (
          <div className="flex flex-wrap gap-2">
            {session.state === 'ACTIVE' &&
              (session.questionOpen ? (
                <Button
                  variant="primary"
                  pending={closeQuestion.pending}
                  onClick={() => void run(closeQuestion)}
                >
                  Close question
                </Button>
              ) : (
                !flexible &&
                hasRemaining && (
                  <Button variant="primary" pending={next.pending} onClick={() => void run(next)}>
                    Next question
                  </Button>
                )
              ))}
            <Button variant="danger" onClick={() => setConfirmEnd(true)}>
              End session
            </Button>
          </div>
        )}

        {session.state === 'ENDED' && (
          <Button variant="primary" onClick={() => navigate(`/sessions/${session.id}/results`)}>
            View results
          </Button>
        )}
      </div>

      {stalled && (
        <div
          role="alert"
          className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200 ring-inset"
        >
          <p className="font-semibold">The live connection is not coming up.</p>
          <p className="mt-1">
            Participants can still register, but nobody will receive questions. A STOMP connection
            that hangs without an error is usually the message broker: check that the{' '}
            <code className="font-mono text-xs">livequiz-rabbitmq</code> container is running, or
            restart the backend with <code className="font-mono text-xs">WS_BROKER_MODE=simple</code>{' '}
            to use Spring's in-memory broker instead.
          </p>
        </div>
      )}

      {host.status === 'reconnecting' && !stalled && (
        <div
          role="status"
          className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200 ring-inset"
        >
          Lost the live connection — retrying. Answers already submitted are safe, and this screen
          resyncs automatically once it reconnects.
        </div>
      )}

      {host.liveError && (
        <div
          role="alert"
          className="mb-4 flex items-start justify-between gap-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 ring-1 ring-red-200 ring-inset"
        >
          <span>{host.liveError}</span>
          <button
            type="button"
            onClick={host.dismissLiveError}
            className="font-semibold underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {actionError && (
        <div className="mb-4">
          <ErrorBanner error={actionError} />
        </div>
      )}

      {session.state === 'LOBBY' && (
        <LobbyPanel
          session={session}
          participants={host.participants}
          participantCount={host.participantCount}
          starting={start.pending}
          onStart={() => void run(start)}
        />
      )}

      {session.state === 'ACTIVE' && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <div className="space-y-6">
            {host.currentQuestion ? (
              <LiveQuestionPanel
                session={session}
                question={host.currentQuestion}
                position={host.askedPosition}
                answerCount={host.answerCount}
                participantCount={host.participantCount}
                reveal={host.reveal}
                breakdown={host.breakdown}
              />
            ) : (
              // A flexible session sits here between start and the first pick, and the
              // picker below already explains what to do, so the placeholder is only for
              // a static session that is briefly out of sync.
              !flexible && (
                <Card className="px-5 py-10 text-center text-sm text-slate-500">
                  Waiting for the current question…
                </Card>
              )
            )}

            {flexible && !session.questionOpen && (
              <QuestionPickerPanel
                remaining={host.remainingQuestions}
                openingId={openingId}
                pending={openQuestion.pending}
                onOpen={(questionId) => void askQuestion(questionId)}
                onAdd={() => setAddingQuestion(true)}
              />
            )}
          </div>
          <LeaderboardPanel rows={host.leaderboard} />
        </div>
      )}

      {session.state === 'ENDED' && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Card className="px-5 py-10 text-center">
            <p className="text-lg font-semibold text-slate-900">This session has ended.</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
              Final standings, per-question statistics and the CSV export are on the results page.
            </p>
            <Link
              to={`/sessions/${session.id}/results`}
              className="mt-5 inline-block font-semibold text-brand-700 hover:underline"
            >
              Open results →
            </Link>
          </Card>
          <LeaderboardPanel rows={host.leaderboard} title="Final standings" />
        </div>
      )}

      {/* Authoring from the live console: a flexible quiz can grow while it runs, and the
          professor should not have to leave the session screen to do it. */}
      <Modal
        open={addingQuestion}
        title="Add a question"
        onClose={() => setAddingQuestion(false)}
      >
        <QuestionForm
          quizId={session.quizId}
          onSaved={(saved) => {
            host.questionAdded(saved)
            setAddingQuestion(false)
          }}
          onCancel={() => setAddingQuestion(false)}
        />
      </Modal>

      <ConfirmDialog
        open={confirmEnd}
        title="End session"
        confirmLabel="End session"
        pending={end.pending}
        message={
          session.state === 'LOBBY' ? (
            <>
              <p>
                Close <strong>{session.quizTitle}</strong> without running it? The join code stops
                working immediately.
              </p>
              <p className="mt-2 text-slate-500">
                Nothing has been answered yet, so there is nothing to lose.
              </p>
            </>
          ) : (
            <>
              <p>
                End <strong>{session.quizTitle}</strong> for everyone? Participants stop being able
                to answer immediately.
              </p>
              <p className="mt-2 text-slate-500">
                An open question is graded first, so no submitted answer is lost.
              </p>
            </>
          )
        }
        onConfirm={async () => {
          if (await run(end)) {
            setConfirmEnd(false)
          }
        }}
        onCancel={() => setConfirmEnd(false)}
      />
    </>
  )
}
