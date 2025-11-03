-- Add claim_token column to store the full token server-side
-- This avoids URL length/truncation issues
ALTER TABLE external_identities
ADD COLUMN IF NOT EXISTS claim_token TEXT,
ADD COLUMN IF NOT EXISTS claim_token_expires_at TIMESTAMPTZ;

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_external_identities_claim_token
ON external_identities(claim_token)
WHERE claim_token IS NOT NULL;
