-- Survey mode: a quiz with no right or wrong answers.
--
-- The professor is not testing anyone, they are opening a discussion — "what do you think?"
-- rather than "what is the answer?". Options carry no correct flag, answers are never graded,
-- and there is no scoring or leaderboard. What stays useful is the distribution: how many
-- people picked each option, which is the whole point of asking.
--
-- Defaults to false so every existing quiz keeps behaving exactly as it does today.
alter table quiz_config
    add column survey_mode boolean not null default false;
