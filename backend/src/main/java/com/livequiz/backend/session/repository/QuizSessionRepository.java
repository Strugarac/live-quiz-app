package com.livequiz.backend.session.repository;

import com.livequiz.backend.session.domain.QuizSession;
import com.livequiz.backend.session.domain.SessionState;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface QuizSessionRepository extends JpaRepository<QuizSession, UUID> {

    Optional<QuizSession> findByIdAndHostProfessorId(UUID id, UUID hostProfessorId);

    List<QuizSession> findByHostProfessorIdOrderByCreatedAtDesc(UUID hostProfessorId);

    Optional<QuizSession> findByJoinToken(String joinToken);

    boolean existsByJoinToken(String joinToken);

    boolean existsByQuiz_IdAndStateIn(UUID quizId, Collection<SessionState> states);
}
