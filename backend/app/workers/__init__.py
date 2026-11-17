from app.workers.celery_app import celery_app
from app.workers.tasks import (
    generate_image_task,
    inpaint_image_task,
    segment_image_task,
)

__all__ = [
    "celery_app",
    "generate_image_task",
    "inpaint_image_task",
    "segment_image_task",
]
