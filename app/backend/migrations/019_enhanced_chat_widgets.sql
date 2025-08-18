-- Enhanced Chat Widget Features
-- Adds enterprise-grade customization options for chat widgets

-- Add new columns to chat_widgets table
ALTER TABLE chat_widgets 
ADD COLUMN widget_shape VARCHAR(50) DEFAULT 'rounded' CHECK (widget_shape IN ('rounded', 'square', 'minimal', 'professional', 'modern', 'classic')),
ADD COLUMN chat_bubble_style VARCHAR(50) DEFAULT 'modern' CHECK (chat_bubble_style IN ('modern', 'classic', 'minimal', 'bot')),
ADD COLUMN agent_name VARCHAR(255) DEFAULT 'Support Agent',
ADD COLUMN agent_avatar_url TEXT,
ADD COLUMN use_ai BOOLEAN DEFAULT false,
ADD COLUMN custom_css TEXT,
ADD COLUMN widget_size VARCHAR(20) DEFAULT 'medium' CHECK (widget_size IN ('small', 'medium', 'large')),
ADD COLUMN animation_style VARCHAR(30) DEFAULT 'smooth' CHECK (animation_style IN ('smooth', 'bounce', 'fade', 'slide')),
ADD COLUMN sound_enabled BOOLEAN DEFAULT true,
ADD COLUMN show_powered_by BOOLEAN DEFAULT true,
ADD COLUMN custom_greeting TEXT,
ADD COLUMN away_message TEXT DEFAULT 'We''re currently away. Leave us a message and we''ll get back to you!';

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
