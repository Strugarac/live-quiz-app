package com.livequiz.backend.session.domain;

import com.livequiz.backend.common.domain.BaseEntity;
import com.livequiz.backend.quiz.domain.Quiz;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "quiz_session")
@Getter
@Setter
@NoArgsConstructor
public class QuizSession extends BaseEntity {

    public static final int NOT_STARTED = -1;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "quiz_id", nullable = false)
    private Quiz quiz;

    @Column(name = "host_professor_id", nullable = false)
    private UUID hostProfessorId;

    @Column(name = "join_token", nullable = false, unique = true, length = 16)
    private String joinToken;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SessionState state = SessionState.LOBBY;

    @Column(name = "current_question_index", nullable = false)
    private int currentQuestionIndex = NOT_STARTED;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "ended_at")
    private Instant endedAt;

    private int questionCount() {
        return quiz.getQuestions().size();
    }

    public boolean isStarted() {
        return currentQuestionIndex != NOT_STARTED;
    }

    public void start() {
        requireState(SessionState.LOBBY, "start");
        if (questionCount() == 0) {
            throw new IllegalSessionState("Cannot start a session whose quiz has no questions");
        }
        state = SessionState.ACTIVE;
        currentQuestionIndex = 0;
        startedAt = Instant.now();
    }

    public void advance() {
        requireState(SessionState.ACTIVE, "advance");
        if (currentQuestionIndex + 1 >= questionCount()) {
            throw new IllegalSessionState("No more questions; end the session instead");
        }
        currentQuestionIndex++;
    }

    public void end() {
        if (state == SessionState.ENDED) {
            throw new IllegalSessionState("Session is already ended");
        }
        state = SessionState.ENDED;
        endedAt = Instant.now();
    }

    private void requireState(SessionState expected, String action) {
        if (state != expected) {
            throw new IllegalSessionState(
                    "Cannot %s a session in state %s (expected %s)".formatted(action, state, expected));
        }
    }

    public static class IllegalSessionState extends RuntimeException {
        public IllegalSessionState(String message) {
            super(message);
        }
    }
}
