/**
 * Distinct colours per option, the way quiz games do, so choices are easy to hit.
 *
 * Shared so the screen shown after submitting can echo an option in the same colour the
 * participant tapped — recognising the tile is faster than re-reading the text.
 */
export const OPTION_COLORS = [
  { base: 'bg-rose-500', hover: 'hover:bg-rose-400' },
  { base: 'bg-sky-500', hover: 'hover:bg-sky-400' },
  { base: 'bg-amber-500', hover: 'hover:bg-amber-400' },
  { base: 'bg-violet-500', hover: 'hover:bg-violet-400' },
  { base: 'bg-emerald-500', hover: 'hover:bg-emerald-400' },
  { base: 'bg-cyan-500', hover: 'hover:bg-cyan-400' },
]

export const optionColor = (index: number) => OPTION_COLORS[index % OPTION_COLORS.length]

/** A, B, C… — the badge shown on each option tile. */
export const optionLetter = (index: number) => String.fromCharCode(65 + index)
