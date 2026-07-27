package com.livequiz.backend.session.service;

import com.livequiz.backend.common.exception.ConflictException;
import com.livequiz.backend.common.exception.NotFoundException;
import com.livequiz.backend.live.dto.LiveEventType;
import com.livequiz.backend.live.dto.QuestionClosedPayload;
import com.livequiz.backend.live.dto.SessionEndedPayload;
import com.livequiz.backend.live.repository.ParticipantAnswerRepository;
import com.livequiz.backend.live.service.LiveEventPublisher;
import com.livequiz.backend.live.service.LiveMapper;
import com.livequiz.backend.quiz.domain.Question;
import com.livequiz.backend.quiz.domain.Quiz;
import com.livequiz.backend.quiz.repository.QuizRepository;
import com.livequiz.backend.scoring.dto.LeaderboardPayload;
import com.livequiz.backend.scoring.service.ScoringService;
import com.livequiz.backend.session.domain.QuizSession;
import com.livequiz.backend.session.domain.SessionState;
import com.livequiz.backend.session.dto.CreateSessionRequest;
import com.livequiz.backend.session.dto.SessionResponse;
import com.livequiz.backend.session.repository.QuizSessionRepository;
import com.livequiz.backend.security.CurrentUserProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class SessionService {

    private static final List<SessionState> LIVE_STATES = List.of(SessionState.LOBBY, SessionState.ACTIVE);

    private final QuizSessionRepository sessionRepository;
    private final QuizRepository quizRepository;
    private final JoinTokenGenerator joinTokenGenerator;
    private final SessionMapper mapper;
    private final CurrentUserProvider currentUser;
    private final ParticipantAnswerRepository answerRepository;
    private final LiveEventPublisher publisher;
    private final LiveMapper liveMapper;
    private final ScoringService scoringService;

    public SessionService(QuizSessionRepository sessionRepository,
                          QuizRepository quizRepository,
                          JoinTokenGenerator joinTokenGenerator,
                          SessionMapper mapper,
                          CurrentUserProvider currentUser,
                          ParticipantAnswerRepository answerRepository,
                          LiveEventPublisher publisher,
                          LiveMapper liveMapper,
                          ScoringService scoringService) {
        this.sessionRepository = sessionRepository;
        this.quizRepository = quizRepository;
        this.joinTokenGenerator = joinTokenGenerator;
        this.mapper = mapper;
        this.currentUser = currentUser;
        this.answerRepository = answerRepository;
        this.publisher = publisher;
        this.liveMapper = liveMapper;
        this.scoringService = scoringService;
    }

    public SessionResponse create(CreateSessionRequest request) {
        Quiz quiz = quizRepository.findByIdAndOwnerProfessorId(request.quizId(), ownerId())
                .orElseThrow(() -> NotFoundException.of("Quiz", request.quizId()));

        if (sessionRepository.existsByQuiz_IdAndStateIn(quiz.getId(), LIVE_STATES)) {
            throw new ConflictException("This quiz already has an active session");
        }

        QuizSession session = new QuizSession();
        session.setQuiz(quiz);
        session.setHostProfessorId(ownerId());
        session.setJoinToken(joinTokenGenerator.generateUnique());
        return mapper.toResponse(sessionRepository.saveAndFlush(session));
    }

    @Transactional(readOnly = true)
    public List<SessionResponse> list() {
        return sessionRepository.findByHostProfessorIdOrderByCreatedAtDesc(ownerId()).stream()
                .map(mapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public SessionResponse get(UUID sessionId) {
        return mapper.toResponse(loadOwned(sessionId));
    }

    /** The cumulative leaderboard for a session, on demand (also usable after the session ends). */
    @Transactional(readOnly = true)
    public LeaderboardPayload leaderboard(UUID sessionId) {
        return scoringService.leaderboard(loadOwned(sessionId));
    }

    public SessionResponse start(UUID sessionId) {
        QuizSession session = loadOwned(sessionId);
        session.start();
        broadcastQuestionOpened(session);
        return mapper.toResponse(session);
    }

    /**
     * Moves to the next question. If the current one is still open it is closed first, so
     * the reveal still reaches the clients even when the host skips straight ahead.
     */
    public SessionResponse advance(UUID sessionId) {
        QuizSession session = loadOwned(sessionId);
        if (session.isQuestionOpen()) {
            closeCurrentQuestion(session);
        }
        session.advance();
        broadcastQuestionOpened(session);
        return mapper.toResponse(session);
    }

    /** Stops accepting answers for the current question and reveals the correct options. */
    public SessionResponse closeQuestion(UUID sessionId) {
        QuizSession session = loadOwned(sessionId);
        closeCurrentQuestion(session);
        return mapper.toResponse(session);
    }

    public SessionResponse end(UUID sessionId) {
        QuizSession session = loadOwned(sessionId);
        if (session.getState() == SessionState.ACTIVE && session.isQuestionOpen()) {
            closeCurrentQuestion(session);
        }
        session.end();
        publisher.toParticipants(session.getJoinToken(), LiveEventType.SESSION_ENDED, new SessionEndedPayload(
                session.getId(), session.questionCount(), session.getEndedAt()));
        return mapper.toResponse(session);
    }

    private void closeCurrentQuestion(QuizSession session) {
        Question question = session.currentQuestion();
        session.closeQuestion();
        scoringService.gradeQuestion(session, question);
        publisher.toParticipants(session.getJoinToken(), LiveEventType.QUESTION_CLOSED, new QuestionClosedPayload(
                question.getId(),
                session.getCurrentQuestionIndex(),
                liveMapper.correctOptionIds(question),
                answerRepository.countBySession_IdAndQuestion_Id(session.getId(), question.getId()),
                session.hasNextQuestion()));
        publisher.toHost(session.getJoinToken(), LiveEventType.LEADERBOARD_UPDATED,
                scoringService.leaderboard(session));
    }

    private void broadcastQuestionOpened(QuizSession session) {
        publisher.toParticipants(session.getJoinToken(), LiveEventType.QUESTION_OPENED,
                liveMapper.toQuestionView(session));
    }

    private QuizSession loadOwned(UUID sessionId) {
        return sessionRepository.findByIdAndHostProfessorId(sessionId, ownerId())
                .orElseThrow(() -> NotFoundException.of("Session", sessionId));
    }

    private UUID ownerId() {
        return currentUser.currentProfessorId().value();
    }
}
