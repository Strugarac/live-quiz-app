package com.livequiz.backend.quiz.dto;

import com.livequiz.backend.quiz.domain.QuizType;

import java.time.Instant;
import java.util.UUID;

public record QuizSummary(
        UUID id,
        String title,
        QuizType type,
        int questionCount,
        /* Sessions hosted from this quiz; deleting the quiz deletes them and their results. */
        long sessionCount,
        Instant createdAt
) {
}
