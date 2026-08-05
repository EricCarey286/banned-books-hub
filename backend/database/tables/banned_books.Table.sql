CREATE TABLE `banned_books` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `isbn` text NOT NULL,
  `author` text NOT NULL,
  `title` text NOT NULL,
  `description` text NOT NULL,
  `banned_by` text NOT NULL,
  `ban_reason` text NOT NULL,
  `created_on` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_on` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `featured` tinyint(1) NOT NULL DEFAULT '0',
  `cover_url` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `id` (`id`)
) ENGINE = InnoDB AUTO_INCREMENT = 53 DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci