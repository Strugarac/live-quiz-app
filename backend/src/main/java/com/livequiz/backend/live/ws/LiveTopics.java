package com.livequiz.backend.live.ws;

public final class LiveTopics {

    public static final String PARTICIPANT_PREFIX = "/topic/session.";

    public static final String HOST_SUFFIX = ".host";

    public static final String USER_QUEUE = "/queue/session";

    private LiveTopics() {
    }

    public static String participants(String joinToken) {
        return PARTICIPANT_PREFIX + joinToken;
    }

    public static String host(String joinToken) {
        return PARTICIPANT_PREFIX + joinToken + HOST_SUFFIX;
    }
}
