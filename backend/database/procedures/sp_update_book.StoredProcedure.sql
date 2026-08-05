CREATE DEFINER = `root` @`%` PROCEDURE `sp_update_book` (
  IN p_isbn INT,
  IN p_title VARCHAR(255),
  IN p_author VARCHAR(255),
  IN p_description TEXT,
  IN p_ban_reason TEXT,
  IN p_banned_by VARCHAR(255)
) BEGIN
UPDATE banned_books
SET
  isbn = IFNULL(p_isbn, isbn),
  title = IFNULL(p_title, title),
  author = IFNULL(p_author, author),
  description = IFNULL(p_description, description),
  ban_reason = IFNULL(p_ban_reason, ban_reason),
  banned_by = IFNULL(p_banned_by, banned_by),
  updated_on = CURRENT_TIMESTAMP
WHERE
  isbn = p_isbn;

END