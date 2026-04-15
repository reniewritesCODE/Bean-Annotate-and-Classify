# app/utils/trainer.py

import os
import json
from pathlib import Path


BASE_MODEL_PATH = "models/base/robusta_base.pt"
RUNS_DIR = "models/runs"
PROGRESS_DIR = "models/progress"

def run_training(dataset_path: str, job_id: str, epochs=50, imgsz=640, batch=16) -> dict:
    from ultralytics import YOLO

    os.makedirs(PROGRESS_DIR, exist_ok=True)
    progress_file = os.path.join(PROGRESS_DIR, f"{job_id}.json")

    model = YOLO(BASE_MODEL_PATH)

    # ── Live progress callback ─────────────────────────────────────────────
    def on_epoch_end(trainer):
        metrics = trainer.metrics or {}
        epoch_log = {
            "epoch": trainer.epoch + 1,
            "total_epochs": trainer.epochs,
            "loss": round(float(trainer.loss.item()), 4) if hasattr(trainer, 'loss') else None,
            "map50": round(float(metrics.get("metrics/mAP50(B)", 0) or 0), 4),
            "precision": round(float(metrics.get("metrics/precision(B)", 0) or 0), 4),
            "recall": round(float(metrics.get("metrics/recall(B)", 0) or 0), 4),
        }
        history = []
        if os.path.exists(progress_file):
            with open(progress_file) as f:
                history = json.load(f)
        
        history = [h for h in history if h["epoch"] != epoch_log["epoch"]]
        history.append(epoch_log)
        with open(progress_file, "w") as f:
            json.dump(history, f)

    model.add_callback("on_fit_epoch_end", on_epoch_end)
    # ──────────────────────────────────────────────────────────────────────

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
        "map50": float(results.results_dict.get("metrics/mAP50(B)", 0) or 0),
        "map50_95": float(results.results_dict.get("metrics/mAP50-95(B)", 0) or 0),
        "precision": float(results.results_dict.get("metrics/precision(B)", 0) or 0),
        "recall": float(results.results_dict.get("metrics/recall(B)", 0) or 0),
        "best_model_path": str(Path(results.save_dir) / "weights" / "best.pt"),
    }