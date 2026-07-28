package com.livequiz.backend.session.domain;

import java.util.List;

public enum SessionState {
    LOBBY,
    ACTIVE,
    ENDED;

    /**
     * States a session can be in while it is still running. Used to refuse actions that
     * would disrupt a lecture in progress: starting a second session for the same quiz,
     * or deleting the quiz underneath a live one.
     */
    public static final List<SessionState> LIVE_STATES = List.of(LOBBY, ACTIVE);
}
