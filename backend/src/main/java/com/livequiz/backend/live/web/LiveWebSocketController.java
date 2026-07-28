package com.livequiz.backend.live.web;

import com.livequiz.backend.common.exception.BadRequestException;
import com.livequiz.backend.common.exception.ConflictException;
import com.livequiz.backend.common.exception.NotFoundException;
import com.livequiz.backend.live.dto.ErrorPayload;
import com.livequiz.backend.live.dto.LiveEvent;
import com.livequiz.backend.live.dto.LiveEventType;
import com.livequiz.backend.live.dto.SessionStatePayload;
import com.livequiz.backend.live.dto.SubmitAnswerMessage;
import com.livequiz.backend.live.service.LiveSessionService;
import com.livequiz.backend.live.ws.LiveTopics;
import com.livequiz.backend.live.ws.LiveUser;
import com.livequiz.backend.session.domain.QuizSession;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
public class LiveWebSocketController {

    private static final Logger log = LoggerFactory.getLogger(LiveWebSocketController.class);

    private final LiveSessionService liveSessionService;

    public LiveWebSocketController(LiveSessionService liveSessionService) {
        this.liveSessionService = liveSessionService;
    }

    @MessageMapping("/session/answer")
    public void answer(@Valid @Payload SubmitAnswerMessage message, Principal principal) {
        liveSessionService.submitAnswer(user(principal), message);
    }

    @MessageMapping("/session/state")
    @SendToUser(LiveTopics.USER_QUEUE)
    public LiveEvent<SessionStatePayload> state(Principal principal) {
        return LiveEvent.of(LiveEventType.SESSION_STATE, liveSessionService.snapshot(user(principal)));
    }

    @MessageExceptionHandler({BadRequestException.class, ConflictException.class,
            NotFoundException.class, QuizSession.IllegalSessionState.class})
    @SendToUser(LiveTopics.USER_QUEUE)
    public LiveEvent<ErrorPayload> handleRejected(RuntimeException ex) {
        return LiveEvent.of(LiveEventType.ERROR, new ErrorPayload(codeOf(ex), ex.getMessage()));
    }

    @MessageExceptionHandler(Exception.class)
    @SendToUser(LiveTopics.USER_QUEUE)
    public LiveEvent<ErrorPayload> handleUnexpected(Exception ex) {
        log.error("Unhandled exception while processing a live message", ex);
        return LiveEvent.of(LiveEventType.ERROR, new ErrorPayload("INTERNAL_ERROR", "Unexpected error"));
    }

    private static LiveUser user(Principal principal) {
        if (principal instanceof LiveUser liveUser) {
            return liveUser;
        }
        throw new BadRequestException("Not connected to a session");
    }

    private static String codeOf(RuntimeException ex) {
        if (ex instanceof NotFoundException) {
            return "NOT_FOUND";
        }
        if (ex instanceof ConflictException || ex instanceof QuizSession.IllegalSessionState) {
            return "CONFLICT";
        }
        return "BAD_REQUEST";
    }
}
