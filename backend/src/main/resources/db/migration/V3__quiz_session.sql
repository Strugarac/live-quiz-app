-- Live SESSION side: one running instance of a quiz template.
-- Column names/types mirror the JPA entities exactly (ddl-auto=validate).
-- current_question_index is -1 while the session is in LOBBY (not yet started).

create table quiz_session (
    id                     uuid        primary key,
    version                bigint,
    created_at             timestamptz,
    updated_at             timestamptz,
    quiz_id                uuid        not null references quiz (id),
    host_professor_id      uuid        not null references professor (id),
    join_token             varchar(16) not null unique,
    state                  varchar(20) not null,
    current_question_index integer     not null,
    started_at             timestamptz,
    ended_at               timestamptz
);

create index idx_session_host on quiz_session (host_professor_id);
create index idx_session_quiz on quiz_session (quiz_id);

-- Enforce "one active session per quiz" at the DB level: a quiz may have at most
-- one session that is not yet ENDED. Belt-and-suspenders next to the service check.
create unique index uq_active_session_per_quiz
    on quiz_session (quiz_id)
    where state in ('LOBBY', 'ACTIVE');
