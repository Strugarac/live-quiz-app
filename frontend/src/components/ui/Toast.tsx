import type { ToastMessage } from '../../lib/useToast'

/** Renders whatever `useToast` is currently holding. Nothing to dismiss: it times out. */
export function Toast({ message }: { message: ToastMessage | null }) {
  if (!message) {
    return null
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4">
      {/* role="status" so it is announced without stealing focus from whatever is being edited. */}
      <p
        role="status"
        className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg"
      >
        {message.text}
      </p>
    </div>
  )
}
