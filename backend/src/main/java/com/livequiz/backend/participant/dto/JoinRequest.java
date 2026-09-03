package com.livequiz.backend.participant.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;

public record JoinRequest(
        @Email @Size(max = 255) String email,
        @Size(max = 255) String name,
        @Size(max = 255) String surname,
        @Size(max = 64) String personalNumber,
        @Size(max = 255) String faculty
) {
}
