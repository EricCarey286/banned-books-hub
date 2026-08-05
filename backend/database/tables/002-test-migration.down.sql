-- Migration: 002 - Test Migration (Rollback)
-- Author: system
-- Date: 2026-08-05
-- Environment: both
-- Timeout: 10
-- Purpose: Clean up test table

BEGIN;

DROP TABLE IF EXISTS migration_workflow_test;

COMMIT;
