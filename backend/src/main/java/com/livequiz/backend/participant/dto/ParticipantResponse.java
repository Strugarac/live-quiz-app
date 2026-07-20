package com.livequiz.backend.participant.dto;

import java.util.UUID;

public record ParticipantResponse(
        UUID id,
        String token,
        UUID sessionId,
        String email,
        String name,
        String surname,
        String personalNumber,
        String faculty
) {
}
