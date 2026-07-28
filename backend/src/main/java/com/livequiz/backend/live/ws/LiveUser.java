package com.livequiz.backend.live.ws;

import java.security.Principal;
import java.util.UUID;

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
