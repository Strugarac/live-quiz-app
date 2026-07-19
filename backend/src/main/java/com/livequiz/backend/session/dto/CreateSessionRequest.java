package com.livequiz.backend.session.dto;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CreateSessionRequest(
        @NotNull UUID quizId
) {
}
