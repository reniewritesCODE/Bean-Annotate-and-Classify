# backend/app/routers/projects.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.database import get_db
from app.models import Project, Image
from app.schemas import ProjectCreate, ProjectResponse
from app.auth import get_current_user, TokenData
from app.utils.dataset_exporter import DatasetExporter
from app.utils.s3_utils import get_presigned_url

router = APIRouter(prefix="/api/projects", tags=["projects"])

@router.get("", response_model=List[ProjectResponse])
async def list_projects(
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """List all projects with an optional thumbnail."""
    projects = db.query(Project).all()
    
    # Enrich projects with thumbnails
    for project in projects:
        # Get the most recent image for this project
        latest_image = db.query(Image).filter(Image.project_id == project.id).order_by(Image.uploaded_at.desc()).first()
        if latest_image:
            url = get_presigned_url(latest_image.s3_key)
            if url:
                project.thumbnail_url = url.replace("http://minio:9000", "http://localhost:9000")
        else:
            project.thumbnail_url = None
            
    return projects

@router.post("", response_model=ProjectResponse)
async def create_project(
    project_in: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Create a new project."""
    # Check for name uniqueness
    existing = db.query(Project).filter(Project.name == project_in.name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Project with name '{project_in.name}' already exists."
        )
    
    new_project = Project(
        name=project_in.name,
        description=project_in.description
    )
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    return new_project

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Get project details."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(404, "Project not found")
    return project

@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Delete a project."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(404, "Project not found")
    
    db.delete(project)
    db.commit()
    return {"status": "success", "message": f"Project '{project.name}' deleted."}

@router.post("/{project_id}/export")
async def export_project_dataset(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Export project annotations to YOLO format."""
    try:
        exporter = DatasetExporter(db)
        export_path = exporter.export_project(project_id)
        return {
            "status": "success", 
            "message": "Dataset exported successfully",
            "export_path": export_path
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
