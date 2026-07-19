package com.livequiz.backend.quiz.dto;

import java.util.UUID;

public record OptionResponse(
        UUID id,
        int orderIndex,
        String text,
        String imageUrl,
        boolean correct
) {
}
