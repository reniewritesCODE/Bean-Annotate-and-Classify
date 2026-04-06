# app/config.py
from pydantic_settings import BaseSettings  

class Settings(BaseSettings):
    SECRET_KEY: str
    DATABASE_URL: str
    REDIS_HOST: str = "redis"
    REDIS_PORT: int = 6379
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    DEV_MODE: bool = False
    class Config:
        env_file = ".env"

settings = Settings()