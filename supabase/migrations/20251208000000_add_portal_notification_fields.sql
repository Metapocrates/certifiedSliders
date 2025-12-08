-- Add fields for portal coming soon notification preferences
-- These fields track user interest in upcoming role-specific portals

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS portal_notify_me BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS portal_feedback_note TEXT;

COMMENT ON COLUMN profiles.portal_notify_me IS 'User wants to be notified when their role-specific portal launches';
COMMENT ON COLUMN profiles.portal_feedback_note IS 'User feedback about what features would be most helpful in their portal';
