CREATE DEFINER = `root` @`%` PROCEDURE `sp_delete_books` (IN p_ids TEXT) BEGIN
SET
  @sql = CONCAT(
    'DELETE FROM banned_books WHERE id IN (',
    p_ids,
    ')'
  );

PREPARE stmt
FROM
  @sql;

EXECUTE stmt;

DEALLOCATE PREPARE stmt;

END