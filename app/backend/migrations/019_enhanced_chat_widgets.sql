-- +goose Up
-- Chat widget configurations for projects
-- Enhanced Chat Widget Features
-- Adds enterprise-grade customization options for chat widgets

-- Add new columns to chat_widgets table (with IF NOT EXISTS checks)
DO $$
BEGIN
    -- Add widget_shape column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_widgets' AND column_name = 'widget_shape') THEN
        ALTER TABLE chat_widgets ADD COLUMN widget_shape VARCHAR(50) DEFAULT 'rounded' CHECK (widget_shape IN ('rounded', 'square', 'minimal', 'professional', 'modern', 'classic'));
    END IF;
    
    -- Add chat_bubble_style column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_widgets' AND column_name = 'chat_bubble_style') THEN
        ALTER TABLE chat_widgets ADD COLUMN chat_bubble_style VARCHAR(50) DEFAULT 'modern' CHECK (chat_bubble_style IN ('modern', 'classic', 'minimal', 'bot'));
    END IF;
    
    -- Add agent_name column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_widgets' AND column_name = 'agent_name') THEN
        ALTER TABLE chat_widgets ADD COLUMN agent_name VARCHAR(255) DEFAULT 'Support Agent';
    END IF;
    
    -- Add agent_avatar_url column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_widgets' AND column_name = 'agent_avatar_url') THEN
        ALTER TABLE chat_widgets ADD COLUMN agent_avatar_url TEXT;
    END IF;
    
    -- Add use_ai column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_widgets' AND column_name = 'use_ai') THEN
        ALTER TABLE chat_widgets ADD COLUMN use_ai BOOLEAN DEFAULT false;
    END IF;
    
    -- Add custom_css column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_widgets' AND column_name = 'custom_css') THEN
        ALTER TABLE chat_widgets ADD COLUMN custom_css TEXT;
    END IF;
    
    -- Add widget_size column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_widgets' AND column_name = 'widget_size') THEN
        ALTER TABLE chat_widgets ADD COLUMN widget_size VARCHAR(20) DEFAULT 'medium' CHECK (widget_size IN ('small', 'medium', 'large'));
    END IF;
    
    -- Add animation_style column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_widgets' AND column_name = 'animation_style') THEN
        ALTER TABLE chat_widgets ADD COLUMN animation_style VARCHAR(30) DEFAULT 'smooth' CHECK (animation_style IN ('smooth', 'bounce', 'fade', 'slide'));
    END IF;
    
    -- Add sound_enabled column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_widgets' AND column_name = 'sound_enabled') THEN
        ALTER TABLE chat_widgets ADD COLUMN sound_enabled BOOLEAN DEFAULT true;
    END IF;
    
    -- Add show_powered_by column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_widgets' AND column_name = 'show_powered_by') THEN
        ALTER TABLE chat_widgets ADD COLUMN show_powered_by BOOLEAN DEFAULT true;
    END IF;
    
    -- Add custom_greeting column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_widgets' AND column_name = 'custom_greeting') THEN
        ALTER TABLE chat_widgets ADD COLUMN custom_greeting TEXT;
    END IF;
    
    -- Add away_message column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_widgets' AND column_name = 'away_message') THEN
        ALTER TABLE chat_widgets ADD COLUMN away_message TEXT DEFAULT 'We''re currently away. Leave us a message and we''ll get back to you!';
    END IF;
END $$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_chat_widgets_shape_active ON chat_widgets(widget_shape, is_active);

-- Update existing widgets with default values
UPDATE chat_widgets 
SET 
    agent_name = 'Support Agent',
    custom_greeting = 'Hi there! 👋 How can we help you today?',
    away_message = 'We''re currently away. Leave us a message and we''ll get back to you!'
WHERE agent_name IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN chat_widgets.widget_shape IS 'Visual theme/shape of the chat widget UI';
COMMENT ON COLUMN chat_widgets.chat_bubble_style IS 'Style of chat message bubbles';
COMMENT ON COLUMN chat_widgets.agent_name IS 'Personalized agent name shown to visitors';
COMMENT ON COLUMN chat_widgets.agent_avatar_url IS 'URL to agent profile picture';
COMMENT ON COLUMN chat_widgets.use_ai IS 'Whether AI assistance is enabled for this widget';
COMMENT ON COLUMN chat_widgets.custom_css IS 'Additional CSS customizations';
COMMENT ON COLUMN chat_widgets.widget_size IS 'Size variant of the chat widget';
COMMENT ON COLUMN chat_widgets.animation_style IS 'Animation style for widget interactions';
COMMENT ON COLUMN chat_widgets.sound_enabled IS 'Whether notification sounds are enabled';
COMMENT ON COLUMN chat_widgets.show_powered_by IS 'Whether to show "Powered by" branding';
COMMENT ON COLUMN chat_widgets.custom_greeting IS 'Custom greeting message (overrides welcome_message)';
COMMENT ON COLUMN chat_widgets.away_message IS 'Message shown when agents are offline';

-- +goose Down

DO $$
BEGIN
    -- Drop columns safely if they exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_widgets' AND column_name = 'widget_shape') THEN
        ALTER TABLE chat_widgets DROP COLUMN widget_shape;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_widgets' AND column_name = 'chat_bubble_style') THEN
        ALTER TABLE chat_widgets DROP COLUMN chat_bubble_style;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_widgets' AND column_name = 'agent_name') THEN
        ALTER TABLE chat_widgets DROP COLUMN agent_name;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_widgets' AND column_name = 'agent_avatar_url') THEN
        ALTER TABLE chat_widgets DROP COLUMN agent_avatar_url;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_widgets' AND column_name = 'use_ai') THEN
        ALTER TABLE chat_widgets DROP COLUMN use_ai;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_widgets' AND column_name = 'custom_css') THEN
        ALTER TABLE chat_widgets DROP COLUMN custom_css;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_widgets' AND column_name = 'widget_size') THEN
        ALTER TABLE chat_widgets DROP COLUMN widget_size;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_widgets' AND column_name = 'animation_style') THEN
        ALTER TABLE chat_widgets DROP COLUMN animation_style;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_widgets' AND column_name = 'sound_enabled') THEN
        ALTER TABLE chat_widgets DROP COLUMN sound_enabled;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_widgets' AND column_name = 'show_powered_by') THEN
        ALTER TABLE chat_widgets DROP COLUMN show_powered_by;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_widgets' AND column_name = 'custom_greeting') THEN
        ALTER TABLE chat_widgets DROP COLUMN custom_greeting;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_widgets' AND column_name = 'away_message') THEN
        ALTER TABLE chat_widgets DROP COLUMN away_message;
    END IF;
END $$;

-- Drop index
DROP INDEX IF EXISTS idx_chat_widgets_shape_active;
