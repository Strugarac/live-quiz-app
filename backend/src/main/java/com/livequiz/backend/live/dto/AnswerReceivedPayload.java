package com.livequiz.backend.live.dto;

import java.util.UUID;

public record AnswerReceivedPayload(
        UUID questionId,
        int questionIndex,
        long answerCount,
        long participantCount
) {
}
