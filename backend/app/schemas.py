# backend/app/schemas.py
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, Literal

class ImageResponse(BaseModel):
    id: str
    project_id: str
    s3_key: str
    width: Optional[int] = None
    height: Optional[int] = None
    split: str = "train"
    status: str = "none"
    uploaded_at: datetime

    class Config:
        from_attributes = True

UserRole = Literal["admin", "annotator", "viewer"]

# Schemas for authentication
class LoginRequest(BaseModel):
    username: str
    password: str

class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class RefreshRequest(BaseModel):
    refresh_token: str

class UserPublic(BaseModel):
    username: str
    role: UserRole

