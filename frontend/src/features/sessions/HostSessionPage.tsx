import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { sessionApi } from '../../lib/api/sessions'
import type {
  QuizType,
  SessionResponse,
  SessionState as SessionStateValue,
  UUID,
} from '../../lib/api/types'
import { useAction } from '../../lib/useAsync'
import { Button } from '../../components/ui/Button'
import { Card, ErrorBanner, Spinner } from '../../components/ui/Feedback'
import { ConfirmDialog, Modal } from '../../components/ui/Modal'
import { useStalledConnection } from '../../lib/ws/useStalledConnection'
import { QuestionForm } from '../quizzes/QuestionForm'
import { QUIZ_TYPE_LABELS } from '../quizzes/quizLabels'
import { LeaderboardPanel } from './LeaderboardPanel'
import { LiveQuestionPanel } from './LiveQuestionPanel'
import { LobbyPanel } from './LobbyPanel'
import { QuestionPickerPanel } from './QuestionPickerPanel'
import { hasResults } from './sessionResults'
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

// The session state drives every control on this screen, so it gets a filled pill rather
// than the quiet Badge used elsewhere.
const STATE_LOOK: Record<
  SessionStateValue,
  { label: string; hint: string; pill: string; dot: string }
> = {
  LOBBY: {
    label: 'In lobby',
    hint: 'Waiting for participants to join with the code. Nothing is asked until you press Start.',
    pill: 'bg-brand-600 text-white',
    dot: 'bg-white/80',
  },
  ACTIVE: {
    label: 'Running',
    hint: 'The quiz is under way — participants answer the question you open, and the leaderboard updates as they do.',
    pill: 'bg-emerald-600 text-white',
    dot: 'bg-white animate-pulse',
  },
  ENDED: {
    label: 'Ended',
    hint: 'The session is closed. The join code no longer works and no further answers are accepted — results stay available.',
    pill: 'bg-slate-600 text-white',
    dot: 'bg-white/70',
  },
}

// Hover *and* focus open the hint, and the pill is tabbable, so it is reachable without a
// mouse. The tooltip itself is aria-hidden — its text rides on the pill via aria-label,
// which is what a screen reader announces anyway.
function HintPill({
  hint,
  ariaLabel,
  className,
  children,
}: {
  hint: string
  ariaLabel: string
  className: string
  children: ReactNode
}) {
  return (
    <span className="group relative inline-flex">
      <span
        tabIndex={0}
        aria-label={ariaLabel}
        className={`inline-flex cursor-help items-center gap-2 rounded-full text-sm font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 ${className}`}
      >
        {children}
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute top-full left-0 z-20 mt-2 w-64 rounded-lg bg-slate-900 px-3 py-2 text-xs font-normal text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {hint}
      </span>
    </span>
  )
}

function SessionState({ state }: { state: SessionStateValue }) {
  const look = STATE_LOOK[state]
  return (
    <HintPill
      hint={look.hint}
      ariaLabel={`Session status: ${look.label}. ${look.hint}`}
      className={`px-3 py-1 tracking-wide uppercase ${look.pill}`}
    >
      <span className={`size-2 rounded-full ${look.dot}`} aria-hidden="true" />
      Session: {look.label}
    </HintPill>
  )
}

// The type is what makes the two consoles differ, so the pill says what the professor does
// rather than only naming the type: an icon, the name, and the behaviour in three words.
const QUIZ_TYPE_LOOK: Record<QuizType, { tagline: string; hint: string; pill: string; icon: ReactNode }> = {
  STATIC: {
    tagline: 'fixed order',
    hint: 'Static quiz: questions are asked in the order they were authored. Use “Next question” to move through them.',
    pill: 'bg-slate-100 text-slate-700 ring-1 ring-slate-300 ring-inset',
    icon: (
      // A stacked list — the questions run top to bottom as written.
      <svg viewBox="0 0 16 16" fill="currentColor" className="size-3.5" aria-hidden="true">
        <path d="M2 3.5h2v2H2v-2Zm4 .25h8v1.5H6v-1.5ZM2 7h2v2H2V7Zm4 .25h8v1.5H6v-1.5ZM2 10.5h2v2H2v-2Zm4 .25h8v1.5H6v-1.5Z" />
      </svg>
    ),
  },
  FLEXIBLE: {
    tagline: 'you pick each question',
    hint: 'Flexible quiz: you choose which question to ask next, in any order, and can add a new question while the session is running.',
    pill: 'bg-amber-100 text-amber-800 ring-1 ring-amber-300 ring-inset',
    icon: (
      // Branching arrows — the order is chosen, not fixed.
      <svg viewBox="0 0 16 16" fill="currentColor" className="size-3.5" aria-hidden="true">
        <path d="M1 3.25h3.2c.5 0 .96.24 1.25.65l4.1 5.85h2.2V7.5l3.2 2.5-3.2 2.5v-2.25h-2.6c-.5 0-.96-.24-1.25-.65L3.8 3.75H1v-.5Zm10.75 0V1l3.2 2.5-3.2 2.5V4.75h-2.2L8.3 6.35 7.35 5l1.5-2.15c.29-.41.75-.65 1.25-.65h1.65v1.05Z" />
      </svg>
    ),
  },
}

function QuizTypeBadge({ type }: { type: QuizType }) {
  const look = QUIZ_TYPE_LOOK[type]
  const label = QUIZ_TYPE_LABELS[type]
  return (
    <HintPill
      hint={look.hint}
      ariaLabel={`Quiz type: ${label}. ${look.hint}`}
      className={`px-3 py-1 ${look.pill}`}
    >
      {look.icon}
      {label}
      <span className="font-normal opacity-75">· {look.tagline}</span>
    </HintPill>
  )
}

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
  const exportCsv = useAction(() => sessionApi.exportResultsCsv(session.id))
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
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{session.quizTitle}</h1>
            {/* The console behaves differently per quiz type, so say which this is —
                next to the title, since it describes the quiz and not the session. */}
            <QuizTypeBadge type={session.quizType} />
            {/* Says up front that the names on this screen are numbers, so the professor
                is never left wondering whether registration failed. */}
            {!session.saveParticipants && (
              <HintPill
                hint="This quiz keeps no participant identities: students join with one tap, nothing personal is collected, and everyone appears as “Participant N” here and in the results."
                ariaLabel="Anonymous quiz: no participant identities are collected."
                className="bg-slate-100 px-3 py-1 text-slate-700 ring-1 ring-slate-300 ring-inset"
              >
                <svg viewBox="0 0 16 16" fill="currentColor" className="size-3.5" aria-hidden="true">
                  {/* A masked face. */}
                  <path d="M8 1.5c-2.2 0-4 .7-4 .7v3.3c0 2.9 1.8 4.6 4 5.5 2.2-.9 4-2.6 4-5.5V2.2s-1.8-.7-4-.7Zm-2 3h1.5v1.2H6V4.5Zm2.5 0H10v1.2H8.5V4.5ZM6 7.3h4v1H6v-1Z" />
                  <path d="M3 13.2c1.2-1 3-1.5 5-1.5s3.8.5 5 1.5v1.3H3v-1.3Z" />
                </svg>
                Anonymous
              </HintPill>
            )}
          </div>
          <div className="mt-3">
            <SessionState state={session.state} />
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

        {/* Nothing to open when the quiz discards its results, or they were cleared. */}
        {session.state === 'ENDED' && hasResults(session) && (
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
          {/* A survey keeps no score, so there is no standing to show. */}
          {!session.surveyMode && <LeaderboardPanel rows={host.leaderboard} />}
        </div>
      )}

      {session.state === 'ENDED' && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <Card className="px-5 py-10 text-center">
            <p className="text-lg font-semibold text-slate-900">This session has ended.</p>
            {hasResults(session) ? (
              <>
                <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                  {session.surveyMode
                    ? 'Per-question answer breakdowns and the CSV export are on the results page.'
                    : 'Final standings, per-question statistics and the CSV export are on the results page.'}
                </p>
                <Link
                  to={`/sessions/${session.id}/results`}
                  className="mt-5 inline-block font-semibold text-brand-700 hover:underline"
                >
                  Open results →
                </Link>
              </>
            ) : (
              <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                {!session.saveStatistics
                  ? 'This quiz is set not to keep results, so its answers and participants were deleted when the session ended. There is nothing left to open.'
                  : 'There are no results for this session — nobody took part, or they have been cleared.'}
              </p>
            )}
          </Card>
          {/* The leaderboard held in this console's memory outlives the deletion, so hide
              it too rather than showing standings that no longer exist anywhere. */}
          {!session.surveyMode && hasResults(session) && (
            <LeaderboardPanel rows={host.leaderboard} title="Final standings" />
          )}
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
          surveyMode={session.surveyMode}
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
              {/* Ending is the deletion for a quiz that keeps nothing, so this is the last
                  moment the data exists — the export has to be offered here. */}
              {!session.saveStatistics && (
                <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-red-900 ring-1 ring-red-200 ring-inset">
                  <p className="font-semibold">
                    This quiz is set not to keep results and statistics.
                  </p>
                  <p className="mt-1">
                    Ending it deletes every answer and participant permanently. Export the CSV
                    now if you need it — afterwards there is nothing to open.
                  </p>
                  <Button
                    size="sm"
                    className="mt-2"
                    pending={exportCsv.pending}
                    onClick={() => void exportCsv.run()}
                  >
                    Export CSV
                  </Button>
                  {exportCsv.error && (
                    <p className="mt-2 font-medium text-red-700">{exportCsv.error.message}</p>
                  )}
                </div>
              )}
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
