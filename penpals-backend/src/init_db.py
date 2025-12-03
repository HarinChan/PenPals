from main import application, db

with application.app_context():
    db.create_all()
    print("Database tables created successfully!")