-- Migration: Add userId field to saved_projects table
-- Purpose: Enforce user-level data isolation for authentication
-- Date: 2026-06-21

-- Step 1: Add userId column (nullable first to allow existing data)
ALTER TABLE saved_projects
ADD COLUMN "userId" TEXT;

-- Step 2: Create index on userId for fast queries
CREATE INDEX "saved_projects_userId_idx" ON saved_projects("userId");

-- Step 3 (MANUAL): Update existing rows with a test user ID or delete them
-- WARNING: Choose ONE of these options based on your needs:

-- OPTION A: Assign all existing projects to a specific user (if you have one test user)
-- UPDATE saved_projects SET "userId" = 'user_xxxxxxxxxxxxxxxxxxxxx' WHERE "userId" IS NULL;

-- OPTION B: Delete all existing test projects (recommended for fresh start)
-- DELETE FROM saved_projects WHERE "userId" IS NULL;

-- Step 4: Make userId NOT NULL (run AFTER Step 3)
-- ALTER TABLE saved_projects ALTER COLUMN "userId" SET NOT NULL;

-- NOTES:
-- - The userId index already exists in schema (@@index([userId]))
-- - Run Steps 1-2 immediately
-- - Run Step 3 after deciding how to handle existing data
-- - Run Step 4 only after Step 3 is complete
-- - In production, userId will be populated automatically by Clerk auth
