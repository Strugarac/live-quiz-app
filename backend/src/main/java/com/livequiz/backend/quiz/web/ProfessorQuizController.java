package com.livequiz.backend.quiz.web;

import com.livequiz.backend.quiz.dto.CreateQuizRequest;
import com.livequiz.backend.quiz.dto.QuestionRequest;
import com.livequiz.backend.quiz.dto.QuestionResponse;
import com.livequiz.backend.quiz.dto.QuizResponse;
import com.livequiz.backend.quiz.dto.QuizSummary;
import com.livequiz.backend.quiz.dto.UpdateQuizRequest;
import com.livequiz.backend.quiz.service.QuizService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/professor/quizzes")
public class ProfessorQuizController {

    private final QuizService quizService;

    public ProfessorQuizController(QuizService quizService) {
        this.quizService = quizService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public QuizResponse create(@Valid @RequestBody CreateQuizRequest request) {
        return quizService.create(request);
    }

    @GetMapping
    public List<QuizSummary> list() {
        return quizService.list();
    }

    @GetMapping("/{quizId}")
    public QuizResponse get(@PathVariable UUID quizId) {
        return quizService.get(quizId);
    }

    @PutMapping("/{quizId}")
    public QuizResponse update(@PathVariable UUID quizId, @Valid @RequestBody UpdateQuizRequest request) {
        return quizService.update(quizId, request);
    }

    @DeleteMapping("/{quizId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID quizId) {
        quizService.delete(quizId);
    }

    @PostMapping("/{quizId}/questions")
    @ResponseStatus(HttpStatus.CREATED)
    public QuestionResponse addQuestion(@PathVariable UUID quizId, @Valid @RequestBody QuestionRequest request) {
        return quizService.addQuestion(quizId, request);
    }

    @PutMapping("/{quizId}/questions/{questionId}")
    public QuestionResponse updateQuestion(@PathVariable UUID quizId,
                                           @PathVariable UUID questionId,
                                           @Valid @RequestBody QuestionRequest request) {
        return quizService.updateQuestion(quizId, questionId, request);
    }

    @DeleteMapping("/{quizId}/questions/{questionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteQuestion(@PathVariable UUID quizId, @PathVariable UUID questionId) {
        quizService.deleteQuestion(quizId, questionId);
    }
}
