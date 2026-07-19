create table professor (
    id           uuid         primary key,
    email        varchar(255) not null unique,
    display_name varchar(255) not null,
    created_at   timestamp  not null default now()
);

insert into professor (id, email, display_name)
values ('00000000-0000-0000-0000-000000000001', 'professor@test.local', 'Test Professor');
