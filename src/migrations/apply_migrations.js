#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Supabase URL and service role key are required.');
    console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Get migration file path from command line arguments
const migrationFile = process.argv[2];
if (!migrationFile) {
    console.error('Error: Migration file path is required.');
    console.error('Usage: node apply_migrations.js <migration-file-path>');
    process.exit(1);
}

const filePath = path.resolve(process.cwd(), migrationFile);

// Check if file exists
if (!fs.existsSync(filePath)) {
    console.error(`Error: Migration file not found: ${filePath}`);
    process.exit(1);
}

// Read migration SQL
const sql = fs.readFileSync(filePath, 'utf8');

// Apply migration
async function applyMigration() {
    console.log(`Applying migration: ${migrationFile}`);

    try {
        // Split SQL into individual statements
        const statements = sql
            .split(';')
            .map(statement => statement.trim())
            .filter(statement => statement.length > 0);

        // Execute each statement
        for (const statement of statements) {
            console.log(`Executing: ${statement.substring(0, 50)}...`);

            const { error } = await supabase.rpc('pgexecute', { query: statement });

            if (error) {
                console.error('Error executing SQL statement:', error);
                process.exit(1);
            }
        }

        console.log('Migration applied successfully!');

        // Record migration in migrations table
        const migrationName = path.basename(migrationFile);
        const { error } = await supabase
            .from('migrations')
            .insert([
                {
                    name: migrationName,
                    applied_at: new Date().toISOString()
                }
            ]);

        if (error) {
            console.error('Error recording migration:', error);
        } else {
            console.log(`Migration "${migrationName}" recorded in migrations table.`);
        }

    } catch (error) {
        console.error('Error applying migration:', error);
        process.exit(1);
    }
}

applyMigration();