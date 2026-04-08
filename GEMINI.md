# BeanScan: Robusta Coffee Bean Defect Classification Platform

BeanScan is a full-stack machine learning platform designed for the detection and classification of defects in Robusta coffee beans using YOLOv8. It provides a complete workflow from image upload and annotation to model training and deployment.

## Project Overview

*   **Goal:** Automate the identification of defects in coffee beans to improve quality control.
*   **Architecture:** A containerized microservices-style architecture featuring:
    *   **Backend:** FastAPI (Python) for the core API and business logic.
    *   **Frontend:** Next.js (TypeScript) with Tailwind CSS and Shadcn UI.
    *   **Inference:** Integrated YOLOv8 for bean detection and defect classification.
    *   **Storage:** MinIO (S3-compatible) for image and model artifact storage.
    *   **Database:** PostgreSQL for metadata, annotations, and project management.
    *   **Task Queue:** Celery with Redis for long-running training and inference jobs.
    *   **Labeling:** Integration with Label Studio for managed annotation workflows.

## Tech Stack

### Backend (`/backend`)
*   **Framework:** FastAPI
*   **ORM:** SQLAlchemy (PostgreSQL)
*   **Migrations:** Alembic
*   **Task Queue:** Celery + Redis
*   **ML:** YOLOv8 (Ultralytics)
*   **Storage:** Boto3 (MinIO)
*   **Auth:** JWT-based authentication

### Frontend (`/frontend`)
*   **Framework:** Next.js (React 19, TypeScript)
*   **Styling:** Tailwind CSS + Shadcn UI
*   **Icons:** Lucide-React
*   **State Management:** React Context API (`AuthContext`, `AppContext`)

### Infrastructure (`/infra`)
*   **Orchestration:** Docker Compose
*   **Services:** PostgreSQL, Redis, MinIO, Label Studio, pgAdmin

## Building and Running

### Prerequisites
*   Docker & Docker Desktop
*   Node.js (for local frontend development)
*   Python 3.11 (for local backend development)

### Local Development Setup (Recommended)

1.  **Environment Variables:**
    Copy `.env.example` to `.env` in the root directory and configure as needed.
    ```bash
    cp .env.example .env
    ```

2.  **Start Services:**
    Use Docker Compose to start the entire stack.
    ```bash
    cd infra
    docker compose up -d
    ```

3.  **Seed Base Model:**
    Initialize the system with the base YOLO model.
    ```bash
    docker compose exec api python /app/scripts/seed_base_model.py
    ```

### Key Commands

*   **Start Backend (Dev):** `uvicorn app.main:app --reload` (inside `backend/`)
*   **Start Frontend (Dev):** `npm run dev` (inside `frontend/`)
*   **Run Migrations:** `alembic upgrade head` (inside `backend/`)
*   **Check API Health:** `curl http://localhost:8000/health`

## Development Conventions

*   **API Design:** RESTful endpoints organized by domain (auth, images, annotations, models, training).
*   **Authentication:** JWT tokens stored in `localStorage`. Include `Authorization: Bearer <token>` in API requests.
*   **Component Library:** Use Shadcn UI primitives for consistent styling.
*   **Type Safety:** Strict TypeScript in the frontend and Pydantic models for request/response validation in the backend.
*   **Mocking:** The current `auth_routes.py` uses a mock user database; replace with SQLAlchemy lookups in production.

## Project Structure

```bash
BeanScan/
├── backend/           # FastAPI application (Models, Routers, Worker)
├── frontend/          # Next.js Application (App Router, Components, Views)
├── infra/             # Docker Compose configurations
├── models/base/       # Pre-trained YOLOv8 weights (.pt files)
├── ml/                # Training scripts and local experiments
└── scripts/           # Utility and seeding scripts
```
