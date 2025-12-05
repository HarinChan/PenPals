from sqlalchemy import create_engine, Column, String, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, scoped_session
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
import os
from pathlib import Path

Base = declarative_base()


class Post(Base):
    __tablename__ = 'posts'
    
    id = Column(String(36), primary_key=True)
    author_id = Column(String(100), nullable=False, index=True)
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, nullable=False, index=True)
    image_url = Column(String(500), nullable=True)
    media_object_name = Column(String(500), nullable=True)
    media_mimetype = Column(String(100), nullable=True)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert Post model to dictionary."""
        return {
            "id": self.id,
            "authorId": self.author_id,
            "content": self.content,
            "timestamp": self.timestamp.isoformat() if self.timestamp is not None else None,
            "imageUrl": self.image_url,
            "media_object_name": self.media_object_name,
            "media_mimetype": self.media_mimetype
        }


class PostService:
    def __init__(self, db_url: Optional[str] = None):
        """
        Initialize database service.
        
        Args:
            db_url: Database URL (e.g., 'sqlite:///posts.db' or 'postgresql://...')
                   If None, defaults to SQLite database in backend root
        """
        if db_url is None:
            # Default to SQLite in backend root
            db_path = Path(__file__).parent.parent / 'posts.db'
            db_url = f'sqlite:///{db_path}'
        
        self.engine = create_engine(db_url, echo=False)
        self.session_factory = sessionmaker(bind=self.engine)
        self.Session = scoped_session(self.session_factory)
        
        # Create tables if they don't exist
        Base.metadata.create_all(self.engine)
    
    def create_post(self, post_data: Dict[str, Any]) -> Post:
        """
        Create a new post in the database.
        
        Args:
            post_data: Dictionary with post fields (id, authorId, authorName, content, etc.)
        
        Returns:
            Created Post object
        """
        session = self.Session()
        try:
            # Parse timestamp if it's a string
            timestamp = post_data.get('timestamp')
            if isinstance(timestamp, str):
                timestamp = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            elif timestamp is None:
                timestamp = datetime.now(timezone.utc)
            
            post = Post(
                id=post_data['id'],
                author_id=post_data['authorId'],
                content=post_data['content'],
                timestamp=timestamp,
                image_url=post_data.get('imageUrl'),
                media_object_name=post_data.get('media_object_name'),
                media_mimetype=post_data.get('media_mimetype')
            )
            
            session.add(post)
            session.commit()
            session.refresh(post)
            return post
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
    
    def get_post_by_id(self, post_id: str) -> Optional[Post]:
        """
        Retrieve a post by its ID.
        
        Args:
            post_id: Post ID
        
        Returns:
            Post object or None if not found
        """
        session = self.Session()
        try:
            return session.query(Post).filter(Post.id == post_id).first()
        finally:
            session.close()
    
    def get_posts(self, limit: int = 50, author_id: Optional[str] = None, offset: int = 0) -> List[Post]:
        """
        Retrieve posts with optional filtering.
        
        Args:
            limit: Maximum number of posts to return
            author_id: Filter by author ID (optional)
            offset: Number of posts to skip (for pagination)
        
        Returns:
            List of Post objects ordered by timestamp (newest first)
        """
        session = self.Session()
        try:
            query = session.query(Post)
            
            if author_id:
                query = query.filter(Post.author_id == author_id)
            
            query = query.order_by(Post.timestamp.desc())
            query = query.offset(offset).limit(limit)
            
            return query.all()
        finally:
            session.close()
    
    def delete_post(self, post_id: str) -> bool:
        """
        Delete a post by ID.
        
        Args:
            post_id: Post ID
        
        Returns:
            True if deleted, False if not found
        """
        session = self.Session()
        try:
            post = session.query(Post).filter(Post.id == post_id).first()
            if post:
                session.delete(post)
                session.commit()
                return True
            return False
        except Exception as e:
            session.rollback()
            raise e
        finally:
            session.close()
    
    def count_posts(self, author_id: Optional[str] = None) -> int:
        """
        Count total posts, optionally filtered by author.
        
        Args:
            author_id: Filter by author ID (optional)
        
        Returns:
            Number of posts
        """
        session = self.Session()
        try:
            query = session.query(Post)
            if author_id:
                query = query.filter(Post.author_id == author_id)
            return query.count()
        finally:
            session.close()
