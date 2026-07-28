import type { LeaderboardRow } from '../../lib/api/types'
import { Card, CardHeader } from '../../components/ui/Feedback'

const MEDALS = ['🥇', '🥈', '🥉']

interface LeaderboardPanelProps {
  rows: LeaderboardRow[]
  /** Shown when no question has been graded yet. */
  emptyHint?: string
  title?: string
}

/**
 * Host-only standings. Cumulative across every graded question, includes participants
 * who have not scored, and uses competition ranking so ties share a place.
 */
export function LeaderboardPanel({
  rows,
  emptyHint = 'Scores appear once the first question is closed.',
  title = 'Leaderboard',
}: LeaderboardPanelProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader title={title} />
      {rows.length === 0 ? (
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
      )}
    </Card>
  )
}
