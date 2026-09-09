-- Rename the seeded console user.
--
-- The stub identity behind every /api/professor/** request was still the "Test Professor"
-- placeholder from the baseline. It is the name and address the console shows on screen,
-- so it is now the intended one: Admin User <adminuser@gmail.com>.
--
-- Done as a migration rather than by editing V1, which is already applied everywhere and
-- whose checksum Flyway verifies on every startup. Matched by id, not by the old email,
-- so it lands on the right row whatever that row currently holds.
--
-- This does not change the auth seam itself: HardcodedProfessorProvider still answers
-- every request as this one id until university login replaces it.

update professor
set email        = 'adminuser@gmail.com',
    display_name = 'Admin User'
where id = '00000000-0000-0000-0000-000000000001';
