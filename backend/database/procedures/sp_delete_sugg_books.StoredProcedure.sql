CREATE DEFINER = `root` @`%` PROCEDURE `sp_delete_sugg_books` (IN p_ids TEXT) BEGIN
SET
  @sql = CONCAT(
    'DELETE FROM suggested_books WHERE id IN (',
    p_ids,
    ')'
  );

PREPARE stmt
FROM
  @sql;

EXECUTE stmt;

DEALLOCATE PREPARE stmt;

END