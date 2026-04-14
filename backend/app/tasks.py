from app.worker import celery_app
from app.database import SessionLocal
from app.models import TrainingJob
from app.utils.dataset_exporter import DatasetExporter
from app.utils.trainer import run_training
from datetime import datetime

@celery_app.task(bind=True)
def train_model_task(self, job_id: str, project_id: str, config: dict):
    db = SessionLocal()
    job = db.query(TrainingJob).filter(TrainingJob.id == job_id).first()

    try:
        # Mark running
        job.status = "running"
        db.commit()

        # Step 1: Export dataset
        exporter = DatasetExporter(db)
        dataset_path = exporter.export_project(project_id)

        # Step 2: Run YOLO training
        metrics = run_training(
            dataset_path=dataset_path,
            job_id=job_id,
            epochs=config.get("epochs", 50),
            imgsz=config.get("imgsz", 640),
            batch=config.get("batch", 16),
        )

        # Step 3: Mark done + save metrics
        job.status = "done"
        job.config = {**job.config, "metrics": metrics} if job.config else {"metrics": metrics}
        db.commit()

    except Exception as e:
        job.status = "failed"
        job.config = {**(job.config or {}), "error": str(e)}
        db.commit()
        raise

    finally:
        db.close()