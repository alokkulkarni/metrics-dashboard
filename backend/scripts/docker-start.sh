#!/bin/sh

# Backend startup script for Docker
set -e

echo "Starting backend application..."

# Wait for database to be ready
echo "Waiting for PostgreSQL to be ready..."
until pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER; do
  echo "PostgreSQL is not ready yet. Waiting..."
  sleep 2
done

echo "PostgreSQL is ready!"

# Run database setup (sync tables)
echo "Setting up database..."
npm run db:setup

# Start the application
echo "Starting the application..."
exec npm start
