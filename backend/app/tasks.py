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

        # Extract configs
        splits_config = config.get("splits", {"train": 80, "val": 10, "test": 10})
        preprocessing_config = config.get("preprocessing", {"autoOrient": True})
        augmentations_config = config.get("augmentations", {})

        # Step 1: Export dataset with custom splits and preprocessing
        exporter = DatasetExporter(db)
        dataset_path = exporter.export_project(
            project_id,
            splits_config=splits_config,
            preprocessing_config=preprocessing_config
        )

        # Step 2: Run YOLO training with augmentation config
        metrics = run_training(
            dataset_path=dataset_path,
            job_id=job_id,
            epochs=config.get("epochs", 50),
            imgsz=config.get("imgsz", 640),
            batch=config.get("batch", 16),
            augmentations=augmentations_config,
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