package com.livequiz.backend.live.domain;

import com.livequiz.backend.common.domain.BaseEntity;
import com.livequiz.backend.participant.domain.Participant;
import com.livequiz.backend.quiz.domain.Question;
import com.livequiz.backend.session.domain.QuizSession;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "participant_answer", uniqueConstraints =
        @UniqueConstraint(name = "uq_answer_participant_question", columnNames = {"participant_id", "question_id"}))
@Getter
@Setter
@NoArgsConstructor
public class ParticipantAnswer extends BaseEntity {

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private QuizSession session;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "participant_id", nullable = false)
    private Participant participant;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    @Column(name = "question_index", nullable = false)
    private int questionIndex;

    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "participant_answer_option", joinColumns = @JoinColumn(name = "answer_id"))
    @Column(name = "option_id", nullable = false)
    private Set<UUID> selectedOptionIds = new LinkedHashSet<>();

    @Column(name = "free_text", length = 2000)
    private String freeText;

    @Column(name = "response_time_ms")
    private Long responseTimeMs;

    @Column(name = "submitted_at", nullable = false)
    private Instant submittedAt;

    @Column(name = "is_correct")
    private Boolean correct;

    @Column(nullable = false)
    private int points;
}
