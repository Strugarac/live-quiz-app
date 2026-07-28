import type { LiveConnectionStatus } from '../../lib/ws/liveClient'

const LOOK: Record<LiveConnectionStatus, { label: string; dot: string; text: string }> = {
  connecting: { label: 'Connecting…', dot: 'bg-amber-500', text: 'text-amber-700' },
  connected: { label: 'Live', dot: 'bg-emerald-500', text: 'text-emerald-700' },
  reconnecting: { label: 'Reconnecting…', dot: 'bg-amber-500 animate-pulse', text: 'text-amber-700' },
  closed: { label: 'Disconnected', dot: 'bg-slate-400', text: 'text-slate-500' },
}

export function ConnectionStatus({ status }: { status: LiveConnectionStatus }) {
  const look = LOOK[status]
  return (
    <span
      className={`inline-flex items-center gap-2 text-xs font-semibold ${look.text}`}
      title="Live connection to the quiz server"
    >
      <span className={`size-2 rounded-full ${look.dot}`} aria-hidden="true" />
      {look.label}
    </span>
  )
}
