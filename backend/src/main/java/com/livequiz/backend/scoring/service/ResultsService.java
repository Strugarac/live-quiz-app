package com.livequiz.backend.scoring.service;

import com.livequiz.backend.live.domain.ParticipantAnswer;
import com.livequiz.backend.live.repository.ParticipantAnswerRepository;
import com.livequiz.backend.live.service.LiveMapper;
import com.livequiz.backend.participant.domain.Participant;
import com.livequiz.backend.participant.repository.ParticipantRepository;
import com.livequiz.backend.quiz.domain.AnswerOption;
import com.livequiz.backend.quiz.domain.Question;
import com.livequiz.backend.quiz.domain.QuestionType;
import com.livequiz.backend.quiz.domain.QuizConfig;
import com.livequiz.backend.scoring.dto.FreeTextEntry;
import com.livequiz.backend.scoring.dto.LeaderboardRow;
import com.livequiz.backend.scoring.dto.OptionBreakdown;
import com.livequiz.backend.scoring.dto.QuestionBreakdown;
import com.livequiz.backend.scoring.dto.SessionResultsResponse;
import com.livequiz.backend.session.domain.QuizSession;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@Transactional
public class ResultsService {

    private final ParticipantAnswerRepository answerRepository;
    private final ParticipantRepository participantRepository;
    private final ScoringService scoringService;
    private final LiveMapper liveMapper;

    public ResultsService(ParticipantAnswerRepository answerRepository,
                          ParticipantRepository participantRepository,
                          ScoringService scoringService,
                          LiveMapper liveMapper) {
        this.answerRepository = answerRepository;
        this.participantRepository = participantRepository;
        this.scoringService = scoringService;
        this.liveMapper = liveMapper;
    }

    @Transactional(readOnly = true)
    public SessionResultsResponse getResults(QuizSession session) {
        QuizConfig config = session.getQuiz().getConfig();
        List<Participant> participants = participantRepository.findBySession_IdOrderByCreatedAtAsc(session.getId());
        Map<UUID, String> labels = labels(config, participants);

        Map<UUID, List<ParticipantAnswer>> byQuestion =
                answerRepository.findBySession_IdOrderByQuestionIndexAsc(session.getId()).stream()
                        .collect(Collectors.groupingBy(a -> a.getQuestion().getId()));

        List<QuestionBreakdown> questions = session.getQuiz().getQuestions().stream()
                .map(q -> breakdown(q, byQuestion.getOrDefault(q.getId(), List.of()), labels))
                .toList();

        List<LeaderboardRow> leaderboard = relabel(scoringService.leaderboard(session).rows(), labels);

        return new SessionResultsResponse(
                session.getId(),
                session.getQuiz().getTitle(),
                session.getState(),
                session.getEndedAt(),
                participants.size(),
                session.questionCount(),
                config.isSaveStatistics(),
                config.isSaveParticipants(),
                leaderboard,
                questions);
    }

    @Transactional(readOnly = true)
    public String exportCsv(QuizSession session) {
        QuizConfig config = session.getQuiz().getConfig();
        List<Participant> participants = participantRepository.findBySession_IdOrderByCreatedAtAsc(session.getId());
        Map<UUID, String> labels = labels(config, participants);

        Map<UUID, Question> questionById = new HashMap<>();
        Map<UUID, String> optionText = new HashMap<>();
        for (Question q : session.getQuiz().getQuestions()) {
            questionById.put(q.getId(), q);
            for (AnswerOption o : q.getOptions()) {
                optionText.put(o.getId(), o.getText());
            }
        }

        StringBuilder csv = new StringBuilder();
        csv.append(row("Question #", "Question", "Type", "Participant", "Answer", "Correct", "Points", "Response time (ms)"));
        for (ParticipantAnswer a : answerRepository.findBySession_IdOrderByQuestionIndexAsc(session.getId())) {
            Question q = questionById.get(a.getQuestion().getId());
            boolean freeText = q != null && q.getType() == QuestionType.FREE_TEXT;
            String answerText = freeText
                    ? nullToEmpty(a.getFreeText())
                    : a.getSelectedOptionIds().stream()
                            .map(id -> optionText.getOrDefault(id, "?"))
                            .collect(Collectors.joining("; "));
            String correct = a.getCorrect() == null ? "" : (a.getCorrect() ? "yes" : "no");
            csv.append(row(
                    String.valueOf(a.getQuestionIndex() + 1),
                    q == null ? "" : nullToEmpty(q.getText()),
                    q == null ? "" : q.getType().name(),
                    labels.getOrDefault(a.getParticipant().getId(), ""),
                    answerText,
                    correct,
                    String.valueOf(a.getPoints()),
                    a.getResponseTimeMs() == null ? "" : String.valueOf(a.getResponseTimeMs())));
        }
        return csv.toString();
    }

    public void anonymizeParticipants(QuizSession session) {
        List<Participant> participants = participantRepository.findBySession_IdOrderByCreatedAtAsc(session.getId());
        for (Participant p : participants) {
            p.setName(null);
            p.setSurname(null);
            p.setPersonalNumber(null);
            p.setFaculty(null);
            p.setEmail("anon-" + p.getId());
        }
        participantRepository.saveAll(participants);
    }

    public void discard(QuizSession session) {
        answerRepository.deleteBySession_Id(session.getId());
        participantRepository.deleteBySession_Id(session.getId());
    }

    private QuestionBreakdown breakdown(Question question, List<ParticipantAnswer> answers, Map<UUID, String> labels) {
        long correct = answers.stream().filter(a -> Boolean.TRUE.equals(a.getCorrect())).count();
        long incorrect = answers.stream().filter(a -> Boolean.FALSE.equals(a.getCorrect())).count();

        Map<UUID, Long> chosen = new HashMap<>();
        for (ParticipantAnswer a : answers) {
            for (UUID optionId : a.getSelectedOptionIds()) {
                chosen.merge(optionId, 1L, Long::sum);
            }
        }
        List<OptionBreakdown> options = question.getOptions().stream()
                .map(o -> new OptionBreakdown(o.getId(), o.getText(), o.isCorrect(), chosen.getOrDefault(o.getId(), 0L)))
                .toList();

        List<FreeTextEntry> freeText = question.getType() != QuestionType.FREE_TEXT ? List.of()
                : answers.stream()
                        .filter(a -> StringUtils.hasText(a.getFreeText()))
                        .map(a -> new FreeTextEntry(labels.get(a.getParticipant().getId()), a.getFreeText()))
                        .toList();

        return new QuestionBreakdown(
                question.getId(), question.getOrderIndex(), question.getText(), question.getType(),
                answers.size(), correct, incorrect, options, freeText);
    }

    private Map<UUID, String> labels(QuizConfig config, List<Participant> participants) {
        Map<UUID, String> labels = new LinkedHashMap<>();
        int n = 1;
        for (Participant p : participants) {
            labels.put(p.getId(), config.isSaveParticipants() ? liveMapper.label(p) : "Participant " + n);
            n++;
        }
        return labels;
    }

    private List<LeaderboardRow> relabel(List<LeaderboardRow> rows, Map<UUID, String> labels) {
        return rows.stream()
                .map(r -> new LeaderboardRow(
                        r.participantId(), labels.getOrDefault(r.participantId(), r.label()),
                        r.score(), r.correctCount(), r.rank()))
                .toList();
    }

    private String row(String... cells) {
        return Arrays.stream(cells).map(this::escape).collect(Collectors.joining(",")) + "\r\n";
    }

    private String escape(String value) {
        if (value == null) {
            return "";
        }
        boolean needsQuoting = value.contains(",") || value.contains("\"")
                || value.contains("\n") || value.contains("\r");
        String escaped = value.replace("\"", "\"\"");
        return needsQuoting ? "\"" + escaped + "\"" : escaped;
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
