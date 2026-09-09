import { useId, useState } from 'react'
import type { LeaderboardRow } from '../../lib/api/types'
import { Card, CardHeader, ChevronIcon } from '../../components/ui/Feedback'

const MEDALS = ['🥇', '🥈', '🥉']

interface LeaderboardPanelProps {
  rows: LeaderboardRow[]
  /** Shown when no question has been graded yet. */
  emptyHint?: string
  title?: string
  /**
   * Turns the header into a toggle. Off by default: the live console wants the standings
   * on screen at all times, it is the results page that has other things to show first.
   */
  collapsible?: boolean
  defaultOpen?: boolean
}

/**
 * Host-only standings. Cumulative across every graded question, includes participants
 * who have not scored, and uses competition ranking so ties share a place.
 */
export function LeaderboardPanel({
  rows,
  emptyHint = 'Scores appear once the first question is closed.',
  title = 'Leaderboard',
  collapsible = false,
  defaultOpen = false,
}: LeaderboardPanelProps) {
  const [open, setOpen] = useState(!collapsible || defaultOpen)
  const panelId = useId()

  const body =
    rows.length === 0 ? (
      <p className="px-5 py-8 text-center text-sm text-slate-500">{emptyHint}</p>
    ) : (
      <ol className="max-h-[32rem] divide-y divide-slate-100 overflow-y-auto">
        {rows.map((row) => (
          <li key={row.participantId} className="flex items-center gap-3 px-5 py-2.5">
            <span className="w-7 shrink-0 text-center text-sm font-bold text-slate-400">
              {row.rank <= 3 ? MEDALS[row.rank - 1] : row.rank}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{row.label}</span>
            <span className="shrink-0 text-xs text-slate-400">{row.correctCount} correct</span>
            <span className="w-16 shrink-0 text-right text-sm font-bold text-slate-900">
              {row.score}
            </span>
          </li>
        ))}
      </ol>
    )

  if (!collapsible) {
    return (
      <Card className="overflow-hidden">
        <CardHeader title={title} />
        {body}
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={panelId}
        className={`flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-slate-50 ${
          open ? 'border-b border-slate-200' : ''
        }`}
      >
        <ChevronIcon open={open} />
        <span className="flex-1">
          <span className="block text-sm font-semibold text-slate-900">{title}</span>
          <span className="mt-0.5 block text-xs text-slate-500">
            {rows.length === 0
              ? 'No scores recorded'
              : `${rows.length} ${rows.length === 1 ? 'participant' : 'participants'}, top score ${rows[0].score}`}
          </span>
        </span>
      </button>
      <div id={panelId} hidden={!open}>
        {body}
      </div>
    </Card>
  )
}
