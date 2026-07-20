package com.livequiz.backend.participant.service;

import com.livequiz.backend.participant.repository.ParticipantRepository;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.util.Base64;

@Component
public class ParticipantTokenGenerator {

    private static final int BYTES = 24;
    private static final int MAX_ATTEMPTS = 5;

    private final SecureRandom random = new SecureRandom();
    private final Base64.Encoder encoder = Base64.getUrlEncoder().withoutPadding();
    private final ParticipantRepository repository;

    public ParticipantTokenGenerator(ParticipantRepository repository) {
        this.repository = repository;
    }

    public String generateUnique() {
        for (int attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            String token = random();
            if (repository.findByToken(token).isEmpty()) {
                return token;
            }
        }
        throw new IllegalStateException("Could not generate a unique participant token");
    }

    private String random() {
        byte[] bytes = new byte[BYTES];
        random.nextBytes(bytes);
        return encoder.encodeToString(bytes);
    }
}
