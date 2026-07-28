package com.livequiz.backend.live.dto;

import com.livequiz.backend.session.domain.SessionState;

import java.util.UUID;

public record SessionStatePayload(
        UUID sessionId,
        SessionState state,
        Integer currentQuestionIndex,
        int questionCount,
        boolean questionOpen,
        long participantCount,
        LiveQuestionView question,
        boolean alreadyAnswered
) {
}
