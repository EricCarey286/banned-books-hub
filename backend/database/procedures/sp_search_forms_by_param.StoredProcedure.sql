CREATE DEFINER = `root` @`%` PROCEDURE `sp_search_forms_by_param` (IN searchTerm VARCHAR(255)) BEGIN
SELECT
  id,
  name,
  email,
  message,
  created_on,
  updated_on
FROM
  contact_form
WHERE
  name LIKE searchTerm
  OR email LIKE searchTerm
  OR message LIKE searchTerm;

END