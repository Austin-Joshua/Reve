"""
Reve Platform — Ephemeral GPU Worker Client
Runs on Kaggle (Free 2x T4 GPU) or Google Colab (Free T4 GPU).

Outbound Polling Architecture:
- No inbound HTTP ports or brittle reverse proxies (ngrok) required.
- Initiates outbound requests to the Reve backend.
- Communicates using strictly typed payloads and authenticated via X-Worker-Token header.
"""

import os
import sys
import time
import base64
import io
import logging
from typing import Optional, Dict, Any, Tuple

try:
    import requests
except ImportError:
    requests = None

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] [Reve Worker] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("reve_worker")


def get_secret_or_env(key: str) -> Optional[str]:
    """
    Attempts to read secret from Kaggle Secrets (kaggle_secrets),
    Google Colab (google.colab.userdata), or system environment variables.
    """
    # 1. Kaggle Secrets
    try:
        from kaggle_secrets import UserSecretsClient
        val = UserSecretsClient().get_secret(key)
        if val:
            return str(val).strip()
    except Exception:
        pass

    # 2. Google Colab userdata
    try:
        from google.colab import userdata
        val = userdata.get(key)
        if val:
            return str(val).strip()
    except Exception:
        pass

    # 3. Standard Environment Variables
    val = os.environ.get(key)
    if val:
        return val.strip()

    return None


def resolve_worker_token() -> str:
    """
    Resolves the shared authentication token for remote worker endpoints.
    Token Precedence:
    1. REVE_WORKER_TOKEN (Kaggle secrets / worker convention)
    2. REVE_WORKER_SECRET_TOKEN (Render backend / server convention)
    3. Fallback to development token ONLY when connected to localhost/testserver
       or when ALLOW_DEV_TOKEN=true is explicitly set.
    """
    token = get_secret_or_env("REVE_WORKER_TOKEN") or get_secret_or_env("REVE_WORKER_SECRET_TOKEN")
    if token:
        return token

    # Check if dev fallback is explicitly permitted
    backend_url = resolve_backend_url()
    is_local = any(h in backend_url.lower() for h in ["localhost", "127.0.0.1", "testserver"])
    allow_dev = os.environ.get("ALLOW_DEV_TOKEN", "false").lower() == "true"

    if is_local or allow_dev:
        logger.warning("No worker token configured. Using insecure development default token.")
        return "dev-reve-remote-worker-secret-token"

    raise RuntimeError(
        "Missing worker token: Please configure REVE_WORKER_TOKEN or REVE_WORKER_SECRET_TOKEN "
        "in your Kaggle Secrets or environment variables before running the worker."
    )


def resolve_backend_url() -> str:
    """
    Resolves and normalizes the Reve backend root URL.
    Strips trailing slashes and any trailing '/api/v1' suffix to ensure
    consistent endpoint construction.
    """
    raw = get_secret_or_env("REVE_BACKEND_URL") or "http://localhost:8000"
    cleaned = raw.strip().rstrip("/")
    if cleaned.endswith("/api/v1"):
        cleaned = cleaned[:-len("/api/v1")]
    return cleaned.rstrip("/")


class ReveKaggleWorker:
    def __init__(
        self,
        backend_url: Optional[str] = None,
        worker_token: Optional[str] = None,
        worker_id: Optional[str] = None,
        model_id: str = "runwayml/stable-diffusion-v1-5",
    ):
        self.backend_url = backend_url or resolve_backend_url()
        self.worker_token = worker_token or resolve_worker_token()
        self.worker_id = worker_id or f"gpu-worker-{os.getpid()}"
        self.model_id = model_id
        self.headers = {
            "X-Worker-Token": self.worker_token,
            "Content-Type": "application/json",
        }
        self.pipeline = None
        self.img2img_pipe = None
        self.last_heartbeat = 0.0

    def init_hardware_and_models(self):
        """Initializes CUDA hardware and loads Stable Diffusion pipelines."""
        import torch

        if not torch.cuda.is_available():
            raise RuntimeError("CUDA GPU acceleration is required. Enable GPU in Kaggle Notebook settings.")

        gpu_name = torch.cuda.get_device_name(0)
        vram_total = torch.cuda.get_device_properties(0).total_memory / (1024**3)
        logger.info(f"Initialized GPU: {gpu_name} ({vram_total:.1f} GB VRAM)")

        from diffusers import StableDiffusionPipeline, StableDiffusionImg2ImgPipeline

        logger.info(f"Loading diffusion model: {self.model_id} ...")
        self.pipeline = StableDiffusionPipeline.from_pretrained(
            self.model_id,
            torch_dtype=torch.float16,
            safety_checker=None,
        ).to("cuda")
        self.pipeline.enable_attention_slicing()

        # Share components with Img2Img pipeline to preserve VRAM
        self.img2img_pipe = StableDiffusionImg2ImgPipeline(**self.pipeline.components)
        logger.info("Text-to-Image and Image-to-Image pipelines ready.")

    def send_heartbeat(self) -> bool:
        """Sends telemetry heartbeat to backend."""
        import torch

        vram_total = torch.cuda.get_device_properties(0).total_memory / (1024**3) if torch.cuda.is_available() else 0.0
        vram_free = (
            (torch.cuda.get_device_properties(0).total_memory - torch.cuda.memory_allocated(0)) / (1024**3)
            if torch.cuda.is_available()
            else 0.0
        )
        gpu_name = torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU"

        payload = {
            "worker_id": self.worker_id,
            "environment": "colab" if "COLAB_GPU" in os.environ else "kaggle",
            "gpu_name": gpu_name,
            "vram_total_gb": round(vram_total, 2),
            "vram_free_gb": round(vram_free, 2),
            "cuda_version": torch.version.cuda or "unknown",
            "torch_version": torch.__version__,
            "loaded_models": [self.model_id, "SD-1.5"],
        }
        url = f"{self.backend_url}/api/v1/internal/worker/heartbeat"
        try:
            res = requests.post(url, json=payload, headers=self.headers, timeout=5)
            if res.status_code == 200:
                self.last_heartbeat = time.time()
                return True
            else:
                logger.warning(f"Heartbeat rejected: HTTP {res.status_code} - {res.text}")
                return False
        except Exception as e:
            logger.warning(f"Heartbeat connection failed: {e}")
            return False

    def poll_for_job(self) -> Optional[Dict[str, Any]]:
        """Polls backend queue for the oldest pending generation job."""
        url = f"{self.backend_url}/api/v1/internal/worker/jobs/poll"
        try:
            res = requests.get(url, headers=self.headers, timeout=10)
            if res.status_code == 200:
                return res.json()
            elif res.status_code == 204:
                return None  # No jobs pending
            else:
                logger.warning(f"Poll unexpected response: HTTP {res.status_code}")
                return None
        except Exception as e:
            logger.warning(f"Poll request failed: {e}")
            return None

    def execute_job(self, job: Dict[str, Any]):
        """Executes one inference task and reports results or failure."""
        import torch
        from PIL import Image

        job_id = job["job_id"]
        prompt = job["prompt"]
        operation = job.get("operation", "text_to_image")
        logger.info(f"Processing {operation} job {job_id}: '{prompt[:50]}...'")

        # Determine seed
        raw_seed = job.get("seed")
        actual_seed = raw_seed if raw_seed is not None else int(torch.randint(0, 2147483647, (1,)).item())
        generator = torch.Generator("cuda").manual_seed(actual_seed)

        t0 = time.time()
        try:
            with torch.inference_mode():
                if operation == "image_to_image" and job.get("source_image_base64"):
                    raw_source = base64.b64decode(job["source_image_base64"])
                    init_image = Image.open(io.BytesIO(raw_source)).convert("RGB").resize(
                        (job.get("width", 512), job.get("height", 512))
                    )
                    out = self.img2img_pipe(
                        prompt=prompt,
                        image=init_image,
                        strength=job.get("strength", 0.75),
                        negative_prompt=job.get("negative_prompt"),
                        num_inference_steps=job.get("steps", 25),
                        guidance_scale=job.get("cfg_scale", 7.0),
                        generator=generator,
                    )
                else:
                    out = self.pipeline(
                        prompt=prompt,
                        negative_prompt=job.get("negative_prompt"),
                        num_inference_steps=job.get("steps", 25),
                        guidance_scale=job.get("cfg_scale", 7.0),
                        width=job.get("width", 512),
                        height=job.get("height", 512),
                        generator=generator,
                    )

            gen_image = out.images[0]
            elapsed = time.time() - t0

            # Encode to PNG base64
            buf = io.BytesIO()
            gen_image.save(buf, format="PNG")
            img_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

            complete_payload = {
                "job_id": job_id,
                "status": "SUCCESS",
                "images_base64": [img_b64],
                "seed": actual_seed,
                "model_id": job.get("model_id", "SD-1.5"),
                "execution_time_seconds": round(elapsed, 2),
            }

            comp_res = requests.post(
                f"{self.backend_url}/api/v1/internal/worker/jobs/{job_id}/complete",
                json=complete_payload,
                headers=self.headers,
                timeout=30,
            )
            if comp_res.status_code == 200:
                logger.info(f"Job {job_id} successfully completed in {elapsed:.2f}s.")
            elif comp_res.status_code == 404:
                logger.warning(f"Job {job_id} was already cancelled or expired on backend (HTTP 404).")
            else:
                logger.error(f"Job completion submission rejected: HTTP {comp_res.status_code} - {comp_res.text}")

        except Exception as err:
            logger.error(f"Job {job_id} execution failed: {err}")
            if "out of memory" in str(err).lower():
                torch.cuda.empty_cache()

            # Submit failure to unblock user credits
            try:
                requests.post(
                    f"{self.backend_url}/api/v1/internal/worker/jobs/{job_id}/fail",
                    json={"error_message": str(err)[:1024]},
                    headers=self.headers,
                    timeout=10,
                )
                logger.info(f"Reported failure for job {job_id} to backend.")
            except Exception as post_err:
                logger.error(f"Failed to post failure for job {job_id}: {post_err}")

    def run(self, poll_interval: float = 2.0):
        """Main worker loop."""
        logger.info(f"Connecting to backend: {self.backend_url}")
        self.init_hardware_and_models()

        # Initial heartbeat
        self.send_heartbeat()
        logger.info("Entering job polling loop. Waiting for generation requests...")

        while True:
            now = time.time()
            if now - self.last_heartbeat >= 15.0:
                self.send_heartbeat()

            job = self.poll_for_job()
            if job:
                self.execute_job(job)
            else:
                time.sleep(poll_interval)


def main():
    try:
        worker = ReveKaggleWorker()
        worker.run()
    except KeyboardInterrupt:
        logger.info("Worker stopped by user.")
    except Exception as e:
        logger.critical(f"Worker startup failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
