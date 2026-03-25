from fastapi import FastAPI
from app.database import engine
from app.models import Base

app = FastAPI(title='BeanScan')

# Create tables on startup (for development only)
@app.on_event('startup')
def create_tables():
    Base.metadata.create_all(bind=engine)

@app.get('/health')
def health():
    return {'status': 'ok'}
