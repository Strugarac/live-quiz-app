package com.livequiz.backend.live.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.Set;
import java.util.UUID;

/**
 * What a participant sends to {@code /app/session/answer}. Which of the two answer
 * carriers is required depends on the question type, so both are optional here and the
 * service validates the combination.
 */
public record SubmitAnswerMessage(
        @NotNull(message = "questionId is required")
        UUID questionId,

        Set<UUID> optionIds,

        @Size(max = 2000, message = "answer must be at most 2000 characters")
        String freeText
) {

    public Set<UUID> optionIdsOrEmpty() {
        return optionIds == null ? Set.of() : optionIds;
    }
}
