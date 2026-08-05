CREATE DEFINER = `root` @`%` PROCEDURE `sp_insert_suggested_book` (
  IN p_isbn VARCHAR(20),
  IN p_title VARCHAR(255),
  IN p_author VARCHAR(255),
  IN p_description TEXT,
  IN p_ban_reason TEXT,
  IN p_banned_by VARCHAR(255),
  IN p_cover_url VARCHAR(255)
) BEGIN
INSERT INTO
  suggested_books (
    isbn,
    title,
    author,
    description,
    ban_reason,
    banned_by,
    cover_url
  )
VALUES
  (
    p_isbn,
    p_title,
    p_author,
    p_description,
    p_ban_reason,
    p_banned_by,
    p_cover_url
  );

END