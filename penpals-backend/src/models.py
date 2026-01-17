from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timezone

db = SQLAlchemy()

class Account(db.Model):
    __tablename__ = 'accounts'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)  # HASHED password
    organization = db.Column(db.String(120), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))
    
    # Relationships
    classrooms = db.relationship('Profile', backref='account', lazy='dynamic', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Account {self.email}>'


class Profile(db.Model):
    __tablename__ = 'profiles'
    
    id = db.Column(db.Integer, primary_key=True)
    account_id = db.Column(db.Integer, db.ForeignKey('accounts.id'), nullable=False)
    
    name = db.Column(db.String(100), nullable=False)
    location = db.Column(db.String(100), nullable=True) # Name of the place eg London
    lattitude = db.Column(db.String(100), nullable=True)
    longitude = db.Column(db.String(100), nullable=True)
    class_size = db.Column(db.Integer, nullable=True)
    availability = db.Column(db.JSON, nullable=True)  # Store as JSON array
    interests = db.Column(db.JSON, nullable=True)  # Store as JSON array
    
    # Relationships
    sent_relations = db.relationship('Relation', foreign_keys='Relation.from_profile_id', 
                                     backref='from_profile', lazy='dynamic', cascade='all, delete-orphan')
    received_relations = db.relationship('Relation', foreign_keys='Relation.to_profile_id',
                                         backref='to_profile', lazy='dynamic', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Profile {self.name}>'


class Relation(db.Model):
    """Profile-to-Profile connections (friendships/connections)"""
    __tablename__ = 'relations'
    
    id = db.Column(db.Integer, primary_key=True)
    from_profile_id = db.Column(db.Integer, db.ForeignKey('profiles.id'), nullable=False)
    to_profile_id = db.Column(db.Integer, db.ForeignKey('profiles.id'), nullable=False)
    # status = db.Column(db.String(20), default='pending')  # pending, accepted, blocked
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))
    
    __table_args__ = (
        db.UniqueConstraint('from_profile_id', 'to_profile_id', name='unique_relation'),
    )
    
    def __repr__(self):
        return f'<Relation {self.from_profile_id} -> {self.to_profile_id}>'


# Alias for classroom - Profile represents a classroom
Classroom = Profile


class Post(db.Model):
    """Posts/messages between classrooms"""
    __tablename__ = 'posts'
    
    id = db.Column(db.Integer, primary_key=True)
    profile_id = db.Column(db.Integer, db.ForeignKey('profiles.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))
    
    # Relationships
    profile = db.relationship('Profile', backref='posts')
    
    def __repr__(self):
        return f'<Post {self.id} by {self.profile_id}>'


meeting_participants = db.Table('meeting_participants',
    db.Column('meeting_id', db.Integer, db.ForeignKey('meetings.id'), primary_key=True),
    db.Column('profile_id', db.Integer, db.ForeignKey('profiles.id'), primary_key=True)
)


class Meeting(db.Model):
    """Video meetings scheduled via WebEx"""
    __tablename__ = 'meetings'
    
    id = db.Column(db.Integer, primary_key=True)
    webex_id = db.Column(db.String(255), nullable=True)
    title = db.Column(db.String(255), nullable=False)
    start_time = db.Column(db.DateTime, nullable=False)
    end_time = db.Column(db.DateTime, nullable=False)
    web_link = db.Column(db.String(1000), nullable=False)
    
    creator_id = db.Column(db.Integer, db.ForeignKey('profiles.id'), nullable=False)
    
    # Relationships
    creator = db.relationship('Profile', foreign_keys=[creator_id], backref='created_meetings')
    participants = db.relationship('Profile', secondary=meeting_participants, lazy='subquery',
        backref=db.backref('meetings', lazy=True))
    
    def __repr__(self):
        return f'<Meeting {self.title}>'