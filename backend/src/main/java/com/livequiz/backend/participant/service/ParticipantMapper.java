package com.livequiz.backend.participant.service;

import com.livequiz.backend.live.service.LiveMapper;
import com.livequiz.backend.participant.domain.Participant;
import com.livequiz.backend.participant.dto.JoinInfoResponse;
import com.livequiz.backend.participant.dto.JoinRequest;
import com.livequiz.backend.participant.dto.ParticipantFieldsDto;
import com.livequiz.backend.participant.dto.ParticipantResponse;
import com.livequiz.backend.quiz.domain.FieldRequirement;
import com.livequiz.backend.quiz.domain.QuizConfig;
import com.livequiz.backend.session.domain.QuizSession;
import org.springframework.stereotype.Component;

@Component
public class ParticipantMapper {

    private final LiveMapper liveMapper;

    public ParticipantMapper(LiveMapper liveMapper) {
        this.liveMapper = liveMapper;
    }

    public Participant toNewParticipant(QuizSession session, JoinRequest request, QuizConfig config,
                                        String token, long ordinal) {
        Participant participant = new Participant();
        participant.setSession(session);
        participant.setToken(token);

        if (!config.isSaveParticipants()) {
            participant.setDisplayLabel("Participant " + ordinal);
            return participant;
        }

        participant.setEmail(normalizeEmail(request.email()));
        participant.setName(collect(config.getNameRequirement(), request.name()));
        participant.setSurname(collect(config.getSurnameRequirement(), request.surname()));
        participant.setPersonalNumber(collect(config.getPersonalNumberRequirement(), request.personalNumber()));
        participant.setFaculty(collect(config.getFacultyRequirement(), request.faculty()));
        return participant;
    }

    public ParticipantResponse toResponse(Participant participant) {
        return new ParticipantResponse(
                participant.getId(),
                participant.getToken(),
                participant.getSession().getId(),
                liveMapper.label(participant),
                participant.getEmail(),
                participant.getName(),
                participant.getSurname(),
                participant.getPersonalNumber(),
                participant.getFaculty());
    }

    public JoinInfoResponse toJoinInfo(QuizSession session) {
        QuizConfig config = session.getQuiz().getConfig();
        boolean anonymous = !config.isSaveParticipants();
        ParticipantFieldsDto fields = anonymous
                ? new ParticipantFieldsDto(FieldRequirement.HIDDEN, FieldRequirement.HIDDEN,
                        FieldRequirement.HIDDEN, FieldRequirement.HIDDEN, FieldRequirement.HIDDEN)
                : new ParticipantFieldsDto(
                        FieldRequirement.REQUIRED,
                        config.getNameRequirement(),
                        config.getSurnameRequirement(),
                        config.getPersonalNumberRequirement(),
                        config.getFacultyRequirement());
        return new JoinInfoResponse(session.getId(), session.getQuiz().getTitle(), session.getState(),
                anonymous, fields);
    }

    public static String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase();
    }

    private String collect(FieldRequirement requirement, String value) {
        if (requirement == FieldRequirement.HIDDEN || value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
