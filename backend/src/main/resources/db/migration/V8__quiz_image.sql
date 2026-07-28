-- Uploaded question / answer-option images.
--
-- Bytes live in Postgres rather than on the server's filesystem so that no volume is
-- needed and several backend instances can serve the same image (the same reason the
-- STOMP relay went to RabbitMQ instead of an in-memory broker).
--
-- question.image_url and answer_option.image_url stay plain varchar: they hold
-- /api/public/images/{id} for an upload, or an external URL if one was pasted. There is
-- deliberately no FK from those columns to this table, so replacing or deleting a
-- question leaves its image row behind as an orphan. Acceptable for now; a cleanup job
-- belongs in Step 10.
create table quiz_image (
    id                 uuid         primary key,
    version            bigint,
    created_at         timestamptz,
    updated_at         timestamptz,
    owner_professor_id uuid         not null references professor (id),
    content_type       varchar(100) not null,
    size_bytes         integer      not null,
    data               bytea        not null
);

create index idx_quiz_image_owner on quiz_image (owner_professor_id);
