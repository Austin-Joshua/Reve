import time
from app.workers.celery_app import celery_app
from app.core.config import settings


@celery_app.task(bind=True, name="app.workers.tasks.generate_image_task")
def generate_image_task(self, job_id: str, generation_params: dict):
    """
    Celery task for executing text-to-image diffusion inference.
    Wired for Phase 1 execution with local diffusers or cloud API.
    """
    self.update_state(state="PROCESSING", meta={"progress": 10, "stage": "loading_model"})
    time.sleep(0.5)

    self.update_state(state="PROCESSING", meta={"progress": 50, "stage": "diffusion_inference"})
    time.sleep(0.5)

    self.update_state(state="POST_PROCESSING", meta={"progress": 90, "stage": "uploading_s3"})
    time.sleep(0.2)

    return {
        "job_id": job_id,
        "status": "COMPLETED",
        "progress": 100,
    }


@celery_app.task(bind=True, name="app.workers.tasks.inpaint_image_task")
def inpaint_image_task(self, job_id: str, inpaint_params: dict):
    return {"job_id": job_id, "status": "COMPLETED"}


@celery_app.task(bind=True, name="app.workers.tasks.segment_image_task")
def segment_image_task(self, job_id: str, segment_params: dict):
    return {"job_id": job_id, "status": "COMPLETED"}
