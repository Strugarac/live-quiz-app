package com.livequiz.backend.session.service;

import com.livequiz.backend.participant.repository.ParticipantRepository;
import com.livequiz.backend.session.domain.QuizSession;
import com.livequiz.backend.session.dto.SessionResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Component
public class SessionMapper {

    private final String joinBaseUrl;
    private final ParticipantRepository participantRepository;

    public SessionMapper(@Value("${app.join-base-url}") String joinBaseUrl,
                         ParticipantRepository participantRepository) {
        this.joinBaseUrl = joinBaseUrl;
        this.participantRepository = participantRepository;
    }

    public SessionResponse toResponse(QuizSession session) {
        return toResponse(session, participantRepository.countBySession_Id(session.getId()));
    }

    public List<SessionResponse> toResponses(List<QuizSession> sessions) {
        if (sessions.isEmpty()) {
            return List.of();
        }
        Map<UUID, Long> counts = participantRepository.countBySessionIds(
                        sessions.stream().map(QuizSession::getId).toList()).stream()
                .collect(Collectors.toMap(
                        ParticipantRepository.SessionParticipantCount::getSessionId,
                        ParticipantRepository.SessionParticipantCount::getTotal));
        return sessions.stream()
                .map(session -> toResponse(session, counts.getOrDefault(session.getId(), 0L)))
                .toList();
    }

    private SessionResponse toResponse(QuizSession session, long participantCount) {
        return new SessionResponse(
                session.getId(),
                session.getQuiz().getId(),
                session.getQuiz().getTitle(),
                session.getQuiz().getType(),
                session.getQuiz().getConfig().isSurveyMode(),
                session.getQuiz().getConfig().isSaveParticipants(),
                session.getQuiz().getConfig().isSaveStatistics(),
                session.getState(),
                session.getJoinToken(),
                joinUrl(session.getJoinToken()),
                session.hasCurrentQuestion() ? session.getCurrentQuestionIndex() : null,
                List.copyOf(session.getAskedQuestionIds()),
                session.isQuestionOpen(),
                session.getQuiz().getQuestions().size(),
                participantCount,
                session.getCreatedAt(),
                session.getStartedAt(),
                session.getEndedAt());
    }

    private String joinUrl(String token) {
        return joinBaseUrl + "/" + token;
    }
}
