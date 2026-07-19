package com.livequiz.backend.common.web;

import com.livequiz.backend.security.CurrentUserProvider;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/ping")
public class PingController {

    private final CurrentUserProvider currentUserProvider;

    public PingController(CurrentUserProvider currentUserProvider) {
        this.currentUserProvider = currentUserProvider;
    }

    @GetMapping
    public Map<String, Object> ping() {
        return Map.of(
                "status", "ok",
                "currentProfessorId", currentUserProvider.currentProfessorId().value());
    }
}
