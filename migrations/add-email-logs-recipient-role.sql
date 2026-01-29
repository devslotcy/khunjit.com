-- Migration: Add recipient_role and template_path to email_logs
-- Purpose: Prevent role mixup bugs by explicitly tracking which role received which email
-- Date: 2026-01-29

-- Add recipient_role column (nullable for backward compatibility with existing logs)
ALTER TABLE email_logs
ADD COLUMN IF NOT EXISTS recipient_role VARCHAR(20);

-- Add template_path column for debugging and audit trails
ALTER TABLE email_logs
ADD COLUMN IF NOT EXISTS template_path VARCHAR(255);

-- Create index for role-based queries
CREATE INDEX IF NOT EXISTS idx_email_logs_role ON email_logs(recipient_role);

-- Add comments for documentation
COMMENT ON COLUMN email_logs.recipient_role IS 'The role of the email recipient: patient, psychologist, or admin';
COMMENT ON COLUMN email_logs.template_path IS 'The template path used for this email, e.g., en/patient/welcome.html';

-- Optional: Backfill existing logs with best-guess role based on email type
-- This is safe to run and will help with historical data analysis
UPDATE email_logs
SET recipient_role = CASE
  WHEN type IN ('verification_approved', 'verification_rejected') THEN 'psychologist'
  ELSE 'patient'  -- Default assumption for historical data
END
WHERE recipient_role IS NULL;

-- Note: For production, you may want to determine role more accurately by joining with user_profiles
