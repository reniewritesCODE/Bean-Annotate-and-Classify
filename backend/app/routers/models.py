from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import ModelVersion, Project, TrainingJob
from app.auth import get_current_user
from pydantic import BaseModel
from typing import Optional
import io

router = APIRouter(prefix="/api/projects", tags=["models"])


def _model_to_dict(model: ModelVersion) -> dict:
    """Serialize a ModelVersion row to a JSON-safe dict."""
    return {
        "id": model.id,
        "name": model.name,
        "is_base": model.is_base,
        "is_production": model.is_production,
        "is_approved": model.is_approved,
        "s3_key_pt": model.s3_key_pt,
        "s3_key_onnx": model.s3_key_onnx,
        "map50": model.map50,
        "precision": model.precision,
        "recall": model.recall,
        "mlflow_run_id": model.mlflow_run_id,
        "per_class_ap": model.per_class_ap,
        "training_job_id": model.training_job_id,
        "created_at": model.created_at.isoformat() if model.created_at else None,
    }


# ──────────────────────────────────────────────
# LIST all models for a project
# ──────────────────────────────────────────────
@router.get("/{project_id}/models")
def list_models(
    project_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Return all ModelVersions associated with a project's training jobs,
    plus the global base model."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Collect model IDs from all jobs in this project
    job_ids = [
        j.id
        for j in db.query(TrainingJob).filter(TrainingJob.project_id == project_id).all()
    ]

    models = (
        db.query(ModelVersion)
        .filter(
            (ModelVersion.training_job_id.in_(job_ids)) | (ModelVersion.is_base == True)
        )
        .order_by(ModelVersion.created_at.desc())
        .all()
    )

    return [_model_to_dict(m) for m in models]


# ──────────────────────────────────────────────
# GET single model details
# ──────────────────────────────────────────────
@router.get("/{project_id}/models/{model_id}")
def get_model(
    project_id: str,
    model_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    model = db.query(ModelVersion).filter(ModelVersion.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    return _model_to_dict(model)


# ──────────────────────────────────────────────
# PROMOTE — set a model as production
# ──────────────────────────────────────────────
@router.patch("/{project_id}/models/{model_id}/promote")
def promote_model(
    project_id: str,
    model_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Mark a model as the production model.
    Demotes any previously promoted models for this project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    target = db.query(ModelVersion).filter(ModelVersion.id == model_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="Model not found")

    # No longer demoting others to allow multiple production models

    target.is_production = True
    target.is_approved = True  # Also mark as approved when promoted
    db.commit()
    db.refresh(target)

    return {"status": "promoted", "model": _model_to_dict(target)}
# ──────────────────────────────────────────────
# DEMOTE — remove model from production
# ──────────────────────────────────────────────
@router.patch("/{project_id}/models/{model_id}/demote")
def demote_model(
    project_id: str,
    model_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Remove a model from production status."""
    model = db.query(ModelVersion).filter(ModelVersion.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    model.is_production = False
    db.commit()
    db.refresh(model)

    return {"status": "demoted", "model": _model_to_dict(model)}


# ──────────────────────────────────────────────
# DOWNLOAD — stream the .pt file from MinIO/S3
# ──────────────────────────────────────────────
@router.get("/{project_id}/models/{model_id}/download")
def download_model(
    project_id: str,
    model_id: str,
    format: Optional[str] = "pt",   # "pt" or "onnx"
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Stream a model weight file (.pt or .onnx) directly to the client."""
    model = db.query(ModelVersion).filter(ModelVersion.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    s3_key = model.s3_key_pt if format == "pt" else model.s3_key_onnx
    if not s3_key:
        raise HTTPException(
            status_code=404,
            detail=f"No {format.upper()} file available for this model",
        )

    try:
        from app.utils.s3_utils import get_file_from_s3

        file_bytes = get_file_from_s3(s3_key)
        if not file_bytes:
            raise HTTPException(status_code=404, detail="File not found in storage")

        filename = f"{model.name}.{format}"
        content_type = (
            "application/octet-stream" if format == "pt" else "application/octet-stream"
        )

        return StreamingResponse(
            io.BytesIO(file_bytes),
            media_type=content_type,
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")


class ModelUpdate(BaseModel):
    name: str


# ──────────────────────────────────────────────
# UPDATE model name
# ──────────────────────────────────────────────
@router.patch("/{project_id}/models/{model_id}")
def update_model(
    project_id: str,
    model_id: str,
    body: ModelUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Update a model's name."""
    model = db.query(ModelVersion).filter(ModelVersion.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    # Check for duplicate name
    existing = db.query(ModelVersion).filter(
        ModelVersion.name == body.name,
        ModelVersion.id != model_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="A model with this name already exists")

    model.name = body.name
    db.commit()
    db.refresh(model)

    return {"status": "updated", "model": _model_to_dict(model)}


# ──────────────────────────────────────────────
# APPROVE — mark model as approved for registry
# ──────────────────────────────────────────────
@router.patch("/{project_id}/models/{model_id}/approve")
def approve_model(
    project_id: str,
    model_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Mark a model as approved for the registry."""
    model = db.query(ModelVersion).filter(ModelVersion.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    model.is_approved = True
    db.commit()
    db.refresh(model)

    return {"status": "approved", "model": _model_to_dict(model)}


# ──────────────────────────────────────────────
# DELETE a model version
# ──────────────────────────────────────────────
@router.delete("/{project_id}/models/{model_id}")
def delete_model(
    project_id: str,
    model_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Delete a model version and its associated S3 artifacts."""
    model = db.query(ModelVersion).filter(ModelVersion.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    if model.is_base:
        raise HTTPException(status_code=400, detail="Cannot delete the base model")

    if model.is_production:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete the active production model. Promote another model first.",
        )

    # Remove S3 artifacts
    try:
        from app.utils.s3_utils import delete_from_s3

        if model.s3_key_pt:
            delete_from_s3(model.s3_key_pt)
        if model.s3_key_onnx:
            delete_from_s3(model.s3_key_onnx)
    except Exception:
        pass  # Best-effort cleanup; proceed with DB deletion

    db.delete(model)
    db.commit()

    return {"status": "deleted", "model_id": model_id}


# ──────────────────────────────────────────────
# EVALUATE — run val on a model
# ──────────────────────────────────────────────
@router.post("/{project_id}/models/{model_id}/evaluate")
def evaluate_model(
    project_id: str,
    model_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Trigger an asynchronous evaluation task for a model."""
    from app.tasks import evaluate_model_task
    
    # Check if model exists
    model = db.query(ModelVersion).filter(ModelVersion.id == model_id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    task = evaluate_model_task.delay(model_id, project_id)
    return {"status": "queued", "task_id": task.id}
