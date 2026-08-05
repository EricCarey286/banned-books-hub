-- Migration: 002 - Test Migration
-- Author: system
-- Date: 2026-08-05
-- Environment: both
-- Timeout: 10
-- Purpose: Test migration workflow verification

BEGIN;

CREATE TABLE IF NOT EXISTS migration_workflow_test (
  id INT AUTO_INCREMENT PRIMARY KEY,
  test_name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_created_at (created_at)
);

COMMIT;
