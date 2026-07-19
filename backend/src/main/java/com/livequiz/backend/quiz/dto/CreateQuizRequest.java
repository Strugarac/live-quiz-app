package com.livequiz.backend.quiz.dto;

import com.livequiz.backend.quiz.domain.QuizType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record CreateQuizRequest(
        @NotBlank @Size(max = 255) String title,
        @Size(max = 2000) String description,
        @NotNull QuizType type,
        @NotNull @Valid QuizConfigDto config,
        @Valid List<QuestionRequest> questions
) {
}
