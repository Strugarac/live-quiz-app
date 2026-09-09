import { chartColors } from './chartTheme'

interface TooltipEntry {
  name?: string | number
  value?: number | string
  color?: string
  payload?: Record<string, unknown>
}

interface ChartTooltipProps {
  /** Recharts injects these; they are all optional because it renders us before any hover. */
  active?: boolean
  payload?: TooltipEntry[]
  label?: string | number
  /** Replaces the bold heading, for when the axis tick is an abbreviation like "Q3". */
  heading?: (entry: TooltipEntry) => string
  /** A line of context under the values, e.g. "80% correct". */
  footer?: (entry: TooltipEntry) => string | undefined
}

/**
 * The hover readout for every chart. Values lead and series names follow — the reader
 * already knows which series they pointed at, what they came for is the number.
 *
 * Tooltips only ever enhance here: each value is also on the page as a badge or a
 * leaderboard row, so nothing is reachable by hovering alone.
 */
export function ChartTooltip({ active, payload, label, heading, footer }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null
  }
  const first = payload[0]
  const title = heading ? heading(first) : String(label ?? '')
  const note = footer?.(first)

  return (
    <div className="max-w-xs rounded-lg bg-white px-3 py-2 text-xs shadow-lg ring-1 ring-slate-200 ring-inset">
      {title && <p className="mb-1.5 font-semibold text-slate-900">{title}</p>}
      <ul className="space-y-1">
        {payload.map((entry) => (
          <li key={String(entry.name)} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-0.5 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: entry.color ?? chartColors.accent }}
            />
            <span className="font-semibold text-slate-900 tabular-nums">{entry.value}</span>
            <span className="text-slate-500">{entry.name}</span>
          </li>
        ))}
      </ul>
      {note && <p className="mt-1.5 text-slate-500">{note}</p>}
    </div>
  )
}

/**
 * Identity has to survive a reader who cannot separate the hues, so two or more series
 * always carry a legend. A single-series chart gets none — its title already says what
 * is plotted, and a lone swatch would just restate it.
 */
export function ChartLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-4">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5 text-xs text-slate-600">
          <span
            aria-hidden="true"
            className="size-2.5 rounded-sm"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  )
}
