-- PostgreSQL initialization script for Reve Platform
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Database and default schema ready
GRANT ALL PRIVILEGES ON DATABASE reve_db TO reve;
