from sqlalchemy import Column, String, Float, Boolean, Integer, Enum, DateTime, ForeignKey, JSON, Text, func
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import uuid
from datetime import datetime

# ==================== Named ENUM Types (required for PostgreSQL) ====================

SplitType = Enum('train', 'val', 'test', name='split_type')
ImageStatusType = Enum('none', 'partial', 'done', name='image_status')
AnnotationSourceType = Enum('human', 'auto-label', name='annotation_source')
JobStatusType = Enum('pending', 'running', 'done', 'failed', name='job_status')

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(Text, nullable=False)
    role = Column(String, nullable=False, default="viewer")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    token = Column(String, unique=True, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_revoked = Column(Boolean, default=False, nullable=False)

    user = relationship("User")

class Project(Base):
    __tablename__ = 'projects'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False, unique=True)
    description = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    images = relationship('Image', back_populates='project')


class Image(Base):
    __tablename__ = 'images'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey('projects.id'), nullable=False)
    s3_key = Column(String, nullable=False)
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    split = Column(SplitType, default='train')
    status = Column(ImageStatusType, default='none')
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship('Project', back_populates='images')
    annotations = relationship('Annotation', back_populates='image', cascade="all, delete-orphan")


class Annotation(Base):
    __tablename__ = 'annotations'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    image_id = Column(String, ForeignKey('images.id'), nullable=False)
    class_id = Column(String, ForeignKey('class_labels.id'), nullable=False)
    x_center = Column(Float, nullable=False)
    y_center = Column(Float, nullable=False)
    width = Column(Float, nullable=False)
    height = Column(Float, nullable=False)
    source = Column(AnnotationSourceType, default='human')

    image = relationship('Image', back_populates='annotations')


class TrainingJob(Base):
    __tablename__ = 'training_jobs'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String, ForeignKey('projects.id'), nullable=False)
    base_model_id = Column(String, ForeignKey('model_versions.id'), nullable=False)
    status = Column(JobStatusType, default='pending')
    config = Column(JSON, nullable=True)                 # epochs, lr, batch_size, etc.
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ModelVersion(Base):
    __tablename__ = 'model_versions'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    # Deferred foreign key to break circular dependency
    training_job_id = Column(String, ForeignKey('training_jobs.id', use_alter=True, name='fk_model_training_job', deferrable=True, initially='DEFERRED'), nullable=True)
    name = Column(String, nullable=False, unique=True)
    is_base = Column(Boolean, default=False)
    is_production = Column(Boolean, default=False)
    s3_key_pt = Column(String, nullable=True)
    s3_key_onnx = Column(String, nullable=True)
    map50 = Column(Float, nullable=True)
    precision = Column(Float, nullable=True)
    recall = Column(Float, nullable=True)
    mlflow_run_id = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class ClassLabel(Base):
    __tablename__ = 'class_labels'

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    color_hex = Column(String(7), nullable=True) 






