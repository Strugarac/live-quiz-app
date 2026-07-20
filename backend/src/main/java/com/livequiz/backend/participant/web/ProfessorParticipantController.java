package com.livequiz.backend.participant.web;

import com.livequiz.backend.participant.dto.ParticipantResponse;
import com.livequiz.backend.participant.service.ParticipantService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/professor/sessions/{sessionId}/participants")
public class ProfessorParticipantController {

    private final ParticipantService participantService;

    public ProfessorParticipantController(ParticipantService participantService) {
        this.participantService = participantService;
    }

    @GetMapping
    public List<ParticipantResponse> list(@PathVariable UUID sessionId) {
        return participantService.listForHost(sessionId);
    }
}
