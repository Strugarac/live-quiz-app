package com.livequiz.backend.session.dto;

import com.livequiz.backend.session.domain.SessionState;

import java.time.Instant;
import java.util.UUID;

public record SessionResponse(
        UUID id,
        UUID quizId,
        String quizTitle,
        SessionState state,
        String joinToken,
        String joinUrl,
        Integer currentQuestionIndex,
        boolean questionOpen,
        int questionCount,
        Instant createdAt,
        Instant startedAt,
        Instant endedAt
) {
}
