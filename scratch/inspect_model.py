from ultralytics import YOLO
import json
import os

model_path = 'backend/models/base/best.pt'
if not os.path.exists(model_path):
    print(f"Error: Model not found at {model_path}")
else:
    model = YOLO(model_path)
    print("Model Names:", json.dumps(model.names, indent=2))
    print("Number of classes:", len(model.names))
