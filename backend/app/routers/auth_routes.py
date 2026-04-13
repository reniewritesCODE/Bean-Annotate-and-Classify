# backend/app/routers/auth_routes.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from datetime import timedelta
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.schemas import UserCreate, UserResponse, LoginResponse
from typing import List
from app.auth import verify_password, get_password_hash, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES, Token, require_role, get_current_user, TokenData

router = APIRouter(prefix="/api/auth", tags=["auth"])

# --- Mock Database for Example Purposes ---
# In a real app, this comes from your database (PostgreSQL, MongoDB, etc.)
@router.post("/register", response_model=UserResponse)
async def register(user_in: UserCreate, db: Session = Depends(get_db)):
    # 1. Check if user already exists
    user = db.query(User).filter(
        (User.username == user_in.username) | (User.email == user_in.email)
    ).first()
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this username or email already exists",
        )
    
    # 2. Check if this is the first user (to make them admin)
    user_count = db.query(User).count()
    role = "admin" if user_count == 0 else "annotator"
    
    # 3. Create new user
    new_user = User(
        username=user_in.username,
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        role=role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user
# ------------------------------------------

@router.post("/login", response_model=LoginResponse)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), 
    db: Session = Depends(get_db)
):
    # 1. Fetch user from database
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 2. Verify password
    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 3. Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role},
        expires_delta=access_token_expires
    )
    
    # 4. Return token and user info
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get currently logged in user info from token."""
    return current_user

@router.get("/users", response_model=List[UserResponse])
async def list_users(
    db: Session = Depends(get_db),
    admin_user: TokenData = Depends(require_role("admin"))
):
    """List all registered users. Admin only."""
    return db.query(User).all()

@router.delete("/users/{username}")
async def delete_user(
    username: str,
    db: Session = Depends(get_db),
    admin_user: TokenData = Depends(require_role("admin"))
):
    """Delete a user by username. Admin only. Cannot delete self."""
    # 1. Prevent self-deletion
    if admin_user.username == username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account."
        )
    
    # 2. Fetch user
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User '{username}' not found."
        )
    
    # 3. Delete
    db.delete(user)
    db.commit()
    
    return {"status": "success", "message": f"User '{username}' deleted successfully."}
