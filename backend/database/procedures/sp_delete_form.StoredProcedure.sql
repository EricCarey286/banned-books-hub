CREATE DEFINER = `root` @`%` PROCEDURE `sp_delete_form` (IN p_id INT) BEGIN
DELETE FROM contact_form
WHERE
  id = p_id;

END