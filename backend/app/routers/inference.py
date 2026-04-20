from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import ModelVersion, Project
from app.auth import get_current_user
from app.utils.s3_utils import get_file_from_s3
from ultralytics import YOLO
import os
import tempfile
import cv2
import numpy as np
import base64
import json
from typing import Dict, Any, List

router = APIRouter(prefix="/api/projects", tags=["inference"])

class InferenceEngine:
    _instance = None
    _models: Dict[str, YOLO] = {}
    _model_devices: Dict[str, str] = {} # model_id -> 'cpu' or 'cuda'

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(InferenceEngine, cls).__new__(cls)
        return cls._instance

    def get_model(self, db: Session, project_id: str, device: str = "cpu") -> YOLO:
        # Find the production model for the project
        model_version = (
            db.query(ModelVersion)
            .join(ModelVersion.training_job)
            .filter(
                # ModelVersion.training_job.has(project_id=project_id),
                ModelVersion.is_production == True
            )
            .first()
        )
        # Fallback to base model if no production model exists
        if not model_version:
            model_version = db.query(ModelVersion).filter(ModelVersion.is_base == True).first()
            
        if not model_version:
            raise HTTPException(status_code=404, detail="No production or base model found for inference.")

        model_id = model_version.id

        # If already loaded and device matches, return it
        if model_id in self._models and self._model_devices.get(model_id) == device:
            return self._models[model_id]

        # Ensure model is downloaded from S3
        temp_dir = tempfile.gettempdir()
        local_model_path = os.path.join(temp_dir, f"{model_id}.pt")
        
        if not os.path.exists(local_model_path):
            if not model_version.s3_key_pt:
                raise HTTPException(status_code=400, detail="Model does not have S3 weights available")
            
            print(f"Downloading model {model_id} from S3...")
            model_bytes = get_file_from_s3(model_version.s3_key_pt)
            if not model_bytes:
                 # It might be a base model stored locally at models/base/yolov8n.pt ?
                 # Check if local exists if S3 fails
                 raise HTTPException(status_code=500, detail="Failed to download model weights from MinIO")
            with open(local_model_path, "wb") as f:
                f.write(model_bytes)

        print(f"Loading YOLO model {model_id} on {device}...")
        
        # Load the YOLO model
        try:
            model = YOLO(local_model_path)
            # Send to requested device
            model.to(device)
            self._models[model_id] = model
            self._model_devices[model_id] = device
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Error loading YOLO model: {str(e)}")

        return self._models[model_id]

engine = InferenceEngine()

@router.post("/{project_id}/inference/image")
async def infer_image(
    project_id: str,
    file: UploadFile = File(...),
    threshold: float = Form(0.5),
    device: str = Form("cpu"),
    db: Session = Depends(get_db),
    # current_user = Depends(get_current_user)
):
    try:
        model = engine.get_model(db, project_id, device=device)
        
        contents = await file.read()
        np_arr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image format")

        results = model.predict(source=img, conf=threshold, device=device, verbose=False)
        
        detections = []
        for result in results:
            boxes = result.boxes
            for box in boxes:
                # box.xywhn returns center x, center y, width, height format in normalized coords (0-1)
                xywhn = box.xywhn[0].cpu().numpy()
                conf = float(box.conf[0].cpu().numpy())
                cls = int(box.cls[0].cpu().numpy())
                
                detections.append({
                    "cls": cls,
                    "conf": conf,
                    "x": float(xywhn[0]),
                    "y": float(xywhn[1]),
                    "w": float(xywhn[2]),
                    "h": float(xywhn[3])
                })
                
        return {"status": "success", "detections": detections}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.websocket("/{project_id}/inference/stream")
async def websocket_inference(websocket: WebSocket, project_id: str, db: Session = Depends(get_db)):
    await websocket.accept()
    device = "cpu"
    threshold = 0.5
    model = None
    
    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            
            # Handle config messages
            if "config" in payload:
                config = payload["config"]
                if "device" in config:
                    device = config["device"]
                if "threshold" in config:
                    threshold = config["threshold"]
                
                # Fetch model with specified device lazily or force reload if device changed
                model = engine.get_model(db, project_id, device=device)
                await websocket.send_text(json.dumps({"type": "config_ack", "message": "Updated"}))
                continue
            
            # Handle frame messages
            if "frame" in payload:
                if model is None:
                    model = engine.get_model(db, project_id, device=device)

                # Decode base64 to image
                frame_data = payload["frame"]
                if frame_data.startswith("data:"):
                    frame_data = frame_data.split(",")[1]
                
                img_bytes = base64.b64decode(frame_data)
                np_arr = np.frombuffer(img_bytes, np.uint8)
                img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
                
                if img is None:
                    continue

                results = model.predict(source=img, conf=threshold, device=device, verbose=False)
                
                detections = []
                for result in results:
                    boxes = result.boxes
                    for box in boxes:
                        xywhn = box.xywhn[0].cpu().numpy() # normalized coordinates 0-1
                        conf = float(box.conf[0].cpu().numpy())
                        cls = int(box.cls[0].cpu().numpy())
                        
                        detections.append({
                            "cls": cls,
                            "conf": conf,
                            "x": float(xywhn[0]),
                            "y": float(xywhn[1]),
                            "w": float(xywhn[2]),
                            "h": float(xywhn[3])
                        })
                
                await websocket.send_text(json.dumps({
                    "type": "detections",
                    "detections": detections
                }))

    except WebSocketDisconnect:
        print("WebSocket client disconnected")
    except Exception as e:
        print(f"WebSocket Error: {e}")
        try:
            await websocket.close(code=1011, reason=str(e))
        except:
            pass
