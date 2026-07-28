package com.livequiz.backend.media.domain;

import com.livequiz.backend.common.domain.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "quiz_image")
@Getter
@Setter
@NoArgsConstructor
public class QuizImage extends BaseEntity {

    @Column(name = "owner_professor_id", nullable = false)
    private UUID ownerProfessorId;

    @Column(name = "content_type", nullable = false, length = 100)
    private String contentType;

    @Column(name = "size_bytes", nullable = false)
    private int sizeBytes;

    /**
     * Deliberately NOT annotated with @Lob: on Postgres that would map to an oid / large
     * object rather than the bytea column this entity is validated against.
     */
    @Column(name = "data", nullable = false)
    private byte[] data;
}
