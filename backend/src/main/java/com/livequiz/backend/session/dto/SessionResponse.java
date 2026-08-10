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
        /** FLEXIBLE lets the host choose each question and add questions while running. */
        QuizType quizType,
        SessionState state,
        String joinToken,
        String joinUrl,
        Integer currentQuestionIndex,
        /**
         * Questions already presented, in presentation order. The console subtracts these
         * from the quiz to offer the host what is still available to ask, which keeps
         * working when a question is added mid-session.
         */
        List<UUID> askedQuestionIds,
        boolean questionOpen,
        int questionCount,
        Instant createdAt,
        Instant startedAt,
        Instant endedAt
) {
}
