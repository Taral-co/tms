-- +goose Up
-- Add display_name to email_mailboxes table
-- This adds a display name field to mailboxes for better sender identity

-- Add display_name column to email_mailboxes
ALTER TABLE email_mailboxes 
ADD COLUMN display_name TEXT;

-- Add comment for clarity
COMMENT ON COLUMN email_mailboxes.display_name IS 'Friendly display name for the mailbox (e.g., "Support Team")';

-- +goose Down
-- Remove display_name column
ALTER TABLE email_mailboxes 
DROP COLUMN IF EXISTS display_name;
