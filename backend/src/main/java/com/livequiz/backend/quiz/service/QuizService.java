package com.livequiz.backend.quiz.service;

import com.livequiz.backend.common.exception.ConflictException;
import com.livequiz.backend.common.exception.NotFoundException;
import com.livequiz.backend.quiz.domain.Question;
import com.livequiz.backend.quiz.domain.Quiz;
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
        quiz.setTitle(request.title());
        quiz.setDescription(request.description());
        quiz.setType(request.type());
        mapper.applyConfig(quiz.getConfig(), request.config());
        return mapper.toResponse(quiz);
    }

    /**
     * Deletes the quiz and, by database cascade, every session hosted from it along with
     * their participants and answers. Refused while a session is still in LOBBY or ACTIVE,
     * so a lecture in progress cannot be destroyed by a mis-click.
     */
    public void delete(UUID quizId) {
        Quiz quiz = loadOwned(quizId);
        if (sessionRepository.existsByQuiz_IdAndStateIn(quizId, SessionState.LIVE_STATES)) {
            throw new ConflictException(
                    "This quiz has a session that has not ended yet. End that session before deleting the quiz.");
        }
        quizRepository.delete(quiz);
    }

    public QuestionResponse addQuestion(UUID quizId, QuestionRequest request) {
        questionValidator.validate(request);
        Quiz quiz = loadOwned(quizId);
        Question question = mapper.toQuestion(request);
        quiz.addQuestion(question);
        quizRepository.flush();
        return mapper.toQuestionResponse(question);
    }

    public QuestionResponse updateQuestion(UUID quizId, UUID questionId, QuestionRequest request) {
        questionValidator.validate(request);
        Quiz quiz = loadOwned(quizId);
        Question question = findQuestion(quiz, questionId);

        question.setText(request.text());
        question.setImageUrl(request.imageUrl());
        question.setType(request.type());
        question.clearOptions();
        Question rebuilt = mapper.toQuestion(request);
        rebuilt.getOptions().forEach(question::addOption);

        quizRepository.flush();
        return mapper.toQuestionResponse(question);
    }

    public void deleteQuestion(UUID quizId, UUID questionId) {
        Quiz quiz = loadOwned(quizId);
        quiz.removeQuestion(findQuestion(quiz, questionId));
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
