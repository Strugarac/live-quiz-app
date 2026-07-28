package com.livequiz.backend.live.service;

import com.livequiz.backend.live.dto.LiveEvent;
import com.livequiz.backend.live.dto.LiveEventType;
import com.livequiz.backend.live.ws.LiveTopics;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Component
public class LiveEventPublisher {

    private final SimpMessagingTemplate messaging;

    public LiveEventPublisher(SimpMessagingTemplate messaging) {
        this.messaging = messaging;
    }

    public void toParticipants(String joinToken, LiveEventType type, Object payload) {
        broadcast(LiveTopics.participants(joinToken), LiveEvent.of(type, payload));
    }

    public void toHost(String joinToken, LiveEventType type, Object payload) {
        broadcast(LiveTopics.host(joinToken), LiveEvent.of(type, payload));
    }

    public void toUser(String userName, LiveEventType type, Object payload) {
        messaging.convertAndSendToUser(userName, LiveTopics.USER_QUEUE, LiveEvent.of(type, payload));
    }

    private void broadcast(String destination, LiveEvent<?> event) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            messaging.convertAndSend(destination, event);
            return;
        }
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                messaging.convertAndSend(destination, event);
            }
        });
    }
}
