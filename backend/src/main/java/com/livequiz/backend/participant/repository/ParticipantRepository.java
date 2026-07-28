package com.livequiz.backend.participant.repository;

import com.livequiz.backend.participant.domain.Participant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ParticipantRepository extends JpaRepository<Participant, UUID> {

    boolean existsBySession_IdAndEmail(UUID sessionId, String email);

    Optional<Participant> findByToken(String token);

    long countBySession_Id(UUID sessionId);

    List<Participant> findBySession_IdOrderByCreatedAtAsc(UUID sessionId);

    void deleteBySession_Id(UUID sessionId);
}
