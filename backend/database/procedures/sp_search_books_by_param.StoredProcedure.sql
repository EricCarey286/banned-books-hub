CREATE DEFINER = `root` @`%` PROCEDURE `sp_search_books_by_param` (IN searchTerm VARCHAR(255)) BEGIN
SELECT
  id,
  isbn,
  title,
  author,
  description,
  ban_reason,
  banned_by,
  cover_url created_on,
  updated_on
FROM
  banned_books
WHERE
  title LIKE searchTerm
  OR author LIKE searchTerm
  OR description LIKE searchTerm
  OR isbn LIKE searchTerm
  OR ban_reason LIKE searchTerm
  OR banned_by LIKE searchTerm;

END