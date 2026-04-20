#!/usr/bin/env python3
"""
Seed script to create an initial admin user.
Run this inside the Docker container.
"""
import os
import sys
sys.path.append('/app')

from app.database import SessionLocal
from app.models import User
from app.auth import get_password_hash

def seed_admin_user():
    db = SessionLocal()
    try:
        # Check if any users exist
        user_count = db.query(User).count()
        if user_count > 0:
            print("Users already exist. Skipping seeding.")
            return

        # Create admin user
        admin_user = User(
            username="admin",
            email="admin@example.com",
            hashed_password=get_password_hash("admin123"),
            role="admin"
        )
        db.add(admin_user)
        db.commit()
        print("✅ Admin user created!")
        print("Username: admin")
        print("Password: admin123")
        print("Role: admin")

    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_admin_user()