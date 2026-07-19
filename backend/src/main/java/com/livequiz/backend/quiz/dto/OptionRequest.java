package com.livequiz.backend.quiz.dto;

import jakarta.validation.constraints.Size;

public record OptionRequest(
        @Size(max = 1000) String text,
        @Size(max = 1024) String imageUrl,
        boolean correct
) {
}
