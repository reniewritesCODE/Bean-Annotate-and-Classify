# backend/app/main.py - MINIMAL VERSION FOR DEBUGGING
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth_routes

app = FastAPI(title="BeanScan API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_routes.router)

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "message": "BeanScan API is running (minimal version)"
    }

print("✅ Minimal FastAPI app started successfully")