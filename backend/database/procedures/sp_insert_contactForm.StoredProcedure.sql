CREATE DEFINER = `root` @`%` PROCEDURE `sp_insert_contactForm` (
  IN p_name VARCHAR(20),
  IN p_email VARCHAR(255),
  IN p_message TEXT
) BEGIN
INSERT INTO
  contact_form (name, email, message)
VALUES
  (p_name, p_email, p_message);

END