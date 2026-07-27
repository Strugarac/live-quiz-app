package com.livequiz.backend.live.repository;

import com.livequiz.backend.live.domain.ParticipantAnswer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ParticipantAnswerRepository extends JpaRepository<ParticipantAnswer, UUID> {

    boolean existsByParticipant_IdAndQuestion_Id(UUID participantId, UUID questionId);

    long countBySession_IdAndQuestion_Id(UUID sessionId, UUID questionId);

    List<ParticipantAnswer> findBySession_IdAndQuestion_Id(UUID sessionId, UUID questionId);

    List<ParticipantAnswer> findBySession_IdOrderByQuestionIndexAsc(UUID sessionId);
}
