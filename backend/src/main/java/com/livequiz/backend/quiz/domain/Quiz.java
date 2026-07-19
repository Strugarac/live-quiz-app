package com.livequiz.backend.quiz.domain;

import com.livequiz.backend.common.domain.BaseEntity;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OneToOne;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "quiz")
@Getter
@Setter
@NoArgsConstructor
public class Quiz extends BaseEntity {

    @Column(nullable = false, length = 255)
    private String title;

    @Column(length = 2000)
    private String description;

    @Column(name = "owner_professor_id", nullable = false)
    private UUID ownerProfessorId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private QuizType type;

    @OneToOne(cascade = CascadeType.ALL, orphanRemoval = true, optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "config_id", nullable = false, unique = true)
    private QuizConfig config;

    @OneToMany(mappedBy = "quiz", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orderIndex ASC")
    private List<Question> questions = new ArrayList<>();

    public void addQuestion(Question question) {
        question.setOrderIndex(questions.size());
        question.setQuiz(this);
        questions.add(question);
    }

    public void removeQuestion(Question question) {
        questions.remove(question);
        question.setQuiz(null);
        reindexQuestions();
    }

    private void reindexQuestions() {
        for (int i = 0; i < questions.size(); i++) {
            questions.get(i).setOrderIndex(i);
        }
    }
}
