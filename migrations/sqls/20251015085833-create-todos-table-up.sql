-- Create todos table
CREATE TABLE IF NOT EXISTS todos (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'not yet' CHECK (status IN ('done', 'not yet')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on status for better query performance
CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status);

-- Create index on created_at for better query performance
CREATE INDEX IF NOT EXISTS idx_todos_created_at ON todos(created_at);