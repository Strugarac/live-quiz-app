package com.livequiz.backend.scoring.dto;

import com.livequiz.backend.session.domain.SessionState;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record SessionResultsResponse(
        UUID sessionId,
        String quizTitle,
        SessionState state,
        Instant endedAt,
        int participantCount,
        int questionCount,
        boolean surveyMode,
        boolean saveStatistics,
        boolean saveParticipants,
        List<LeaderboardRow> leaderboard,
        List<QuestionBreakdown> questions
) {
}
