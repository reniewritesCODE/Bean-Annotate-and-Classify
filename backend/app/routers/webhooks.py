# backend/app/routers/webhooks.py
from fastapi import APIRouter, Request, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Image, Annotation
import uuid
from datetime import datetime

router = APIRouter()

# Temporary mapping (we'll improve this later)
CLASS_NAME_TO_ID = {
    "Full Black": 0, "Full Sour": 1, "Full Cherry/Pod": 2, "Fungus Damage": 3,
    "Severe Insect Damage": 4, "Foreign Matter": 5, "Partial Black": 6,
    "Partial Sour": 7, "Hull/Husk": 8, "Parchment/Pergamino": 9,
    "Slight Insect Damage": 10, "Floater": 11, "Immature/Unripe": 12,
    "Withered": 13, "Shell": 14, "Broken/Chipped/Cut": 15,
}


@router.post("/webhooks/label-studio")
async def label_studio_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.json()

    if payload.get("action") != "ANNOTATION_CREATED":
        return {"status": "ignored"}

    task = payload["task"]
    annotation_data = payload["annotation"]

    image_id = task["data"].get("image_id")
    if not image_id:
        return {"status": "error", "message": "No image_id found"}

    # Clear old annotations
    db.query(Annotation).filter_by(image_id=image_id).delete()

    for result in annotation_data.get("result", []):
        value = result["value"]
        label = value["rectanglelabels"][0]
        class_id = CLASS_NAME_TO_ID.get(label, 0)

        x = value["x"] / 100
        y = value["y"] / 100
        w = value["width"] / 100
        h = value["height"] / 100

        ann = Annotation(
            id=str(uuid.uuid4()),
            image_id=image_id,
            class_id=class_id,
            x_center=x + w / 2,
            y_center=y + h / 2,
            width=w,
            height=h,
            source="human",
        )
        db.add(ann)

    db.query(Image).filter_by(id=image_id).update({"status": "done"})
    db.commit()

    return {"status": "ok"}