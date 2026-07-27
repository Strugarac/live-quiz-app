package com.livequiz.backend.live.service;

import com.livequiz.backend.live.dto.LiveOptionView;
import com.livequiz.backend.live.dto.LiveQuestionView;
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

    /** Strips {@code correct} from the options — this view goes to participants. */
    public LiveQuestionView toQuestionView(QuizSession session) {
        Question question = session.currentQuestion();
        return new LiveQuestionView(
                question.getId(),
                session.getCurrentQuestionIndex(),
                session.questionCount(),
                question.getText(),
                question.getImageUrl(),
                question.getType(),
                question.getOptions().stream()
                        .map(o -> new LiveOptionView(o.getId(), o.getText(), o.getImageUrl()))
                        .toList());
    }

    public List<UUID> correctOptionIds(Question question) {
        return question.getOptions().stream()
                .filter(AnswerOption::isCorrect)
                .map(AnswerOption::getId)
                .toList();
    }

    /**
     * How the host sees a participant in the lobby. The real leaderboard label is a
     * Step 6 decision; this is only for the "someone joined" notification.
     */
    public String label(Participant participant) {
        String fullName = ("%s %s".formatted(
                participant.getName() == null ? "" : participant.getName(),
                participant.getSurname() == null ? "" : participant.getSurname())).trim();
        return StringUtils.hasText(fullName) ? fullName : participant.getEmail();
    }
}
