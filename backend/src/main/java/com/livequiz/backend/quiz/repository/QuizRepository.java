package com.livequiz.backend.quiz.repository;

import com.livequiz.backend.quiz.domain.Quiz;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface QuizRepository extends JpaRepository<Quiz, UUID> {

    List<Quiz> findByOwnerProfessorIdOrderByCreatedAtDesc(UUID ownerProfessorId);

    Optional<Quiz> findByIdAndOwnerProfessorId(UUID id, UUID ownerProfessorId);
}
