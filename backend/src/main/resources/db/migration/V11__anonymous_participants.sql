-- Anonymous participants.
--
-- A quiz configured NOT to keep participant identities now collects nothing at all: the
-- student taps once to join, no email and no personal data is ever stored, and both the
-- live console and the results show "Participant N". Previously the data was collected
-- and only wiped when the session ended, which meant the professor saw real names all
-- the way through a supposedly anonymous round.
--
-- Email therefore becomes optional. The (session_id, email) uniqueness stays as it is:
-- Postgres treats NULLs as distinct, so guests are never deduplicated against each other,
-- while a session that does collect email still allows one participant per address.
alter table participant
    alter column email drop not null;

-- Decided when the participant joins rather than reconstructed at the end, so the label a
-- professor sees during the session is the same one that appears in the results and CSV.
alter table participant
    add column display_label varchar(64);
