CREATE DEFINER = `root` @`%` PROCEDURE `sp_get_suggested_books` (IN in_offset INT, IN in_limit INT) BEGIN
SELECT
  id,
  isbn,
  title,
  author,
  description,
  ban_reason,
  banned_by,
  cover_url,
  created_on,
  updated_on
FROM
  suggested_books
LIMIT
  in_offset, in_limit;

END