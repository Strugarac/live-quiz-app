-- Participants of a live session. Email is always required (used later for
-- university-website authentication) and is unique within a session. The other
-- identity fields are collected only when the quiz's QuizConfig asks for them.
-- Column names/types mirror the JPA entity exactly (ddl-auto=validate).

create table participant (
    id              uuid         primary key,
    version         bigint,
    created_at      timestamptz,
    updated_at      timestamptz,
    session_id      uuid         not null references quiz_session (id) on delete cascade,
    token           varchar(64)  not null unique,
    email           varchar(255) not null,
    name            varchar(255),
    surname         varchar(255),
    personal_number varchar(64),
    faculty         varchar(255),
    constraint uq_participant_session_email unique (session_id, email)
);

create index idx_participant_session on participant (session_id);
