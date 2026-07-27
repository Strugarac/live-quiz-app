package com.livequiz.backend.live.dto;

import java.util.UUID;

/**
 * Host-only progress ping: how many of the joined participants have answered the open
 * question. Carries no answer content, so the host screen cannot leak the distribution
 * before the reveal.
 */
public record AnswerReceivedPayload(
        UUID questionId,
        int questionIndex,
        long answerCount,
        long participantCount
) {
}
