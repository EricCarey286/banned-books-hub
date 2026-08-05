-- Migrations Metadata Table
-- Purpose: Track all database schema migrations for audit trail and idempotency

CREATE TABLE IF NOT EXISTS migrations (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  version VARCHAR(50) UNIQUE NOT NULL,
  description VARCHAR(255) NOT NULL,
  migration_file VARCHAR(512) NOT NULL,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  executor_id VARCHAR(100),
  status ENUM('pending', 'success', 'failed', 'rolled_back') DEFAULT 'pending',
  execution_time_ms INT,
  error_message TEXT,
  applied_to_env ENUM('development', 'production') NOT NULL,
  checksum VARCHAR(64),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_version_env (version, applied_to_env),
  INDEX idx_executed_at (executed_at),
  INDEX idx_status (status),
  INDEX idx_applied_to_env (applied_to_env)
);

-- Bootstrap entry for baseline schema
INSERT IGNORE INTO migrations
(version, description, executor_id, status, applied_to_env)
VALUES
('000-baseline', 'Baseline schema before migration system', 'bootstrap', 'success', 'development'),
('000-baseline', 'Baseline schema before migration system', 'bootstrap', 'success', 'production');
