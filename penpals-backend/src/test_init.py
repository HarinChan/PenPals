#!/usr/bin/env python3
"""
Simple database initialization test
"""
import os
import sys

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

# Create database directory if it doesn't exist
db_dir = os.path.join(os.path.dirname(__file__), 'penpals_db')
os.makedirs(db_dir, exist_ok=True)

from main import application, db

print(f"Database directory: {db_dir}")
print(f"Database URI: {application.config['SQLALCHEMY_DATABASE_URI']}")

with application.app_context():
    try:
        db.create_all()
        print("Database tables created successfully!")
        
        # Test basic functionality
        from models import Account
        print(f"Account table exists: {Account.__table__.exists(db.engine)}")
        
    except Exception as e:
        print(f"Error creating database: {e}")