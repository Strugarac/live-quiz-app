package com.livequiz.backend.live.dto;

import java.time.Instant;

/**
 * Envelope for everything pushed over WebSocket. The client switches on {@code type}
 * and reads the matching payload record.
 */
public record LiveEvent<T>(LiveEventType type, Instant at, T payload) {

    public static <T> LiveEvent<T> of(LiveEventType type, T payload) {
        return new LiveEvent<>(type, Instant.now(), payload);
    }
}
