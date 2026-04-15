# backend/app/routers/projects.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
import uuid

from app.database import get_db
from app.models import Project, Image, Annotation
from app.schemas import ProjectCreate, ProjectResponse, ProjectSummaryResponse, ClassCount, ActivityItem
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


@router.get("/{project_id}/summary", response_model=ProjectSummaryResponse)
async def get_project_summary(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """Return aggregated analytics for the project dashboard."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    total_images = db.query(func.count(Image.id)).filter(Image.project_id == project_id).scalar() or 0
    annotated_images = (
        db.query(func.count(Image.id))
        .filter(Image.project_id == project_id, Image.status == "done")
        .scalar()
        or 0
    )

    total_annotations = (
        db.query(func.count(Annotation.id))
        .join(Image, Annotation.image_id == Image.id)
        .filter(Image.project_id == project_id)
        .scalar()
        or 0
    )

    class_rows = (
        db.query(Annotation.class_id.label("class_id"), func.count(Annotation.id).label("count"))
        .join(Image, Annotation.image_id == Image.id)
        .filter(Image.project_id == project_id)
        .group_by(Annotation.class_id)
        .order_by(func.count(Annotation.id).desc())
        .all()
    )
    class_distribution = [ClassCount(class_id=row.class_id, count=row.count) for row in class_rows]

    # Minimal recent activity without adding audit tables/timestamps:
    # - Image uploads: use Image.uploaded_at
    # - Annotation completion: infer from Image.status == 'done' (timestamp approximated by uploaded_at)
    recent_activity: List[ActivityItem] = []

    recent_uploads = (
        db.query(Image.id, Image.uploaded_at)
        .filter(Image.project_id == project_id)
        .order_by(Image.uploaded_at.desc())
        .limit(10)
        .all()
    )
    for img_id, ts in recent_uploads:
        if ts:
            recent_activity.append(
                ActivityItem(
                    timestamp=ts,
                    action="Uploaded image",
                    details=f"Image {img_id} uploaded",
                )
            )

    recent_done = (
        db.query(Image.id, Image.uploaded_at)
        .filter(Image.project_id == project_id, Image.status == "done")
        .order_by(Image.uploaded_at.desc())
        .limit(10)
        .all()
    )
    for img_id, ts in recent_done:
        if ts:
            recent_activity.append(
                ActivityItem(
                    timestamp=ts,
                    action="Annotation completed",
                    details=f"Image {img_id} marked done",
                )
            )

    recent_activity = sorted(recent_activity, key=lambda a: a.timestamp, reverse=True)[:10]

    return ProjectSummaryResponse(
        project_id=project_id,
        total_images=total_images,
        annotated_images=annotated_images,
        total_annotations=total_annotations,
        class_distribution=class_distribution,
        recent_activity=recent_activity,
    )

from app.utils.cleanup import cleanup_project_resources

@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: TokenData = Depends(get_current_user)
):
    """Delete a project and its associated resources."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(404, "Project not found")
    
    # Clean up physical resources (S3, Disk) before deleting from DB
    cleanup_project_resources(project, db)
    
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
