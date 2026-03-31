# backend/app/schemas.py
from pydantic import BaseModel
from datetime import datetime
from typing import Optional

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