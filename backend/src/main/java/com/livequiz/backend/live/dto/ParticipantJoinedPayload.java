package com.livequiz.backend.live.dto;

import java.util.UUID;

public record ParticipantJoinedPayload(
        UUID participantId,
        String label,
        long participantCount
) {

    public static ParticipantJoinedPayload countOnly(long participantCount) {
        return new ParticipantJoinedPayload(null, null, participantCount);
    }
}
