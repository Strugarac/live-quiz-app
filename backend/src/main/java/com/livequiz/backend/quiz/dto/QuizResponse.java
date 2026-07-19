package com.livequiz.backend.quiz.dto;

import com.livequiz.backend.quiz.domain.QuizType;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record QuizResponse(
        UUID id,
        String title,
        String description,
        QuizType type,
        QuizConfigDto config,
        List<QuestionResponse> questions,
        Instant createdAt
) {
}
