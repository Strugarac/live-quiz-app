import type { ReactNode } from 'react'
import type { ApiError } from '../../lib/api/client'

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-sm text-slate-500">
      <span
        aria-hidden="true"
        className="size-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-600"
      />
      {label}
    </div>
  )
}

/**
 * Renders anything the api layer threw, including the per-field validation
 * messages produced by the backend's MethodArgumentNotValidException handler.
 */
export function ErrorBanner({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-lg bg-red-50 p-4 ring-1 ring-red-200 ring-inset">
      {/* Status codes stay on the ApiError for callers that branch on them; nobody reading
          this banner needs to see a number. */}
      <p className="text-sm font-semibold text-red-800">{error.message}</p>
      {error.fieldErrors.length > 0 && (
        <ul className="mt-2 list-inside list-disc space-y-0.5 text-sm text-red-700">
          {error.fieldErrors.map((fe) => (
            <li key={`${fe.field}-${fe.message}`}>
              <span className="font-mono text-xs">{fe.field}</span>: {fe.message}
            </li>
          ))}
        </ul>
      )}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 text-sm font-semibold text-red-800 underline hover:no-underline"
        >
          Try again
        </button>
      )}
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <h3 className="text-base font-semibold text-slate-800">{title}</h3>
      {description && <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}

const BADGE_TONES = {
  slate: 'bg-slate-100 text-slate-700',
  brand: 'bg-brand-50 text-brand-700',
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
} as const

export function Badge({
  children,
  tone = 'slate',
}: {
  children: ReactNode
  tone?: keyof typeof BADGE_TONES
}) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${BADGE_TONES[tone]}`}
    >
      {children}
    </span>
  )
}

/**
 * The affordance on every expandable header: points down when the panel is open.
 * Decorative — the header's own `aria-expanded` is what actually announces the state.
 */
export function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      className={`size-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-90' : ''}`}
    >
      <path d="M6 3.5 10.5 8 6 12.5 4.9 11.4 8.3 8 4.9 4.6 6 3.5Z" />
    </svg>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl bg-white ring-1 ring-slate-200 ring-inset ${className}`}>
      {children}
    </section>
  )
}

export function CardHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
      </div>
      {action}
    </header>
  )
}
