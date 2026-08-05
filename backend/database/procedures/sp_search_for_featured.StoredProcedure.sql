CREATE DEFINER = `root` @`%` PROCEDURE `sp_search_for_featured` () BEGIN
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
  banned_books
WHERE
  featured LIKE 1;

END