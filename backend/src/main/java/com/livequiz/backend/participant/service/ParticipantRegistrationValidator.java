package com.livequiz.backend.participant.service;

import com.livequiz.backend.common.exception.BadRequestException;
import com.livequiz.backend.participant.dto.JoinRequest;
import com.livequiz.backend.quiz.domain.FieldRequirement;
import com.livequiz.backend.quiz.domain.QuizConfig;
import org.springframework.stereotype.Component;

@Component
public class ParticipantRegistrationValidator {

    public void validate(QuizConfig config, JoinRequest request) {
        if (!config.isSaveParticipants()) {
            return;
        }
        if (isBlank(request.email())) {
            throw new BadRequestException("email is required for this quiz");
        }
        require(config.getNameRequirement(), request.name(), "name");
        require(config.getSurnameRequirement(), request.surname(), "surname");
        require(config.getPersonalNumberRequirement(), request.personalNumber(), "personalNumber");
        require(config.getFacultyRequirement(), request.faculty(), "faculty");
    }

    private void require(FieldRequirement requirement, String value, String field) {
        if (requirement == FieldRequirement.REQUIRED && isBlank(value)) {
            throw new BadRequestException(field + " is required for this quiz");
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
