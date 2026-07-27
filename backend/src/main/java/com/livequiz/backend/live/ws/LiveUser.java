package com.livequiz.backend.live.ws;

import java.security.Principal;
import java.util.UUID;

/**
 * Identity attached to a STOMP connection by {@link StompAuthChannelInterceptor} and
 * handed to {@code @MessageMapping} methods as the {@link Principal}.
 * <p>
 * A participant is identified by the opaque token issued at join time (Step 4); the host
 * is identified through {@code CurrentUserProvider}, which becomes real login in Step 8.
 */
public record LiveUser(
        Role role,
        UUID sessionId,
        String joinToken,
        /* Set for PARTICIPANT only. */
        UUID participantId,
        String name
) implements Principal {

    public enum Role {PARTICIPANT, HOST}

    public static LiveUser participant(UUID sessionId, String joinToken, UUID participantId) {
        return new LiveUser(Role.PARTICIPANT, sessionId, joinToken, participantId, "participant:" + participantId);
    }

    public static LiveUser host(UUID sessionId, String joinToken, UUID professorId) {
        return new LiveUser(Role.HOST, sessionId, joinToken, null, "host:" + professorId + ":" + sessionId);
    }

    public boolean isHost() {
        return role == Role.HOST;
    }

    @Override
    public String getName() {
        return name;
    }
}
