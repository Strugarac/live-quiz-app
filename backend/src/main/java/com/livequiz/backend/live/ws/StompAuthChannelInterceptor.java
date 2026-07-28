package com.livequiz.backend.live.ws;

import com.livequiz.backend.participant.domain.Participant;
import com.livequiz.backend.participant.repository.ParticipantRepository;
import com.livequiz.backend.security.CurrentUserProvider;
import com.livequiz.backend.session.domain.QuizSession;
import com.livequiz.backend.session.domain.SessionState;
import com.livequiz.backend.session.repository.QuizSessionRepository;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.UUID;

@Component
public class StompAuthChannelInterceptor implements ChannelInterceptor {

    private static final String HEADER_PARTICIPANT_TOKEN = "participantToken";
    private static final String HEADER_ROLE = "role";
    private static final String HEADER_SESSION_ID = "sessionId";
    private static final String ROLE_HOST = "HOST";

    private final ParticipantRepository participantRepository;
    private final QuizSessionRepository sessionRepository;
    private final CurrentUserProvider currentUser;

    public StompAuthChannelInterceptor(ParticipantRepository participantRepository,
                                       QuizSessionRepository sessionRepository,
                                       CurrentUserProvider currentUser) {
        this.participantRepository = participantRepository;
        this.sessionRepository = sessionRepository;
        this.currentUser = currentUser;
    }

    @Override
    @Transactional(readOnly = true)
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }

        if (accessor.getCommand() == StompCommand.CONNECT) {
            accessor.setUser(authenticate(accessor));
        } else if (accessor.getCommand() == StompCommand.SUBSCRIBE) {
            authorizeSubscription(accessor);
        }
        return message;
    }

    private LiveUser authenticate(StompHeaderAccessor accessor) {
        String participantToken = firstHeader(accessor, HEADER_PARTICIPANT_TOKEN);
        if (StringUtils.hasText(participantToken)) {
            return authenticateParticipant(participantToken);
        }
        if (ROLE_HOST.equalsIgnoreCase(firstHeader(accessor, HEADER_ROLE))) {
            return authenticateHost(firstHeader(accessor, HEADER_SESSION_ID));
        }
        throw reject("CONNECT requires either a participantToken or role=HOST with a sessionId");
    }

    private LiveUser authenticateParticipant(String participantToken) {
        Participant participant = participantRepository.findByToken(participantToken)
                .orElseThrow(() -> reject("Unknown participant token"));
        QuizSession session = participant.getSession();
        if (session.getState() == SessionState.ENDED) {
            throw reject("This session has ended");
        }
        return LiveUser.participant(session.getId(), session.getJoinToken(), participant.getId());
    }

    private LiveUser authenticateHost(String rawSessionId) {
        if (!StringUtils.hasText(rawSessionId)) {
            throw reject("A host must connect with a sessionId header");
        }
        UUID sessionId;
        try {
            sessionId = UUID.fromString(rawSessionId);
        } catch (IllegalArgumentException ex) {
            throw reject("sessionId is not a valid UUID");
        }

        UUID professorId = currentUser.currentProfessorId().value();
        QuizSession session = sessionRepository.findByIdAndHostProfessorId(sessionId, professorId)
                .orElseThrow(() -> reject("You do not host this session"));
        return LiveUser.host(session.getId(), session.getJoinToken(), professorId);
    }

    private void authorizeSubscription(StompHeaderAccessor accessor) {
        if (!(accessor.getUser() instanceof LiveUser user)) {
            throw reject("Not connected");
        }
        String destination = accessor.getDestination();
        if (destination == null) {
            throw reject("SUBSCRIBE requires a destination");
        }

        // Private replies are already scoped to the connection by Spring.
        if (destination.startsWith("/user/")) {
            return;
        }
        if (!destination.equals(LiveTopics.participants(user.joinToken()))
                && !destination.equals(LiveTopics.host(user.joinToken()))) {
            throw reject("You may not subscribe to " + destination);
        }
        if (destination.endsWith(LiveTopics.HOST_SUFFIX) && !user.isHost()) {
            throw reject("Only the host may subscribe to the host channel");
        }
    }

    private static String firstHeader(StompHeaderAccessor accessor, String name) {
        return accessor.getFirstNativeHeader(name);
    }

    private static MessageDeliveryException reject(String message) {
        return new MessageDeliveryException(message);
    }
}
