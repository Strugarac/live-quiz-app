package com.livequiz.backend.quiz.service;

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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class QuizService {

    private final QuizRepository quizRepository;
    private final QuizMapper mapper;
    private final QuestionValidator questionValidator;
    private final CurrentUserProvider currentUser;

    public QuizService(QuizRepository quizRepository,
                       QuizMapper mapper,
                       QuestionValidator questionValidator,
                       CurrentUserProvider currentUser) {
        this.quizRepository = quizRepository;
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
        return quizRepository.findByOwnerProfessorIdOrderByCreatedAtDesc(ownerId()).stream()
                .map(mapper::toSummary)
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

    public void delete(UUID quizId) {
        quizRepository.delete(loadOwned(quizId));
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
