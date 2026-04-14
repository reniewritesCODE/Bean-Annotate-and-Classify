from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import TrainingJob, ModelVersion, Project
from app.auth import get_current_user
from app.tasks import train_model_task
from pydantic import BaseModel
from typing import Optional
from app.worker import celery_app
from celery.result import AsyncResult

import uuid

router = APIRouter(prefix="/api/projects", tags=["training"])


class TrainRequest(BaseModel):
    epochs: Optional[int] = 50
    imgsz: Optional[int] = 640
    batch: Optional[int] = 16


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


@router.get("/{project_id}/train/status")
def get_training_status(
    project_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    # Return the most recent job for this project
    job = (
        db.query(TrainingJob)
        .filter(TrainingJob.project_id == project_id)
        .order_by(TrainingJob.created_at.desc())
        .first()
    )
    if not job:
        raise HTTPException(status_code=404, detail="No training job found for this project")

    return {
        "job_id": job.id,
        "status": job.status,           # pending | running | done | failed
        "config": job.config,           # includes metrics once done
        "created_at": job.created_at,
    }



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