# app/models/permissions.py
import enum
import uuid
from datetime import datetime
from sqlalchemy import Column, Enum, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.database import Base

class TopicPermission(str, enum.Enum):
    READ = "read"
    WRITE = "write"
    ADMIN = "admin"

class UserTopicAccess(Base):
    __tablename__ = "user_topic_access"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    topic_id = Column(UUID(as_uuid=True), ForeignKey("topics.id", ondelete="CASCADE"), nullable=False)
    permission = Column(Enum(TopicPermission), default=TopicPermission.READ)
    granted_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id], backref="topic_access")
    grantor = relationship("User", foreign_keys=[granted_by])
    topic = relationship("Topic", backref="user_access")
    
    __table_args__ = (
        UniqueConstraint('user_id', 'topic_id', name='_user_topic_uc'),
    )
