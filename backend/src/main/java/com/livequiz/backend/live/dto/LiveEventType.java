package com.livequiz.backend.live.dto;

public enum LiveEventType {

    /** Full snapshot, sent privately to a client that just connected or reconnected. */
    SESSION_STATE,

    /** A question went live and now accepts answers. Broadcast to everyone. */
    QUESTION_OPENED,

    /** Answers for the current question are no longer accepted; carries the reveal. */
    QUESTION_CLOSED,

    /** Someone joined the lobby. Broadcast to everyone (host variant carries the label). */
    PARTICIPANT_JOINED,

    /** An answer arrived. Host topic only — participants must not see who answered what. */
    ANSWER_RECEIVED,

    /** Private acknowledgement to the participant whose answer was stored. */
    ANSWER_ACCEPTED,

    /** The host ended the session. */
    SESSION_ENDED,

    /** Something the client did was rejected; sent privately to that client. */
    ERROR
}
