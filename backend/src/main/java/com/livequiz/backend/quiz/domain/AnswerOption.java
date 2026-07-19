package com.livequiz.backend.quiz.domain;

import com.livequiz.backend.common.domain.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "answer_option")
@Getter
@Setter
@NoArgsConstructor
public class AnswerOption extends BaseEntity {

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    @Column(name = "order_index", nullable = false)
    private int orderIndex;

    @Column(length = 1000)
    private String text;

    @Column(name = "image_url", length = 1024)
    private String imageUrl;

    @Column(nullable = false)
    private boolean correct;
}
