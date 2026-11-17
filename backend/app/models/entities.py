import uuid
from datetime import datetime, timezone
from typing import Optional, List
from sqlalchemy import (
    String, Text, Integer, Float, Boolean, JSON, DateTime, ForeignKey, UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base, TimestampMixin


class User(Base, TimestampMixin):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    plan_tier: Mapped[str] = mapped_column(String(50), default="free", nullable=False)  # free, pro, enterprise
    credits_remaining: Mapped[int] = mapped_column(Integer, default=50, nullable=False)

    projects: Mapped[List["Project"]] = relationship("Project", back_populates="user", cascade="all, delete-orphan")
    generations: Mapped[List["Generation"]] = relationship("Generation", back_populates="user", cascade="all, delete-orphan")
    assets: Mapped[List["Asset"]] = relationship("Asset", back_populates="user", cascade="all, delete-orphan")
    references: Mapped[List["ImageReference"]] = relationship("ImageReference", back_populates="user", cascade="all, delete-orphan")
    conversations: Mapped[List["Conversation"]] = relationship("Conversation", back_populates="user", cascade="all, delete-orphan")
    project_memberships: Mapped[List["ProjectMember"]] = relationship("ProjectMember", back_populates="user", cascade="all, delete-orphan")


class Project(Base, TimestampMixin):
    __tablename__ = "projects"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), default="Untitled Project", nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    thumbnail_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    canvas_width: Mapped[int] = mapped_column(Integer, default=1024, nullable=False)
    canvas_height: Mapped[int] = mapped_column(Integer, default=1024, nullable=False)
    canvas_background: Mapped[str] = mapped_column(String(32), default="#0A0A0B", nullable=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="projects")
    scene_document: Mapped[Optional["SceneDocument"]] = relationship("SceneDocument", back_populates="project", uselist=False, cascade="all, delete-orphan")
    generations: Mapped[List["Generation"]] = relationship("Generation", back_populates="project", cascade="all, delete-orphan")
    conversations: Mapped[List["Conversation"]] = relationship("Conversation", back_populates="project")
    members: Mapped[List["ProjectMember"]] = relationship("ProjectMember", back_populates="project", cascade="all, delete-orphan")
    invitations: Mapped[List["ProjectInvitation"]] = relationship("ProjectInvitation", back_populates="project", cascade="all, delete-orphan")


class SceneDocument(Base, TimestampMixin):
    __tablename__ = "scene_documents"

    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), unique=True, index=True, nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    canvas_data: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    layers_data: Mapped[list] = mapped_column(JSON, default=list, nullable=False)

    project: Mapped["Project"] = relationship("Project", back_populates="scene_document")
    layers: Mapped[List["Layer"]] = relationship("Layer", back_populates="scene_document", cascade="all, delete-orphan")


class Layer(Base, TimestampMixin):
    __tablename__ = "layers"

    scene_document_id: Mapped[str] = mapped_column(String(36), ForeignKey("scene_documents.id", ondelete="CASCADE"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), default="New Layer", nullable=False)
    layer_type: Mapped[str] = mapped_column(String(32), default="raster", nullable=False)  # raster, text, shape, group
    z_index: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    visible: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    locked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    opacity: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    transform_data: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    content_data: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    scene_document: Mapped["SceneDocument"] = relationship("SceneDocument", back_populates="layers")


class Generation(Base, TimestampMixin):
    __tablename__ = "generations"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    project_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("projects.id", ondelete="SET NULL"), index=True, nullable=True)
    conversation_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("conversations.id", ondelete="SET NULL"), index=True, nullable=True)
    generation_type: Mapped[str] = mapped_column(String(32), default="text_to_image", nullable=False)  # text_to_image, image_to_image, inpaint, outpaint
    source_image_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    negative_prompt: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    model_id: Mapped[str] = mapped_column(String(100), default="FLUX.1-dev", nullable=False)
    provider_name: Mapped[str] = mapped_column(String(50), default="local_diffusers", nullable=False)
    seed: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    cfg_scale: Mapped[float] = mapped_column(Float, default=7.0, nullable=False)
    steps: Mapped[int] = mapped_column(Integer, default=28, nullable=False)
    width: Mapped[int] = mapped_column(Integer, default=1024, nullable=False)
    height: Mapped[int] = mapped_column(Integer, default=1024, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="PENDING", nullable=False)  # PENDING, QUEUED, PROCESSING, COMPLETED, FAILED, CANCELLED
    parameters: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="generations")
    project: Mapped[Optional["Project"]] = relationship("Project", back_populates="generations")
    conversation: Mapped[Optional["Conversation"]] = relationship("Conversation", back_populates="generations")
    images: Mapped[List["GeneratedImage"]] = relationship("GeneratedImage", back_populates="generation", cascade="all, delete-orphan")
    job: Mapped[Optional["GenerationJob"]] = relationship("GenerationJob", back_populates="generation", uselist=False, cascade="all, delete-orphan")


class GeneratedImage(Base, TimestampMixin):
    __tablename__ = "generated_images"

    generation_id: Mapped[str] = mapped_column(String(36), ForeignKey("generations.id", ondelete="CASCADE"), index=True, nullable=False)
    storage_url: Mapped[str] = mapped_column(String(512), nullable=False)
    thumbnail_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    width: Mapped[int] = mapped_column(Integer, nullable=False)
    height: Mapped[int] = mapped_column(Integer, nullable=False)
    file_size_bytes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    mime_type: Mapped[str] = mapped_column(String(64), default="image/png", nullable=False)

    generation: Mapped["Generation"] = relationship("Generation", back_populates="images")


class GenerationJob(Base, TimestampMixin):
    __tablename__ = "generation_jobs"

    generation_id: Mapped[str] = mapped_column(String(36), ForeignKey("generations.id", ondelete="CASCADE"), unique=True, index=True, nullable=False)
    celery_task_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="PENDING", nullable=False)  # PENDING, QUEUED, PROCESSING, COMPLETED, FAILED, CANCELLED
    progress: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    stage: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)  # queued, validating, preflight, loading_model, inference, saving
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    execution_time_seconds: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    generation: Mapped["Generation"] = relationship("Generation", back_populates="job")


class ImageReference(Base, TimestampMixin):
    __tablename__ = "image_references"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    label: Mapped[str] = mapped_column(String(10), nullable=False)  # @1, @2, @3, @4, @5
    role: Mapped[str] = mapped_column(String(32), default="style", nullable=False)  # subject, style, composition, color, character
    strength: Mapped[float] = mapped_column(Float, default=0.75, nullable=False)
    image_url: Mapped[str] = mapped_column(String(512), nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="references")


class Asset(Base, TimestampMixin):
    __tablename__ = "assets"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    asset_type: Mapped[str] = mapped_column(String(32), default="image", nullable=False)  # image, mask, reference
    storage_url: Mapped[str] = mapped_column(String(512), nullable=False)
    thumbnail_url: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    size_bytes: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    mime_type: Mapped[str] = mapped_column(String(64), default="image/png", nullable=False)
    width: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    height: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="assets")


class EditOperation(Base, TimestampMixin):
    __tablename__ = "edit_operations"

    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False)
    action_type: Mapped[str] = mapped_column(String(64), nullable=False)
    previous_state: Mapped[dict] = mapped_column(JSON, nullable=False)
    new_state: Mapped[dict] = mapped_column(JSON, nullable=False)


class ModelProvider(Base, TimestampMixin):
    __tablename__ = "model_providers"

    name: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    priority: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    supported_models: Mapped[list] = mapped_column(JSON, default=list, nullable=False)


class UsageRecord(Base, TimestampMixin):
    __tablename__ = "usage_records"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    operation: Mapped[str] = mapped_column(String(50), nullable=False)
    credits_consumed: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    details: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)


class Conversation(Base, TimestampMixin):
    __tablename__ = "conversations"

    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    project_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("projects.id", ondelete="SET NULL"), index=True, nullable=True)
    title: Mapped[str] = mapped_column(String(255), default="New Conversation", nullable=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="conversations")
    project: Mapped[Optional["Project"]] = relationship("Project", back_populates="conversations")
    messages: Mapped[List["ConversationMessage"]] = relationship(
        "ConversationMessage",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="ConversationMessage.created_at.asc()",
    )
    generations: Mapped[List["Generation"]] = relationship("Generation", back_populates="conversation")


class ConversationMessage(Base, TimestampMixin):
    __tablename__ = "conversation_messages"

    conversation_id: Mapped[str] = mapped_column(String(36), ForeignKey("conversations.id", ondelete="CASCADE"), index=True, nullable=False)
    role: Mapped[str] = mapped_column(String(32), default="user", nullable=False)  # user, assistant, system
    content: Mapped[str] = mapped_column(Text, nullable=False)
    generation_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("generations.id", ondelete="SET NULL"), index=True, nullable=True)
    metadata_json: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    conversation: Mapped["Conversation"] = relationship("Conversation", back_populates="messages")
    generation: Mapped[Optional["Generation"]] = relationship("Generation")


class ProjectMember(Base, TimestampMixin):
    __tablename__ = "project_members"
    __table_args__ = (
        UniqueConstraint("project_id", "user_id", name="uq_project_user_member"),
    )

    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    role: Mapped[str] = mapped_column(String(32), default="EDITOR", nullable=False)  # OWNER, EDITOR, VIEWER

    project: Mapped["Project"] = relationship("Project", back_populates="members")
    user: Mapped["User"] = relationship("User", back_populates="project_memberships")


class ProjectInvitation(Base, TimestampMixin):
    __tablename__ = "project_invitations"

    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), index=True, nullable=False)
    inviter_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)
    invitee_email: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    role: Mapped[str] = mapped_column(String(32), default="EDITOR", nullable=False)  # EDITOR, VIEWER
    status: Mapped[str] = mapped_column(String(32), default="PENDING", nullable=False)  # PENDING, ACCEPTED, REJECTED, REVOKED

    project: Mapped["Project"] = relationship("Project", back_populates="invitations")
    inviter: Mapped["User"] = relationship("User")
