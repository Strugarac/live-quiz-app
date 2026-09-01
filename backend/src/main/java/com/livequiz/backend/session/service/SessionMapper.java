package com.livequiz.backend.session.service;

import com.livequiz.backend.session.domain.QuizSession;
import com.livequiz.backend.session.dto.SessionResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.List;

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
                session.getQuiz().getType(),
                session.getQuiz().getConfig().isSurveyMode(),
                session.getState(),
                session.getJoinToken(),
                joinUrl(session.getJoinToken()),
                session.hasCurrentQuestion() ? session.getCurrentQuestionIndex() : null,
                List.copyOf(session.getAskedQuestionIds()),
                session.isQuestionOpen(),
                session.getQuiz().getQuestions().size(),
                session.getCreatedAt(),
                session.getStartedAt(),
                session.getEndedAt());
    }

    private String joinUrl(String token) {
        return joinBaseUrl + "/" + token;
    }
}
