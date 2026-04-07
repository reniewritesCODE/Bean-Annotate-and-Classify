from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.config import settings

SECRET_KEY = settings.SECRET_KEY
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_DAYS = settings.REFRESH_TOKEN_EXPIRE_DAYS

ALGORITHM = "HS256"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")       # Initializes bcrypt for secure password hashing
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")        # FastAPI's OAuth2 helper that automatically extracts bearer token from Authorization header in requests.

# Takes plain text password, returns bcrypt hash. Used when users register or change their password.
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

# Compares plain text password against stored hash. Used during login to verify credentials.
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

# Creates a short-lived JWT access token. Include user info in data dict. Used for authenticating API requests.
def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    to_encode["exp"] = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode["type"] = "access"
    token = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return token if isinstance(token, str) else token.decode("utf-8")

# Creates a long-lived JWT refresh token. Include user info in data dict. Used for obtaining new access tokens.
def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    to_encode["exp"] = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    to_encode["type"] = "refresh"
    token = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return token if isinstance(token, str) else token.decode("utf-8")

# Decodes and validates JWT. Returns the payload (data inside token) or raises 401 error if token is invalid/expired. Used in get_current_user dependency to authenticate requests.
def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

# Dependency function that can be added to any route to require authentication. It extracts the token from the request, decodes it, and returns the user info from the token payload. If the token is invalid or expired, it raises a 401 error.
def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = decode_access_token(token)  # already raises 401 if invalid
    if payload.get("type") != "access":
        raise HTTPException(status_code=401, detail="Access token required")
    return payload

def require_roles(*allowed_roles):
    def checker(current_user: dict = Depends(get_current_user)):
        role = current_user.get("role")
        if role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{role}' is not allowed to access this resource"
            )
        return current_user
    return checker
