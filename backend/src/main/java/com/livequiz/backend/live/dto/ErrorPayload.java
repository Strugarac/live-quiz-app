package com.livequiz.backend.live.dto;

/** The WebSocket counterpart of the REST ApiError: why the client's message was rejected. */
public record ErrorPayload(
        String code,
        String message
) {
}
