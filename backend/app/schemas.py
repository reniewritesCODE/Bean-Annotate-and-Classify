# backend/app/schemas.py
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

from typing import Optional, Literal

class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

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