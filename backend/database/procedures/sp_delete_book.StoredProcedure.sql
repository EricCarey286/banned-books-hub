CREATE DEFINER = `root` @`%` PROCEDURE `sp_delete_book` (IN p_id INT) BEGIN
DELETE FROM banned_books
WHERE
  id = p_id;

END