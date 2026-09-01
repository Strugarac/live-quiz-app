package com.livequiz.backend.live.dto;

public record OwnStandingView(
        long score,
        long correctCount,
        int rank
) {
}
