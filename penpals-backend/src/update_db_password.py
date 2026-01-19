
from main import application, db
from sqlalchemy import text

def update_schema():
    with application.app_context():
        # Add password column to meetings table
        try:
            with db.engine.connect() as conn:
                conn.execute(text("ALTER TABLE meetings ADD COLUMN password TEXT"))
                conn.commit()
            print("Successfully added password column to meetings table")
        except Exception as e:
            print(f"Error updating schema: {e}")

if __name__ == "__main__":
    update_schema()
