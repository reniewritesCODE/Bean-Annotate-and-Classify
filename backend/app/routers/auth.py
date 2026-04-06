from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone, timedelta
from app.config import settings
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.schemas import TokenPair, RefreshRequest, UserPublic, UserCreate
from app.auth import create_access_token, create_refresh_token, get_current_user, verify_password, hash_password, decode_access_token
from app.database import get_db
from app.models import User, RefreshToken

router = APIRouter(prefix="/api/auth", tags=["Auth"])

@router.post("/login", response_model=TokenPair)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):

    # Fetch user by email
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not user.is_active:
        raise HTTPException(status_code=401, detail="Account is disabled")

    # Prepare token data
    token_data = {"sub": str(user.id), "role": user.role}

    # Create access and refresh tokens
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    # Save refresh token in DB
    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    db_refresh_token = RefreshToken(
        user_id=user.id,
        token=refresh_token,
        expires_at=expires_at,
        is_revoked=False
    )
    db.add(db_refresh_token)
    db.commit()

    # Return token pair
    return TokenPair(
        access_token=access_token,
        refresh_token=refresh_token
    )

@router.post("/register", response_model=UserPublic)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = User(
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        role="trainer",
        is_active=True
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return UserPublic(
        email=new_user.email,
        role=new_user.role
    )

@router.post("/refresh", response_model=TokenPair)
def refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    # Decode and validate the refresh token (raises if expired/invalid)
    try:
        payload = decode_access_token(body.refresh_token)
    except HTTPException:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    db_token = db.query(RefreshToken).filter(RefreshToken.token == body.refresh_token).first()

    # Validate token
    if not db_token:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
    if db_token.is_revoked:
        raise HTTPException(status_code=401, detail="Refresh token has been revoked")
    if db_token.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Refresh token has expired")

    # Fetch the user
    user = db.query(User).filter(User.id == db_token.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Rotate refresh token: revoke old token and create a new one
    db_token.is_revoked = True  # Revoke old token

    token_data = {"sub": str(user.id), "role": user.role}
    new_access_token = create_access_token(token_data)
    new_refresh_token = create_refresh_token(token_data)

    expires_at = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    new_db_token = RefreshToken(
        user_id=user.id,
        token=new_refresh_token,
        expires_at=expires_at,
        is_revoked=False
    )
    db.add(new_db_token)
    db.commit()

    # Return new tokens
    return TokenPair(
        access_token=new_access_token,
        refresh_token=new_refresh_token
    )

@router.post("/logout", status_code=204)
def logout(body: RefreshRequest, db: Session = Depends(get_db), current_user: dict = Depends(get_current_user)):
    db_token = db.query(RefreshToken).filter(RefreshToken.token == body.refresh_token).first()
    if db_token and str(db_token.user_id) == str(current_user.get("sub")):
        db_token.is_revoked = True
        db.commit()
    return None

@router.get("/me", response_model=UserPublic)
def me(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == current_user.get("sub")).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserPublic(
        email=user.email,
        role=user.role
    )
