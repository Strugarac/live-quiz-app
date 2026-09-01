package com.livequiz.backend.quiz.domain;

import com.livequiz.backend.common.domain.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "quiz_config")
@Getter
@Setter
@NoArgsConstructor
public class QuizConfig extends BaseEntity {

    @Enumerated(EnumType.STRING)
    @Column(name = "email_requirement", nullable = false, length = 20)
    private FieldRequirement emailRequirement = FieldRequirement.HIDDEN;

    @Enumerated(EnumType.STRING)
    @Column(name = "personal_number_requirement", nullable = false, length = 20)
    private FieldRequirement personalNumberRequirement = FieldRequirement.HIDDEN;

    @Enumerated(EnumType.STRING)
    @Column(name = "name_requirement", nullable = false, length = 20)
    private FieldRequirement nameRequirement = FieldRequirement.HIDDEN;

    @Enumerated(EnumType.STRING)
    @Column(name = "surname_requirement", nullable = false, length = 20)
    private FieldRequirement surnameRequirement = FieldRequirement.HIDDEN;

    @Enumerated(EnumType.STRING)
    @Column(name = "faculty_requirement", nullable = false, length = 20)
    private FieldRequirement facultyRequirement = FieldRequirement.HIDDEN;

    @Column(name = "survey_mode", nullable = false)
    private boolean surveyMode;

    @Column(name = "save_statistics", nullable = false)
    private boolean saveStatistics;

    @Column(name = "save_participants", nullable = false)
    private boolean saveParticipants;
}
