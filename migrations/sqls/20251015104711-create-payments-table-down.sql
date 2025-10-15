-- Drop trigger first
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop indexes
DROP INDEX IF EXISTS idx_payments_reference;
DROP INDEX IF EXISTS idx_payments_created_at;
DROP INDEX IF EXISTS idx_payments_phone;
DROP INDEX IF EXISTS idx_payments_status;
DROP INDEX IF EXISTS idx_payments_link_id;

-- Drop payments table
DROP TABLE IF EXISTS payments;