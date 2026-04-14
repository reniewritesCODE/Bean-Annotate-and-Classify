# app/utils/trainer.py

import os
import json

BASE_MODEL_PATH = "models/base/robusta_base.pt"
RUNS_DIR = "models/runs"
PROGRESS_DIR = "models/progress"

def run_training(dataset_path: str, job_id: str, epochs=50, imgsz=640, batch=16) -> dict:
    from ultralytics import YOLO  # ← moved inside the function

    os.makedirs(PROGRESS_DIR, exist_ok=True)
    progress_file = os.path.join(PROGRESS_DIR, f"{job_id}.json")

    model = YOLO(BASE_MODEL_PATH)

    data_yaml = os.path.join(dataset_path, "data.yaml")
    if not os.path.exists(data_yaml):
        raise FileNotFoundError(f"data.yaml not found at {data_yaml}")

    results = model.train(
        data=data_yaml,
        epochs=epochs,
        imgsz=imgsz,
        batch=batch,
        project=RUNS_DIR,
        name=job_id,
        exist_ok=True,
        verbose=False,
    )

    return {
        "map50": float(results.results_dict.get("metrics/mAP50(B)", 0)),
        "map50_95": float(results.results_dict.get("metrics/mAP50-95(B)", 0)),
        "precision": float(results.results_dict.get("metrics/precision(B)", 0)),
        "recall": float(results.results_dict.get("metrics/recall(B)", 0)),
        "best_model_path": str(results.save_dir / "weights/best.pt"),
    }