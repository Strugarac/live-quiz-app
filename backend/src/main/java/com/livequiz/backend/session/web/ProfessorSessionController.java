package com.livequiz.backend.session.web;

import com.livequiz.backend.session.dto.CreateSessionRequest;
import com.livequiz.backend.session.dto.SessionResponse;
import com.livequiz.backend.session.service.SessionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/professor/sessions")
public class ProfessorSessionController {

    private final SessionService sessionService;

    public ProfessorSessionController(SessionService sessionService) {
        this.sessionService = sessionService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SessionResponse create(@Valid @RequestBody CreateSessionRequest request) {
        return sessionService.create(request);
    }

    @GetMapping
    public List<SessionResponse> list() {
        return sessionService.list();
    }

    @GetMapping("/{sessionId}")
    public SessionResponse get(@PathVariable UUID sessionId) {
        return sessionService.get(sessionId);
    }

    @PostMapping("/{sessionId}/start")
    public SessionResponse start(@PathVariable UUID sessionId) {
        return sessionService.start(sessionId);
    }

    /** Stops accepting answers and reveals the correct options, without advancing. */
    @PostMapping("/{sessionId}/close-question")
    public SessionResponse closeQuestion(@PathVariable UUID sessionId) {
        return sessionService.closeQuestion(sessionId);
    }

    @PostMapping("/{sessionId}/next")
    public SessionResponse next(@PathVariable UUID sessionId) {
        return sessionService.advance(sessionId);
    }

    @PostMapping("/{sessionId}/end")
    public SessionResponse end(@PathVariable UUID sessionId) {
        return sessionService.end(sessionId);
    }
}
