# backend/app/utils/cleanup.py
import os
import shutil
from sqlalchemy.orm import Session
from app.models import Image, TrainingJob, ModelVersion
from app.utils.s3_utils import delete_from_s3

def cleanup_project_resources(project, db: Session):
    """
    Cleans up all physical resources associated with a project.
    This includes images in S3, model versions in S3, and exported datasets on disk.
    """
    # 1. Delete all images from S3
    images = db.query(Image).filter(Image.project_id == project.id).all()
    for img in images:
        if img.s3_key:
            delete_from_s3(img.s3_key)

    # 2. Delete all training job artifacts (ModelVersions) from S3
    # Only delete models that were produced by this project and are NOT base models
    jobs = db.query(TrainingJob).filter(TrainingJob.project_id == project.id).all()
    for job in jobs:
        model_versions = db.query(ModelVersion).filter(ModelVersion.training_job_id == job.id).all()
        for mv in model_versions:
            if not mv.is_base:
                if mv.s3_key_pt:
                    delete_from_s3(mv.s3_key_pt)
                if mv.s3_key_onnx:
                    delete_from_s3(mv.s3_key_onnx)

    # 3. Delete exported datasets from disk
    # Pattern: datasets/{project_name_safe}_{project_id[:8]}
    project_name_safe = project.name.replace(" ", "_").lower()
    # Note: DatasetExporter uses "datasets" as default base_path relative to backend root
    project_dir = f"datasets/{project_name_safe}_{project.id[:8]}"
    
    if os.path.exists(project_dir):
        try:
            shutil.rmtree(project_dir)
            print(f"Deleted dataset directory: {project_dir}")
        except Exception as e:
            print(f"Error deleting dataset directory {project_dir}: {e}")
