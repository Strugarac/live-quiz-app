package com.livequiz.backend.session.dto;

import com.livequiz.backend.quiz.domain.QuizType;
import com.livequiz.backend.session.domain.SessionState;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record SessionResponse(
        UUID id,
        UUID quizId,
        String quizTitle,
        QuizType quizType,
        boolean surveyMode,
        boolean saveParticipants,
        boolean saveStatistics,
        SessionState state,
        String joinToken,
        String joinUrl,
        Integer currentQuestionIndex,
        List<UUID> askedQuestionIds,
        boolean questionOpen,
        int questionCount,
        long participantCount,
        Instant createdAt,
        Instant startedAt,
        Instant endedAt
) {
}
