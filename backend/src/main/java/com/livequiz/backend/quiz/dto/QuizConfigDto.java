package com.livequiz.backend.quiz.dto;

import com.livequiz.backend.quiz.domain.FieldRequirement;
import jakarta.validation.constraints.NotNull;

public record QuizConfigDto(
        @NotNull FieldRequirement emailRequirement,
        @NotNull FieldRequirement personalNumberRequirement,
        @NotNull FieldRequirement nameRequirement,
        @NotNull FieldRequirement surnameRequirement,
        @NotNull FieldRequirement facultyRequirement,
        boolean saveStatistics,
        boolean saveParticipants
) {
}
