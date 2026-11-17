# Zero-Cost GPU Experiment Plan

## 1. Overview & Architectural Philosophy

The **Reve Platform** enforces a strict **₹0-First Policy**:
- No paid cloud GPU rentals (AWS EC2, Lambda, RunPod).
- No paid SaaS inference APIs (Replicate, Midjourney, Fal.ai).
- No hardcoded reliance on brittle, temporary notebook URLs (ngrok, localtunnel).
- Full separation between API control plane (local host) and ephemeral compute plane (free cloud notebooks).

This plan outlines the architecture, security protocol, worker script, and verification procedure for connecting **Google Colab** (Free NVIDIA Tesla T4 with ~15 GB VRAM) or **Kaggle** (Free 2x Tesla T4 16 GB, 30 hours/week) as an on-demand, zero-cost inference worker.

---

## 2. Remote Worker Architecture: Outbound Polling Model

Traditional hobbyist setups often expose a notebook server via a temporary reverse proxy (such as ngrok or trycloudflare), pointing the backend at an ephemeral `https://xxxx.ngrok-free.app` URL.

### Why Inbound Tunneling is Prohibited:
1. **Brittle Production Dependencies:** Free ngrok / cloudflare tunnels expire every few hours, require manual URL updates in backend `.env`, and fail unpredictably.
2. **Security Vulnerabilities:** Exposing an open inbound HTTP port on a notebook without strict mTLS or API gateway layers creates security holes.
3. **Session Interruption:** If a notebook resets, the backend retains dead URLs and returns 502/504 errors to users.

### The Outbound Polling Worker Solution:
Instead of the backend calling into the notebook, **the remote notebook worker initiates outbound HTTPS requests to the Reve backend**.

```
┌────────────────────────────────────────────────────────┐
│                   Reve Host Machine                    │
│                                                        │
│  ┌────────────────┐     Internal API     ┌───────────┐ │
│  │ FastAPI Server │ ◄── [X-Worker-Token] ┤ DB / S3   │ │
│  └───────▲────────┘                      └───────────┘ │
└──────────┼─────────────────────────────────────────────┘
           │
           │ Outbound HTTPS Requests (No Inbound Ports Needed)
           │ 1. POST /api/v1/internal/worker/heartbeat
           │ 2. GET  /api/v1/internal/worker/jobs/poll
           │ 3. POST /api/v1/internal/worker/jobs/{id}/complete
           ▼
┌────────────────────────────────────────────────────────┐
│         Free Cloud GPU Notebook (Colab / Kaggle)        │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │ Python Worker Client (diffusers + PyTorch)       │  │
│  │ GPU: NVIDIA Tesla T4 (15–16 GB VRAM)             │  │
│  │ Models Cached: SD-1.5 / FLUX.1-schnell (FP8)     │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

---

## 3. Worker Protocol & Security Specification

### 3.1 Authentication
- Every worker request must include an `X-Worker-Token` header.
- The token is defined in the host `.env` as `REVE_WORKER_SECRET_TOKEN` and configured in the notebook environment secrets (`userdata.get('REVE_WORKER_TOKEN')` in Colab, or Kaggle Secrets).
- No user tokens, database credentials, or S3 root keys are ever sent to the notebook.

### 3.2 Heartbeat & Lifecycle Contract
- The worker emits a heartbeat every **15 seconds** to `POST /api/v1/internal/worker/heartbeat`:
  ```json
  {
    "worker_id": "colab-worker-01",
    "environment": "colab",
    "gpu_name": "NVIDIA Tesla T4",
    "vram_total_gb": 15.0,
    "vram_free_gb": 14.1,
    "cuda_version": "12.2",
    "torch_version": "2.3.1",
    "loaded_models": ["runwayml/stable-diffusion-v1-5"]
  }
  ```
- **Heartbeat TTL:** 45 seconds. If no heartbeat arrives within 45s, `RemoteWorkerProvider` marks the worker `OFFLINE`.
- **Preflight Check:** Any incoming generation request immediately checks `preflight_check()`. If `worker == None`, the job is refused before deducting user credits with status `REMOTE_WORKER_OFFLINE`.

### 3.3 Job Execution Flow
1. **Poll:** Worker requests `GET /api/v1/internal/worker/jobs/poll`.
2. **Dispatch:** Backend returns the oldest `QUEUED` job matching the worker's cached models and transitions job status to `PROCESSING`.
3. **Inference:** Worker runs diffusion synthesis on the GPU.
4. **Validation:** Worker encodes generated PNG image bytes into base64 and posts to `POST /api/v1/internal/worker/jobs/{id}/complete`.
5. **Ingestion:** Backend verifies that image bytes are valid PNG/JPEG headers, stores the file in MinIO or local storage fallback, generates thumbnails, updates `GeneratedImage` entities, and marks job `COMPLETED`.
6. **Failure Recovery:** If the worker crashes or model throws CUDA OOM, worker sends `POST /api/v1/internal/worker/jobs/{id}/fail`, and backend automatically refunds reserved user credits via `_fail_job_and_refund`.

---

## 4. Colab / Kaggle Worker Implementation Script

The following standalone script can be executed directly inside a Google Colab or Kaggle Notebook session:

```python
"""
Reve Platform — Ephemeral GPU Worker Client
Runs on Google Colab or Kaggle with Free T4 GPU.
"""

import os
import sys
import time
import base64
import io
import requests
import torch
from PIL import Image

# 1. Environment Configuration
BACKEND_URL = os.environ.get("REVE_BACKEND_URL", "https://your-reve-host.example.com")
WORKER_TOKEN = os.environ.get("REVE_WORKER_TOKEN", "dev-reve-remote-worker-secret-token")
WORKER_ID = f"gpu-worker-{os.getpid()}"
HEADERS = {"X-Worker-Token": WORKER_TOKEN, "Content-Type": "application/json"}

# 2. Hardware Inspection
assert torch.cuda.is_available(), "CUDA GPU is required! Enable GPU acceleration in Notebook settings."
gpu_name = torch.cuda.get_device_name(0)
vram_total = torch.cuda.get_device_properties(0).total_memory / (1024**3)
print(f"[Worker] Initialized on GPU: {gpu_name} ({vram_total:.1f} GB VRAM)")

# 3. Model Pipeline Initialization (Baseline: SD-1.5 / Schnell)
from diffusers import StableDiffusionPipeline, FluxPipeline

print("[Worker] Loading baseline model: runwayml/stable-diffusion-v1-5 ...")
pipeline = StableDiffusionPipeline.from_pretrained(
    "runwayml/stable-diffusion-v1-5",
    torch_dtype=torch.float16,
    safety_checker=None,
).to("cuda")
pipeline.enable_attention_slicing()
loaded_models = ["runwayml/stable-diffusion-v1-5", "SD-1.5"]
print("[Worker] Model ready.")

# 4. Main Polling Loop
def send_heartbeat():
    free_vram = (torch.cuda.get_device_properties(0).total_memory - torch.cuda.memory_allocated(0)) / (1024**3)
    payload = {
        "worker_id": WORKER_ID,
        "environment": "colab" if "COLAB_GPU" in os.environ else "kaggle",
        "gpu_name": gpu_name,
        "vram_total_gb": round(vram_total, 2),
        "vram_free_gb": round(free_vram, 2),
        "cuda_version": torch.version.cuda or "unknown",
        "torch_version": torch.__version__,
        "loaded_models": loaded_models,
    }
    try:
        requests.post(f"{BACKEND_URL}/api/v1/internal/worker/heartbeat", json=payload, headers=HEADERS, timeout=5)
    except Exception as e:
        print(f"[Worker] Heartbeat failed: {e}")

last_heartbeat = 0
print("[Worker] Entering polling loop. Waiting for inference jobs...")

while True:
    now = time.time()
    if now - last_heartbeat >= 15:
        send_heartbeat()
        last_heartbeat = now

    try:
        resp = requests.get(f"{BACKEND_URL}/api/v1/internal/worker/jobs/poll", headers=HEADERS, timeout=10)
        if resp.status_code == 200 and resp.json():
            job = resp.json()
            job_id = job["job_id"]
            prompt = job["prompt"]
            print(f"[Worker] Executing job {job_id}: '{prompt[:40]}...'")

            t0 = time.time()
            with torch.inference_mode():
                out = pipeline(
                    prompt=prompt,
                    negative_prompt=job.get("negative_prompt"),
                    num_inference_steps=job.get("steps", 25),
                    guidance_scale=job.get("cfg_scale", 7.0),
                    width=job.get("width", 512),
                    height=job.get("height", 512),
                )
            gen_image = out.images[0]
            elapsed = time.time() - t0

            # Encode image to PNG base64
            buf = io.BytesIO()
            gen_image.save(buf, format="PNG")
            img_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")

            # Submit completed job
            complete_payload = {
                "job_id": job_id,
                "status": "SUCCESS",
                "images_base64": [img_b64],
                "seed": job.get("seed", 42),
                "model_id": job.get("model_id", "SD-1.5"),
                "execution_time_seconds": round(elapsed, 2),
            }
            requests.post(
                f"{BACKEND_URL}/api/v1/internal/worker/jobs/{job_id}/complete",
                json=complete_payload,
                headers=HEADERS,
                timeout=30,
            )
            print(f"[Worker] Job {job_id} completed in {elapsed:.2f}s.")
    except Exception as err:
        print(f"[Worker] Polling loop error: {err}")

    time.sleep(2)
```

---

## 5. Candidate Model Roadmap for GPU Experiments

| Stage | Model Candidate | Reason & Verification Criteria |
| :--- | :--- | :--- |
| **Step 1 (First Live Baseline)** | **Stable Diffusion 1.5** | 2.13 GB download; fits effortlessly in 15 GB VRAM; proves pipeline from user prompt to image raster display in <5 seconds. |
| **Step 2 (Commercial High-Res)** | **SDXL 1.0 Base (FP16)** | 6.94 GB download; native 1024x1024 output; tests memory management and VAE tiling under 15 GB VRAM constraint. |
| **Step 3 (Next-Gen Flow Matching)** | **FLUX.1-schnell (FP8)** | 11.9 GB download; Apache 2.0 commercial license; 4 inference steps; verifies cutting-edge diffusion architecture on free hardware. |

---

## 6. Acceptance Criteria for Phase 1.1 GPU Readiness

The remote worker integration is considered verified when:
1. `RemoteWorkerProvider` conforms to the `BaseImageProvider` interface and passes all unit tests.
2. In the absence of an active remote worker, `preflight_check()` returns `can_run=False` with status `REMOTE_WORKER_OFFLINE`, preventing credit loss.
3. Upon receiving a valid `WorkerHeartbeat`, the provider dynamically updates its health status to `HEALTHY` and populates GPU telemetry.
4. If the active worker's free VRAM is lower than the model's required VRAM, `preflight_check()` returns `HARDWARE_INSUFFICIENT_VRAM`.
5. Received image payloads are decoded, validated via Pillow, and stored in the storage backend without schema degradation.
