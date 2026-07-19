package com.livequiz.backend.quiz.dto;

import com.livequiz.backend.quiz.domain.QuestionType;

import java.util.List;
import java.util.UUID;

public record QuestionResponse(
        UUID id,
        int orderIndex,
        String text,
        String imageUrl,
        QuestionType type,
        List<OptionResponse> options
) {
}
