package com.livequiz.backend.live.dto;

import com.livequiz.backend.quiz.domain.QuestionType;

import java.util.List;
import java.util.UUID;

public record LiveQuestionView(
        UUID questionId,
        int questionIndex,
        int questionCount,
        String text,
        String imageUrl,
        QuestionType type,
        List<LiveOptionView> options
) {
}
