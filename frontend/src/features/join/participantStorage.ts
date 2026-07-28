/**
 * Remembers the opaque participant token per session.
 *
 * Students play on phones, where the tab gets backgrounded, reloaded and restored
 * constantly. Without this, every reload would look like a new participant — and the
 * second registration would be refused anyway, since a session allows one participant
 * per email.
 */

const KEY_PREFIX = 'livequiz.participant.'
/** Stored alongside the token purely so the UI can say who it thinks you are. */
const LABEL_SUFFIX = '.label'

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key)
  } catch {
    // Private browsing modes can throw on access; treat as "not registered".
    return null
  }
}

function write(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Not fatal: the participant just loses their place on reload.
  }
}

export function readToken(joinToken: string): string | null {
  return read(KEY_PREFIX + joinToken)
}

export function readLabel(joinToken: string): string | null {
  return read(KEY_PREFIX + joinToken + LABEL_SUFFIX)
}

export function writeRegistration(joinToken: string, participantToken: string, label: string): void {
  write(KEY_PREFIX + joinToken, participantToken)
  write(KEY_PREFIX + joinToken + LABEL_SUFFIX, label)
}

export function clearToken(joinToken: string): void {
  try {
    window.localStorage.removeItem(KEY_PREFIX + joinToken)
    window.localStorage.removeItem(KEY_PREFIX + joinToken + LABEL_SUFFIX)
  } catch {
    // Nothing to do.
  }
}
