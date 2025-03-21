#!/bin/bash

# This script applies the document system database migrations

# Check if .env file exists
if [ ! -f .env ]; then
  echo "Error: .env file not found. Please create one with NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
  exit 1
fi

# Load environment variables
source .env

# Check if required environment variables are set
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file."
  exit 1
fi

# Install required dependencies if not already installed
if ! npm list dotenv @supabase/supabase-js | grep -q "dotenv"; then
  echo "Installing required dependencies..."
  npm install --save-dev dotenv @supabase/supabase-js
fi

# Make the script executable
chmod +x src/migrations/apply_migrations.js

# Apply the document system migrations
echo "Applying document system migrations..."
node src/migrations/apply_migrations.js src/migrations/add_parent_document_id.sql

# Check if the migration was successful
if [ $? -eq 0 ]; then
  echo "Document system migrations applied successfully!"
else
  echo "Error applying document system migrations."
  exit 1
fi

echo "Document system is now ready to use."