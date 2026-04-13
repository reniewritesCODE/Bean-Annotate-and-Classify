# backend/app/routers/projects.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid

from app.database import get_db
from app.models import Project
from app.schemas import ProjectCreate, ProjectResponse
from app.auth import get_current_user, TokenData

router = APIRouter(prefix="/api/projects", tags=["projects"])

@router.get("", response_model=List[ProjectResponse])
async def list_projects(
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """List all projects."""
    return db.query(Project).all()

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
