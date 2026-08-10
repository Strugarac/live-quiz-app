-- Which questions a session has already presented, in the order they were presented.
--
-- Until now progress was implied by quiz_session.current_question_index: everything up to
-- it had been asked. A FLEXIBLE quiz breaks that — the host picks any remaining question,
-- so the presented set is no longer a prefix of the quiz — and it also lets questions be
-- appended while the session runs, which would silently change what "remaining" means.
-- Recording the asked questions explicitly makes "remaining" a fact rather than an
-- inference, for both quiz types.
--
-- current_question_index is kept and still means "position of the current question in the
-- quiz": it is what identifies the question being shown. It just no longer doubles as a
-- progress marker.
create table session_asked_question (
    session_id  uuid    not null references quiz_session (id) on delete cascade,
    question_id uuid    not null references question (id) on delete cascade,
    position    integer not null,
    primary key (session_id, position)
);

-- A question is presented at most once per session.
create unique index uq_session_asked_question
    on session_asked_question (session_id, question_id);

-- Supports the "has this question been asked in a live session?" guard that protects an
-- asked question from being edited or deleted mid-session.
create index idx_session_asked_question_question
    on session_asked_question (question_id);

-- Backfill sessions that already ran: every question up to and including the current one
-- was presented, in quiz order. Sessions that never started (index -1) match nothing.
insert into session_asked_question (session_id, question_id, position)
select s.id, q.id, q.order_index
from quiz_session s
         join question q on q.quiz_id = s.quiz_id
where s.current_question_index >= 0
  and q.order_index <= s.current_question_index;
