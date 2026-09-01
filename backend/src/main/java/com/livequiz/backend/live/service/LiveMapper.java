package com.livequiz.backend.live.service;

import com.livequiz.backend.live.domain.ParticipantAnswer;
import com.livequiz.backend.live.dto.LiveOptionView;
import com.livequiz.backend.live.dto.LiveQuestionView;
import com.livequiz.backend.live.dto.OwnAnswerView;
import com.livequiz.backend.live.dto.QuestionClosedPayload;
import com.livequiz.backend.media.service.ImageUrlResolver;
import com.livequiz.backend.participant.domain.Participant;
import com.livequiz.backend.quiz.domain.AnswerOption;
import com.livequiz.backend.quiz.domain.Question;
import com.livequiz.backend.session.domain.QuizSession;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.UUID;

@Component
public class LiveMapper {

    private final ImageUrlResolver imageUrls;

    public LiveMapper(ImageUrlResolver imageUrls) {
        this.imageUrls = imageUrls;
    }

    public LiveQuestionView toQuestionView(QuizSession session) {
        Question question = session.currentQuestion();
        return new LiveQuestionView(
                question.getId(),
                session.getCurrentQuestionIndex(),
                session.askedPosition(),
                session.questionCount(),
                question.getText(),
                imageUrls.toPublicUrl(question.getImageUrl()),
                question.getType(),
                session.getQuiz().getConfig().isSurveyMode(),
                question.getOptions().stream()
                        .map(o -> new LiveOptionView(o.getId(), o.getText(),
                                imageUrls.toPublicUrl(o.getImageUrl())))
                        .toList());
    }

    public QuestionClosedPayload toClosedPayload(QuizSession session, long answerCount) {
        Question question = session.currentQuestion();
        return new QuestionClosedPayload(
                question.getId(),
                session.getCurrentQuestionIndex(),
                session.getQuiz().getConfig().isSurveyMode() ? List.of() : correctOptionIds(question),
                answerCount,
                session.hasNextQuestion());
    }

    public OwnAnswerView toOwnAnswer(ParticipantAnswer answer, int ordinal) {
        return new OwnAnswerView(
                answer.getQuestion().getId(),
                List.copyOf(answer.getSelectedOptionIds()),
                answer.getFreeText(),
                ordinal,
                answer.getResponseTimeMs());
    }

    public List<UUID> correctOptionIds(Question question) {
        return question.getOptions().stream()
                .filter(AnswerOption::isCorrect)
                .map(AnswerOption::getId)
                .toList();
    }

    public String label(Participant participant) {
        String fullName = ("%s %s".formatted(
                participant.getName() == null ? "" : participant.getName(),
                participant.getSurname() == null ? "" : participant.getSurname())).trim();
        return StringUtils.hasText(fullName) ? fullName : participant.getEmail();
    }
}
