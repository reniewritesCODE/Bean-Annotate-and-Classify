from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import DatasetVersion, Project, Image
from app.auth import get_current_user
from pydantic import BaseModel
from typing import Optional, Dict, Any
from datetime import datetime
import uuid

router = APIRouter(prefix="/api/projects", tags=["versions"])


class DatasetVersionCreate(BaseModel):
    name: str
    train_split: int = 70
    val_split: int = 20
    test_split: int = 10
    image_size: int = 640
    preprocessing: Dict[str, Any]
    augmentations: Dict[str, bool]


class DatasetVersionResponse(BaseModel):
    id: str
    name: str
    project_id: str
    train_split: int
    val_split: int
    test_split: int
    image_size: int
    preprocessing: Dict[str, Any]
    augmentations: Dict[str, Any]
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("/{project_id}/versions")
async def create_version(
    project_id: str,
    data: DatasetVersionCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Create a new dataset version with splits, preprocessing, and augmentations."""
    # Verify project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Check for duplicate name
    existing = db.query(DatasetVersion).filter(
        DatasetVersion.project_id == project_id,
        DatasetVersion.name == data.name
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Version name already exists")

    # Validate splits sum to 100
    total = data.train_split + data.val_split + data.test_split
    if total != 100:
        raise HTTPException(status_code=400, detail=f"Splits must sum to 100, got {total}")

    # Create version record
    version = DatasetVersion(
        id=str(uuid.uuid4()),
        project_id=project_id,
        name=data.name,
        train_split=data.train_split,
        val_split=data.val_split,
        test_split=data.test_split,
        image_size=data.image_size,
        preprocessing=data.preprocessing,
        augmentations=data.augmentations,
    )

    db.add(version)

    # Apply split to images
    images = db.query(Image).filter(Image.project_id == project_id).all()
    import random
    random.seed(42)  # Reproducible splits
    shuffled = images.copy()
    random.shuffle(shuffled)

    n_train = int(len(shuffled) * data.train_split / 100)
    n_val = int(len(shuffled) * data.val_split / 100)

    for i, img in enumerate(shuffled):
        if i < n_train:
            img.split = 'train'
        elif i < n_train + n_val:
            img.split = 'val'
        else:
            img.split = 'test'

    db.commit()
    db.refresh(version)

    return {
        "id": version.id,
        "name": version.name,
        "message": f"Version '{data.name}' created with {len(images)} images split {data.train_split}/{data.val_split}/{data.test_split}"
    }


@router.get("/{project_id}/versions")
async def list_versions(
    project_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """List all dataset versions for a project."""
    versions = db.query(DatasetVersion).filter(
        DatasetVersion.project_id == project_id
    ).order_by(DatasetVersion.created_at.desc()).all()

    return [DatasetVersionResponse.model_validate(v) for v in versions]


@router.get("/{project_id}/versions/{version_id}")
async def get_version(
    project_id: str,
    version_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Get a specific dataset version."""
    version = db.query(DatasetVersion).filter(
        DatasetVersion.id == version_id,
        DatasetVersion.project_id == project_id
    ).first()

    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    return DatasetVersionResponse.model_validate(version)


@router.patch("/{project_id}/versions/{version_id}")
async def update_version(
    project_id: str,
    version_id: str,
    data: dict,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Update a dataset version name."""
    version = db.query(DatasetVersion).filter(
        DatasetVersion.id == version_id,
        DatasetVersion.project_id == project_id
    ).first()

    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    # Check for duplicate name if updating name
    if 'name' in data:
        existing = db.query(DatasetVersion).filter(
            DatasetVersion.project_id == project_id,
            DatasetVersion.name == data['name'],
            DatasetVersion.id != version_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Version name already exists")
        version.name = data['name']

    db.commit()
    db.refresh(version)

    return {"id": version.id, "name": version.name, "message": "Version updated successfully"}


@router.delete("/{project_id}/versions/{version_id}")
async def delete_version(
    project_id: str,
    version_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Delete a dataset version."""
    version = db.query(DatasetVersion).filter(
        DatasetVersion.id == version_id,
        DatasetVersion.project_id == project_id
    ).first()

    if not version:
        raise HTTPException(status_code=404, detail="Version not found")

    db.delete(version)
    db.commit()

    return {"message": f"Version '{version.name}' deleted successfully"}
