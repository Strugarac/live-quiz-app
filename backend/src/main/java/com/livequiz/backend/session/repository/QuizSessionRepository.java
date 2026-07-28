package com.livequiz.backend.session.repository;

import com.livequiz.backend.session.domain.QuizSession;
import com.livequiz.backend.session.domain.SessionState;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface QuizSessionRepository extends JpaRepository<QuizSession, UUID> {

    /** How many sessions exist per quiz; used to warn before a cascading quiz delete. */
    interface QuizSessionCount {
        UUID getQuizId();

        long getTotal();
    }

    @Query("""
            select s.quiz.id as quizId, count(s) as total
            from QuizSession s
            where s.quiz.id in :quizIds
            group by s.quiz.id
            """)
    List<QuizSessionCount> countByQuizIdIn(@Param("quizIds") Collection<UUID> quizIds);

    Optional<QuizSession> findByIdAndHostProfessorId(UUID id, UUID hostProfessorId);

    List<QuizSession> findByHostProfessorIdOrderByCreatedAtDesc(UUID hostProfessorId);

    Optional<QuizSession> findByJoinToken(String joinToken);

    boolean existsByJoinToken(String joinToken);

    boolean existsByQuiz_IdAndStateIn(UUID quizId, Collection<SessionState> states);
}
