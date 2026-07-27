package com.livequiz.backend.live.dto;

import java.util.UUID;

/**
 * An answer option as participants see it while the question is open.
 * Deliberately has no {@code correct} flag — that would leak the answer.
 */
public record LiveOptionView(
        UUID id,
        String text,
        String imageUrl
) {
}
