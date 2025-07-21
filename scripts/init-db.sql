-- Initialize the database with required extensions and initial data

-- Create extensions if they don't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'board_type') THEN
        CREATE TYPE board_type AS ENUM ('scrum', 'kanban', 'simple');
    END IF;
END
$$;

-- Create indexes for better performance
-- These will be created by Sequelize migrations, but including here for reference

-- Board indexes
-- CREATE INDEX IF NOT EXISTS idx_boards_board_id ON boards(board_id);
-- CREATE INDEX IF NOT EXISTS idx_boards_project_key ON boards(project_key);
-- CREATE INDEX IF NOT EXISTS idx_boards_type ON boards(type);
-- CREATE INDEX IF NOT EXISTS idx_boards_is_active ON boards(is_active);
-- CREATE INDEX IF NOT EXISTS idx_boards_last_synced_at ON boards(last_synced_at);

-- Project indexes  
-- CREATE INDEX IF NOT EXISTS idx_projects_project_id ON projects(project_id);
-- CREATE INDEX IF NOT EXISTS idx_projects_key ON projects(key);
-- CREATE INDEX IF NOT EXISTS idx_projects_project_type_key ON projects(project_type_key);
-- CREATE INDEX IF NOT EXISTS idx_projects_last_synced_at ON projects(last_synced_at);

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE metrics_dashboard TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
