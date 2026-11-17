# Technical Requirements Document (TRD)
## Reve-Inspired AI Image Generation & Visual Editing Platform

**Version:** 1.0  
**Status:** Draft  
**Last Updated:** 2026-11-17  
**Author:** Senior Technical Architect

---

## Table of Contents

1. [Technology Stack Overview](#1-technology-stack-overview)
2. [Framework Decisions](#2-framework-decisions)
3. [AI Model Requirements](#3-ai-model-requirements)
4. [Hardware Requirements](#4-hardware-requirements)
5. [Runtime Requirements](#5-runtime-requirements)
6. [Dependencies](#6-dependencies)
7. [Database Requirements](#7-database-requirements)
8. [Storage Requirements](#8-storage-requirements)
9. [Security Requirements](#9-security-requirements)
10. [Deployment Requirements](#10-deployment-requirements)
11. [Performance Targets](#11-performance-targets)
12. [Monitoring and Observability](#12-monitoring-and-observability)

---

## 1. Technology Stack Overview

> [!IMPORTANT]
> **Pixel-space diffusion inference is a first-class requirement, not an optional feature.** Every generation pipeline — text-to-image, image-to-image, inpainting, outpainting — MUST route through a real diffusion model. Scene-graph rendering or placeholder images are explicitly forbidden as substitutes.

### 1.1 Frontend Stack

| Component | Technology | Version Target | Rationale |
|---|---|---|---|
| UI Framework | React | 18.3+ | Concurrent rendering, Suspense for async image loads, massive ecosystem |
| Language | TypeScript | 5.4+ | Type safety across canvas layer types, API contracts, and state shapes |
| Build Tool | Vite | 5.3+ | Native ESM, HMR in <100ms vs CRA/Webpack minutes; critical for canvas-heavy dev loop |
| Styling | Tailwind CSS | 3.4+ | Utility-first; avoids CSS specificity wars in complex editor UI |
| Animations | Framer Motion | 11.x | Declarative animation API, layout animations for layer panel reordering |
| State Management | Zustand | 4.5+ | Minimal boilerplate for editor state (layers, selections, history); no Redux overhead |
| Canvas Engine | Konva.js / react-konva | 9.x | First-class layer model, hit detection, transformer handles — superior to raw Fabric.js for structured layer editing |
| Server State | TanStack Query (React Query) | 5.x | Caching, background refetch, optimistic updates for generation jobs |
| HTTP Client | Axios | 1.7+ | Interceptors for auth token injection and global error handling |
| Real-time Updates | Native `EventSource` (SSE) | Browser API | Server-Sent Events for job progress; falls back to Socket.io-client for bidirectional needs |
| Testing | Vitest + React Testing Library | 1.6+ / 15+ | Vite-native test runner; RTL for component behavioral tests |
| E2E Testing | Playwright | 1.44+ | Cross-browser, reliable for canvas interactions |

### 1.2 Backend Stack

| Component | Technology | Version Target | Rationale |
|---|---|---|---|
| Language | Python | 3.11+ | Required for PyTorch/diffusers ecosystem; 3.11 perf improvements over 3.10 |
| Web Framework | FastAPI | 0.110+ | Async-first, automatic OpenAPI docs, Pydantic v2 integration |
| Data Validation | Pydantic | v2.7+ | 5-10x faster than v1; dataclasses-style syntax; used throughout FastAPI and Celery tasks |
| ORM | SQLAlchemy | 2.0 (async) | Async session support; type-annotated ORM; industry standard |
| DB Migrations | Alembic | 1.13+ | SQLAlchemy-native migration tool; auto-generate from model diffs |
| Task Queue | Celery | 5.4+ | Distributed background jobs for GPU inference; mature retry/ETA/routing |
| Task Broker/Backend | Redis | 7.2+ | Celery broker + result backend + pub/sub for SSE events |
| Image Processing | Pillow / Pillow-SIMD | 10.x | Post-processing, compositing, format conversion; SIMD variant for throughput |
| File Uploads | python-multipart | 0.0.9+ | Required for FastAPI multipart/form-data; streaming upload support |
| Authentication | PyJWT + bcrypt | 2.8+ / 4.1+ | Stateless JWT access tokens; bcrypt for password hashing |
| Object Storage | boto3 | 1.34+ | S3-compatible API client; works with MinIO, AWS S3, Cloudflare R2 |
| Testing | pytest + pytest-asyncio | 8.x | Async test support for FastAPI endpoints and SQLAlchemy sessions |

### 1.3 Database & Cache

| Component | Technology | Version Target | Rationale |
|---|---|---|---|
| Primary Database | PostgreSQL | 16.x | JSONB for layer/scene documents, full-text search, mature async driver support |
| Async PG Driver | asyncpg | 0.29+ | Fastest async PostgreSQL driver for SQLAlchemy |
| Cache / Queue / Pub-Sub | Redis | 7.2+ | Multi-role: Celery broker, result backend, SSE pub/sub, response caching |

### 1.4 Storage

| Environment | Technology | Rationale |
|---|---|---|
| Local Development | MinIO | S3-compatible, Docker-deployable, no cloud credentials required |
| Staging / Production | AWS S3 or Cloudflare R2 | R2 preferred (zero egress fees); same boto3 API surface |

### 1.5 AI / Inference Stack

| Component | Technology | Version Target | Rationale |
|---|---|---|---|
| Inference Library | Hugging Face `diffusers` | 0.27+ | Official pipeline implementations for FLUX, SDXL, ControlNet, inpainting |
| Primary Model | FLUX.1-dev | — | State-of-the-art quality, 12B parameters, rectified flow |
| Fallback Model | Stable Diffusion XL (SDXL) | 1.0 | 6.6B params, 8GB VRAM, broad community support |
| Deep Learning | PyTorch | 2.2+ | Required by diffusers; CUDA 12 and Apple MPS backend |
| Attention Optimization | xformers | 0.0.25+ | Memory-efficient attention — reduces VRAM ~30% for SDXL, required for FLUX on <24GB |
| Prompt Weighting | compel | 2.0+ | Enables `(word:1.5)` prompt weighting syntax with CLIP |
| Structural Conditioning | ControlNet pipelines | via diffusers | Pose, depth, canny-edge conditioning |
| Segmentation | Segment Anything Model (SAM) | SAM 2 | Assisted mask generation for inpainting |
| Quantization | `optimum` / `bitsandbytes` | 0.21+ | int8 / fp8 quantization for lower-VRAM deployments |

---

## 2. Framework Decisions

### 2.1 React 18 + TypeScript 5

**Decision:** React 18 with strict TypeScript.  
**Alternatives considered:**
- **Vue 3:** Strong reactivity model, but Konva integration is React-first and the ecosystem for canvas editors skews React.
- **SvelteKit:** Excellent DX but immature ecosystem for complex stateful canvas apps; lack of react-konva equivalent.
- **Vanilla JS/Canvas API:** Maximum control but prohibitive development time for a layered editor.

**Why React wins:** Concurrent rendering enables non-blocking UI updates while Celery jobs run. Suspense boundaries isolate canvas loading. TypeScript 5 enables strict inference of Konva node types and API response shapes.

### 2.2 Vite 5 over CRA / Webpack

**Decision:** Vite as the build tool.  
**Key reason:** Canvas-heavy apps with large Konva trees cause Webpack HMR to take 3–8 seconds. Vite's native ESM server delivers <100ms HMR for the same change. Cold start is ~300ms vs 15–30s. This is a developer productivity critical path.

### 2.3 Zustand 4 over Redux Toolkit

**Decision:** Zustand for client state.  
**Why not Redux:** The editor state (layers, selection, tool mode, undo stack) is deeply nested and frequently mutated during canvas interactions. Redux's action/reducer pattern creates friction for high-frequency updates. Zustand's direct mutation via Immer, combined with devtools middleware, provides equivalent debuggability with 70% less boilerplate.

### 2.4 Konva.js over Fabric.js

**Decision:** Konva.js / react-konva for the canvas editor.  
**Fabric.js issues:**
- Event model poorly aligns with React's synthetic event system.
- Layer z-index management is imperative and hard to synchronize with React state.
- No native React integration (no maintained official bindings).

**Konva advantages:**
- react-konva provides React-native component API (`<Layer>`, `<Image>`, `<Text>`, `<Transformer>`).
- Hit detection, drag handles, and transformers built-in.
- Declarative layer model maps directly to the platform's scene document schema.

### 2.5 FastAPI over Django REST Framework / Flask

**Decision:** FastAPI.  
**Rationale:** Async I/O is required because generation jobs are non-blocking — the API must serve polling requests while Celery workers use GPU. FastAPI's async support is first-class. Auto-generated OpenAPI docs accelerate frontend integration. Pydantic v2 is native.

### 2.6 Celery + Redis over RQ / Dramatiq / Direct async

**Decision:** Celery 5 with Redis broker.  
**Why not async FastAPI background tasks:** FastAPI background tasks share the web process — GPU inference would starve API workers. GPU work MUST run in isolated Celery worker processes.  
**Why Celery over RQ:** Celery supports task routing (send GPU tasks only to GPU workers), task ETAs, retry policies with exponential backoff, and chaining (e.g., generate → post-process → upload).

### 2.7 PostgreSQL 16 over MongoDB / MySQL

**Decision:** PostgreSQL as the primary store.  
**Rationale:** The scene document (layers, operations) is a mix of structured relational data (users, projects, jobs) and semi-structured JSON (layer trees, generation parameters). PostgreSQL's JSONB handles both in one engine with full ACID guarantees. JSONB supports indexed queries on layer types. MongoDB was considered but rejected for lack of transactions across document updates.

---

## 3. AI Model Requirements

### 3.1 Inference Architecture

> [!IMPORTANT]
> Pixel-space diffusion inference is **mandatory** for all generation features. No feature may substitute client-side rendering, placeholder images, or mocked responses as a shipped behavior.

The platform uses a **Provider Abstraction Layer** to decouple inference code from any single model host:

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass
from PIL import Image
from typing import Optional

@dataclass
class GenerationRequest:
    prompt: str
    negative_prompt: str = ""
    width: int = 1024
    height: int = 1024
    num_inference_steps: int = 28
    guidance_scale: float = 3.5
    seed: Optional[int] = None
    init_image: Optional[Image.Image] = None
    mask_image: Optional[Image.Image] = None
    strength: float = 0.75
    reference_images: list[Image.Image] = None

@dataclass
class GenerationResult:
    image: Image.Image
    seed: int
    model_id: str
    inference_time_ms: int

class ImageProvider(ABC):
    """All image generation backends implement this interface."""

    @abstractmethod
    async def generate(self, request: GenerationRequest) -> GenerationResult:
        """Text-to-image or image-to-image generation."""
        ...

    @abstractmethod
    async def inpaint(self, request: GenerationRequest) -> GenerationResult:
        """Inpainting with mask_image required."""
        ...

    @abstractmethod
    def health_check(self) -> bool:
        """Returns True if provider is ready to serve."""
        ...

# Concrete implementations:
# - LocalDiffusersProvider  (FLUX.1-dev or SDXL via diffusers, local GPU)
# - ReplicateProvider       (Replicate API)
# - TogetherAIProvider      (Together AI API)
# - StabilityAIProvider     (Stability AI REST API)
```

The active provider is selected at runtime via the `IMAGE_PROVIDER` environment variable. Swapping providers requires no code changes — only config.

### 3.2 FLUX.1-dev Specifications

| Property | Value |
|---|---|
| Parameters | 12 billion |
| Architecture | Multimodal Diffusion Transformer (MMDiT) with rectified flow |
| Native precision | BF16 |
| VRAM (full BF16) | ~24 GB |
| VRAM (fp8 quantized) | ~12 GB |
| VRAM (int8 quantized) | ~10 GB |
| Minimum viable GPU | NVIDIA RTX 3090 24GB (full BF16) |
| Recommended GPU | NVIDIA A100 40GB or H100 |
| Optimal resolution | 1024×1024 (natively trained) |
| Scheduler | FlowMatchEulerDiscreteScheduler |
| Typical steps | 20–50 |
| CFG scale | 3.5–7.0 |

> [!CAUTION]
> FLUX.1-dev **cannot** run on 4GB or 8GB VRAM in full precision. fp8 quantization requires a minimum of 10GB VRAM. Do not advertise FLUX support for GPUs below RTX 3080 10GB without fp8 quantization explicitly enabled.

### 3.3 SDXL Fallback Specifications

| Property | Value |
|---|---|
| Parameters | 6.6 billion (Base + Refiner) |
| Architecture | Latent Diffusion Model with UNet |
| Precision | FP16 |
| VRAM (Base only) | ~6 GB |
| VRAM (Base + Refiner) | ~10 GB |
| Minimum viable GPU | NVIDIA RTX 3060 8GB (Base only) |
| Optimal resolution | 1024×1024 |
| Scheduler | DPMSolverMultistepScheduler |
| Typical steps | 30–50 |

### 3.4 Model Caching Strategy

```
MODEL_CACHE_DIR/
├── flux/
│   └── flux.1-dev/          # HF snapshot cache
├── sdxl/
│   ├── stable-diffusion-xl-base-1.0/
│   └── sdxl-refiner-1.0/
├── controlnet/
│   ├── controlnet-canny-sdxl/
│   └── controlnet-depth-sdxl/
└── sam/
    └── sam2-hiera-large/
```

- Models are loaded once per Celery worker process and kept in VRAM between requests.
- **Model offloading:** `enable_model_cpu_offload()` is enabled when VRAM < 16GB. This streams model weights CPU↔GPU per pipeline stage at ~15% throughput cost.
- **Sequential CPU offload:** `enable_sequential_cpu_offload()` is the final fallback for systems with <10GB VRAM (development only).
- Worker startup time (model load) is ~60–120 seconds for FLUX; this is acceptable as workers are persistent processes.

### 3.5 CPU Inference Fallback

CPU inference is supported for development environments only. Throughput is approximately 1 step/second for SDXL (512×512), making a 30-step generation ~30 minutes. CPU inference is explicitly disabled in production via the `ALLOW_CPU_INFERENCE=false` environment variable.

### 3.6 Quantization Options

| Mode | VRAM Reduction | Quality Loss | Use Case |
|---|---|---|---|
| BF16 (default) | None | None | Production GPU with ≥24GB |
| FP8 | ~50% | Minimal | Production GPU with 10–16GB |
| INT8 (`bitsandbytes`) | ~60% | Minor | Dev/staging with 8–12GB |
| Sequential offload | ~80% | None (speed hit) | CPU+GPU dev fallback |

---

## 4. Hardware Requirements

### 4.1 Development Workstation (Minimum)

| Component | Minimum | Recommended |
|---|---|---|
| GPU | NVIDIA RTX 3080 10GB | NVIDIA RTX 4090 24GB |
| CPU | 8-core (Intel i7-12th gen / AMD Ryzen 7 5800X) | 16-core |
| RAM | 32 GB DDR4 | 64 GB DDR5 |
| Storage | 500 GB NVMe SSD (for model cache) | 2 TB NVMe |
| OS | Ubuntu 22.04 / Windows 11 + WSL2 / macOS 14+ (Apple Silicon) | Ubuntu 22.04 |
| CUDA | 12.1+ | 12.3 |

> [!NOTE]
> Apple Silicon (M2 Pro+) is supported via PyTorch MPS backend for SDXL. FLUX on MPS is experimental. Unified memory (18–36GB) counts as VRAM for Apple Silicon.

### 4.2 Staging Environment

| Component | Spec |
|---|---|
| GPU Node | 1× NVIDIA A10G 24GB (AWS `g5.xlarge`) |
| CPU | 4 vCPU |
| RAM | 16 GB |
| API Nodes | 2× `t3.medium` (no GPU) |
| Database | RDS PostgreSQL 16 `db.t3.medium` |
| Cache | ElastiCache Redis 7 `cache.t3.micro` |

### 4.3 Production Environment (Initial)

| Component | Spec |
|---|---|
| GPU Workers | 2× NVIDIA A100 40GB (AWS `p4d.xlarge` or equivalent) |
| API Nodes | 3× `c6i.xlarge` (4 vCPU, 8GB RAM) behind ALB |
| Database Primary | RDS PostgreSQL 16 `db.r6g.large` (Multi-AZ) |
| Database Read Replica | 1× `db.r6g.medium` |
| Cache / Queue | ElastiCache Redis 7 cluster mode |
| Object Storage | Cloudflare R2 (zero egress) or AWS S3 |
| CDN | Cloudflare or AWS CloudFront |

---

## 5. Runtime Requirements

| Runtime | Minimum Version | Notes |
|---|---|---|
| Python | 3.11.0 | 3.12 supported but diffusers may lag |
| Node.js | 20 LTS (20.x) | Required for Vite 5; npm 10+ |
| CUDA Toolkit | 12.1 | Required for PyTorch 2.2+ CUDA builds |
| cuDNN | 8.9+ | Bundled with PyTorch pip wheels |
| Docker | 24.x | For Compose dev environment |
| Docker Compose | 2.24+ | V2 syntax required |
| OS (Backend) | Ubuntu 22.04 LTS | Production containers; WSL2 for Windows dev |
| OS (Frontend dev) | Windows 11 / macOS 14 / Ubuntu 22.04 | Vite supports all |
| Browser Support | Chrome 120+, Firefox 121+, Safari 17+, Edge 120+ | No IE11; Konva requires Canvas API |

---

## 6. Dependencies

### 6.1 Backend / AI — `requirements.txt`

```
# Web framework
fastapi==0.110.3
uvicorn[standard]==0.29.0
python-multipart==0.0.9

# Data validation
pydantic==2.7.1
pydantic-settings==2.3.0

# Database
sqlalchemy[asyncio]==2.0.30
asyncpg==0.29.0
alembic==1.13.1

# Task queue
celery[redis]==5.4.0
redis==5.0.4

# Auth
pyjwt==2.8.0
bcrypt==4.1.3
passlib[bcrypt]==1.7.4

# Storage
boto3==1.34.100

# Image processing
Pillow==10.3.0
# Pillow-SIMD: install separately on x86 for SIMD acceleration

# AI / Inference
torch==2.2.2
torchvision==0.17.2
diffusers==0.27.2
transformers==4.40.2
accelerate==0.30.0
xformers==0.0.25.post1
compel==2.0.2
sentencepiece==0.2.0
safetensors==0.4.3

# Quantization
bitsandbytes==0.43.1
optimum==1.19.0

# SAM
segment-anything==1.0

# Observability
structlog==24.1.0
prometheus-client==0.20.0
opentelemetry-api==1.24.0
opentelemetry-sdk==1.24.0
opentelemetry-instrumentation-fastapi==0.45b0
sentry-sdk[fastapi]==2.3.0

# Dev / test
pytest==8.2.0
pytest-asyncio==0.23.6
pytest-cov==5.0.0
httpx==0.27.0
factory-boy==3.3.0
```

### 6.2 Frontend — `package.json` (dependencies)

```json
{
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.23.1",
    "konva": "^9.3.6",
    "react-konva": "^18.2.10",
    "framer-motion": "^11.2.9",
    "zustand": "^4.5.2",
    "immer": "^10.1.1",
    "@tanstack/react-query": "^5.37.1",
    "@tanstack/react-query-devtools": "^5.37.1",
    "axios": "^1.7.2",
    "tailwindcss": "^3.4.3",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.3.0",
    "react-dropzone": "^14.2.3",
    "react-colorful": "^5.6.1",
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-tooltip": "^1.0.7",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-slider": "^1.1.2",
    "@radix-ui/react-tabs": "^1.0.4",
    "lucide-react": "^0.379.0",
    "use-image": "^1.1.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.2.1",
    "typescript": "^5.4.5",
    "vite": "^5.2.11",
    "vitest": "^1.6.0",
    "@testing-library/react": "^15.0.7",
    "@testing-library/user-event": "^14.5.2",
    "playwright": "^1.44.0",
    "@playwright/test": "^1.44.0",
    "autoprefixer": "^10.4.19",
    "postcss": "^8.4.38",
    "eslint": "^8.57.0",
    "@typescript-eslint/eslint-plugin": "^7.10.0",
    "prettier": "^3.2.5"
  }
}
```

---

## 7. Database Requirements

### 7.1 Schema Overview

The PostgreSQL database uses a versioned schema managed by Alembic. Core tables:

| Table | Purpose |
|---|---|
| `users` | Authentication, profile, subscription tier |
| `projects` | User-created project containers |
| `generation_jobs` | Celery job tracking: status, params, result URLs |
| `scene_documents` | JSONB layer tree for canvas editor |
| `edit_operations` | Undo/redo history records |
| `assets` | Uploaded images in asset library |
| `generation_history` | Flattened log of all generated images |

### 7.2 Connection Pooling

```python
# SQLAlchemy async engine configuration
engine = create_async_engine(
    DATABASE_URL,
    pool_size=10,          # Persistent connections per worker
    max_overflow=20,       # Burst connections
    pool_timeout=30,       # Seconds before connection timeout
    pool_recycle=1800,     # Recycle connections every 30min
    pool_pre_ping=True,    # Validate connection before use
)
```

PgBouncer is deployed in **transaction pooling** mode in production, sitting between app and RDS, reducing actual PostgreSQL connection count from N workers × 10 to a fixed pool of 50.

### 7.3 Read Replicas

Read replica is used for:
- Generation history queries (paginated, no writes)
- Asset library browsing
- Project gallery listing

Write path (job creation, scene saves) always routes to primary.

### 7.4 Migrations

```bash
# Generate migration from model diff
alembic revision --autogenerate -m "add_reference_images_table"

# Apply migrations
alembic upgrade head

# Rollback one step
alembic downgrade -1
```

Migrations are applied as part of Docker entrypoint before API server starts.

### 7.5 Backup Strategy

| Backup Type | Frequency | Retention | Method |
|---|---|---|---|
| Automated snapshots | Daily | 30 days | RDS automated backups |
| Point-in-time recovery | Continuous | 7 days | RDS PITR |
| Manual snapshot | Pre-deployment | Indefinite | Pre-deploy CI step |

---

## 8. Storage Requirements

### 8.1 Bucket Structure

```
{bucket-name}/
├── uploads/
│   └── {user_id}/
│       └── {asset_id}.{ext}        # User-uploaded reference images
├── generated/
│   └── {user_id}/
│       └── {job_id}/
│           ├── result.png           # Primary generated image
│           ├── result_thumb.webp    # 512px thumbnail (auto-generated)
│           └── mask.png             # Inpainting mask (if applicable)
├── exports/
│   └── {user_id}/
│       └── {project_id}/
│           └── {export_id}.png     # Final exports
└── tmp/
    └── {job_id}/                    # Ephemeral working files; TTL 24h
```

### 8.2 Access Policies

- **User uploads:** Private. Access via pre-signed URLs (expire in 1 hour).
- **Generated images:** Private by default. Owner can toggle to public (CDN-served URL).
- **Public assets:** Served via CDN with long Cache-Control headers (`max-age=31536000, immutable`).
- **Service account:** Backend IAM role has `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`. No `s3:ListBucket` on user prefixes.

### 8.3 Image Optimization Pipeline

On upload and on generation result:
1. Validate MIME type (allowlist: `image/png`, `image/jpeg`, `image/webp`)
2. Strip EXIF metadata (Pillow `Image.save(..., exif=b"")`)
3. Generate WebP thumbnail at 512px longest edge (quality 85)
4. Store both original and thumbnail in S3

CDN serves thumbnail URLs for gallery/history views; full-resolution URLs for editor canvas loads.

### 8.4 Storage Quotas (by plan tier)

| Tier | Generated Storage | Upload Storage | Retention |
|---|---|---|---|
| Free | 500 MB | 100 MB | 30 days |
| Pro | 10 GB | 2 GB | Indefinite |
| Team | 100 GB | 20 GB | Indefinite |

---

## 9. Security Requirements

### 9.1 Authentication — JWT Strategy

```
Access Token:  JWT, RS256-signed, expires 15 minutes
Refresh Token: Opaque, stored in HttpOnly Secure cookie, 30-day TTL
               Rotated on each use (refresh token rotation)
               Stored in Redis with user binding for revocation
```

Token claims include: `sub` (user UUID), `iat`, `exp`, `tier` (subscription tier).

Password requirements: minimum 12 characters, bcrypt cost factor 12.

### 9.2 CORS Configuration

```python
origins = [
    "https://app.reveplatform.com",        # Production frontend
    "https://staging.reveplatform.com",    # Staging
    "http://localhost:5173",               # Vite dev server
]

# Disallow wildcard in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["Authorization", "Content-Type"],
)
```

### 9.3 Content Security Policy

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{request_nonce}';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https://*.r2.dev https://*.cloudfront.net;
  connect-src 'self' https://api.reveplatform.com;
  frame-ancestors 'none';
```

### 9.4 Rate Limiting

Implemented via Redis sliding window counter per user UUID (authenticated) or IP (unauthenticated):

| Endpoint Group | Limit | Window |
|---|---|---|
| Generation jobs (POST) | 10 req | 1 minute |
| File uploads | 20 req | 1 hour |
| Auth (login/register) | 5 req | 15 minutes |
| General API | 300 req | 1 minute |

Rate limit headers returned: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

### 9.5 File Upload Validation

```python
ALLOWED_MIME_TYPES = {"image/png", "image/jpeg", "image/webp"}
MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024  # 20 MB

def validate_upload(file: UploadFile) -> None:
    # 1. Check content-type header
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(415, "Unsupported media type")
    # 2. Read first 16 bytes, verify magic bytes (not just extension)
    header = await file.read(16)
    if not is_valid_image_magic(header):
        raise HTTPException(400, "Invalid image file")
    # 3. Enforce size limit via streaming read
    # 4. Re-encode via Pillow to strip any embedded payloads
```

---

## 10. Deployment Requirements

### 10.1 Docker Compose (Development)

```yaml
# docker-compose.yml (abbreviated)
version: "3.9"
services:
  api:
    build: ./backend
    ports: ["8000:8000"]
    environment:
      DATABASE_URL: postgresql+asyncpg://reve:reve@db:5432/reve
      REDIS_URL: redis://redis:6379/0
      IMAGE_PROVIDER: local_diffusers
      ALLOW_CPU_INFERENCE: "true"
    depends_on: [db, redis, minio]
    volumes:
      - ./backend:/app
      - model_cache:/root/.cache/huggingface

  worker:
    build: ./backend
    command: celery -A app.worker worker -Q gpu_tasks -c 1 --loglevel=info
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
    environment:
      IMAGE_PROVIDER: local_diffusers
    volumes:
      - model_cache:/root/.cache/huggingface

  frontend:
    build: ./frontend
    ports: ["5173:5173"]
    command: npm run dev -- --host

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: reve
      POSTGRES_USER: reve
      POSTGRES_PASSWORD: reve
    volumes: [pg_data:/var/lib/postgresql/data]

  redis:
    image: redis:7.2-alpine

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    ports: ["9000:9000", "9001:9001"]
    volumes: [minio_data:/data]

volumes:
  pg_data:
  minio_data:
  model_cache:
```

### 10.2 Kubernetes (Production)

The platform targets Kubernetes for production via Helm chart. Key resources:

| Resource | Replicas | Notes |
|---|---|---|
| `api-deployment` | 3 | Horizontal Pod Autoscaler on CPU 70% |
| `worker-deployment` | 2 | Node selector: `accelerator: nvidia-a100`; resource limit: 1 GPU |
| `postgres` | 1 primary + 1 replica | External: RDS preferred |
| `redis` | 1 cluster | External: ElastiCache preferred |

GPU workers use `nvidia.com/gpu: 1` resource requests. Worker pods are scheduled exclusively on GPU node pools.

### 10.3 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL async DSN |
| `REDIS_URL` | Yes | Redis connection string |
| `SECRET_KEY` | Yes | JWT RS256 private key (PEM) |
| `PUBLIC_KEY` | Yes | JWT RS256 public key (PEM) |
| `S3_BUCKET` | Yes | Storage bucket name |
| `S3_ENDPOINT_URL` | No | Override for MinIO / R2 |
| `AWS_ACCESS_KEY_ID` | Yes | S3 credentials |
| `AWS_SECRET_ACCESS_KEY` | Yes | S3 credentials |
| `IMAGE_PROVIDER` | Yes | `local_diffusers` / `replicate` / `together_ai` / `stability_ai` |
| `HF_MODEL_ID` | No | Override Hugging Face model ID |
| `ALLOW_CPU_INFERENCE` | No | `true` for dev only; default `false` |
| `SENTRY_DSN` | No | Sentry error tracking DSN |
| `CELERY_CONCURRENCY` | No | GPU worker concurrency (default 1) |

### 10.4 Secrets Management

- **Local dev:** `.env` file (never committed; `.env.example` committed)
- **Staging/Production:** AWS Secrets Manager; injected as environment variables via ECS task definition or Kubernetes External Secrets Operator
- **CI/CD:** GitHub Actions encrypted secrets; never logged

---

## 11. Performance Targets

### 11.1 API Response Times (p95)

| Endpoint | Target p95 | Notes |
|---|---|---|
| `POST /auth/login` | < 200ms | Bcrypt adds ~100ms |
| `GET /projects` | < 100ms | Cached after first load |
| `POST /generate` (job submit) | < 300ms | Returns job ID; actual inference is async |
| `GET /jobs/{id}` (poll) | < 50ms | Redis lookup |
| `GET /history` | < 150ms | Paginated, read replica |
| `POST /upload` | < 2s | 20MB file limit |

### 11.2 Image Generation Time Budgets

| Model | GPU | Mode | Target Time |
|---|---|---|---|
| FLUX.1-dev | A100 40GB | 28 steps, 1024×1024 | < 15 seconds |
| FLUX.1-dev | RTX 4090 24GB | 28 steps, 1024×1024 | < 25 seconds |
| SDXL | A10G 24GB | 30 steps, 1024×1024 | < 20 seconds |
| SDXL | RTX 3080 10GB | 30 steps, 1024×1024 | < 45 seconds |
| Inpainting (SDXL) | A10G | 30 steps | < 25 seconds |

> [!NOTE]
> Times include model inference only. Add ~2–5 seconds for upload, post-processing, and S3 upload in the full pipeline.

### 11.3 Frontend Performance Targets (Core Web Vitals)

| Metric | Target | Measurement |
|---|---|---|
| Largest Contentful Paint (LCP) | < 2.5s | Lighthouse, production |
| First Input Delay (FID) | < 100ms | Web Vitals library |
| Cumulative Layout Shift (CLS) | < 0.1 | Web Vitals library |
| Time to Interactive (TTI) | < 4.0s | Lighthouse |
| Canvas render (100-layer scene) | < 16ms/frame | Konva stage draw |
| Bundle size (initial JS) | < 300 KB gzip | Vite bundle analysis |

### 11.4 Real-time Update Latency

| Channel | Target Latency | Method |
|---|---|---|
| Job progress SSE | < 500ms end-to-end | Redis pub/sub → SSE |
| Job completion notification | < 1s | Celery task → Redis → SSE |

---

## 12. Monitoring and Observability

### 12.1 Structured Logging (structlog)

```python
import structlog

log = structlog.get_logger()

# All log entries include: timestamp, level, service, request_id, user_id
log.info("generation_job_submitted",
    job_id=str(job.id),
    user_id=str(user.id),
    provider=provider_name,
    model=model_id,
    width=request.width,
    height=request.height,
    steps=request.num_inference_steps,
)
```

Log format: JSON in production (ingested by Loki or CloudWatch). Human-readable in development.

### 12.2 Metrics (Prometheus)

Exposed at `/metrics`. Key metrics:

| Metric | Type | Description |
|---|---|---|
| `generation_job_duration_seconds` | Histogram | Inference wall-clock time by model |
| `generation_job_total` | Counter | Jobs by status (queued/success/failed) |
| `active_celery_workers` | Gauge | GPU worker availability |
| `gpu_vram_used_bytes` | Gauge | VRAM usage per worker |
| `api_request_duration_seconds` | Histogram | FastAPI endpoint latency |
| `s3_upload_duration_seconds` | Histogram | Storage upload latency |
| `active_sse_connections` | Gauge | Live client SSE connections |

Grafana dashboards for: Generation throughput, GPU utilization, API latency p50/p95/p99, error rates.

### 12.3 Distributed Tracing (OpenTelemetry)

```python
from opentelemetry import trace
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor

FastAPIInstrumentor.instrument_app(app)
SQLAlchemyInstrumentor().instrument()
```

Traces cover the full request path: HTTP request → DB query → Celery task dispatch → Worker inference → S3 upload → SSE notification.

Traces exported to: Jaeger (development), AWS X-Ray or Tempo (production).

### 12.4 Error Tracking (Sentry)

```python
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.celery import CeleryIntegration

sentry_sdk.init(
    dsn=settings.SENTRY_DSN,
    integrations=[FastApiIntegration(), CeleryIntegration()],
    traces_sample_rate=0.1,    # 10% trace sampling
    profiles_sample_rate=0.01, # 1% profiling
    environment=settings.ENVIRONMENT,
)
```

Sentry captures: unhandled exceptions in API workers, Celery task failures (with job_id and user_id context), frontend JS errors (via Sentry browser SDK).

### 12.5 Alerting Thresholds

| Alert | Condition | Severity |
|---|---|---|
| Generation failure rate | > 5% over 5min | Critical |
| GPU worker count | < 1 available | Critical |
| API p95 latency | > 2s over 10min | Warning |
| Celery queue depth | > 50 jobs pending | Warning |
| Disk / VRAM OOM | Any OOM event | Critical |
| Storage bucket access error | Any 5xx from S3 | Critical |

---

## Appendix A: Provider Abstraction Registration

```python
# app/providers/registry.py
from app.providers.local_diffusers import LocalDiffusersProvider
from app.providers.replicate import ReplicateProvider
from app.providers.together_ai import TogetherAIProvider
from app.providers.stability_ai import StabilityAIProvider

PROVIDER_REGISTRY: dict[str, type[ImageProvider]] = {
    "local_diffusers": LocalDiffusersProvider,
    "replicate":       ReplicateProvider,
    "together_ai":     TogetherAIProvider,
    "stability_ai":    StabilityAIProvider,
}

def get_provider() -> ImageProvider:
    name = settings.IMAGE_PROVIDER
    if name not in PROVIDER_REGISTRY:
        raise ValueError(f"Unknown IMAGE_PROVIDER: {name}")
    return PROVIDER_REGISTRY[name]()
```

---

## Appendix B: Directory Structure

```
reve/
├── backend/
│   ├── app/
│   │   ├── api/           # FastAPI routers
│   │   ├── core/          # Config, security, deps
│   │   ├── models/        # SQLAlchemy ORM models
│   │   ├── schemas/       # Pydantic schemas
│   │   ├── providers/     # ImageProvider implementations
│   │   ├── services/      # Business logic
│   │   ├── tasks/         # Celery task definitions
│   │   └── worker.py      # Celery app instance
│   ├── alembic/           # DB migrations
│   ├── tests/
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Route-level components
│   │   ├── stores/        # Zustand stores
│   │   ├── hooks/         # Custom React hooks
│   │   ├── api/           # Axios client + TanStack Query
│   │   ├── canvas/        # Konva layer editor
│   │   └── types/         # TypeScript type definitions
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
├── docs/
│   ├── PRD.md
│   └── TRD.md
├── docker-compose.yml
└── .env.example
```

---

*Document version controlled in Git. All architectural decisions with significant trade-offs should be captured as Architecture Decision Records (ADRs) in `docs/adr/`.*
