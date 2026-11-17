# Reve-Inspired AI Image Generation & Visual Editing Platform

> A production-oriented AI visual creation platform combining genuine pixel-space generative diffusion, inpainting/outpainting, structured editable layer composition, multi-reference conditioning, and precision typography.

---

## 🌟 Overview

This repository houses the complete architectural blueprints, design systems, and technical implementation specifications for an original creative platform inspired by Reve AI.

The platform uniquely unifies **two complementary paradigms**:
1. **Pixel-Space Generative Synthesis**: Direct latent diffusion model inference (FLUX.1-dev, SDXL) producing high-fidelity raster artwork.
2. **Structured, Object-Based Layer Editing**: A JSON scene graph and canvas engine (Konva.js) enabling non-destructive manipulation of raster elements, vector typography, shapes, and reference assets.

---

## 📚 Core Specification Documents (`docs/`)

All six authoritative specification documents are complete, rigorously cross-referenced, and implementation-ready:

| Document | Purpose & Summary | Word Count |
|---|---|---|
| [**`PRD.md`**](file:///c:/Users/austi/OneDrive/Desktop/Reve/docs/PRD.md) | **Product Requirements Document**: Vision, problem statement, 5 user personas, 10 goals & 6 non-goals, 11 detailed functional requirements (FR-01–FR-11), 24 user stories, testable acceptance criteria, MoSCoW priorities, and MVP definition. | ~6,300 words |
| [**`TRD.md`**](file:///c:/Users/austi/OneDrive/Desktop/Reve/docs/TRD.md) | **Technical Requirements Document**: Technology stack, framework decisions with rejected alternatives, AI model hardware & VRAM specs (FLUX.1-dev & SDXL), provider abstraction layer, dependencies, database, storage, security, deployment, and performance budgets. | ~4,800 words |
| [**`SYSTEM_ARCHITECTURE.md`**](file:///c:/Users/austi/OneDrive/Desktop/Reve/docs/SYSTEM_ARCHITECTURE.md) | **System Architecture Specification**: 8-tier system diagram, frontend/backend architecture, provider router pattern, 12-step pixel-space generation pipeline, inpainting pipeline, SceneDocument JSON specification, database ER diagram (11 entities), Celery queue topology, and SSE streaming. | ~4,800 words |
| [**`UI_UX_SPECIFICATION.md`**](file:///c:/Users/austi/OneDrive/Desktop/Reve/docs/UI_UX_SPECIFICATION.md) | **UI/UX Design Specification**: Dark-first design system (#0A0A0B), typography tokens, 13 core components, Generation Workspace (3-panel + prompt bar) and Editing Workspace layout dimensions, 10 screen specifications, 7 end-to-end user journeys, keyboard shortcuts, and WCAG 2.1 AA accessibility. | ~6,100 words |
| [**`API_SPECIFICATION.md`**](file:///c:/Users/austi/OneDrive/Desktop/Reve/docs/API_SPECIFICATION.md) | **REST & SSE API Specification**: Conventions, authentication, user/project/generation/upload/layer/asset/model endpoints with complete request/response JSON schemas, Server-Sent Events contract with TypeScript interfaces, error code catalog, and rate limiting tables. | ~4,800 words |
| [**`IMPLEMENTATION_ROADMAP.md`**](file:///c:/Users/austi/OneDrive/Desktop/Reve/docs/IMPLEMENTATION_ROADMAP.md) | **Engineering Roadmap**: 6 development phases (Phase 0–5, Weeks 1–18), 60+ task breakdown with dependencies and estimates, Definition of Done, MVP success checklist, comprehensive risk register, and step-by-step developer environment setup. | ~7,200 words |

---

## 🏗️ Architecture & Technology Stack

```
                               ┌────────────────────────────────┐
                               │   React 18 + Vite Frontend     │
                               │  (Tailwind + Zustand + Konva)  │
                               └──────────────┬─────────────────┘
                                              │ HTTP / SSE
                                              ▼
                               ┌────────────────────────────────┐
                               │   FastAPI Backend Gateway      │
                               │   (Auth, Projects, Scene Doc)  │
                               └───────┬──────────────┬─────────┘
                                       │              │
                   ┌───────────────────┴──┐        ┌──┴───────────────────┐
                   │  PostgreSQL 16 (DB)  │        │   Redis 7 (Queue)    │
                   └──────────────────────┘        └──────────┬───────────┘
                                                              │
                                                              ▼
                                                   ┌────────────────────┐
                                                   │   Celery Workers   │
                                                   └──────────┬─────────┘
                                                              │
                                         ┌────────────────────┴──────────────────┐
                                         ▼                                       ▼
                              ┌────────────────────┐                  ┌────────────────────┐
                              │  Local Diffusers   │                  │  Cloud AI Router   │
                              │ (FLUX.1-dev, SDXL) │                  │(Replicate/Together)│
                              └──────────┬─────────┘                  └──────────┬─────────┘
                                         │                                       │
                                         └────────────────────┬──────────────────┘
                                                              ▼
                                                   ┌────────────────────┐
                                                   │  S3 / MinIO Store  │
                                                   └────────────────────┘
```

- **Frontend**: React 18, TypeScript 5, Vite 5, Tailwind CSS, Zustand, Konva.js / react-konva, TanStack Query, Framer Motion.
- **Backend**: Python 3.11, FastAPI, Pydantic v2, SQLAlchemy 2.0 (async), Celery 5, Redis 7, Alembic.
- **AI Engine**: Hugging Face Diffusers, PyTorch 2.2, FLUX.1-dev, SDXL, Segment Anything Model (SAM), provider abstraction supporting local CUDA GPU and cloud fallbacks.
- **Database & Storage**: PostgreSQL 16, S3-compatible Object Storage (MinIO for dev, Cloudflare R2 / AWS S3 for prod).

---

## 📁 Monorepo Layout

```
reve-inspired-platform/
├── docs/                      # The 6 core specification documents
│   ├── PRD.md
│   ├── TRD.md
│   ├── SYSTEM_ARCHITECTURE.md
│   ├── UI_UX_SPECIFICATION.md
│   ├── API_SPECIFICATION.md
│   └── IMPLEMENTATION_ROADMAP.md
├── frontend/                  # React 18 + Vite client application
├── backend/                   # FastAPI REST API & Celery workers
├── ai-engine/                 # Model provider abstraction & diffusion pipelines
├── infrastructure/            # Docker, database, and deployment configurations
├── scripts/                   # Developer tooling and automation scripts
├── tests/                     # Cross-service end-to-end and integration tests
├── .env.example               # Environment variable template
├── .gitignore                 # Repository ignore rules
├── docker-compose.yml         # Local container orchestration
└── README.md                  # Project root documentation
```

---

## ⚡ Quick Start (Local Development)

### Prerequisites
- Docker Engine 24+ & Docker Compose v2
- Node.js 20 LTS & npm 10+
- Python 3.11+
- NVIDIA GPU with CUDA 12+ (Recommended for local inference, or switch `IMAGE_PROVIDER` to cloud in `.env`)

### 1. Clone & Configure
```bash
cp .env.example .env
# Edit .env with your local credentials and preferences
```

### 2. Launch Supporting Services
```bash
docker compose up -d db redis minio create-buckets
```

### 3. Start Backend & Celery Worker
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

### 4. Start Frontend
```bash
cd frontend
npm install
npm run dev
# Open http://localhost:5173 in your browser
```

---

## 🛡️ Key Principles & Guidelines

1. **No Fake Generation**: Generative outputs are produced via actual inference pipelines (local CUDA or authenticated cloud API); mock place-holders in production paths are strictly prohibited.
2. **Complementary Modalities**: Raster image generation and structured vector/layer composition coexist gracefully. Raster layers do not require forced segmentation to be positioned or blended.
3. **Provider Flexibility**: The AI engine uses a strict interface pattern (`BaseImageProvider`), enabling instant switching between local models and third-party APIs without modifying application logic.
