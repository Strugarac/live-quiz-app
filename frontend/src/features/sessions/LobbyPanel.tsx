import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import type { SessionResponse } from '../../lib/api/types'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Feedback'
import type { LobbyEntry } from './useHostSession'

interface LobbyPanelProps {
  session: SessionResponse
  participants: LobbyEntry[]
  participantCount: number
  starting: boolean
  onStart: () => void
}

/**
 * Pre-game view: the join code and QR students scan, plus who has arrived so far.
 * The backend hands us joinUrl (built from app.join-base-url); the QR is rendered here.
 */
export function LobbyPanel({
  session,
  participants,
  participantCount,
  starting,
  onStart,
}: LobbyPanelProps) {
  const [copied, setCopied] = useState(false)

  const copyJoinUrl = async () => {
    try {
      await navigator.clipboard.writeText(session.joinUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <Card className="overflow-hidden">
        <CardHeader
          title="Waiting for participants"
          description="Students scan the code or open the link, then register."
        />
        <div className="flex flex-col items-center gap-6 px-5 py-8 sm:flex-row sm:items-start sm:justify-center">
          <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200 ring-inset">
            <QRCodeSVG value={session.joinUrl} size={190} level="M" />
          </div>

          <div className="text-center sm:text-left">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Join code</p>
            <p className="mt-1 font-mono text-4xl font-bold tracking-[0.2em] text-slate-900">
              {session.joinToken}
            </p>

            <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">Link</p>
            <p className="mt-1 font-mono text-sm break-all text-slate-600">{session.joinUrl}</p>
            <Button size="sm" onClick={copyJoinUrl} className="mt-2">
              {copied ? 'Copied' : 'Copy link'}
            </Button>

            <div className="mt-6">
              <Button
                variant="primary"
                pending={starting}
                disabled={session.questionCount === 0}
                onClick={onStart}
              >
                Start quiz
              </Button>
              {session.questionCount === 0 && (
                <p className="mt-2 text-xs text-red-600">
                  This quiz has no questions, so it cannot be started.
                </p>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader title={`Participants (${participantCount})`} />
        {participants.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">Nobody has joined yet.</p>
        ) : (
          <ul className="max-h-96 divide-y divide-slate-100 overflow-y-auto">
            {participants.map((participant) => (
              <li key={participant.id} className="px-5 py-2.5 text-sm text-slate-700">
                {participant.label}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
