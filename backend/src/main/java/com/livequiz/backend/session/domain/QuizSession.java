package com.livequiz.backend.session.domain;

import com.livequiz.backend.common.domain.BaseEntity;
import com.livequiz.backend.quiz.domain.Question;
import com.livequiz.backend.quiz.domain.Quiz;
import com.livequiz.backend.quiz.domain.QuizType;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "quiz_session")
@Getter
@Setter
@NoArgsConstructor
public class QuizSession extends BaseEntity {

    public static final int NO_QUESTION = -1;

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

    /**
     * Position of the question being shown within the quiz, or {@link #NO_QUESTION}. This
     * identifies the current question; it is NOT a progress marker — a flexible session
     * jumps around, so {@link #askedQuestionIds} is what says how far it has got.
     */
    @Column(name = "current_question_index", nullable = false)
    private int currentQuestionIndex = NO_QUESTION;

    /**
     * Questions already presented, in presentation order. A question appears at most once,
     * so everything else in the quiz is still available to ask.
     */
    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "session_asked_question", joinColumns = @JoinColumn(name = "session_id"))
    @Column(name = "question_id", nullable = false)
    @OrderColumn(name = "position")
    private List<UUID> askedQuestionIds = new ArrayList<>();

    /** True while the current question still accepts answers. Closed manually by the host. */
    @Column(name = "question_open", nullable = false)
    private boolean questionOpen = false;

    /** When the current question went live; answer speed is measured from this instant. */
    @Column(name = "current_question_opened_at")
    private Instant currentQuestionOpenedAt;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "ended_at")
    private Instant endedAt;

    public int questionCount() {
        return quiz.getQuestions().size();
    }

    /** A flexible quiz lets the host choose each question instead of running a fixed order. */
    public boolean isFlexible() {
        return quiz.getType() == QuizType.FLEXIBLE;
    }

    /**
     * Whether a question is currently selected. A flexible session is ACTIVE but has no
     * current question between {@link #start()} and the host's first pick, so this is not
     * the same as "the session has started".
     */
    public boolean hasCurrentQuestion() {
        return currentQuestionIndex != NO_QUESTION;
    }

    /** Questions of this quiz that have not been presented yet, in quiz order. */
    public List<Question> remainingQuestions() {
        Set<UUID> asked = new HashSet<>(askedQuestionIds);
        return quiz.getQuestions().stream()
                .filter(question -> !asked.contains(question.getId()))
                .toList();
    }

    public boolean hasNextQuestion() {
        return !remainingQuestions().isEmpty();
    }

    /** The presentation position of the current question, 1-based. */
    public int askedPosition() {
        return askedQuestionIds.size();
    }

    public Question currentQuestion() {
        if (!hasCurrentQuestion()) {
            throw new IllegalSessionState("No question is open yet");
        }
        return quiz.getQuestions().get(currentQuestionIndex);
    }

    public void start() {
        requireState(SessionState.LOBBY, "start");
        if (questionCount() == 0) {
            throw new IllegalSessionState("Cannot start a session whose quiz has no questions");
        }
        state = SessionState.ACTIVE;
        startedAt = Instant.now();
        // A flexible session opens nothing yet: the host chooses every question including
        // the first, so it sits ACTIVE with no current question until that choice is made.
        if (!isFlexible()) {
            openQuestionAt(0);
        }
    }

    public void advance() {
        requireState(SessionState.ACTIVE, "advance");
        if (isFlexible()) {
            throw new IllegalSessionState(
                    "This quiz is flexible; choose which question to open instead of advancing");
        }
        if (currentQuestionIndex + 1 >= questionCount()) {
            throw new IllegalSessionState("No more questions; end the session instead");
        }
        openQuestionAt(currentQuestionIndex + 1);
    }

    /**
     * Presents a specific question. Flexible quizzes only, and only a question that has not
     * been asked yet — going back would reopen scoring state that has already been closed,
     * which is the same reason there is no "previous question" navigation.
     */
    public void openQuestion(Question question) {
        requireState(SessionState.ACTIVE, "open a question of");
        if (!isFlexible()) {
            throw new IllegalSessionState(
                    "This quiz is static; its questions run in a fixed order");
        }
        if (askedQuestionIds.contains(question.getId())) {
            throw new IllegalSessionState("That question has already been asked in this session");
        }
        int index = indexOf(question);
        if (index == NO_QUESTION) {
            throw new IllegalSessionState("That question does not belong to this session's quiz");
        }
        openQuestionAt(index);
    }

    /**
     * Stops accepting answers for the current question so the host can reveal the
     * correct options. Advancing closes the question implicitly, so this is only
     * needed when the host wants a reveal before moving on.
     */
    public void closeQuestion() {
        requireState(SessionState.ACTIVE, "close the question of");
        if (!questionOpen) {
            throw new IllegalSessionState("The current question is already closed");
        }
        questionOpen = false;
    }

    public void end() {
        if (state == SessionState.ENDED) {
            throw new IllegalSessionState("Session is already ended");
        }
        state = SessionState.ENDED;
        questionOpen = false;
        endedAt = Instant.now();
    }

    private int indexOf(Question question) {
        List<Question> questions = quiz.getQuestions();
        for (int i = 0; i < questions.size(); i++) {
            if (questions.get(i).getId().equals(question.getId())) {
                return i;
            }
        }
        return NO_QUESTION;
    }

    private void openQuestionAt(int index) {
        currentQuestionIndex = index;
        askedQuestionIds.add(quiz.getQuestions().get(index).getId());
        questionOpen = true;
        currentQuestionOpenedAt = Instant.now();
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
