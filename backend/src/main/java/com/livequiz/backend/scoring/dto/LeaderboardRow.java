package com.livequiz.backend.scoring.dto;

import java.util.UUID;

/**
 * One participant's standing in the leaderboard. {@code label} is the same
 * host-facing label used in the lobby (name/surname, falling back to email) —
 * this goes only to the host topic, so participant identities are not exposed.
 */
public record LeaderboardRow(
        UUID participantId,
        String label,
        long score,
        long correctCount,
        int rank
) {
}
