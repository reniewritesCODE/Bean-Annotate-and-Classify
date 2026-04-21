from fastapi import APIRouter, HTTPException, Depends, Response
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from fastapi.responses import FileResponse
import os
import uuid

router = APIRouter(prefix="/models", tags=["models"])

# Create a new model
@router.post("/", response_model=schemas.ModelVersion)
def create_model(model: schemas.ModelVersionCreate, db: Session = Depends(get_db)):
	# Generate a new UUID for the model
	model_id = str(uuid.uuid4())
	db_model = models.ModelVersion(
		id=model_id,
		name=model.name,
		project_id=model.project_id,
		map50=model.map50,
		map75=model.map75,
		precision=model.precision,
		recall=model.recall,
		f1=model.f1,
		speed=model.speed,
		s3_key_pt=model.s3_key_pt,
		per_class_ap=model.per_class_ap
	)
	db.add(db_model)
	db.commit()
	db.refresh(db_model)
	return db_model

# List all models
@router.get("", response_model=list[schemas.ModelVersion], include_in_schema=False)
def list_models(db: Session = Depends(get_db)):
	return db.query(models.ModelVersion).all()

# Get model details
@router.get("/{model_id}", response_model=schemas.ModelVersion)
def get_model(model_id: str, db: Session = Depends(get_db)):
	model = db.query(models.ModelVersion).filter(models.ModelVersion.id == model_id).first()
	if not model:
		raise HTTPException(status_code=404, detail="Model not found")
	return model
"""
# Download model artifact
@router.get("/{model_id}/download")
def download_model(model_id: str, db: Session = Depends(get_db)):
	model = db.query(models.ModelVersion).filter(models.ModelVersion.id == model_id).first()
	if not model or not model.s3_key_pt:
		raise HTTPException(status_code=404, detail="Model or artifact not found")
	# Example: s3_key_pt is a file path or S3 key
	file_path = os.path.join("models", model.s3_key_pt)
	if not os.path.exists(file_path):
		raise HTTPException(status_code=404, detail="File not found")
	return FileResponse(file_path, filename=os.path.basename(file_path))

# Deploy model (set as production)
@router.post("/{model_id}/deploy")
def deploy_model(model_id: str, db: Session = Depends(get_db)):
	model = db.query(models.ModelVersion).filter(models.ModelVersion.id == model_id).first()
	if not model:
		raise HTTPException(status_code=404, detail="Model not found")
	# Unset previous production model
	db.query(models.ModelVersion).filter(models.ModelVersion.is_production == True).update({"is_production": False})
	model.is_production = True
	db.commit()
	return {"detail": "Model deployed to production"}
"""