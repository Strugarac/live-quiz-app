package com.livequiz.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

@ConfigurationProperties(prefix = "app.websocket")
public record WebSocketProperties(
        List<String> allowedOrigins,
        Broker broker
) {

    public record Broker(
            Mode mode,
            String host,
            int port,
            String virtualHost,
            String username,
            String password
    ) {
        public enum Mode {RELAY, SIMPLE}

        public boolean isRelay() {
            return mode == Mode.RELAY;
        }
    }
}
