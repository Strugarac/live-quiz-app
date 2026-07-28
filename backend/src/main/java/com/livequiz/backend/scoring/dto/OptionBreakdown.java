package com.livequiz.backend.scoring.dto;

import java.util.UUID;

public record OptionBreakdown(
        UUID optionId,
        String text,
        boolean correct,
        long chosenCount
) {
}
