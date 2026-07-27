package com.livequiz.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;

/**
 * @param allowedOrigins browser origins allowed to open the WebSocket handshake
 * @param broker         which STOMP broker backs {@code /topic} — see {@link Broker}
 */
@ConfigurationProperties(prefix = "app.websocket")
public record WebSocketProperties(
        List<String> allowedOrigins,
        Broker broker
) {

    /**
     * @param mode     {@code relay} sends every broadcast through RabbitMQ so several
     *                 backend instances share one session; {@code simple} uses Spring's
     *                 in-memory broker, which only works for a single instance
     * @param host        RabbitMQ host
     * @param port        RabbitMQ STOMP port (61613 with the rabbitmq_stomp plugin enabled)
     * @param virtualHost RabbitMQ vhost, "/" by default. Must be set explicitly: without it
     *                    Spring sends the relay host as the STOMP {@code host} header and
     *                    RabbitMQ rejects the CONNECT with "Virtual host 'localhost' access denied"
     * @param username    RabbitMQ user for both the client and system relay connections
     */
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
