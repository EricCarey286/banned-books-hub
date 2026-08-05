CREATE DEFINER = `root` @`%` PROCEDURE `sp_delete_sugg_book` (IN p_id INT) BEGIN
DELETE FROM suggested_books
WHERE
  id = p_id;

END