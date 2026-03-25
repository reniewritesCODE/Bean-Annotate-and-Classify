from sqlalchemy import Column, String, Boolean, Float, DateTime
from sqlalchemy.orm import relationship
from app.database import Base
import uuid
from datetime import datetime

class ModelVersion(Base):
    __tablename__ = 'model_versions'
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    training_job_id = Column(String, nullable=True)   # removed ForeignKey for now
    name = Column(String, nullable=False)
    is_base = Column(Boolean, default=False)
    is_production = Column(Boolean, default=False)
    s3_key_pt = Column(String)
    s3_key_onnx = Column(String)
    map50 = Column(Float)
    precision = Column(Float)
    recall = Column(Float)
    mlflow_run_id = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

print('ModelVersion table defined (simplified)')
