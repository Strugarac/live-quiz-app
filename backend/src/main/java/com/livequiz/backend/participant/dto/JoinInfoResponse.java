package com.livequiz.backend.participant.dto;

import com.livequiz.backend.session.domain.SessionState;

import java.util.UUID;

public record JoinInfoResponse(
        UUID sessionId,
        String quizTitle,
        SessionState state,
        ParticipantFieldsDto fields
) {
}
