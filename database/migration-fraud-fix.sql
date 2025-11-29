-- Fraud Prevention Fix: Keep trial_attempts records even after user deletion
-- This prevents users from deleting account and starting trial again

-- Step 1: Make user_id nullable (trial records should persist even if user deleted)
ALTER TABLE trial_attempts 
  ALTER COLUMN user_id DROP NOT NULL;

-- Step 2: Remove CASCADE constraint and replace with SET NULL
ALTER TABLE trial_attempts 
  DROP CONSTRAINT IF EXISTS trial_attempts_user_id_fkey;

ALTER TABLE trial_attempts 
  ADD CONSTRAINT trial_attempts_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES users(id) 
  ON DELETE SET NULL;

-- Step 3: Add comment explaining the logic
COMMENT ON COLUMN trial_attempts.user_id IS 'User ID (nullable after deletion) - kept as SET NULL to prevent fraud via account deletion';

-- Verification
-- After running this migration:
-- 1. When a user is deleted, trial_attempts record stays (user_id becomes NULL)
-- 2. device_id stays in database forever
-- 3. Same device_id cannot start trial again (UNIQUE constraint)
-- 4. Fraud prevention works even after account deletion

