# backend/app/utils/dataset_exporter.py
import os
import yaml
import shutil
from sqlalchemy.orm import Session
from app.models import Project, Image, Annotation
from app.utils.s3_utils import s3_client, S3_BUCKET
import random
from PIL import Image as PILImage
from PIL import ExifTags

# List of classes as defined in frontend/lib/constants.ts
# These must match exactly for YOLO to be consistent with the UI
DEFECT_CLASS_NAMES = [
    'Full Black',           # 1 -> 0
    'Full Sour',            # 2 -> 1
    'Fungus Damage',        # 3 -> 2
    'Severe Insect Damage', # 4 -> 3
    'Foreign Matter',       # 5 -> 4
    'Dried Cherry/Pod',     # 6 -> 5
    'Partial Black',        # 7 -> 6
    'Partial Sour',         # 8 -> 7
    'Hull/Husk',            # 9 -> 8
    'Parchment/Pergamino',  # 10 -> 9
    'Slight Insect Damage', # 11 -> 10
    'Floater',              # 12 -> 11
    'Immature/Unripe',      # 13 -> 12
    'Withered',             # 14 -> 13
    'Shell',                # 15 -> 14
    'Broken/Chipped/Cut'    # 16 -> 15
]

class DatasetExporter:
    def __init__(self, db: Session, base_path: str = "datasets"):
        self.db = db
        self.base_path = base_path

    def export_project(self, project_id: str, splits_config: dict = None, preprocessing_config: dict = None):
        """
        Export project dataset with custom splits and preprocessing.
        
        Args:
            project_id: Project ID to export
            splits_config: Dict with 'train', 'val', 'test' percentages (e.g., {'train': 70, 'val': 20, 'test': 10})
            preprocessing_config: Dict with 'autoOrient' boolean
        """
        project = self.db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise Exception("Project not found")

        # Create project directory
        project_name_safe = project.name.replace(" ", "_").lower()
        project_dir = os.path.join(self.base_path, f"{project_name_safe}_{project_id[:8]}")
        
        # Fresh start: clear previous export if any
        if os.path.exists(project_dir):
            shutil.rmtree(project_dir)
        
        os.makedirs(project_dir, exist_ok=True)

        splits = ['train', 'val', 'test']
        for split in splits:
            os.makedirs(os.path.join(project_dir, split, 'images'), exist_ok=True)
            os.makedirs(os.path.join(project_dir, split, 'labels'), exist_ok=True)

        # Fetch all images for this project
        images = self.db.query(Image).filter(Image.project_id == project_id).all()
        
        # Use custom splits or default to 80/10/10
        if splits_config:
            train_pct = splits_config.get('train', 80) / 100
            val_pct = splits_config.get('val', 10) / 100
        else:
            train_pct = 0.8
            val_pct = 0.1
        
        # Apply custom split
        random.shuffle(images)
        total = len(images)
        train_end = int(total * train_pct)
        val_end = train_end + int(total * val_pct)

        for i, img in enumerate(images):
            if i < train_end:
                split = 'train'
            elif i < val_end:
                split = 'val'
            else:
                split = 'test'
            
            self._export_image(img, project_dir, split, preprocessing_config)

        # Generate data.yaml
        self._generate_yaml(project_dir, project_name_safe)
        
        return project_dir

    def _export_image(self, img: Image, project_dir: str, split: str, preprocessing_config: dict = None):
        # 1. Download image from MinIO
        img_extension = img.s3_key.split('.')[-1]
        img_filename = f"{img.id}.{img_extension}"
        local_img_path = os.path.join(project_dir, split, 'images', img_filename)
        
        try:
            s3_client.download_file(S3_BUCKET, img.s3_key, local_img_path)
        except Exception as e:
            print(f"Failed to download {img.s3_key}: {e}")
            return

        # 2. Apply preprocessing (auto-orient)
        if preprocessing_config and preprocessing_config.get('autoOrient', True):
            try:
                self._apply_auto_orient(local_img_path)
            except Exception as e:
                print(f"Failed to auto-orient {img.s3_key}: {e}")

        # 3. Generate .txt label file
        label_filename = f"{img.id}.txt"
        local_label_path = os.path.join(project_dir, split, 'labels', label_filename)
        
        annotations = self.db.query(Annotation).filter(Annotation.image_id == img.id).all()
        
        with open(local_label_path, 'w') as f:
            for ann in annotations:
                # YOLO format: class x_center y_center width height (all normalized 0-1)
                # DB class_id is 1-indexed, YOLO is 0-indexed
                yolo_class = ann.class_id - 1
                f.write(f"{yolo_class} {ann.x_center} {ann.y_center} {ann.width} {ann.height}\n")

    def _apply_auto_orient(self, image_path: str):
        """Fix image orientation based on EXIF data."""
        try:
            with PILImage.open(image_path) as img:
                # Check for EXIF orientation
                try:
                    for orientation in ExifTags.TAGS.keys():
                        if ExifTags.TAGS[orientation] == 'Orientation':
                            break
                    
                    exif = img._getexif()
                    if exif is not None and orientation in exif:
                        orientation_value = exif[orientation]
                        
                        # Apply rotation based on orientation value
                        if orientation_value == 3:
                            img = img.rotate(180, expand=True)
                        elif orientation_value == 6:
                            img = img.rotate(270, expand=True)
                        elif orientation_value == 8:
                            img = img.rotate(90, expand=True)
                        
                        # Save the corrected image
                        img.save(image_path, quality=95)
                except (AttributeError, KeyError, IndexError):
                    # No EXIF data or no orientation tag
                    pass
        except Exception as e:
            print(f"Error auto-orienting image {image_path}: {e}")

    def _generate_yaml(self, project_dir: str, project_name: str):
        data = {
            'path': os.path.abspath(project_dir),
            'train': 'train/images',
            'val': 'val/images',
            'test': 'test/images',
            'names': {i: name for i, name in enumerate(DEFECT_CLASS_NAMES)}
        }
        
        yaml_path = os.path.join(project_dir, 'data.yaml')
        with open(yaml_path, 'w') as f:
            yaml.dump(data, f, sort_keys=False)
