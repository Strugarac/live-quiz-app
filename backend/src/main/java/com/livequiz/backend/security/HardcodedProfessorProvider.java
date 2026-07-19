package com.livequiz.backend.security;

import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class HardcodedProfessorProvider implements CurrentUserProvider {

    public static final UUID TEST_PROFESSOR_ID =
            UUID.fromString("00000000-0000-0000-0000-000000000001");

    @Override
    public ProfessorId currentProfessorId() {
        return new ProfessorId(TEST_PROFESSOR_ID);
    }
}
