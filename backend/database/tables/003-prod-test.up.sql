-- Migration: 003 - Production Test
-- Author: system
-- Date: 2026-08-05
-- Environment: both
-- Timeout: 10
-- Purpose: Test production approval gate workflow

BEGIN;

CREATE TABLE IF NOT EXISTS prod_workflow_test (
  id INT AUTO_INCREMENT PRIMARY KEY,
  test_data VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMIT;
