package com.livequiz.backend.quiz.dto;

import com.livequiz.backend.quiz.domain.QuizType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateQuizRequest(
        @NotBlank @Size(max = 255) String title,
        @Size(max = 2000) String description,
        @NotNull QuizType type,
        @NotNull @Valid QuizConfigDto config
) {
}
