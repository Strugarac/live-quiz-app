package com.livequiz.backend.participant.repository;

import com.livequiz.backend.participant.domain.Participant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ParticipantRepository extends JpaRepository<Participant, UUID> {

    boolean existsBySession_IdAndEmail(UUID sessionId, String email);

    Optional<Participant> findByToken(String token);

    long countBySession_Id(UUID sessionId);

    @Query("""
            select p.session.id as sessionId, count(p) as total
            from Participant p
            where p.session.id in :sessionIds
            group by p.session.id
            """)
    List<SessionParticipantCount> countBySessionIds(@Param("sessionIds") Collection<UUID> sessionIds);

    interface SessionParticipantCount {
        UUID getSessionId();

        long getTotal();
    }

    List<Participant> findBySession_IdOrderByCreatedAtAsc(UUID sessionId);

    void deleteBySession_Id(UUID sessionId);
}
