package com.livequiz.backend.quiz.service;

import com.livequiz.backend.common.exception.ConflictException;
import com.livequiz.backend.common.exception.NotFoundException;
import com.livequiz.backend.quiz.domain.Question;
import com.livequiz.backend.quiz.domain.Quiz;
import com.livequiz.backend.quiz.domain.QuizType;
import com.livequiz.backend.quiz.dto.CreateQuizRequest;
import com.livequiz.backend.quiz.dto.QuestionRequest;
import com.livequiz.backend.quiz.dto.QuestionResponse;
import com.livequiz.backend.quiz.dto.QuizResponse;
import com.livequiz.backend.quiz.dto.QuizSummary;
import com.livequiz.backend.quiz.dto.UpdateQuizRequest;
import com.livequiz.backend.quiz.repository.QuizRepository;
import com.livequiz.backend.security.CurrentUserProvider;
import com.livequiz.backend.session.domain.SessionState;
import com.livequiz.backend.session.repository.QuizSessionRepository;
import com.livequiz.backend.session.repository.QuizSessionRepository.QuizSessionCount;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class QuizService {

    private final QuizRepository quizRepository;
    private final QuizSessionRepository sessionRepository;
    private final QuizMapper mapper;
    private final QuestionValidator questionValidator;
    private final CurrentUserProvider currentUser;

    public QuizService(QuizRepository quizRepository,
                       QuizSessionRepository sessionRepository,
                       QuizMapper mapper,
                       QuestionValidator questionValidator,
                       CurrentUserProvider currentUser) {
        this.quizRepository = quizRepository;
        this.sessionRepository = sessionRepository;
        this.mapper = mapper;
        this.questionValidator = questionValidator;
        this.currentUser = currentUser;
    }

    public QuizResponse create(CreateQuizRequest request) {
        if (request.questions() != null) {
            request.questions().forEach(questionValidator::validate);
        }
        Quiz quiz = mapper.toNewQuiz(request, currentUser.currentProfessorId());
        return mapper.toResponse(quizRepository.saveAndFlush(quiz));
    }

    @Transactional(readOnly = true)
    public List<QuizSummary> list() {
        List<Quiz> quizzes = quizRepository.findByOwnerProfessorIdOrderByCreatedAtDesc(ownerId());
        if (quizzes.isEmpty()) {
            return List.of();
        }
        // One grouped count for the whole page rather than a query per quiz.
        Map<UUID, Long> sessionCounts = sessionRepository
                .countByQuizIdIn(quizzes.stream().map(Quiz::getId).toList()).stream()
                .collect(Collectors.toMap(QuizSessionCount::getQuizId, QuizSessionCount::getTotal));

        return quizzes.stream()
                .map(quiz -> mapper.toSummary(quiz, sessionCounts.getOrDefault(quiz.getId(), 0L)))
                .toList();
    }

    @Transactional(readOnly = true)
    public QuizResponse get(UUID quizId) {
        return mapper.toResponse(loadOwned(quizId));
    }

    public QuizResponse update(UUID quizId, UpdateQuizRequest request) {
        Quiz quiz = loadOwned(quizId);
        // The type decides how a running session navigates, so switching it underneath one
        // is incoherent: flexible to static would resume the fixed order at the position
        // after the current question, re-asking anything the host had skipped past.
        if (quiz.getType() != request.type()
                && sessionRepository.existsByQuiz_IdAndStateIn(quizId, SessionState.LIVE_STATES)) {
            throw new ConflictException(
                    "This quiz has a session that has not ended yet, so its type cannot be changed. "
                            + "End that session first.");
        }
        quiz.setTitle(request.title());
        quiz.setDescription(request.description());
        quiz.setType(request.type());
        mapper.applyConfig(quiz.getConfig(), request.config());
        return mapper.toResponse(quiz);
    }

    public void delete(UUID quizId) {
        Quiz quiz = loadOwned(quizId);
        if (sessionRepository.existsByQuiz_IdAndStateIn(quizId, SessionState.LIVE_STATES)) {
            throw new ConflictException(
                    "This quiz has a session that has not ended yet. End that session before deleting the quiz.");
        }
        quizRepository.delete(quiz);
    }

    /**
     * Adding to a quiz with a session in progress is a FLEXIBLE-only privilege: the host
     * picks each question there, so a late addition simply joins the pool of questions
     * still available to ask. A static quiz runs a fixed order that participants are
     * already partway through, so its question list is frozen once the session is running.
     */
    public QuestionResponse addQuestion(UUID quizId, QuestionRequest request) {
        questionValidator.validate(request);
        Quiz quiz = loadOwned(quizId);
        if (quiz.getType() != QuizType.FLEXIBLE
                && sessionRepository.existsByQuiz_IdAndStateIn(quizId, List.of(SessionState.ACTIVE))) {
            throw new ConflictException(
                    "This quiz is running and is not flexible, so questions cannot be added to it now. "
                            + "End the session first, or make the quiz flexible before starting it.");
        }
        Question question = mapper.toQuestion(request);
        quiz.addQuestion(question);
        quizRepository.flush();
        return mapper.toQuestionResponse(question);
    }

    public QuestionResponse updateQuestion(UUID quizId, UUID questionId, QuestionRequest request) {
        questionValidator.validate(request);
        Quiz quiz = loadOwned(quizId);
        Question question = findQuestion(quiz, questionId);
        requireNotAsked(questionId, "edited");

        Question rebuilt = mapper.toQuestion(request);
        question.setText(rebuilt.getText());
        question.setImageUrl(rebuilt.getImageUrl());
        question.setType(rebuilt.getType());
        question.clearOptions();
        rebuilt.getOptions().forEach(question::addOption);

        quizRepository.flush();
        return mapper.toQuestionResponse(question);
    }

    public void deleteQuestion(UUID quizId, UUID questionId) {
        Quiz quiz = loadOwned(quizId);
        Question question = findQuestion(quiz, questionId);
        requireNotAsked(questionId, "deleted");
        quiz.removeQuestion(question);
    }

    /**
     * Refuses to touch a question a running session has already presented. Participants
     * have seen it and their answers may already be graded against its options, so a change
     * would rewrite history mid-lecture. Questions not yet asked stay editable, which is
     * what lets a flexible session be adjusted while it runs.
     */
    private void requireNotAsked(UUID questionId, String action) {
        if (sessionRepository.existsAskedInSessionStates(questionId, SessionState.LIVE_STATES)) {
            throw new ConflictException(
                    "This question has already been asked in a session that is still running, "
                            + "so it cannot be " + action + " now.");
        }
    }

    private Quiz loadOwned(UUID quizId) {
        return quizRepository.findByIdAndOwnerProfessorId(quizId, ownerId())
                .orElseThrow(() -> NotFoundException.of("Quiz", quizId));
    }

    private Question findQuestion(Quiz quiz, UUID questionId) {
        return quiz.getQuestions().stream()
                .filter(q -> q.getId().equals(questionId))
                .findFirst()
                .orElseThrow(() -> NotFoundException.of("Question", questionId));
    }

    private UUID ownerId() {
        return currentUser.currentProfessorId().value();
    }
}
