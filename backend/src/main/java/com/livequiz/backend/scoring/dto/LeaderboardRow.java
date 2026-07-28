package com.livequiz.backend.scoring.dto;

import java.util.UUID;

public record LeaderboardRow(
        UUID participantId,
        String label,
        long score,
        long correctCount,
        int rank
) {
}
