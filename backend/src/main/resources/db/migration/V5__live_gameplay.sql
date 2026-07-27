-- Real-time gameplay: the answers participants submit over WebSocket, plus the
-- two session columns that describe the currently displayed question.
-- Column names/types mirror the JPA entities exactly (ddl-auto=validate).
--
-- There is deliberately NO per-question time limit: the professor opens a question
-- (start / next) and closes it manually. current_question_opened_at is still recorded
-- so Step 6 can score on answer speed relative to when the question went live.

alter table quiz_session add column question_open boolean not null default false;
alter table quiz_session add column current_question_opened_at timestamptz;

-- One row per (participant, question). Answers are stored RAW here; grading and
-- scoring happen in Step 6, so there is no is_correct / points column yet.
create table participant_answer (
    id               uuid   primary key,
    version          bigint,
    created_at       timestamptz,
    updated_at       timestamptz,
    session_id       uuid   not null references quiz_session (id) on delete cascade,
    participant_id   uuid   not null references participant (id) on delete cascade,
    question_id      uuid   not null references question (id) on delete cascade,
    question_index   integer not null,
    free_text        varchar(2000),
    response_time_ms bigint,
    submitted_at     timestamptz not null,
    constraint uq_answer_participant_question unique (participant_id, question_id)
);

-- Selected options for choice questions. Empty for FREE_TEXT answers.
create table participant_answer_option (
    answer_id uuid not null references participant_answer (id) on delete cascade,
    option_id uuid not null references answer_option (id) on delete cascade,
    primary key (answer_id, option_id)
);

create index idx_participant_answer_session on participant_answer (session_id);
create index idx_participant_answer_question on participant_answer (question_id);
