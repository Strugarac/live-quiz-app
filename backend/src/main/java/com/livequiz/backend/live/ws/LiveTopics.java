package com.livequiz.backend.live.ws;

/**
 * STOMP destinations, in one place because the interceptor authorises subscriptions
 * against exactly these strings.
 * <p>
 * Dots rather than slashes separate the segments: RabbitMQ uses the part after
 * {@code /topic/} verbatim as an AMQP routing key, where dots are the segment separator.
 */
public final class LiveTopics {

    /** Everyone in the session, participants included — never put answers or correctness here. */
    public static final String PARTICIPANT_PREFIX = "/topic/session.";

    /** Host-only side channel. The host also subscribes to the participant topic. */
    public static final String HOST_SUFFIX = ".host";

    /** Private replies, resolved per connection by Spring's user destination support. */
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
