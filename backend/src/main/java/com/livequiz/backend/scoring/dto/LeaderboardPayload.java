package com.livequiz.backend.scoring.dto;

import java.util.List;
import java.util.UUID;

public record LeaderboardPayload(
        UUID sessionId,
        List<LeaderboardRow> rows
) {
}
