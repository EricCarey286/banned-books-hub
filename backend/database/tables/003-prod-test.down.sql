-- Migration: 003 - Production Test (Rollback)
-- Author: system
-- Date: 2026-08-05
-- Environment: both
-- Timeout: 10
-- Purpose: Clean up production test table

BEGIN;

DROP TABLE IF EXISTS prod_workflow_test;

COMMIT;
