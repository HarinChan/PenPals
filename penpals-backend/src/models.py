from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class Account(db.Model):
    __tablename__ = 'accounts'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)  # HASHED password
    organization = db.Column(db.String(120), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship to profile
    profile = db.relationship('Profile', backref='account', uselist=False, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Account {self.email}>'


class Profile(db.Model):
    __tablename__ = 'profiles'
    
    id = db.Column(db.Integer, primary_key=True)
    account_id = db.Column(db.Integer, db.ForeignKey('accounts.id'), nullable=False, unique=True)
    
    name = db.Column(db.String(100), nullable=False)
    location = db.Column(db.String(100), nullable=True)
    class_size = db.Column(db.Integer, nullable=True)
    availability = db.Column(db.JSON, nullable=True)  # Store as JSON array
    timezone = db.Column(db.String(50), nullable=True)
    interests = db.Column(db.JSON, nullable=True)  # Store as JSON array
    
    # Relationships
    sent_relations = db.relationship('Relation', foreign_keys='Relation.from_profile_id', 
                                     backref='from_profile', lazy='dynamic', cascade='all, delete-orphan')
    received_relations = db.relationship('Relation', foreign_keys='Relation.to_profile_id',
                                         backref='to_profile', lazy='dynamic', cascade='all, delete-orphan')
    posts = db.relationship('Post', backref='author', lazy='dynamic', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Profile {self.name}>'


class Relation(db.Model):
    """Profile-to-Profile connections (friendships/connections)"""
    __tablename__ = 'relations'
    
    id = db.Column(db.Integer, primary_key=True)
    from_profile_id = db.Column(db.Integer, db.ForeignKey('profiles.id'), nullable=False)
    to_profile_id = db.Column(db.Integer, db.ForeignKey('profiles.id'), nullable=False)
    status = db.Column(db.String(20), default='pending')  # pending, accepted, blocked
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        db.UniqueConstraint('from_profile_id', 'to_profile_id', name='unique_relation'),
    )
    
    def __repr__(self):
        return f'<Relation {self.from_profile_id} -> {self.to_profile_id}>'


class Post(db.Model):
    __tablename__ = 'posts'
    
    id = db.Column(db.Integer, primary_key=True)
    profile_id = db.Column(db.Integer, db.ForeignKey('profiles.id'), nullable=False)
    
    content = db.Column(db.Text, nullable=False)
    media_url = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Link to ChromaDB document ID for embedding
    embedding_id = db.Column(db.String(100), nullable=True, unique=True)
    
    def __repr__(self):
        return f'<Post {self.id} by Profile {self.profile_id}>'