# backend/app/schemas.py
from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

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

class LoginResponse(Token):
    user: UserResponse

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class ProjectResponse(ProjectBase):
    id: str
    thumbnail_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class ImageResponse(BaseModel):

    id: str
    project_id: str
    s3_key: str
    url: Optional[str] = None
    width: Optional[int] = None
    height: Optional[int] = None
    split: str = "train"
    status: str = "none"
    uploaded_at: datetime

    class Config:
        from_attributes = True

class AnnotationBase(BaseModel):
    class_id: int
    x_center: float
    y_center: float
    width: float
    height: float
    source: str = "human"

class AnnotationCreate(AnnotationBase):
    image_id: str

class AnnotationResponse(AnnotationBase):
    id: str
    image_id: str

    class Config:
        from_attributes = True


class ClassCount(BaseModel):
    class_id: int
    count: int


class ActivityItem(BaseModel):
    timestamp: datetime
    action: str
    details: str


class ProjectSummaryResponse(BaseModel):
    project_id: str
    total_images: int
    annotated_images: int
    total_annotations: int
    class_distribution: List[ClassCount]
    recent_activity: List[ActivityItem]