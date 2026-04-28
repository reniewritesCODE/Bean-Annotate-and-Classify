from app.worker import celery_app
from app.database import SessionLocal
from app.models import TrainingJob, ModelVersion
from app.utils.dataset_exporter import DatasetExporter
from app.utils.trainer import run_training
from app.utils.s3_utils import upload_file_to_s3, get_file_from_s3
from datetime import datetime
import uuid
import os

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

        # Step 1.5: Fetch base model from DB and download from S3
        base_model_local_path = None
        if job.base_model_id:
            base_model = db.query(ModelVersion).filter(ModelVersion.id == job.base_model_id).first()
            if base_model and base_model.s3_key_pt:
                # Download base model from S3 to local temp location
                base_model_bytes = get_file_from_s3(base_model.s3_key_pt)
                if base_model_bytes:
                    base_model_dir = f"models/base_temp/{job_id}"
                    os.makedirs(base_model_dir, exist_ok=True)
                    base_model_local_path = f"{base_model_dir}/base.pt"
                    with open(base_model_local_path, "wb") as f:
                        f.write(base_model_bytes)
                    print(f"Downloaded base model from S3: {base_model.s3_key_pt}")
                else:
                    print(f"Warning: Failed to download base model from S3: {base_model.s3_key_pt}")

        # Step 2: Run YOLO training with augmentation config and custom base model
        metrics = run_training(
            dataset_path=dataset_path,
            job_id=job_id,
            epochs=config.get("epochs", 50),
            imgsz=config.get("imgsz", 640),
            batch=config.get("batch", 16),
            augmentations=augmentations_config,
            base_model_path=base_model_local_path,
        )

        # Step 3: Mark done + save metrics
        job.status = "done"
        job.config = {**job.config, "metrics": metrics} if job.config else {"metrics": metrics}
        db.commit()

        # Step 4: Upload model to S3 and create ModelVersion record
        best_model_path = metrics.get("best_model_path")
        s3_key_pt = None
        
        if best_model_path and os.path.exists(best_model_path):
            # Read model file and upload to S3
            with open(best_model_path, "rb") as f:
                model_bytes = f.read()
            
            s3_key_pt = f"models/{project_id}/{job_id}/best.pt"
            upload_success = upload_file_to_s3(
                model_bytes, 
                s3_key_pt, 
                content_type="application/octet-stream"
            )
            
            if not upload_success:
                print(f"Warning: Failed to upload model to S3 for job {job_id}")
        
        model_version = ModelVersion(
            id=str(uuid.uuid4()),
            training_job_id=job_id,
            name=f"model-{job_id[:8]}",
            is_base=False,
            is_production=False,
            is_approved=False,  # New models are not approved until review
            s3_key_pt=s3_key_pt,
            s3_key_onnx=None,
            map50=metrics.get("map50"),
            precision=metrics.get("precision"),
            recall=metrics.get("recall"),
            per_class_ap=metrics.get("per_class_ap"),  # Per-class AP metrics from training
        )
        db.add(model_version)
        db.commit()

    except Exception as e:
        job.status = "failed"
        job.config = {**(job.config or {}), "error": str(e)}
        db.commit()
        raise

    finally:
        db.close()


@celery_app.task(bind=True)
def evaluate_model_task(self, model_id: str, project_id: str):
    db = SessionLocal()
    try:
        model_version = db.query(ModelVersion).filter(ModelVersion.id == model_id).first()
        if not model_version:
            return {"error": "Model not found"}

        # 1. Check for offline baseline dataset (Option B)
        offline_dataset_path = "/app/models/base/baseline model dataset"
        dataset_path = None
        
        if model_version.is_base and os.path.exists(offline_dataset_path):
            dataset_path = offline_dataset_path
            print(f"ℹ️  Using offline baseline dataset: {dataset_path}")
        else:
            # Export dataset from DB
            exporter = DatasetExporter(db)
            dataset_path = exporter.export_project(project_id)

        # 2. Prepare model
        local_model_path = None
        if model_version.is_base:
            from app.utils.trainer import BASE_MODEL_PATH
            if os.path.exists(BASE_MODEL_PATH):
                local_model_path = BASE_MODEL_PATH
            else:
                print(f"Base model not found at {BASE_MODEL_PATH}, downloading from S3...")
        
        # If not base model or base model missing locally, download from S3
        if not local_model_path and model_version.s3_key_pt:
            model_bytes = get_file_from_s3(model_version.s3_key_pt)
            os.makedirs(f"models/temp_eval/{model_id}", exist_ok=True)
            local_model_path = f"models/temp_eval/{model_id}/weights.pt"
            with open(local_model_path, "wb") as f:
                f.write(model_bytes)
        
        if not local_model_path or not os.path.exists(local_model_path):
            return {"error": f"Model weights not found (tried local and S3: {model_version.s3_key_pt})"}

        # 3. Run evaluation
        from app.utils.trainer import run_evaluation
        metrics = run_evaluation(local_model_path, dataset_path)

        # 4. Update DB
        model_version.map50 = metrics.get("map50")
        model_version.precision = metrics.get("precision")
        model_version.recall = metrics.get("recall")
        model_version.per_class_ap = metrics.get("per_class_ap")
        db.commit()

        return {"status": "done", "metrics": metrics}

    except Exception as e:
        print(f"Error in evaluate_model_task: {e}")
        return {"error": str(e)}
    finally:
        db.close()