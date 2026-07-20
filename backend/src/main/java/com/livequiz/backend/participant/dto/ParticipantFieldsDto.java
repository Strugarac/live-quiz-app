package com.livequiz.backend.participant.dto;

import com.livequiz.backend.quiz.domain.FieldRequirement;

public record ParticipantFieldsDto(
        FieldRequirement email,
        FieldRequirement name,
        FieldRequirement surname,
        FieldRequirement personalNumber,
        FieldRequirement faculty
) {
}
