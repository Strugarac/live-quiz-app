/**
 * One palette for every chart on the console, kept in step with the Tailwind tokens in
 * index.css so charts and badges never disagree about what "correct" looks like.
 *
 * The correct/wrong pair was measured rather than eyeballed: the obvious green-vs-red
 * reads as very nearly the same colour to a deuteranope (ΔE 4.1, well under the 8 that
 * makes a pair safe), so "wrong" borrows the brand indigo — which clears it at 26.7 and
 * happens to already be the app's accent.
 */
export const chartColors = {
  /** emerald-600 — the same green the badges and option rows already mean "correct" with. */
  correct: '#059669',
  /** brand-700. */
  wrong: '#4338ca',
  /** brand-600, for charts with a single series. */
  accent: '#4f46e5',
  /** slate-300, for marks that are context rather than the point. */
  muted: '#cbd5e1',
  /** The Card background. Doubles as the 2px separator painted between stacked segments. */
  surface: '#ffffff',
  /** slate-200 / slate-500 — recessive chrome that must never compete with the data. */
  grid: '#e2e8f0',
  axis: '#64748b',
} as const

/** Hairline, label-only axes: the data is the only thing allowed to be loud. */
export const axisProps = {
  tickLine: false,
  axisLine: false,
  tick: { fill: chartColors.axis, fontSize: 11 },
} as const

/** Bars stay thin and never fill their band; the leftover is deliberate air. */
export const BAR_SIZE = 18
