package com.livequiz.backend.live.dto;

import java.util.UUID;

public record LiveOptionView(
        UUID id,
        String text,
        String imageUrl
) {
}
