import type { ReactNode } from 'react'

/**
 * A headline number. When the data is one value there is nothing for a chart to
 * compare, so the number itself is the visualisation — a one-bar bar chart would
 * spend a whole card saying less.
 */
export function StatTile({
  label,
  value,
  hint,
}: {
  label: string
  value: ReactNode
  hint?: string
}) {
  return (
    <div className="rounded-lg bg-slate-50 px-4 py-3">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      {/* Proportional figures, not tabular: at this size equal-width digits look loose. */}
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

interface Share {
  label: string
  value: number
  color: string
}

/**
 * A part-to-whole bar for two or three slices — the honest form for "how many got it
 * right", where a two-slice pie would be harder to read and no more informative.
 *
 * Segments are separated by a 2px gap in the surface colour rather than by a border:
 * a stroke would add ink that isn't data.
 */
export function StackedShareBar({ shares }: { shares: Share[] }) {
  const total = shares.reduce((sum, share) => sum + share.value, 0)
  if (total === 0) {
    return null
  }

  return (
    <div>
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-slate-100">
        {shares.map((share) => (
          <div
            key={share.label}
            className="h-full"
            style={{ width: `${(share.value / total) * 100}%`, backgroundColor: share.color }}
          />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
        {shares.map((share) => (
          <li key={share.label} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: share.color }}
            />
            <span className="text-sm font-semibold text-slate-900 tabular-nums">
              {share.value}
            </span>
            <span className="text-sm text-slate-500">
              {share.label} · {Math.round((share.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
