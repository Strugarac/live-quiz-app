package com.livequiz.backend.live.dto;

import java.util.UUID;

/**
 * Broadcast when someone joins the lobby. The participant-facing copy carries only the
 * count; {@code participantId} and {@code label} are filled in for the host topic.
 */
public record ParticipantJoinedPayload(
        UUID participantId,
        String label,
        long participantCount
) {

    public static ParticipantJoinedPayload countOnly(long participantCount) {
        return new ParticipantJoinedPayload(null, null, participantCount);
    }
}
