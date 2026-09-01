package com.livequiz.backend.live.dto;

import java.util.List;
import java.util.UUID;

public record OwnAnswerView(
        UUID questionId,
        List<UUID> selectedOptionIds,
        String freeText,
        int ordinal,
        Long responseTimeMs
) {
}
