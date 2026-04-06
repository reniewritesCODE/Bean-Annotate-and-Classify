# backend/app/routers/auth_routes.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from app.auth import verify_password, create_access_token, get_password_hash, ACCESS_TOKEN_EXPIRE_MINUTES, Token
from datetime import timedelta

router = APIRouter(prefix="/api/auth", tags=["auth"])

# --- Mock Database for Example Purposes ---
# In a real app, this comes from your database (PostgreSQL, MongoDB, etc.)
fake_users_db = {
    "admin_user": {
        "username": "admin_user",
        "email": "admin@example.com",
        "hashed_password": get_password_hash("admin123"), # In real DB, store only the hash
        "role": "admin",
    },
    "annotator_user": {
        "username": "annotator_user",
        "email": "annotator@example.com",
        "hashed_password": get_password_hash("annotator123"),
        "role": "annotator",
    }
}
# ------------------------------------------

@router.post("/login", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    # 1. Fetch user from database
    user_dict = fake_users_db.get(form_data.username)
    if not user_dict:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 2. Verify password
    if not verify_password(form_data.password, user_dict["hashed_password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 3. Create access token containing the username and their role
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_dict["username"], "role": user_dict["role"]},
        expires_delta=access_token_expires
    )
    
    # 4. Return token to frontend
    return {"access_token": access_token, "token_type": "bearer"}
