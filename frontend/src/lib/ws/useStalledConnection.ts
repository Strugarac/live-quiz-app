import { useEffect, useState } from 'react'
import type { LiveConnectionStatus } from './liveClient'

/**
 * True once a connection has been trying for too long without succeeding.
 *
 * A STOMP CONNECT that never gets a CONNECTED back produces no error frame at all —
 * which is what happens when the backend's broker relay cannot reach RabbitMQ. Without
 * this, the UI would spin on "Connecting…" forever and say nothing useful.
 */
export function useStalledConnection(status: LiveConnectionStatus, afterMs = 8000): boolean {
  const [stalledAt, setStalledAt] = useState<number | null>(null)

  useEffect(() => {
    if (status === 'connected') {
      return
    }
    // Recorded from a timer rather than set directly in the effect body, so this never
    // triggers the cascading render that react-hooks warns about.
    const timer = window.setTimeout(() => setStalledAt(Date.now()), afterMs)
    return () => window.clearTimeout(timer)
  }, [status, afterMs])

  return status !== 'connected' && stalledAt !== null
}
