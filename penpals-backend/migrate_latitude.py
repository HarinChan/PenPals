#!/usr/bin/env python3
"""
Migration script to rename lattitude column to latitude in the database.
Run this once to update existing databases.
"""

import sqlite3
import os
import sys

def migrate_database(db_path):
    """Rename lattitude column to latitude in Profile table"""
    if not os.path.exists(db_path):
        print(f"Database not found: {db_path}")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if the old column exists
        cursor.execute("PRAGMA table_info(profiles)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'lattitude' not in columns:
            print("Column 'lattitude' not found. Migration may have already been applied.")
            conn.close()
            return True
        
        if 'latitude' in columns:
            print("Column 'latitude' already exists. Skipping migration.")
            conn.close()
            return True
        
        print("Renaming 'lattitude' to 'latitude'...")
        
        # SQLite doesn't support RENAME COLUMN directly in older versions
        # So we need to create a new table and copy data
        cursor.execute("""
            CREATE TABLE profiles_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                account_id INTEGER NOT NULL,
                name VARCHAR(100) NOT NULL,
                location VARCHAR(100),
                latitude VARCHAR(100),
                longitude VARCHAR(100),
                class_size INTEGER,
                description TEXT,
                avatar VARCHAR(255),
                availability JSON,
                interests JSON,
                FOREIGN KEY (account_id) REFERENCES account(id)
            )
        """)
        
        # Copy data from old table to new table
        cursor.execute("""
            INSERT INTO profiles_new 
            SELECT id, account_id, name, location, lattitude, longitude, 
                   class_size, description, avatar, availability, interests
            FROM profiles
        """)
        
        # Drop old table and rename new table
        cursor.execute("DROP TABLE profiles")
        cursor.execute("ALTER TABLE profiles_new RENAME TO profiles")
        
        conn.commit()
        print("Migration completed successfully!")
        conn.close()
        return True
        
    except Exception as e:
        print(f"Error during migration: {e}")
        return False

if __name__ == '__main__':
    db_path = 'penpals_db/penpals.db'
    
    if len(sys.argv) > 1:
        db_path = sys.argv[1]
    
    print(f"Migrating database: {db_path}")
    success = migrate_database(db_path)
    sys.exit(0 if success else 1)
