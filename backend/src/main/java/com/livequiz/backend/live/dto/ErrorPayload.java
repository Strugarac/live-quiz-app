package com.livequiz.backend.live.dto;

public record ErrorPayload(
        String code,
        String message
) {
}
