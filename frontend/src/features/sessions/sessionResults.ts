import type { SessionResponse } from '../../lib/api/types'

/**
 * Whether an ended session still has results behind it worth opening a page for. Two ways
 * for it not to: the quiz keeps no statistics, so ending it deleted them, or its results
 * were cleared afterwards (which leaves it with no participants).
 */
export function hasResults(session: SessionResponse): boolean {
  return session.saveStatistics && session.participantCount > 0
}
