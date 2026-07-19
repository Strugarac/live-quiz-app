create table quiz_config (
    id                          uuid        primary key,
    version                     bigint,
    created_at                  timestamp,
    updated_at                  timestamp,
    email_requirement           varchar(20) not null,
    personal_number_requirement varchar(20) not null,
    name_requirement            varchar(20) not null,
    surname_requirement         varchar(20) not null,
    faculty_requirement         varchar(20) not null,
    save_statistics             boolean     not null,
    save_participants           boolean     not null
);

create table quiz (
    id                 uuid         primary key,
    version            bigint,
    created_at         timestamp,
    updated_at         timestamp,
    title              varchar(255) not null,
    description        varchar(2000),
    owner_professor_id uuid         not null references professor (id),
    type               varchar(20)  not null,
    config_id          uuid         not null unique references quiz_config (id)
);

create table question (
    id          uuid         primary key,
    version     bigint,
    created_at  timestamp,
    updated_at  timestamp,
    quiz_id     uuid         not null references quiz (id) on delete cascade,
    order_index integer      not null,
    text        varchar(1000),
    image_url   varchar(1024),
    type        varchar(20)  not null
);

create table answer_option (
    id          uuid         primary key,
    version     bigint,
    created_at  timestamp,
    updated_at  timestamp,
    question_id uuid         not null references question (id) on delete cascade,
    order_index integer      not null,
    text        varchar(1000),
    image_url   varchar(1024),
    correct     boolean      not null
);

create index idx_quiz_owner on quiz (owner_professor_id);
create index idx_question_quiz on question (quiz_id);
create index idx_answer_option_question on answer_option (question_id);
