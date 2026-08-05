CREATE DEFINER = `root` @`%` PROCEDURE `sp_get_books` (IN in_offset INT, IN in_limit INT) BEGIN
SELECT
  id,
  isbn,
  title,
  author,
  description,
  ban_reason,
  banned_by,
  created_on,
  updated_on,
  cover_url
FROM
  banned_books
ORDER BY
  title ASC
LIMIT
  in_offset, in_limit;

END