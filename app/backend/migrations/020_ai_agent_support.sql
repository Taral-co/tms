-- +goose Up
-- Migration: Add AI agent support to chat system
-- Description: Adds 'ai-agent' as a valid author_type for chat messages to support AI-powered responses

-- Update the chat_messages table to allow 'ai-agent' as author_type
ALTER TABLE chat_messages 
DROP CONSTRAINT IF EXISTS chat_messages_author_type_check;

ALTER TABLE chat_messages 
ADD CONSTRAINT chat_messages_author_type_check 
CHECK (author_type IN ('visitor', 'agent', 'system', 'ai-agent'));

-- Add index for AI agent messages for performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_ai_agent 
ON chat_messages(session_id, created_at) 
WHERE author_type = 'ai-agent';

-- Add index to track human vs AI responses
CREATE INDEX IF NOT EXISTS idx_chat_messages_agent_types 
ON chat_messages(session_id, author_type, created_at);

-- +goose Down

-- Remove AI agent support
ALTER TABLE chat_messages 
DROP CONSTRAINT IF EXISTS chat_messages_author_type_check;

ALTER TABLE chat_messages 
ADD CONSTRAINT chat_messages_author_type_check 
CHECK (author_type IN ('visitor', 'agent', 'system'));

-- Drop AI-specific indexes
DROP INDEX IF EXISTS idx_chat_messages_ai_agent;
DROP INDEX IF EXISTS idx_chat_messages_agent_types;
