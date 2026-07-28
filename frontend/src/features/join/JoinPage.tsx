import { useCallback, useState } from 'react'
import { useParams } from 'react-router'
import { joinApi } from '../../lib/api/join'
import { useAsync } from '../../lib/useAsync'
import { ErrorBanner, Spinner } from '../../components/ui/Feedback'
import { useStalledConnection } from '../../lib/ws/useStalledConnection'
import { AnswerPanel } from './AnswerPanel'
import { RegistrationForm } from './RegistrationForm'
import { clearToken, readLabel, readToken, writeRegistration } from './participantStorage'
import { useParticipantSession } from './useParticipantSession'

/**
 * The participant client. Lives outside the professor layout and RequireAuth: students
 * are never authenticated, they arrive from a QR code with nothing but a join token.
 */
export function JoinPage() {
  const { joinToken = '' } = useParams()

  const info = useAsync(useCallback((signal: AbortSignal) => joinApi.info(joinToken, signal), [joinToken]))

  // Registering is a one-off; the token is what identifies this student from then on.
  // It survives reloads on purpose — phones background and refresh constantly.
  const [participantToken, setParticipantToken] = useState<string | null>(() => readToken(joinToken))
  const [label, setLabel] = useState<string | null>(() => readLabel(joinToken))

  const live = useParticipantSession(joinToken, participantToken)
  const stalled = useStalledConnection(live.status)

  const leave = () => {
    clearToken(joinToken)
    setParticipantToken(null)
    setLabel(null)
    // The cached join info may say LOBBY even though the quiz has since started.
    info.reload()
  }

  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col px-4 py-6">
      {info.loading && <Spinner label="Finding the quiz…" />}

      {info.error && (
        <div className="mt-8">
          <ErrorBanner error={info.error} onRetry={info.reload} />
          {info.error.status === 404 && (
            <p className="mt-3 text-center text-sm text-slate-500">
              Check the code with your professor — it may have a typo, or the session may have been
              removed.
            </p>
          )}
        </div>
      )}

      {info.data && (
        <>
          <header className="mb-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">Live quiz</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">{info.data.quizTitle}</h1>
          </header>

          {/* Not registered yet. */}
          {!participantToken && (
            <>
              {info.data.state === 'LOBBY' ? (
                <RegistrationForm
                  joinToken={joinToken}
                  info={info.data}
                  onJoined={(participant) => {
                    writeRegistration(joinToken, participant.token, participant.email)
                    setParticipantToken(participant.token)
                    setLabel(participant.email)
                  }}
                />
              ) : (
                <Closed
                  title={
                    info.data.state === 'ACTIVE'
                      ? 'This quiz has already started'
                      : 'This quiz has finished'
                  }
                  detail={
                    info.data.state === 'ACTIVE'
                      ? 'Joining closes when the professor starts the first question.'
                      : 'Ask your professor if the results will be shared.'
                  }
                />
              )}
            </>
          )}

          {/* Registered: everything below is driven by the live connection. */}
          {participantToken && (
            <>
              {live.status === 'reconnecting' && (
                <p
                  role="status"
                  className="mb-4 rounded-xl bg-amber-50 px-4 py-2.5 text-center text-sm font-medium text-amber-800"
                >
                  Reconnecting… your submitted answers are safe.
                </p>
              )}

              {live.error && (
                <div
                  role="alert"
                  className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800"
                >
                  <p>{live.error}</p>
                  <div className="mt-2 flex gap-3">
                    <button
                      type="button"
                      onClick={live.clearError}
                      className="font-semibold underline hover:no-underline"
                    >
                      Dismiss
                    </button>
                    {/* Covers a stored token whose participant no longer exists, e.g.
                        after the professor cleared the session's results. */}
                    <button
                      type="button"
                      onClick={leave}
                      className="font-semibold underline hover:no-underline"
                    >
                      Register again
                    </button>
                  </div>
                </div>
              )}

              {live.sessionState === 'ENDED' ? (
                <Closed
                  title="That is the end — thanks for playing!"
                  detail="Your professor has the final scores."
                />
              ) : live.question ? (
                <AnswerPanel
                  // Remounting per question resets the local selection.
                  key={live.question.questionId}
                  question={live.question}
                  questionOpen={live.questionOpen}
                  alreadyAnswered={live.alreadyAnswered}
                  reveal={live.reveal}
                  ownSelection={live.ownSelection}
                  onSubmit={(optionIds, freeText) =>
                    live.submitAnswer(live.question!.questionId, optionIds, freeText)
                  }
                />
              ) : (
                <Waiting
                  participantCount={live.participantCount}
                  connecting={live.status !== 'connected'}
                  stalled={stalled}
                  label={label}
                  onLeave={leave}
                />
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

function Waiting({
  participantCount,
  connecting,
  stalled,
  label,
  onLeave,
}: {
  participantCount: number
  connecting: boolean
  stalled: boolean
  label: string | null
  onLeave: () => void
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <span
        aria-hidden="true"
        className="size-10 animate-spin rounded-full border-4 border-slate-200 border-t-brand-600"
      />
      <p className="mt-5 text-lg font-semibold text-slate-800">
        {connecting ? 'Connecting…' : "You're in!"}
      </p>
      {/* Says who this browser is registered as, so a reload landing straight here is
          not mistaken for the registration form failing to appear. */}
      {label && !connecting && (
        <p className="mt-1 text-sm font-medium text-slate-700">as {label}</p>
      )}
      <p className="mt-1 text-sm text-slate-500">
        {connecting
          ? 'Getting you into the quiz.'
          : 'Waiting for your professor to start the next question.'}
      </p>

      {stalled && (
        <div className="mt-5 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold">Still trying to connect.</p>
          <p className="mt-1">
            You are registered, so nothing is lost — this screen keeps retrying. Tell your professor
            the live connection is not coming up.
          </p>
        </div>
      )}
      {!connecting && participantCount > 0 && (
        <p className="mt-4 text-sm font-medium text-slate-600">
          {participantCount} {participantCount === 1 ? 'person' : 'people'} joined
        </p>
      )}

      <button
        type="button"
        onClick={onLeave}
        className="mt-8 text-sm font-medium text-slate-400 underline hover:text-slate-600"
      >
        Not you? Register again
      </button>
    </div>
  )
}

function Closed({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <p className="text-lg font-semibold text-slate-800">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{detail}</p>
    </div>
  )
}
