package com.livequiz.backend.live.dto;

import java.util.List;
import java.util.UUID;

public record QuestionClosedPayload(
        UUID questionId,
        int questionIndex,
        List<UUID> correctOptionIds,
        long answerCount,
        boolean hasNextQuestion
) {
}
