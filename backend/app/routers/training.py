from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import TrainingJob, ModelVersion, Project, Image, Annotation
from app.auth import get_current_user
from app.tasks import train_model_task
from pydantic import BaseModel
from typing import Optional, List
from app.worker import celery_app
from celery.result import AsyncResult
import os
import json
import uuid
# import cv2  # Moved to local imports to avoid startup issues
import numpy as np
import base64
from io import BytesIO
from PIL import Image as PILImage

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


class AugmentationPreviewRequest(BaseModel):
    augmentations: AugmentationConfig
    image_size: int = 640


def apply_augmentations(image: np.ndarray, config: AugmentationConfig) -> np.ndarray:
    """Apply augmentations to an image and return the augmented image."""
    import cv2  # Local import to avoid startup issues
    augmented = image.copy()
    
    if config.flip:
        augmented = cv2.flip(augmented, 1)  # Horizontal flip
    
    if config.rotate90:
        augmented = cv2.rotate(augmented, cv2.ROTATE_90_CLOCKWISE)
    
    if config.rotation:
        # Apply small random rotation (-15 to +15 degrees)
        angle = np.random.uniform(-15, 15)
        h, w = augmented.shape[:2]
        center = (w // 2, h // 2)
        matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
        augmented = cv2.warpAffine(augmented, matrix, (w, h))
    
    if config.crop:
        # Apply random crop (80-100% of original size)
        h, w = augmented.shape[:2]
        crop_h = int(h * np.random.uniform(0.8, 1.0))
        crop_w = int(w * np.random.uniform(0.8, 1.0))
        start_y = np.random.randint(0, h - crop_h)
        start_x = np.random.randint(0, w - crop_w)
        augmented = augmented[start_y:start_y + crop_h, start_x:start_x + crop_w]
        augmented = cv2.resize(augmented, (w, h))
    
    if config.shear:
        # Apply small random shear
        h, w = augmented.shape[:2]
        shear_value = np.random.uniform(-0.2, 0.2)
        matrix = np.float32([[1, shear_value, 0], [0, 1, 0]])
        augmented = cv2.warpAffine(augmented, matrix, (w, h))
    
    if config.brightness:
        # Apply brightness adjustment
        brightness_factor = np.random.uniform(0.7, 1.3)
        augmented = cv2.convertScaleAbs(augmented, alpha=brightness_factor, beta=0)
    
    if config.exposure:
        # Apply exposure adjustment
        exposure_factor = np.random.uniform(0.7, 1.3)
        augmented = cv2.convertScaleAbs(augmented, alpha=exposure_factor, beta=0)
    
    if config.blur:
        # Apply Gaussian blur
        kernel_size = np.random.choice([3, 5, 7])
        augmented = cv2.GaussianBlur(augmented, (kernel_size, kernel_size), 0)
    
    if config.noise:
        # Add random noise
        noise = np.random.normal(0, 25, augmented.shape).astype(np.uint8)
        augmented = cv2.add(augmented, noise)
    
    if config.motionBlur:
        # Apply motion blur
        size = np.random.choice([3, 5, 7])
        kernel = np.zeros((size, size))
        kernel[int((size-1)/2), :] = np.ones(size)
        kernel = kernel / size
        augmented = cv2.filter2D(augmented, -1, kernel)
    
    if config.cameraGain:
        # Apply camera gain (increase contrast and brightness)
        augmented = cv2.convertScaleAbs(augmented, alpha=1.2, beta=10)
    
    return augmented


@router.post("/{project_id}/train/augmentation-preview")
def get_augmentation_preview(
    project_id: str,
    body: AugmentationPreviewRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Generate augmentation preview using sample images from the project."""
    import cv2  # Local import to avoid startup issues
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get sample images with annotations (up to 3 images)
    sample_images = (
        db.query(Image)
        .join(Annotation, Image.id == Annotation.image_id)
        .filter(Image.project_id == project_id)
        .distinct()
        .limit(3)
        .all()
    )
    
    if not sample_images:
        raise HTTPException(status_code=400, detail="No annotated images found for preview")
    
    preview_results = []
    
    for img in sample_images:
        try:
            # For now, create a placeholder image since we don't have direct file access
            # In a real implementation, you would load the actual image from S3 or storage
            placeholder = np.ones((body.image_size, body.image_size, 3), dtype=np.uint8) * 128
            
            # Create original image (placeholder)
            _, buffer_original = cv2.imencode('.jpg', placeholder)
            img_original_base64 = base64.b64encode(buffer_original).decode('utf-8')
            
            # Apply augmentations
            augmented = apply_augmentations(placeholder, body.augmentations)
            _, buffer_augmented = cv2.imencode('.jpg', augmented)
            img_augmented_base64 = base64.b64encode(buffer_augmented).decode('utf-8')
            
            preview_results.append({
                "image_id": img.id,
                "original": f"data:image/jpeg;base64,{img_original_base64}",
                "augmented": f"data:image/jpeg;base64,{img_augmented_base64}"
            })
            
        except Exception as e:
            # Skip problematic images
            continue
    
    if not preview_results:
        raise HTTPException(status_code=500, detail="Failed to generate preview images")
    
    return {
        "previews": preview_results,
        "augmentations_applied": body.augmentations.dict()
    }


@router.get("/{project_id}/train/history")
def get_training_history(
    project_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Get training history for a project with completed runs and their models."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get training jobs with their associated models
    training_jobs = (
        db.query(TrainingJob, ModelVersion)
        .outerjoin(ModelVersion, TrainingJob.id == ModelVersion.training_job_id)
        .filter(TrainingJob.project_id == project_id)
        .order_by(TrainingJob.created_at.desc())
        .all()
    )
    
    history = []
    for job, model in training_jobs:
        # Extract final metrics from job config or model
        final_metrics = {}
        if model:
            final_metrics = {
                "map50": model.map50,
                "precision": model.precision,
                "recall": model.recall,
            }
        elif job.config and job.config.get("final_metrics"):
            final_metrics = job.config["final_metrics"]
        
        history.append({
            "job_id": job.id,
            "status": job.status,
            "created_at": job.created_at.isoformat(),
            "config": job.config,
            "final_metrics": final_metrics,
            "model": {
                "id": model.id,
                "name": model.name,
                "s3_key_pt": model.s3_key_pt,
                "s3_key_onnx": model.s3_key_onnx,
                "is_production": model.is_production,
            } if model else None,
        })
    
    return {"history": history}


@router.get("/{project_id}/train/{job_id}/download")
def download_model(
    project_id: str,
    job_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Generate download URL for a trained model."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Get the model version for this training job
    model = (
        db.query(ModelVersion)
        .filter(ModelVersion.training_job_id == job_id)
        .first()
    )
    
    if not model:
        raise HTTPException(status_code=404, detail="Model not found for this training job")
    
    if not model.s3_key_pt:
        raise HTTPException(status_code=404, detail="Model file not available")
    
    # In a real implementation, you would generate a presigned URL from S3
    # For now, return the S3 key (this would need to be implemented with proper S3 integration)
    return {
        "download_url": f"/api/models/download/{model.s3_key_pt}",
        "filename": f"{model.name}.pt",
        "file_size": "N/A",  # Would get from S3
        "model_name": model.name,
    }