package com.livequiz.backend.live.dto;

import java.time.Instant;
import java.util.UUID;

public record SessionEndedPayload(
        UUID sessionId,
        int questionCount,
        Instant endedAt
) {
}
