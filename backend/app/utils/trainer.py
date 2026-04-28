# app/utils/trainer.py

import os
import json
from pathlib import Path


BASE_MODEL_PATH = "models/base/best.pt"
RUNS_DIR = "models/runs"
PROGRESS_DIR = "models/progress"

def run_training(dataset_path: str, job_id: str, epochs=50, imgsz=640, batch=16, augmentations: dict = None, base_model_path: str = None) -> dict:
    from ultralytics import YOLO

    os.makedirs(PROGRESS_DIR, exist_ok=True)
    progress_file = os.path.join(PROGRESS_DIR, f"{job_id}.json")

    # Use provided base model path or fall back to default
    model_path = base_model_path or BASE_MODEL_PATH
    model = YOLO(model_path)

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

    # Build augmentation hyperparameters from config
    aug = augmentations or {}
    hsv_h = 0.015 if aug.get('brightness', False) else 0.0  # HSV-Hue
    hsv_s = 0.7 if aug.get('exposure', False) else 0.0      # HSV-Saturation
    hsv_v = 0.4 if aug.get('cameraGain', False) else 0.0    # HSV-Value
    degrees = 10.0 if aug.get('rotation', False) else 0.0  # Rotation
    translate = 0.1 if aug.get('crop', False) else 0.0       # Translation (crop-like)
    scale = 0.5 if aug.get('shear', False) else 0.0         # Scale/Shear
    shear = 2.0 if aug.get('shear', False) else 0.0         # Shear degrees
    flipud = 0.5 if aug.get('flip', False) else 0.0         # Vertical flip
    fliplr = 0.5 if aug.get('flip', False) else 0.0         # Horizontal flip
    # Additional augmentations via albumentations-style
    mosaic = 1.0  # Always use mosaic for YOLO
    mixup = 0.0

    results = model.train(
        data=data_yaml,
        epochs=epochs,
        imgsz=imgsz,
        batch=batch,
        project=RUNS_DIR,
        name=job_id,
        exist_ok=True,
        verbose=False,
        # Augmentation hyperparameters
        hsv_h=hsv_h,
        hsv_s=hsv_s,
        hsv_v=hsv_v,
        degrees=degrees,
        translate=translate,
        scale=scale,
        shear=shear,
        flipud=flipud,
        fliplr=fliplr,
        mosaic=mosaic,
        mixup=mixup,
        # Disable built-in if not using
        copy_paste=0.0,
        erasing=0.0,
        auto_augment=None if not any([aug.get('blur', False), aug.get('noise', False)]) else "randaugment",
    )

    # Extract per-class AP metrics if available
    per_class_ap = None
    if hasattr(results, 'ap_class_index') and hasattr(results, 'ap'):
        try:
            class_names = model.names if hasattr(model, 'names') else {}
            per_class_ap = {}
            for idx, class_id in enumerate(results.ap_class_index):
                class_name = class_names.get(int(class_id), f"class_{class_id}")
                if hasattr(results, 'ap') and len(results.ap) > idx:
                    per_class_ap[class_name] = float(results.ap[idx])
        except Exception as e:
            print(f"Warning: Could not extract per-class AP: {e}")

    return {
        "map50": float(results.results_dict.get("metrics/mAP50(B)", 0) or 0),
        "map50_95": float(results.results_dict.get("metrics/mAP50-95(B)", 0) or 0),
        "precision": float(results.results_dict.get("metrics/precision(B)", 0) or 0),
        "recall": float(results.results_dict.get("metrics/recall(B)", 0) or 0),
        "per_class_ap": per_class_ap,
        "best_model_path": str(Path(results.save_dir) / "weights" / "best.pt"),
    }


def run_evaluation(model_path: str, dataset_path: str) -> dict:
    from ultralytics import YOLO
    model = YOLO(model_path)
    
    data_yaml = os.path.join(dataset_path, "data.yaml")
    if not os.path.exists(data_yaml):
        raise FileNotFoundError(f"data.yaml not found at {data_yaml}")

    # Determine which split to use for evaluation
    # Default to 'test', but fall back to 'val' or 'train' if splits are empty/missing labels
    eval_split = 'test'
    
    def split_has_labels(s):
        labels_path = os.path.join(dataset_path, s, 'labels')
        if not os.path.exists(labels_path):
            return False
        # Check if any .txt file has content > 0
        for f in os.listdir(labels_path):
            if f.endswith('.txt') and os.path.getsize(os.path.join(labels_path, f)) > 0:
                return True
        return False

    if not split_has_labels('test'):
        if split_has_labels('val'):
            eval_split = 'val'
            print(f"ℹ️  'test' split has no labels, falling back to 'val'")
        elif split_has_labels('train'):
            eval_split = 'train'
            print(f"ℹ️  'test' and 'val' splits have no labels, falling back to 'train'")

    results = model.val(data=data_yaml, split=eval_split, verbose=False)
    
    # Extract per-class AP
    per_class_ap = None
    try:
        class_names = model.names
        per_class_ap = {}
        for idx, class_id in enumerate(results.ap_class_index):
            class_name = class_names.get(int(class_id), f"class_{class_id}")
            if hasattr(results, 'ap') and len(results.ap) > idx:
                per_class_ap[class_name] = float(results.ap[idx])
    except Exception as e:
        print(f"Warning: Could not extract per-class AP: {e}")

    return {
        "map50": float(results.results_dict.get("metrics/mAP50(B)", 0) or 0),
        "map50_95": float(results.results_dict.get("metrics/mAP50-95(B)", 0) or 0),
        "precision": float(results.results_dict.get("metrics/precision(B)", 0) or 0),
        "recall": float(results.results_dict.get("metrics/recall(B)", 0) or 0),
        "per_class_ap": per_class_ap,
    }