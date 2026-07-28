package com.livequiz.backend.session.web;

import com.livequiz.backend.scoring.dto.LeaderboardPayload;
import com.livequiz.backend.scoring.dto.SessionResultsResponse;
import com.livequiz.backend.session.dto.CreateSessionRequest;
import com.livequiz.backend.session.dto.SessionResponse;
import com.livequiz.backend.session.service.SessionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
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

    @GetMapping("/{sessionId}/leaderboard")
    public LeaderboardPayload leaderboard(@PathVariable UUID sessionId) {
        return sessionService.leaderboard(sessionId);
    }

    @GetMapping("/{sessionId}/results")
    public SessionResultsResponse results(@PathVariable UUID sessionId) {
        return sessionService.results(sessionId);
    }

    @GetMapping("/{sessionId}/results/export")
    public ResponseEntity<byte[]> exportResults(@PathVariable UUID sessionId) {
        byte[] body = sessionService.exportResultsCsv(sessionId).getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"results-" + sessionId + ".csv\"")
                .body(body);
    }

    @DeleteMapping("/{sessionId}/results")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void discardResults(@PathVariable UUID sessionId) {
        sessionService.discardResults(sessionId);
    }

    @PostMapping("/{sessionId}/start")
    public SessionResponse start(@PathVariable UUID sessionId) {
        return sessionService.start(sessionId);
    }

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
