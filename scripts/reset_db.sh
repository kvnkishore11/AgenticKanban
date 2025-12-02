#!/bin/bash

# Reset database script
# Database location: adws/database/agentickanban.db

echo "Starting database reset..."

# Get the script directory and navigate to project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Check if we're in a worktree, navigate to main project if so
if [[ "$PROJECT_ROOT" == *"/trees/"* ]]; then
    MAIN_PROJECT_ROOT="${PROJECT_ROOT%%/trees/*}"
    echo "Detected worktree. Using main project: $MAIN_PROJECT_ROOT"
else
    MAIN_PROJECT_ROOT="$PROJECT_ROOT"
fi

DB_DIR="$MAIN_PROJECT_ROOT/adws/database"
DB_FILE="$DB_DIR/agentickanban.db"
BACKUP_FILE="$DB_DIR/backup.db"
SCHEMA_FILE="$DB_DIR/schema.sql"

# Check if backup exists
if [ -f "$BACKUP_FILE" ]; then
    echo "Restoring from backup..."
    cp "$BACKUP_FILE" "$DB_FILE"

    if [ $? -eq 0 ]; then
        echo "✓ Database reset from backup successfully"
    else
        echo "✗ Error: Failed to restore from backup"
        exit 1
    fi
elif [ -f "$SCHEMA_FILE" ]; then
    echo "No backup found. Recreating from schema..."
    rm -f "$DB_FILE"
    sqlite3 "$DB_FILE" < "$SCHEMA_FILE"

    if [ $? -eq 0 ]; then
        echo "✓ Database recreated from schema successfully"
    else
        echo "✗ Error: Failed to create database from schema"
        exit 1
    fi
else
    echo "✗ Error: Neither backup.db nor schema.sql found in $DB_DIR"
    exit 1
fi

echo "Database location: $DB_FILE"
