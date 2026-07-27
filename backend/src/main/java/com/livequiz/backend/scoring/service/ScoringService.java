package com.livequiz.backend.scoring.service;

import com.livequiz.backend.live.domain.ParticipantAnswer;
import com.livequiz.backend.live.repository.ParticipantAnswerRepository;
import com.livequiz.backend.live.service.LiveMapper;
import com.livequiz.backend.participant.domain.Participant;
import com.livequiz.backend.participant.repository.ParticipantRepository;
import com.livequiz.backend.quiz.domain.AnswerOption;
import com.livequiz.backend.quiz.domain.Question;
import com.livequiz.backend.quiz.domain.QuestionType;
import com.livequiz.backend.scoring.dto.LeaderboardPayload;
import com.livequiz.backend.scoring.dto.LeaderboardRow;
import com.livequiz.backend.session.domain.QuizSession;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Grades answers and builds the leaderboard (Step 6).
 * <p>
 * Scoring is correctness-only: a correct answer earns a flat {@link #CORRECT_POINTS},
 * a wrong answer earns nothing, and speed does not affect the score (though
 * {@code responseTimeMs} is kept on the row for Step 7 statistics). Choice questions
 * are graded all-or-nothing — the selected option set must match the correct set
 * exactly. FREE_TEXT answers are collected but not auto-graded.
 */
@Service
@Transactional
public class ScoringService {

    /** Points for a correct answer. Flat, because speed is not scored. */
    static final int CORRECT_POINTS = 1000;

    private final ParticipantAnswerRepository answerRepository;
    private final ParticipantRepository participantRepository;
    private final LiveMapper liveMapper;

    public ScoringService(ParticipantAnswerRepository answerRepository,
                          ParticipantRepository participantRepository,
                          LiveMapper liveMapper) {
        this.answerRepository = answerRepository;
        this.participantRepository = participantRepository;
        this.liveMapper = liveMapper;
    }

    /**
     * Grades every answer to one question. Called once, when the question closes, so the
     * cumulative leaderboard can be recomputed straight after.
     */
    public void gradeQuestion(QuizSession session, Question question) {
        Set<UUID> correctOptions = question.getOptions().stream()
                .filter(AnswerOption::isCorrect)
                .map(AnswerOption::getId)
                .collect(Collectors.toSet());

        List<ParticipantAnswer> answers =
                answerRepository.findBySession_IdAndQuestion_Id(session.getId(), question.getId());
        for (ParticipantAnswer answer : answers) {
            grade(answer, question.getType(), correctOptions);
        }
        answerRepository.saveAll(answers);
    }

    private void grade(ParticipantAnswer answer, QuestionType type, Set<UUID> correctOptions) {
        if (type == QuestionType.FREE_TEXT) {
            answer.setCorrect(null);
            answer.setPoints(0);
            return;
        }
        boolean correct = answer.getSelectedOptionIds().equals(correctOptions);
        answer.setCorrect(correct);
        answer.setPoints(correct ? CORRECT_POINTS : 0);
    }

    /**
     * The cumulative leaderboard across every question graded so far. Every participant
     * appears, even with a zero score, ordered by score then label. Tied scores share a rank.
     */
    @Transactional(readOnly = true)
    public LeaderboardPayload leaderboard(QuizSession session) {
        List<Participant> participants =
                participantRepository.findBySession_IdOrderByCreatedAtAsc(session.getId());

        // participantId -> [totalPoints, correctCount], accumulated from graded answers.
        Map<UUID, long[]> tally = new HashMap<>();
        for (ParticipantAnswer answer : answerRepository.findBySession_IdOrderByQuestionIndexAsc(session.getId())) {
            long[] t = tally.computeIfAbsent(answer.getParticipant().getId(), k -> new long[2]);
            t[0] += answer.getPoints();
            if (Boolean.TRUE.equals(answer.getCorrect())) {
                t[1]++;
            }
        }

        List<LeaderboardRow> sorted = participants.stream()
                .map(p -> {
                    long[] t = tally.getOrDefault(p.getId(), new long[2]);
                    return new LeaderboardRow(p.getId(), liveMapper.label(p), t[0], t[1], 0);
                })
                .sorted(Comparator.comparingLong(LeaderboardRow::score).reversed()
                        .thenComparing(LeaderboardRow::label, String.CASE_INSENSITIVE_ORDER))
                .toList();

        return new LeaderboardPayload(session.getId(), assignRanks(sorted));
    }

    /** Competition ranking: equal scores get the same rank, the next distinct score skips ahead. */
    private List<LeaderboardRow> assignRanks(List<LeaderboardRow> sorted) {
        List<LeaderboardRow> ranked = new ArrayList<>(sorted.size());
        long previousScore = Long.MIN_VALUE;
        int rank = 0;
        for (int i = 0; i < sorted.size(); i++) {
            LeaderboardRow row = sorted.get(i);
            if (row.score() != previousScore) {
                rank = i + 1;
                previousScore = row.score();
            }
            ranked.add(new LeaderboardRow(
                    row.participantId(), row.label(), row.score(), row.correctCount(), rank));
        }
        return ranked;
    }
}
