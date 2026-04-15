# backend/app/main.py - MINIMAL VERSION FOR DEBUGGING
import os
from dotenv import load_dotenv
# Load .env before any other app imports
load_dotenv(os.path.join(os.path.dirname(__file__), '../../.env'))
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth_routes, images, projects, annotations
from app.routers.training import router as training_router

app = FastAPI(title="BeanScan API", redirect_slashes=False)

# Update CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # Next.js default
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router)
app.include_router(images.router)
app.include_router(projects.router)
app.include_router(annotations.router)
app.include_router(training_router)


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "message": "BeanScan API is running (minimal version)"
    }

print("Minimal FastAPI app started successfully")