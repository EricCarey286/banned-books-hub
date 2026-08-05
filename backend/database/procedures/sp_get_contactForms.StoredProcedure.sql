CREATE DEFINER = `root` @`%` PROCEDURE `sp_get_contactForms` (IN in_offset INT, IN in_limit INT) BEGIN
SELECT
  id,
  name,
  email,
  message,
  created_on,
  updated_on
FROM
  contact_form
LIMIT
  in_offset, in_limit;

END