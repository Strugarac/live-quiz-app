package com.livequiz.backend.scoring.dto;

import java.util.List;
import java.util.UUID;

public record ParticipantAnswerEntry(
        UUID participantId,
        String participantLabel,
        List<UUID> selectedOptionIds,
        String freeText,
        Boolean correct,
        int points,
        Long responseTimeMs
) {
}
