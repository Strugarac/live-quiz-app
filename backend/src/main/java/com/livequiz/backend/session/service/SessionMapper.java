package com.livequiz.backend.session.service;

import com.livequiz.backend.session.domain.QuizSession;
import com.livequiz.backend.session.dto.SessionResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class SessionMapper {

    private final String joinBaseUrl;

    public SessionMapper(@Value("${app.join-base-url}") String joinBaseUrl) {
        this.joinBaseUrl = joinBaseUrl;
    }

    public SessionResponse toResponse(QuizSession session) {
        return new SessionResponse(
                session.getId(),
                session.getQuiz().getId(),
                session.getQuiz().getTitle(),
                session.getState(),
                session.getJoinToken(),
                joinUrl(session.getJoinToken()),
                session.isStarted() ? session.getCurrentQuestionIndex() : null,
                session.getQuiz().getQuestions().size(),
                session.getCreatedAt(),
                session.getStartedAt(),
                session.getEndedAt());
    }

    private String joinUrl(String token) {
        return joinBaseUrl + "/" + token;
    }
}
