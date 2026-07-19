package com.livequiz.backend.session.service;

import com.livequiz.backend.common.exception.ConflictException;
import com.livequiz.backend.common.exception.NotFoundException;
import com.livequiz.backend.quiz.domain.Quiz;
import com.livequiz.backend.quiz.repository.QuizRepository;
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

    public SessionService(QuizSessionRepository sessionRepository,
                          QuizRepository quizRepository,
                          JoinTokenGenerator joinTokenGenerator,
                          SessionMapper mapper,
                          CurrentUserProvider currentUser) {
        this.sessionRepository = sessionRepository;
        this.quizRepository = quizRepository;
        this.joinTokenGenerator = joinTokenGenerator;
        this.mapper = mapper;
        this.currentUser = currentUser;
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

    public SessionResponse start(UUID sessionId) {
        QuizSession session = loadOwned(sessionId);
        session.start();
        return mapper.toResponse(session);
    }

    public SessionResponse advance(UUID sessionId) {
        QuizSession session = loadOwned(sessionId);
        session.advance();
        return mapper.toResponse(session);
    }

    public SessionResponse end(UUID sessionId) {
        QuizSession session = loadOwned(sessionId);
        session.end();
        return mapper.toResponse(session);
    }

    private QuizSession loadOwned(UUID sessionId) {
        return sessionRepository.findByIdAndHostProfessorId(sessionId, ownerId())
                .orElseThrow(() -> NotFoundException.of("Session", sessionId));
    }

    private UUID ownerId() {
        return currentUser.currentProfessorId().value();
    }
}
