package com.livequiz.backend.live.dto;

import com.livequiz.backend.quiz.domain.QuestionType;

import java.util.List;
import java.util.UUID;

public record LiveQuestionView(
        UUID questionId,
        /**
         * Position within the QUIZ. Identifies the question; the host console looks the
         * question up by it. A flexible session jumps around, so this is not the order
         * participants experienced.
         */
        int questionIndex,
        /**
         * Position within THIS SESSION, 1-based — the "3" in "question 3 of 8". Equal to
         * questionIndex + 1 for a static quiz, and the only sensible counter for a flexible
         * one, where the host may open question 5 first.
         */
        int askedPosition,
        int questionCount,
        String text,
        String imageUrl,
        QuestionType type,
        List<LiveOptionView> options
) {
}
