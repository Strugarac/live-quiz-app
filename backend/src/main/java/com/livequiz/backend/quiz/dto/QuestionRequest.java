package com.livequiz.backend.quiz.dto;

import com.livequiz.backend.quiz.domain.QuestionType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record QuestionRequest(
        @Size(max = 1000) String text,
        @Size(max = 1024) String imageUrl,
        @NotNull QuestionType type,
        @Valid List<OptionRequest> options
) {
}
