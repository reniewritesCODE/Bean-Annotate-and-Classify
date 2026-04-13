# backend/app/routers/images.py
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from sqlalchemy.orm import Session
import uuid
from datetime import datetime
from typing import List

from app.database import get_db
from app.models import Image
from app.schemas import ImageResponse
from app.utils.s3_utils import upload_file_to_s3, ensure_bucket_exists, get_presigned_url
from app.auth import get_current_user, TokenData

router = APIRouter(prefix="/api/images", tags=["images"])

@router.get("/{project_id}", response_model=List[ImageResponse])
async def list_images(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """List all images for a project."""
    images = db.query(Image).filter(Image.project_id == project_id).all()
    for image in images:
        image.url = get_presigned_url(image.s3_key)
        if image.url:
            image.url = image.url.replace("http://minio:9000", "http://localhost:9000")
            
    return images

@router.post("", response_model=ImageResponse)
async def upload_image(
    file: UploadFile = File(...),
    project_id: str = Form(...),
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(400, "Only image files allowed")

    # Ensure bucket exists
    ensure_bucket_exists()

    file_extension = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    file_id = str(uuid.uuid4())
    file_key = f"projects/{project_id}/images/{file_id}.{file_extension}"

    # Read file content
    content = await file.read()
    
    # Upload to MinIO
    success = upload_file_to_s3(content, file_key, file.content_type)
    if not success:
        raise HTTPException(500, "Failed to upload image to storage")

    # Save metadata
    image = Image(
        id=file_id,
        project_id=project_id,
        s3_key=file_key,
        uploaded_at=datetime.utcnow()
    )

    db.add(image)
    db.commit()
    db.refresh(image)

    image.url = get_presigned_url(image.s3_key)
    if image.url:
        image.url = image.url.replace("http://minio:9000", "http://localhost:9000")

    return image

@router.delete("/{image_id}")
async def delete_image(
    image_id: str,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    image = db.query(Image).filter(Image.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
        
    # Delete from S3
    from app.utils.s3_utils import delete_from_s3
    delete_from_s3(image.s3_key)
    
    # Delete from DB
    db.delete(image)
    db.commit()
    
    return {"status": "success", "message": "Image deleted successfully"}