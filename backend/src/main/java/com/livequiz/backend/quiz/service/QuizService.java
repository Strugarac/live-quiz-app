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

    private static final int TITLE_MAX_LENGTH = 255;

    private static final String COPY_SUFFIX = " COPY";

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
            boolean surveyMode = request.config().surveyMode();
            request.questions().forEach(question -> questionValidator.validate(question, surveyMode));
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

    public QuizResponse copy(UUID quizId) {
        Quiz source = loadOwned(quizId);
        Quiz copy = mapper.toCopy(source, copyTitle(source.getTitle()));
        return mapper.toResponse(quizRepository.saveAndFlush(copy));
    }

    private static String copyTitle(String title) {
        int room = TITLE_MAX_LENGTH - COPY_SUFFIX.length();
        String base = title.length() > room ? title.substring(0, room).stripTrailing() : title;
        return base + COPY_SUFFIX;
    }

    public QuizResponse update(UUID quizId, UpdateQuizRequest request) {
        Quiz quiz = loadOwned(quizId);
        if (quiz.getType() != request.type()
                && sessionRepository.existsByQuiz_IdAndStateIn(quizId, SessionState.LIVE_STATES)) {
            throw new ConflictException(
                    "This quiz has a session that has not ended yet, so its type cannot be changed. "
                            + "End that session first.");
        }

        boolean surveyModeChanged = quiz.getConfig().isSurveyMode() != request.config().surveyMode();
        if (surveyModeChanged
                && sessionRepository.existsByQuiz_IdAndStateIn(quizId, SessionState.LIVE_STATES)) {
            throw new ConflictException(
                    "This quiz has a session that has not ended yet, so survey mode cannot be "
                            + "changed. End that session first.");
        }
        if (surveyModeChanged && !request.config().surveyMode()) {
            List<Integer> ungradeable = quiz.getQuestions().stream()
                    .filter(question -> !questionValidator.hasCorrectOptions(question))
                    .map(question -> question.getOrderIndex() + 1)
                    .toList();
            if (!ungradeable.isEmpty()) {
                throw new ConflictException(
                        "Turning survey mode off makes this a scored quiz, but these questions have "
                                + "no correct answer marked: " + ungradeable
                                + ". Mark one on each, or leave survey mode on.");
            }
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

    public QuestionResponse addQuestion(UUID quizId, QuestionRequest request) {
        Quiz quiz = loadOwned(quizId);
        questionValidator.validate(request, quiz.getConfig().isSurveyMode());
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
        Quiz quiz = loadOwned(quizId);
        questionValidator.validate(request, quiz.getConfig().isSurveyMode());
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
