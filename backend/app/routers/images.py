# backend/app/routers/images.py
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from sqlalchemy.orm import Session
import uuid
from datetime import datetime

from app.database import get_db
from app.models import Image
from app.schemas import ImageResponse

router = APIRouter(prefix="/images", tags=["images"])


@router.post("/", response_model=ImageResponse)
async def upload_image(
    file: UploadFile = File(...),
    project_id: str = Form(...),
    db: Session = Depends(get_db),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "Only image files allowed")

    file_key = f"images/{project_id}/{uuid.uuid4()}.jpg"

    # TODO: Upload to MinIO later (we'll add this in next step)
    # For now just save metadata
    image = Image(
        id=str(uuid.uuid4()),
        project_id=project_id,
        s3_key=file_key,
        uploaded_at=datetime.utcnow()
    )

    db.add(image)
    db.commit()
    db.refresh(image)

    return image