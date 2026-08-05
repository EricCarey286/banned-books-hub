CREATE DEFINER = `root` @`%` PROCEDURE `sp_delete_forms` (IN p_ids TEXT) BEGIN
SET
  @sql = CONCAT(
    'DELETE FROM contact_form WHERE id IN (',
    p_ids,
    ')'
  );

PREPARE stmt
FROM
  @sql;

EXECUTE stmt;

DEALLOCATE PREPARE stmt;

END