package com.livequiz.backend.participant.web;

import com.livequiz.backend.participant.dto.JoinInfoResponse;
import com.livequiz.backend.participant.dto.JoinRequest;
import com.livequiz.backend.participant.dto.ParticipantResponse;
import com.livequiz.backend.participant.service.ParticipantService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public/sessions/{joinToken}")
public class PublicJoinController {

    private final ParticipantService participantService;

    public PublicJoinController(ParticipantService participantService) {
        this.participantService = participantService;
    }

    @GetMapping
    public JoinInfoResponse joinInfo(@PathVariable String joinToken) {
        return participantService.joinInfo(joinToken);
    }

    @PostMapping("/participants")
    @ResponseStatus(HttpStatus.CREATED)
    public ParticipantResponse join(@PathVariable String joinToken, @Valid @RequestBody JoinRequest request) {
        return participantService.join(joinToken, request);
    }
}
