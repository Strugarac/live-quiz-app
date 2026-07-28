package com.livequiz.backend.live.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.Set;
import java.util.UUID;

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
