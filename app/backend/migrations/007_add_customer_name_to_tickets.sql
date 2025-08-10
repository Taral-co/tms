-- +goose Up
-- +goose StatementBegin

-- Add customer_name field to tickets table (if not exists)
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);

-- Populate existing tickets with customer names from customers table
UPDATE tickets 
SET customer_name = customers.name 
FROM customers 
WHERE tickets.requester_id = customers.id;

-- Make customer_name NOT NULL now that it's populated
ALTER TABLE tickets ALTER COLUMN customer_name SET NOT NULL;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

-- Remove customer_name field from tickets table
ALTER TABLE tickets DROP COLUMN customer_name;

-- +goose StatementEnd
