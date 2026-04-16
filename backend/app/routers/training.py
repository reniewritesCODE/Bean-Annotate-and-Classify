from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import TrainingJob, ModelVersion, Project, Image, Annotation
from app.auth import get_current_user
from app.tasks import train_model_task
from pydantic import BaseModel
from typing import Optional
from app.worker import celery_app
from celery.result import AsyncResult
import os
import json
import uuid

router = APIRouter(prefix="/api/projects", tags=["training"])


class SplitConfig(BaseModel):
    train: int = 80  # percentage
    val: int = 10
    test: int = 10

class PreprocessingConfig(BaseModel):
    autoOrient: bool = True

class AugmentationConfig(BaseModel):
    flip: bool = True
    rotate90: bool = False
    crop: bool = False
    rotation: bool = False
    shear: bool = False
    brightness: bool = False
    exposure: bool = False
    blur: bool = False
    noise: bool = False
    motionBlur: bool = False
    cameraGain: bool = False

class TrainRequest(BaseModel):
    epochs: Optional[int] = 50
    imgsz: Optional[int] = 640
    batch: Optional[int] = 16
    splits: Optional[SplitConfig] = SplitConfig()
    preprocessing: Optional[PreprocessingConfig] = PreprocessingConfig()
    augmentations: Optional[AugmentationConfig] = AugmentationConfig()


@router.post("/{project_id}/train")
def start_training(
    project_id: str,
    body: TrainRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Find the base model version
    base_model = db.query(ModelVersion).filter(ModelVersion.is_base == True).first()
    if not base_model:
        raise HTTPException(status_code=404, detail="No base model found. Seed one first.")

    # ─── Pre-training Validation ──────────────────────────────────────────────
    # 1. Check minimum image count (at least 10 images per class, 16 classes = 160)
    total_images = db.query(Image).filter(Image.project_id == project_id).count()
    MIN_IMAGES = 10  # Minimum total images required
    if total_images < MIN_IMAGES:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient training data. Project has {total_images} images, minimum {MIN_IMAGES} required."
        )

    # 2. Check at least one augmentation is enabled
    aug = body.augmentations
    any_augmentation_enabled = any([
        aug.flip, aug.rotate90, aug.crop, aug.rotation, aug.shear,
        aug.brightness, aug.exposure, aug.blur, aug.noise,
        aug.motionBlur, aug.cameraGain
    ]) if aug else False
    if not any_augmentation_enabled:
        raise HTTPException(
            status_code=400,
            detail="At least one augmentation must be enabled for training."
        )

    # 3. Validate split percentages sum to 100
    splits = body.splits
    total_split = splits.train + splits.val + splits.test
    if total_split != 100:
        raise HTTPException(
            status_code=400,
            detail=f"Split percentages must sum to 100, got {total_split}."
        )

    # 4. Check minimum images per split
    train_count = int(total_images * splits.train / 100)
    val_count = int(total_images * splits.val / 100)
    if train_count < 10:
        raise HTTPException(
            status_code=400,
            detail=f"Train split too small: {train_count} images. Minimum 10 required."
        )
    if val_count < 2:
        raise HTTPException(
            status_code=400,
            detail=f"Validation split too small: {val_count} images. Minimum 2 required."
        )

    # 5. Check images have annotations
    annotated_count = (
        db.query(Image)
        .join(Annotation, Image.id == Annotation.image_id)
        .filter(Image.project_id == project_id)
        .distinct()
        .count()
    )
    if annotated_count == 0:
        raise HTTPException(
            status_code=400,
            detail="No annotated images found. Please annotate images before training."
        )
    # ───────────────────────────────────────────────────────────────────────────

    # Create the job record
    job = TrainingJob(
        id=str(uuid.uuid4()),
        project_id=project_id,
        base_model_id=base_model.id,
        status="pending",
        config=body.dict(),
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Enqueue the Celery task
    train_model_task.apply_async(
        args=[job.id, project_id, body.dict()],
        task_id=job.id,  # Use the job ID as the Celery task ID
        ignore_result=True
    )

    return {"job_id": job.id, "status": "pending"}


# @router.get("/{project_id}/train/status")
# def get_training_status(
#     project_id: str,
#     db: Session = Depends(get_db),
#     current_user=Depends(get_current_user),
# ):
#     # Return the most recent job for this project
#     job = (
#         db.query(TrainingJob)
#         .filter(TrainingJob.project_id == project_id)
#         .order_by(TrainingJob.created_at.desc())
#         .first()
#     )
#     if not job:
#         raise HTTPException(status_code=404, detail="No training job found for this project")

#     return {
#         "job_id": job.id,
#         "status": job.status,           # pending | running | done | failed
#         "config": job.config,           # includes metrics once done
#         "created_at": job.created_at,
#     }



@router.post("/{project_id}/train/cancel")
def cancel_training(
    project_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    job = (
        db.query(TrainingJob)
        .filter(TrainingJob.project_id == project_id)
        .order_by(TrainingJob.created_at.desc())
        .first()
    )
    if not job:
        raise HTTPException(status_code=404, detail="No training job found")

    # Revoke and terminate the Celery task
    AsyncResult(job.id, app=celery_app).revoke(terminate=True, signal='SIGTERM')

    job.status = "failed"
    job.config = {**(job.config or {}), "error": "Cancelled by user"}
    db.commit()

    return {"status": "cancelled"}



PROGRESS_DIR = "models/progress"

@router.get("/{project_id}/train/status")
def get_training_status(
    project_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    job = (
        db.query(TrainingJob)
        .filter(TrainingJob.project_id == project_id)
        .order_by(TrainingJob.created_at.desc())
        .first()
    )
    if not job:
        raise HTTPException(status_code=404, detail="No training job found for this project")

    # Read per-epoch progress file
    progress = []
    progress_file = os.path.join(PROGRESS_DIR, f"{job.id}.json")
    if os.path.exists(progress_file):
        with open(progress_file) as f:
            progress = json.load(f)

    return {
        "job_id": job.id,
        "status": job.status,
        "config": job.config,
        "created_at": job.created_at,
        "progress": progress,  # ← this is what the frontend reads
    }