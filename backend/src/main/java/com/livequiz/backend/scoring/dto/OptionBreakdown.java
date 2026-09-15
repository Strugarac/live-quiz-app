package com.livequiz.backend.scoring.dto;

import java.util.UUID;

public record OptionBreakdown(
        UUID optionId,
        String text,
        String imageUrl,
        boolean correct,
        long chosenCount
) {
}
