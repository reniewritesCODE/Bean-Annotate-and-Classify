# backend/app/routers/annotations.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.database import get_db
from app.models import Annotation, Image
from app.schemas import AnnotationCreate, AnnotationResponse
from app.auth import get_current_user, TokenData

router = APIRouter(prefix="/api/annotations", tags=["annotations"])

@router.get("/{image_id}", response_model=List[AnnotationResponse])
async def list_annotations(
    image_id: str,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """List all annotations for an image."""
    return db.query(Annotation).filter(Annotation.image_id == image_id).all()

@router.post("/{image_id}", response_model=List[AnnotationResponse])
async def save_annotations(
    image_id: str,
    annotations_in: List[AnnotationCreate],
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Save a list of annotations for an image (replaces existing ones)."""
    # 1. Verify image exists
    image = db.query(Image).filter(Image.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    # 2. Delete existing annotations for this image
    db.query(Annotation).filter(Annotation.image_id == image_id).delete()

    # 3. Add new annotations
    new_annotations = []
    if annotations_in:
        for ann in annotations_in:
            new_ann = Annotation(
                id=str(uuid.uuid4()),
                image_id=image_id,
                class_id=ann.class_id,
                x_center=ann.x_center,
                y_center=ann.y_center,
                width=ann.width,
                height=ann.height,
                source=ann.source
            )
            db.add(new_ann)
            new_annotations.append(new_ann)

    # 4. Update image status to 'done' if annotations are saved
    image.status = 'done'
    
    db.commit()
    for ann in new_annotations:
        db.refresh(ann)
    
    return new_annotations

@router.delete("/{annotation_id}")
async def delete_annotation(
    annotation_id: str,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Delete a single annotation."""
    annotation = db.query(Annotation).filter(Annotation.id == annotation_id).first()
    if not annotation:
        raise HTTPException(status_code=404, detail="Annotation not found")
    
    db.delete(annotation)
    db.commit()
    return {"status": "success", "message": "Annotation deleted"}
