package com.livequiz.backend.live.service;

import com.livequiz.backend.common.exception.BadRequestException;
import com.livequiz.backend.common.exception.ConflictException;
import com.livequiz.backend.common.exception.NotFoundException;
import com.livequiz.backend.live.domain.ParticipantAnswer;
import com.livequiz.backend.live.dto.AnswerReceivedPayload;
import com.livequiz.backend.live.dto.LiveEventType;
import com.livequiz.backend.live.dto.SessionStatePayload;
import com.livequiz.backend.live.dto.SubmitAnswerMessage;
import com.livequiz.backend.live.repository.ParticipantAnswerRepository;
import com.livequiz.backend.live.ws.LiveUser;
import com.livequiz.backend.participant.domain.Participant;
import com.livequiz.backend.participant.repository.ParticipantRepository;
import com.livequiz.backend.quiz.domain.AnswerOption;
import com.livequiz.backend.quiz.domain.Question;
import com.livequiz.backend.quiz.domain.QuestionType;
import com.livequiz.backend.session.domain.QuizSession;
import com.livequiz.backend.session.domain.SessionState;
import com.livequiz.backend.session.repository.QuizSessionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.Duration;
import java.time.Instant;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class LiveSessionService {

    private final QuizSessionRepository sessionRepository;
    private final ParticipantRepository participantRepository;
    private final ParticipantAnswerRepository answerRepository;
    private final LiveEventPublisher publisher;
    private final LiveMapper mapper;

    public LiveSessionService(QuizSessionRepository sessionRepository,
                              ParticipantRepository participantRepository,
                              ParticipantAnswerRepository answerRepository,
                              LiveEventPublisher publisher,
                              LiveMapper mapper) {
        this.sessionRepository = sessionRepository;
        this.participantRepository = participantRepository;
        this.answerRepository = answerRepository;
        this.publisher = publisher;
        this.mapper = mapper;
    }

    public void submitAnswer(LiveUser user, SubmitAnswerMessage message) {
        if (user.isHost()) {
            throw new BadRequestException("The host cannot answer questions");
        }

        Participant participant = participantRepository.findById(user.participantId())
                .orElseThrow(() -> NotFoundException.of("Participant", user.participantId()));
        QuizSession session = participant.getSession();

        if (session.getState() != SessionState.ACTIVE) {
            throw new ConflictException("This session is not running");
        }
        if (!session.isQuestionOpen()) {
            throw new ConflictException("The current question is no longer accepting answers");
        }

        Question question = session.currentQuestion();
        if (!question.getId().equals(message.questionId())) {
            throw new ConflictException("The session has already moved on to another question");
        }
        if (answerRepository.existsByParticipant_IdAndQuestion_Id(participant.getId(), question.getId())) {
            throw new ConflictException("You have already answered this question");
        }

        Set<UUID> optionIds = validate(question, message);

        ParticipantAnswer answer = new ParticipantAnswer();
        answer.setSession(session);
        answer.setParticipant(participant);
        answer.setQuestion(question);
        answer.setQuestionIndex(session.getCurrentQuestionIndex());
        answer.getSelectedOptionIds().addAll(optionIds);
        answer.setFreeText(StringUtils.hasText(message.freeText()) ? message.freeText().trim() : null);
        answer.setSubmittedAt(Instant.now());
        answer.setResponseTimeMs(responseTimeMs(session, answer.getSubmittedAt()));
        answerRepository.saveAndFlush(answer);

        publisher.toHost(session.getJoinToken(), LiveEventType.ANSWER_RECEIVED, new AnswerReceivedPayload(
                question.getId(),
                session.getCurrentQuestionIndex(),
                answerRepository.countBySession_IdAndQuestion_Id(session.getId(), question.getId()),
                participantRepository.countBySession_Id(session.getId())));

        publisher.toUser(user.getName(), LiveEventType.ANSWER_ACCEPTED, snapshotOf(session, participant));
    }

    @Transactional(readOnly = true)
    public SessionStatePayload snapshot(LiveUser user) {
        QuizSession session = sessionRepository.findByJoinToken(user.joinToken())
                .orElseThrow(() -> NotFoundException.of("Session", user.joinToken()));
        Participant participant = user.isHost() ? null
                : participantRepository.findById(user.participantId()).orElse(null);
        return snapshotOf(session, participant);
    }

    private SessionStatePayload snapshotOf(QuizSession session, Participant participant) {
        boolean showQuestion = session.getState() == SessionState.ACTIVE && session.isStarted();
        boolean alreadyAnswered = showQuestion && participant != null
                && answerRepository.existsByParticipant_IdAndQuestion_Id(
                participant.getId(), session.currentQuestion().getId());

        return new SessionStatePayload(
                session.getId(),
                session.getState(),
                session.isStarted() ? session.getCurrentQuestionIndex() : null,
                session.questionCount(),
                session.isQuestionOpen(),
                participantRepository.countBySession_Id(session.getId()),
                showQuestion ? mapper.toQuestionView(session) : null,
                alreadyAnswered);
    }

    private Set<UUID> validate(Question question, SubmitAnswerMessage message) {
        Set<UUID> optionIds = message.optionIdsOrEmpty();

        if (question.getType() == QuestionType.FREE_TEXT) {
            if (!StringUtils.hasText(message.freeText())) {
                throw new BadRequestException("This question expects a written answer");
            }
            if (!optionIds.isEmpty()) {
                throw new BadRequestException("This question has no options to select");
            }
            return Set.of();
        }

        if (optionIds.isEmpty()) {
            throw new BadRequestException("Select at least one option");
        }
        if (question.getType() == QuestionType.SINGLE_CHOICE && optionIds.size() > 1) {
            throw new BadRequestException("This question accepts a single option");
        }

        Set<UUID> allowed = question.getOptions().stream()
                .map(AnswerOption::getId)
                .collect(Collectors.toSet());
        if (!allowed.containsAll(optionIds)) {
            throw new BadRequestException("Selected option does not belong to this question");
        }
        return optionIds;
    }

    private Long responseTimeMs(QuizSession session, Instant submittedAt) {
        Instant openedAt = session.getCurrentQuestionOpenedAt();
        return openedAt == null ? null : Duration.between(openedAt, submittedAt).toMillis();
    }
}
