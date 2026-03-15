# app/models/__init__.py
# Explicitly export models to ensure SQLAlchemy detects them
from app.models.user import User, UserRole
from app.models.topic import Topic
from app.models.document import Document, DocumentStatus
from app.models.chunk import DocumentChunk
from app.models.permissions import UserTopicAccess, TopicPermission
from app.models.conversation import Conversation, ConversationTopic, Message
