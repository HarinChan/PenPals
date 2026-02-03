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
    
    # WebEx OAuth Tokens
    webex_access_token = db.Column(db.String(512), nullable=True)
    webex_refresh_token = db.Column(db.String(512), nullable=True)
    webex_token_expires_at = db.Column(db.DateTime, nullable=True)
    
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
    status = db.Column(db.String(20), default='pending')  # pending, accepted, blocked
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))
    
    __table_args__ = (
        db.UniqueConstraint('from_profile_id', 'to_profile_id', name='unique_relation'),
    )
    
    def __repr__(self):
        return f'<Relation {self.from_profile_id} -> {self.to_profile_id}>'


# Alias for classroom - Profile represents a classroom
Classroom = Profile



post_likes = db.Table('post_likes',
    db.Column('post_id', db.Integer, db.ForeignKey('posts.id'), primary_key=True),
    db.Column('account_id', db.Integer, db.ForeignKey('accounts.id'), primary_key=True),
    db.Column('timestamp', db.DateTime, default=datetime.now(timezone.utc))
)

class Post(db.Model):
    """Posts/messages between classrooms"""
    __tablename__ = 'posts'
    
    id = db.Column(db.Integer, primary_key=True)
    profile_id = db.Column(db.Integer, db.ForeignKey('profiles.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))
    
    # Relationships
    profile = db.relationship('Profile', backref='posts')
    liked_by = db.relationship('Account', secondary=post_likes, lazy='subquery',
        backref=db.backref('liked_posts', lazy=True))
    
    # New fields for rich posts
    likes = db.Column(db.Integer, default=0)
    comments_count = db.Column(db.Integer, default=0)
    image_url = db.Column(db.String(500), nullable=True)
    
    # Self-referential relationship for quoting posts
    quoted_post_id = db.Column(db.Integer, db.ForeignKey('posts.id'), nullable=True)
    quoted_post = db.relationship('Post', remote_side=[id], backref='quoted_by')
    
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
    password = db.Column(db.String(255), nullable=True)
    
    creator_id = db.Column(db.Integer, db.ForeignKey('profiles.id'), nullable=False)
    
    # Relationships
    creator = db.relationship('Profile', foreign_keys=[creator_id], backref='created_meetings')
    participants = db.relationship('Profile', secondary=meeting_participants, lazy='subquery',
        backref=db.backref('meetings', lazy=True))
    
    @property
    def friends(self):
        """Return list of profiles that are friends (accepted relation)"""
        # This is a helper, but actual query logic is often in the route for customization
        pass

    def __repr__(self):
        return f'<Meeting {self.title}>'


class FriendRequest(db.Model):
    """Pending friend requests between profiles (classrooms)"""
    __tablename__ = 'friend_requests'
    
    id = db.Column(db.Integer, primary_key=True)
    sender_profile_id = db.Column(db.Integer, db.ForeignKey('profiles.id'), nullable=False)
    receiver_profile_id = db.Column(db.Integer, db.ForeignKey('profiles.id'), nullable=False)
    status = db.Column(db.String(20), default='pending') # pending, accepted, rejected
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))
    
    # Relationships
    sender = db.relationship('Profile', foreign_keys=[sender_profile_id], backref='sent_requests')
    receiver = db.relationship('Profile', foreign_keys=[receiver_profile_id], backref='received_requests')

    def __repr__(self):
        return f'<FriendRequest {self.sender_profile_id} -> {self.receiver_profile_id}>'


class Notification(db.Model):
    """User notifications"""
    __tablename__ = 'notifications'
    
    id = db.Column(db.Integer, primary_key=True)
    account_id = db.Column(db.Integer, db.ForeignKey('accounts.id'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    message = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(50), default='info') # info, success, warning, error
    read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.now(timezone.utc))
    related_id = db.Column(db.String(50), nullable=True) # ID of related entity (e.g. sender profile id)
    
    # Relationships
    account = db.relationship('Account', backref=db.backref('notifications', lazy='dynamic'))

    def __repr__(self):
        return f'<Notification {self.title}>'


class RecentCall(db.Model):
    """Log of recent calls"""
    __tablename__ = 'recent_calls'
    
    id = db.Column(db.Integer, primary_key=True)
    caller_profile_id = db.Column(db.Integer, db.ForeignKey('profiles.id'), nullable=False)
    # The other party could be null if it was a group call or external, but for now assuming 1:1 or 1:Group
    # Storing the classroom name/ID for display even if the actual call object is complex
    target_classroom_name = db.Column(db.String(255), nullable=True)
    target_classroom_id = db.Column(db.String(50), nullable=True) # ID as string for flexibility
    
    duration_seconds = db.Column(db.Integer, default=0)
    timestamp = db.Column(db.DateTime, default=datetime.now(timezone.utc))
    call_type = db.Column(db.String(20)) # outgoing, incoming
    
    # Relationships
    caller_profile = db.relationship('Profile', foreign_keys=[caller_profile_id], backref='call_history')

    def __repr__(self):
        return f'<RecentCall {self.caller_profile_id} -> {self.target_classroom_name}>'