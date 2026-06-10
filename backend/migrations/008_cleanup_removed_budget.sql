-- Migration: Cleanup removed budget module
-- Removes all budget-related tables that are no longer needed
-- Date: 2026-06-10

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS budget_alerts CASCADE;
DROP TABLE IF EXISTS task_assignee_rates CASCADE;
DROP TABLE IF EXISTS task_budget_allocations CASCADE;
DROP TABLE IF EXISTS time_entries CASCADE;
DROP TABLE IF EXISTS billing_rates CASCADE;
DROP TABLE IF EXISTS budget_expenses CASCADE;
DROP TABLE IF EXISTS budget_categories CASCADE;
DROP TABLE IF EXISTS budgets CASCADE;
