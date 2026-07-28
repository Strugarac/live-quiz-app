package com.livequiz.backend.scoring.dto;

import com.livequiz.backend.quiz.domain.QuestionType;

import java.util.List;
import java.util.UUID;

public record QuestionBreakdown(
        UUID questionId,
        int questionIndex,
        String text,
        QuestionType type,
        long answerCount,
        long correctCount,
        long incorrectCount,
        List<OptionBreakdown> options,
        List<FreeTextEntry> freeTextResponses
) {
}
