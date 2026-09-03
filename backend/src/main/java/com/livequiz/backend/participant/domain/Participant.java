package com.livequiz.backend.participant.domain;

import com.livequiz.backend.common.domain.BaseEntity;
import com.livequiz.backend.session.domain.QuizSession;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "participant", uniqueConstraints =
        @UniqueConstraint(name = "uq_participant_session_email", columnNames = {"session_id", "email"}))
@Getter
@Setter
@NoArgsConstructor
public class Participant extends BaseEntity {

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private QuizSession session;

    @Column(nullable = false, unique = true, length = 64)
    private String token;

    @Column(length = 255)
    private String email;

    @Column(name = "display_label", length = 64)
    private String displayLabel;

    @Column(length = 255)
    private String name;

    @Column(length = 255)
    private String surname;

    @Column(name = "personal_number", length = 64)
    private String personalNumber;

    @Column(length = 255)
    private String faculty;
}
