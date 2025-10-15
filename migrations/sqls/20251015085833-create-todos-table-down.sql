-- Drop indexes first
DROP INDEX IF EXISTS idx_todos_created_at;
DROP INDEX IF EXISTS idx_todos_status;

-- Drop todos table
DROP TABLE IF EXISTS todos;