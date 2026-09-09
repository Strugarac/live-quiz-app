package com.livequiz.backend.security;

import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class HardcodedProfessorProvider implements CurrentUserProvider {

    public static final UUID ADMIN_USER_ID =
            UUID.fromString("00000000-0000-0000-0000-000000000001");

    @Override
    public ProfessorId currentProfessorId() {
        return new ProfessorId(ADMIN_USER_ID);
    }
}
