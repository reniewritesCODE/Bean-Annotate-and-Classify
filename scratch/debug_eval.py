from ultralytics import YOLO
import os
import json

model_path = 'backend/models/base/best.pt'
dataset_path = 'backend/datasets/test_6fc5dce1' # Use the existing export
data_yaml = os.path.join(dataset_path, 'data.yaml')

if not os.path.exists(model_path):
    print(f"Error: Model not found at {model_path}")
elif not os.path.exists(data_yaml):
    print(f"Error: Data yaml not found at {data_yaml}")
else:
    model = YOLO(model_path)
    # Evaluate on 'train' split since we know it has labels
    results = model.val(data=data_yaml, split='train', verbose=True)
    
    print("\n--- Results Dict Keys ---")
    print(json.dumps(list(results.results_dict.keys()), indent=2))
    
    print("\n--- Metrics ---")
    print(f"mAP50: {results.results_dict.get('metrics/mAP50(B)')}")
    print(f"Precision: {results.results_dict.get('metrics/precision(B)')}")
    print(f"Recall: {results.results_dict.get('metrics/recall(B)')}")
