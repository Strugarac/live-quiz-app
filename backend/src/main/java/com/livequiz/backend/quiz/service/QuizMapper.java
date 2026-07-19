package com.livequiz.backend.quiz.service;

import com.livequiz.backend.quiz.domain.AnswerOption;
import com.livequiz.backend.quiz.domain.Question;
import com.livequiz.backend.quiz.domain.Quiz;
import com.livequiz.backend.quiz.domain.QuizConfig;
import com.livequiz.backend.quiz.dto.CreateQuizRequest;
import com.livequiz.backend.quiz.dto.OptionRequest;
import com.livequiz.backend.quiz.dto.OptionResponse;
import com.livequiz.backend.quiz.dto.QuestionRequest;
import com.livequiz.backend.quiz.dto.QuestionResponse;
import com.livequiz.backend.quiz.dto.QuizConfigDto;
import com.livequiz.backend.quiz.dto.QuizResponse;
import com.livequiz.backend.quiz.dto.QuizSummary;
import com.livequiz.backend.security.ProfessorId;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
public class QuizMapper {

    public Quiz toNewQuiz(CreateQuizRequest request, ProfessorId owner) {
        Quiz quiz = new Quiz();
        quiz.setTitle(request.title());
        quiz.setDescription(request.description());
        quiz.setType(request.type());
        quiz.setOwnerProfessorId(owner.value());
        quiz.setConfig(toConfig(request.config()));
        Optional.ofNullable(request.questions()).orElse(List.of())
                .forEach(q -> quiz.addQuestion(toQuestion(q)));
        return quiz;
    }

    public QuizConfig toConfig(QuizConfigDto dto) {
        QuizConfig config = new QuizConfig();
        applyConfig(config, dto);
        return config;
    }

    public void applyConfig(QuizConfig config, QuizConfigDto dto) {
        config.setEmailRequirement(dto.emailRequirement());
        config.setPersonalNumberRequirement(dto.personalNumberRequirement());
        config.setNameRequirement(dto.nameRequirement());
        config.setSurnameRequirement(dto.surnameRequirement());
        config.setFacultyRequirement(dto.facultyRequirement());
        config.setSaveStatistics(dto.saveStatistics());
        config.setSaveParticipants(dto.saveParticipants());
    }

    public Question toQuestion(QuestionRequest dto) {
        Question question = new Question();
        question.setText(dto.text());
        question.setImageUrl(dto.imageUrl());
        question.setType(dto.type());
        Optional.ofNullable(dto.options()).orElse(List.of())
                .forEach(o -> question.addOption(toOption(o)));
        return question;
    }

    private AnswerOption toOption(OptionRequest dto) {
        AnswerOption option = new AnswerOption();
        option.setText(dto.text());
        option.setImageUrl(dto.imageUrl());
        option.setCorrect(dto.correct());
        return option;
    }

    public QuizResponse toResponse(Quiz quiz) {
        return new QuizResponse(
                quiz.getId(),
                quiz.getTitle(),
                quiz.getDescription(),
                quiz.getType(),
                toConfigDto(quiz.getConfig()),
                quiz.getQuestions().stream().map(this::toQuestionResponse).toList(),
                quiz.getCreatedAt());
    }

    public QuizSummary toSummary(Quiz quiz) {
        return new QuizSummary(
                quiz.getId(),
                quiz.getTitle(),
                quiz.getType(),
                quiz.getQuestions().size(),
                quiz.getCreatedAt());
    }

    public QuestionResponse toQuestionResponse(Question question) {
        return new QuestionResponse(
                question.getId(),
                question.getOrderIndex(),
                question.getText(),
                question.getImageUrl(),
                question.getType(),
                question.getOptions().stream().map(this::toOptionResponse).toList());
    }

    private OptionResponse toOptionResponse(AnswerOption option) {
        return new OptionResponse(
                option.getId(),
                option.getOrderIndex(),
                option.getText(),
                option.getImageUrl(),
                option.isCorrect());
    }

    private QuizConfigDto toConfigDto(QuizConfig config) {
        return new QuizConfigDto(
                config.getEmailRequirement(),
                config.getPersonalNumberRequirement(),
                config.getNameRequirement(),
                config.getSurnameRequirement(),
                config.getFacultyRequirement(),
                config.isSaveStatistics(),
                config.isSaveParticipants());
    }
}
