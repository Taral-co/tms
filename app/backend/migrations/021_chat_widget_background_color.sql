-- +goose Up
-- Add background_color to chat_widgets
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chat_widgets' AND column_name = 'background_color'
    ) THEN
        ALTER TABLE chat_widgets 
            ADD COLUMN background_color VARCHAR(7) DEFAULT '#ffffff';
    END IF;
END $$;

-- +goose Down
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'chat_widgets' AND column_name = 'background_color'
    ) THEN
        ALTER TABLE chat_widgets 
            DROP COLUMN background_color;
    END IF;
END $$;
