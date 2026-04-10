from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
import os
from dotenv import load_dotenv

# Try to find .env in root or current dir
load_dotenv(os.path.join(os.path.dirname(__file__), '../../.env'))
load_dotenv() 

DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    # Default fallback for local development if not in environment
    DATABASE_URL = "postgresql://beanscan:beanscanpw@localhost:5432/beanscan"
    print(f"Info: Using default local Database URL: {DATABASE_URL}")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
