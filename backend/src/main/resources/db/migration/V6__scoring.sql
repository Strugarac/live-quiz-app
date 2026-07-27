-- Step 6: grading. Each answer row now records whether it was correct and the points
-- it earned. Scoring is correctness-only (a correct answer is worth a flat amount);
-- speed is NOT scored, but response_time_ms stays on the row for Step 7 statistics.
--
-- FREE_TEXT answers are collected but not auto-graded, so is_correct stays null for them.
alter table participant_answer add column is_correct boolean;
alter table participant_answer add column points integer not null default 0;
