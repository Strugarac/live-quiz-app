import { useCallback, useEffect, useState } from 'react'

export interface ToastMessage {
  text: string
  /** Distinguishes two identical messages, so showing the same one twice restarts the timer. */
  id: number
}

/**
 * A transient confirmation of something that already happened.
 *
 * Only for work that is finished and needs no follow-up — anything the reader still has
 * to act on belongs in something that stays on screen, not a message that leaves on its
 * own while they are looking elsewhere.
 */
export function useToast(durationMs = 3000) {
  const [message, setMessage] = useState<ToastMessage | null>(null)

  const show = useCallback((text: string) => setMessage({ text, id: Date.now() }), [])

  useEffect(() => {
    if (!message) {
      return
    }
    const timer = window.setTimeout(() => setMessage(null), durationMs)
    return () => window.clearTimeout(timer)
  }, [message, durationMs])

  return { message, show }
}
