package com.livequiz.backend.config;

import com.livequiz.backend.live.ws.StompAuthChannelInterceptor;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * STOMP over WebSocket for live gameplay.
 * <p>
 * Clients connect to {@code /ws} (SockJS fallback available), subscribe to
 * {@code /topic/session.{joinToken}} and send answers to {@code /app/session/answer}.
 * Broadcasts go through a RabbitMQ STOMP relay so several backend instances can host the
 * same session; set {@code app.websocket.broker.mode=simple} to fall back to Spring's
 * in-memory broker when RabbitMQ is not running.
 */
@Configuration
@EnableWebSocketMessageBroker
@EnableConfigurationProperties(WebSocketProperties.class)
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final WebSocketProperties properties;
    private final StompAuthChannelInterceptor authInterceptor;

    public WebSocketConfig(WebSocketProperties properties, StompAuthChannelInterceptor authInterceptor) {
        this.properties = properties;
        this.authInterceptor = authInterceptor;
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        String[] origins = properties.allowedOrigins().toArray(String[]::new);
        registry.addEndpoint("/ws").setAllowedOriginPatterns(origins);
        registry.addEndpoint("/ws").setAllowedOriginPatterns(origins).withSockJS();
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        WebSocketProperties.Broker broker = properties.broker();
        if (broker.isRelay()) {
            registry.enableStompBrokerRelay("/topic", "/queue")
                    .setRelayHost(broker.host())
                    .setRelayPort(broker.port())
                    .setVirtualHost(broker.virtualHost())
                    .setClientLogin(broker.username())
                    .setClientPasscode(broker.password())
                    .setSystemLogin(broker.username())
                    .setSystemPasscode(broker.password())
                    // Route private replies and the user registry through the broker too,
                    // otherwise they would only reach clients on this instance.
                    .setUserDestinationBroadcast("/topic/live.user-destination")
                    .setUserRegistryBroadcast("/topic/live.user-registry");
        } else {
            registry.enableSimpleBroker("/topic", "/queue");
        }
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(authInterceptor);
    }
}
