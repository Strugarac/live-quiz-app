package com.livequiz.backend.participant.service;

import com.livequiz.backend.common.exception.ConflictException;
import com.livequiz.backend.common.exception.NotFoundException;
import com.livequiz.backend.live.dto.LiveEventType;
import com.livequiz.backend.live.dto.ParticipantJoinedPayload;
import com.livequiz.backend.live.service.LiveEventPublisher;
import com.livequiz.backend.live.service.LiveMapper;
import com.livequiz.backend.participant.domain.Participant;
import com.livequiz.backend.participant.dto.JoinInfoResponse;
import com.livequiz.backend.participant.dto.JoinRequest;
import com.livequiz.backend.participant.dto.ParticipantResponse;
import com.livequiz.backend.participant.repository.ParticipantRepository;
import com.livequiz.backend.quiz.domain.QuizConfig;
import com.livequiz.backend.security.CurrentUserProvider;
import com.livequiz.backend.session.domain.QuizSession;
import com.livequiz.backend.session.domain.SessionState;
import com.livequiz.backend.session.repository.QuizSessionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional
public class ParticipantService {

    private final ParticipantRepository participantRepository;
    private final QuizSessionRepository sessionRepository;
    private final ParticipantRegistrationValidator validator;
    private final ParticipantTokenGenerator tokenGenerator;
    private final ParticipantMapper mapper;
    private final CurrentUserProvider currentUser;
    private final LiveEventPublisher publisher;
    private final LiveMapper liveMapper;

    public ParticipantService(ParticipantRepository participantRepository,
                              QuizSessionRepository sessionRepository,
                              ParticipantRegistrationValidator validator,
                              ParticipantTokenGenerator tokenGenerator,
                              ParticipantMapper mapper,
                              CurrentUserProvider currentUser,
                              LiveEventPublisher publisher,
                              LiveMapper liveMapper) {
        this.participantRepository = participantRepository;
        this.sessionRepository = sessionRepository;
        this.validator = validator;
        this.tokenGenerator = tokenGenerator;
        this.mapper = mapper;
        this.currentUser = currentUser;
        this.publisher = publisher;
        this.liveMapper = liveMapper;
    }

    @Transactional(readOnly = true)
    public JoinInfoResponse joinInfo(String joinToken) {
        return mapper.toJoinInfo(loadByToken(joinToken));
    }

    public ParticipantResponse join(String joinToken, JoinRequest request) {
        QuizSession session = loadByToken(joinToken);
        if (session.getState() != SessionState.LOBBY) {
            throw new ConflictException("This session is not open for joining");
        }

        QuizConfig config = session.getQuiz().getConfig();
        validator.validate(config, request);

        if (config.isSaveParticipants()) {
            String email = ParticipantMapper.normalizeEmail(request.email());
            if (participantRepository.existsBySession_IdAndEmail(session.getId(), email)) {
                throw new ConflictException("This email has already joined the session");
            }
        }

        long ordinal = participantRepository.countBySession_Id(session.getId()) + 1;
        Participant participant = mapper.toNewParticipant(session, request, config,
                tokenGenerator.generateUnique(), ordinal);
        participantRepository.saveAndFlush(participant);
        announceJoin(session, participant);
        return mapper.toResponse(participant);
    }

    private void announceJoin(QuizSession session, Participant participant) {
        long participantCount = participantRepository.countBySession_Id(session.getId());
        publisher.toParticipants(session.getJoinToken(), LiveEventType.PARTICIPANT_JOINED,
                ParticipantJoinedPayload.countOnly(participantCount));
        publisher.toHost(session.getJoinToken(), LiveEventType.PARTICIPANT_JOINED,
                new ParticipantJoinedPayload(participant.getId(), liveMapper.label(participant), participantCount));
    }

    @Transactional(readOnly = true)
    public List<ParticipantResponse> listForHost(UUID sessionId) {
        QuizSession session = sessionRepository.findByIdAndHostProfessorId(sessionId, currentUser.currentProfessorId().value())
                .orElseThrow(() -> NotFoundException.of("Session", sessionId));
        return participantRepository.findBySession_IdOrderByCreatedAtAsc(session.getId()).stream()
                .map(mapper::toResponse)
                .toList();
    }

    private QuizSession loadByToken(String joinToken) {
        return sessionRepository.findByJoinToken(joinToken)
                .orElseThrow(() -> NotFoundException.of("Session", joinToken));
    }
}
