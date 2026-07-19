package com.livequiz.backend.session.service;

import com.livequiz.backend.session.repository.QuizSessionRepository;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;

@Component
public class JoinTokenGenerator {

    private static final char[] ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789".toCharArray();
    private static final int LENGTH = 8;
    private static final int MAX_ATTEMPTS = 10;

    private final SecureRandom random = new SecureRandom();
    private final QuizSessionRepository repository;

    public JoinTokenGenerator(QuizSessionRepository repository) {
        this.repository = repository;
    }

    public String generateUnique() {
        for (int attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            String token = random(random);
            if (!repository.existsByJoinToken(token)) {
                return token;
            }
        }
        throw new IllegalStateException("Could not generate a unique join token after " + MAX_ATTEMPTS + " attempts");
    }

    private static String random(SecureRandom random) {
        StringBuilder sb = new StringBuilder(LENGTH);
        for (int i = 0; i < LENGTH; i++) {
            sb.append(ALPHABET[random.nextInt(ALPHABET.length)]);
        }
        return sb.toString();
    }
}
