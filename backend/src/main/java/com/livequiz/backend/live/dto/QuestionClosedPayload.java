package com.livequiz.backend.live.dto;

import java.util.List;
import java.util.UUID;

/**
 * Sent when a question stops accepting answers. This is the reveal, so it is the one
 * place where correct option ids go out over the wire.
 */
public record QuestionClosedPayload(
        UUID questionId,
        int questionIndex,
        List<UUID> correctOptionIds,
        long answerCount,
        boolean hasNextQuestion
) {
}
