package com.livequiz.backend.scoring.dto;

import java.util.List;
import java.util.UUID;

/**
 * The full ranked leaderboard for a session, cumulative across every question graded
 * so far. Sent to the host after each question closes, and returned by the professor's
 * leaderboard endpoint.
 */
public record LeaderboardPayload(
        UUID sessionId,
        List<LeaderboardRow> rows
) {
}
