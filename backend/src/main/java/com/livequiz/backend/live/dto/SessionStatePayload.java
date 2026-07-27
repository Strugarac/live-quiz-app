package com.livequiz.backend.live.dto;

import com.livequiz.backend.session.domain.SessionState;

import java.util.UUID;

/**
 * Everything a client needs to render the current screen from scratch. Sent privately
 * on request so a participant who reloads or loses signal can resync.
 */
public record SessionStatePayload(
        UUID sessionId,
        SessionState state,
        Integer currentQuestionIndex,
        int questionCount,
        boolean questionOpen,
        long participantCount,
        /* Null in LOBBY and once the session has ENDED. */
        LiveQuestionView question,
        /* True when this client has already answered the open question. */
        boolean alreadyAnswered
) {
}
