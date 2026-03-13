"""
Database migration script to add messaging tables.
Run this to upgrade the database schema for the messaging feature.
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from main import application
from models import db

def migrate_database():
    """Add new tables for messaging feature"""
    with application.app_context():
        print("Starting database migration...")
        
        # Create new tables
        print("Creating messaging tables...")
        db.create_all()
        print("✓ Created messaging tables")
        
        print("\n✅ Migration completed successfully!")
        print("\nNew tables added:")
        print("  - conversations")
        print("  - messages")
        print("  - message_reads")
        print("  - conversation_participants")

if __name__ == '__main__':
    migrate_database()
