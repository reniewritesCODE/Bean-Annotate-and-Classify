
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.requests import Request
from fastapi.exceptions import HTTPException
from fastapi.encoders import jsonable_encoder
from app.database import Base, engine
from app.models import Base
from app.routers import auth
from app.config import settings


app = FastAPI(title="BeanScan API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "message": "BeanScan API is running (minimal version)"
    }

print("Minimal FastAPI app started successfully")
app.include_router(auth.router)

@app.on_event('startup')
def create_tables():
    if settings.DEV_MODE:
        Base.metadata.create_all(bind=engine)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content=jsonable_encoder({"detail": exc.detail, "error": True}),
    )
