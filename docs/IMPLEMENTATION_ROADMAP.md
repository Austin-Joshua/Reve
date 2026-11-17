# IMPLEMENTATION ROADMAP
## Reve-Inspired AI Image Generation & Visual Editing Platform

**Version:** 1.0  
**Last Updated:** November 2026  
**Document Owner:** Engineering Lead  
**Status:** Active

---

## Table of Contents

1. [Overview and Development Philosophy](#1-overview-and-development-philosophy)
2. [Development Phases](#2-development-phases)
3. [Task Breakdown](#3-task-breakdown)
4. [Dependencies Map](#4-dependencies-map)
5. [Testing Strategy](#5-testing-strategy)
6. [Definition of Done](#6-definition-of-done)
7. [MVP Completion Criteria](#7-mvp-completion-criteria)
8. [Future Enhancements (V2/V3)](#8-future-enhancements-v2v3)
9. [Risk Register](#9-risk-register)
10. [Environment Setup Guide](#10-environment-setup-guide)

---

## 1. Overview and Development Philosophy

### Vision

This platform delivers a professional-grade AI image generation and visual editing environment. It combines pixel-space generative AI (text-to-image, inpainting, outpainting, image-to-image) with a structured layer editor—enabling workflows impossible in tools that treat these as separate concerns.

### Core Principles

#### Iterative, Milestone-Based Delivery

Each phase ends with a **working, demo-able milestone**—not a code checkpoint. Milestones require real, end-to-end functionality running against actual infrastructure. No phase is closed until its milestone condition is met by a human reviewing the running application.

Phases are designed to stack cleanly: Phase N always produces a runnable system that Phase N+1 extends. Regressions are caught immediately through the continuous test pipeline.

#### Testing-First Approach

Tests are written **alongside** implementation code, never after. Every PR must include:
- Unit tests for all new functions and classes
- Integration tests for all new API endpoints
- AI-feature PRs: at least one test running against real model inference (no mock-only merges)

The CI pipeline blocks merges if coverage drops below 85% for backend or any E2E test fails.

#### Definition of Done (Phase Level)

A phase is **Done** when:
1. All tasks in the phase pass their individual acceptance criteria
2. The phase milestone condition is verified by a reviewer against the live running system
3. All new tests are passing in CI
4. No regression in previously passing tests
5. Docs updated to reflect any new setup requirements
6. No hardcoded images, fake generation stubs, or `TODO: replace with real AI` comments remain in merged code

#### No Feature is Done Until It Passes Integration Tests with Real Model Inference

This is the single most important rule. A generation endpoint that returns a placeholder image, a fixed seed image, or a mocked response is **not done**. The pipeline must:
- Accept a real prompt
- Dispatch a real Celery task
- Run actual diffusion model inference on real GPU/MPS hardware
- Return a real, non-deterministic (or seeded) generated image
- Persist that image in MinIO/S3
- Deliver it to the frontend via SSE

This requirement applies to every generation feature: text-to-image, image-to-image, inpainting, outpainting, and reference-conditioned generation.

---

## 2. Development Phases

### Phase 0: Foundation (Week 1–2)

**Goal:** Establish the entire technical skeleton. Every subsequent phase builds on this foundation.

#### Deliverables

| Area | Deliverable |
|------|-------------|
| Monorepo | Vite + React + TypeScript frontend, FastAPI + Python 3.11 backend, shared `docs/` |
| Docker Compose | PostgreSQL 16, Redis 7, MinIO, Backend (uvicorn), Frontend (Vite dev), Celery Worker |
| Database | All SQLAlchemy 2.0 async models: User, Project, GenerationJob, SceneDocument, Layer, EditOperation, Asset, UsageRecord |
| Migrations | Alembic configured; `alembic upgrade head` applies all tables cleanly |
| Auth | JWT register, login, refresh endpoints; bcrypt password hashing; protected route middleware |
| Frontend Shell | React Router v6 routes: `/`, `/login`, `/register`, `/workspace/:projectId`, `/gallery`, `/history` |
| CI Pipeline | GitHub Actions: ESLint + tsc, Ruff + mypy, pytest (unit only), Vitest (component unit) |
| Configuration | `.env.example` with every required variable documented inline |

#### Milestone — Phase 0 Complete

> `GET /api/v1/health` returns `{"status": "ok", "db": "connected", "redis": "connected", "storage": "connected"}`.  
> `POST /api/v1/auth/register` and `POST /api/v1/auth/login` return valid JWT tokens.  
> `alembic upgrade head` completes with no errors against a fresh PostgreSQL instance.  
> Frontend dev server (`npm run dev`) starts and renders the layout shell at `localhost:5173`.  
> GitHub Actions pipeline runs green on a fresh branch.

---

### Phase 1: Core Generation Pipeline (Week 3–5)

**Goal:** End-to-end text-to-image generation working in the browser with real model inference.

#### Deliverables

| Area | Deliverable |
|------|-------------|
| AI Abstraction | `BaseImageProvider` abstract class; `LocalDiffusersProvider` implementing it (FLUX.1-dev or SDXL) |
| Celery | `generate_image` task; task routing; result backend (Redis); worker health probe |
| API | `POST /api/v1/generate/text-to-image`; `GET /api/v1/jobs/{job_id}/status`; `GET /api/v1/jobs/{job_id}/stream` (SSE) |
| State Machine | `GenerationJob` states: `PENDING → QUEUED → RUNNING → COMPLETED / FAILED` |
| Storage | MinIO bucket creation on startup; image upload post-generation; pre-signed URL generation |
| Frontend | 3-panel workspace layout (left sidebar, center canvas, right panel) + bottom toolbar |
| Frontend | Prompt textarea with negative prompt toggle; generate button; aspect ratio selector |
| Frontend | `useJobProgress` custom hook (SSE via `EventSource`); progress bar and status display |
| Frontend | Generated image display in center canvas; download button |

#### Milestone — Phase 1 Complete

> **A real AI-generated image must appear in the browser UI.**  
> User types a novel prompt (e.g., "a photorealistic golden retriever on the moon") with no seed → clicks Generate → SSE progress bar fills to 100% → a new, non-placeholder, model-inferred image renders in the canvas panel.  
> Job record visible in PostgreSQL with `status = COMPLETED` and a valid MinIO URL.  
> Repeating the prompt without a fixed seed produces a different image (non-determinism confirmed).

---

### Phase 2: Image Editing (Week 6–8)

**Goal:** Upload an image, draw a mask, type a replacement prompt, receive an inpainted result.

#### Deliverables

| Area | Deliverable |
|------|-------------|
| API | `POST /api/v1/images/upload` (multipart, MIME validation, MinIO storage) |
| API | `POST /api/v1/generate/image-to-image`; Celery task with strength/guidance params |
| API | `POST /api/v1/generate/inpaint`; Celery task (brush mask PNG → diffusion inpainting) |
| API | `POST /api/v1/generate/outpaint`; Celery task (direction, expansion pixels) |
| Frontend | Image editing workspace: Konva canvas with uploaded image as background layer |
| Frontend | Brush tool (adjustable radius), eraser tool, mask overlay (semi-transparent red) |
| Frontend | Inpaint workflow: draw mask → enter prompt → submit → SSE → result composited back |
| Frontend | Image-to-image panel: upload source, strength slider, transform button |
| Frontend | Outpaint panel: directional expand controls, preview border |

#### Milestone — Phase 2 Complete

> User uploads a photo of a bedroom → paints brush mask over a lamp → types "modern floor lamp with warm glow" → clicks Inpaint → receives a real model-generated inpainted result with the lamp replaced.  
> Result is NOT a client-side composited overlay; it is a full model inference pass returning a new image file.  
> Outpaint extends the canvas of a 512×512 image to 512×768 using real model inference.

---

### Phase 3: Layer System and Scene Editor (Week 9–11)

**Goal:** Multi-layer composition with text, raster images, undo/redo, and scene persistence.

#### Deliverables

| Area | Deliverable |
|------|-------------|
| Data Model | `SceneDocument` JSON schema (version, layers array, canvas dimensions); SQLAlchemy model |
| API | Layer CRUD: `GET/POST/PATCH/DELETE /api/v1/scenes/{scene_id}/layers/{layer_id}` |
| API | Scene save/load: `PUT /api/v1/scenes/{scene_id}` persists full document JSON |
| API | `EditOperation` recording for audit log |
| Frontend | Konva layer renderer: raster layers (images), text layers, shape layers |
| Frontend | Layer panel: visibility toggle (eye icon), lock toggle, z-order reorder (drag), delete |
| Frontend | Properties panel: X, Y, width, height, rotation, opacity (all numeric + slider) |
| Frontend | Undo/redo: Zustand command-pattern stack; Ctrl+Z / Ctrl+Shift+Z keyboard shortcuts |
| Frontend | Text layer editor: font family picker (Google Fonts), size, weight, color, alignment |
| Frontend | Drag-to-reorder layers in panel updates Konva z-index immediately |

#### Milestone — Phase 3 Complete

> User creates a scene with three layers: (1) an AI-generated background image, (2) a product photo raster layer, (3) a text layer reading "Summer Sale".  
> User adjusts opacity of the product layer to 85%, rotates it 15°, repositions it, then undoes the rotation → layer returns to 0°.  
> Scene is saved, page is refreshed, scene reloads with all three layers intact from the database.

---

### Phase 4: Advanced Features (Week 12–15)

**Goal:** Feature-complete MVP — multi-reference generation, full history/gallery, asset library, and model controls.

#### Deliverables

| Area | Deliverable |
|------|-------------|
| Multi-Reference | Upload up to 5 reference images; label each @1–@5; assign roles (subject, style, composition, color, character); set per-reference strength |
| Reference API | `POST /api/v1/generate/reference` Celery task feeding reference images through conditioning pipeline |
| Typography | Font library browser (Google Fonts API); editable text layers with real-time preview |
| History UI | `GET /api/v1/jobs` paginated endpoint; infinite scroll gallery; filter by date/model/prompt search |
| Gallery UI | `GET /api/v1/projects` masonry grid; create, rename, delete, duplicate projects |
| Asset Library | `POST /api/v1/assets/upload`; browse panel with thumbnails; drag-to-canvas insertion |
| Model Settings | Model selector dropdown (FLUX.1-dev, SDXL, custom); scheduler selector; CFG scale; steps; seed input (blank = random) |
| Usage Tracking | `UsageRecord` table; `GET /api/v1/usage` endpoint; usage dashboard widget in sidebar |
| Prompt Enhancement | Optional `POST /api/v1/prompt/enhance` LLM call (OpenAI GPT-4o or local LLM); toggle in settings |

#### Milestone — Phase 4 Complete

> User uploads two reference images (a character face @1, a painterly style @2), types a prompt referencing @1 and @2, selects FLUX.1-dev model with 30 steps / CFG 7.5, clicks Generate → receives a real model-inferred image blending both references.  
> Generation history shows the last 50 jobs with prompt preview and thumbnail; full-text search filters by keyword.  
> Project gallery displays all projects; creating and deleting a project updates the UI immediately without page refresh.

---

### Phase 5: Polish, Testing, and Production Hardening (Week 16–18)

**Goal:** 90%+ test coverage, E2E suite green, performance targets met, production-ready deployment.

#### Deliverables

| Area | Deliverable |
|------|-------------|
| Backend Tests | pytest suite: 90%+ line coverage; real PostgreSQL test DB; real Redis; real MinIO |
| AI Tests | At least one pytest test per generation endpoint using `LocalDiffusersProvider` on actual GPU/MPS hardware (marked `@pytest.mark.gpu`, skipped in CI without GPU) |
| Frontend Tests | Vitest + React Testing Library: all components ≥ 80% branch coverage |
| E2E Tests | Playwright: full generation flow, inpainting flow, layer editing + undo, project CRUD, auth |
| Performance | Lighthouse CI ≥ 85 performance score; image lazy loading; canvas virtualization for 50+ layers; API response caching (Redis, TTL 60s for read-only endpoints) |
| Error Boundaries | React `ErrorBoundary` on all major panels; API error toasts with retry; Celery task retry (3×) |
| Rate Limiting | FastAPI middleware: 10 req/min per user on generation endpoints; 429 response with `Retry-After` header |
| Security | CORS whitelist; CSP headers; file type validation (magic bytes, not just MIME); SQL injection prevention (ORM-only, no raw queries); dependency audit |
| Kubernetes | Optional: Deployment + Service + HPA manifests for backend, worker, frontend; PVC for MinIO |
| Documentation | `README.md` with setup in <10 commands; `CONTRIBUTING.md`; inline API docs via FastAPI /docs |

#### Milestone — Phase 5 Complete

> `pytest --cov` reports ≥ 90% coverage; zero tests skipped except GPU-gated.  
> Playwright suite runs all scenarios against a fully local Docker Compose stack with no external API calls; no test uses a mocked generation response.  
> `k6 run load_test.js` sustains 50 concurrent users on the generation endpoint with p95 latency < 2s (excluding actual inference time).  
> No `# TODO`, `# FIXME`, or `# HACK` comments remain in merged production code.

---

## 3. Task Breakdown

### Phase 0 Tasks

| Task ID | Task Name | Est. Hours | Dependencies | Component | Acceptance Criteria |
|---------|-----------|------------|--------------|-----------|---------------------|
| P0-001 | Monorepo directory structure setup | 2 | — | Infra | `frontend/`, `backend/`, `docs/`, `docker/` dirs exist; root `package.json` with workspaces |
| P0-002 | Vite + React + TypeScript scaffold | 3 | P0-001 | Frontend | `npm run dev` starts on :5173; `npm run build` succeeds; `tsc --noEmit` passes |
| P0-003 | FastAPI + Python 3.11 scaffold | 3 | P0-001 | Backend | `uvicorn app.main:app --reload` starts; `GET /` returns 200; mypy passes on `app/` |
| P0-004 | Docker Compose: PostgreSQL + Redis + MinIO | 4 | P0-001 | Infra | `docker compose up db redis minio` starts all three; health checks pass |
| P0-005 | Docker Compose: Backend + Frontend + Worker | 3 | P0-003, P0-004 | Infra | Full `docker compose up` starts all services; frontend proxies API calls to backend |
| P0-006 | SQLAlchemy models: User, Project, GenerationJob | 4 | P0-004 | Backend | Models importable; relationships defined; `Base.metadata.create_all()` runs without error |
| P0-007 | SQLAlchemy models: SceneDocument, Layer, EditOperation, Asset, UsageRecord | 4 | P0-006 | Backend | All models added; foreign keys correct; no circular import |
| P0-008 | Alembic migration setup + initial migration | 3 | P0-007 | Backend | `alembic upgrade head` applies all tables to fresh DB; `alembic downgrade base` reverts cleanly |
| P0-009 | JWT auth: register endpoint | 3 | P0-006 | Backend | `POST /api/v1/auth/register` creates user, returns JWT; duplicate email returns 409 |
| P0-010 | JWT auth: login + refresh endpoints | 3 | P0-009 | Backend | `POST /api/v1/auth/login` returns access + refresh tokens; `POST /api/v1/auth/refresh` rotates tokens |
| P0-011 | Auth middleware (protected routes) | 2 | P0-010 | Backend | `Authorization: Bearer <token>` grants access; missing/expired token returns 401 |
| P0-012 | Health check endpoint | 1 | P0-004 | Backend | `GET /api/v1/health` returns DB, Redis, and MinIO connectivity status |
| P0-013 | React Router setup + route shells | 3 | P0-002 | Frontend | All 6 routes render without errors; unknown route shows 404 page |
| P0-014 | Tailwind CSS + base layout components | 3 | P0-013 | Frontend | Sidebar, Topbar, ContentArea components exist; Tailwind classes applied; no CSS conflicts |
| P0-015 | GitHub Actions CI pipeline | 4 | P0-002, P0-003 | Infra | Pipeline runs on PR; fails on lint error, type error, or test failure; passes on clean branch |
| P0-016 | `.env.example` + environment validation | 2 | P0-005 | Infra | All 20+ required vars documented; `pydantic-settings` validates on startup; missing var crashes with clear message |

### Phase 1 Tasks

| Task ID | Task Name | Est. Hours | Dependencies | Component | Acceptance Criteria |
|---------|-----------|------------|--------------|-----------|---------------------|
| P1-001 | `BaseImageProvider` abstract class | 3 | P0-003 | AI | Interface defines `generate(prompt, params) → ImageResult`; fully typed; docstrings |
| P1-002 | `LocalDiffusersProvider` implementation (FLUX.1-dev) | 8 | P1-001 | AI | Loads FLUX.1-dev; `generate()` returns a real PIL image; tested on GPU/MPS hardware, NOT mocked |
| P1-003 | Celery app setup + Redis broker config | 3 | P0-004 | Backend | `celery -A app.worker inspect ping` responds; task routing configured |
| P1-004 | `generate_image` Celery task | 5 | P1-002, P1-003 | AI/Backend | Task accepts job_id; loads provider; runs inference; uploads result to MinIO; updates job status in DB |
| P1-005 | `POST /api/v1/generate/text-to-image` endpoint | 4 | P1-004 | Backend | Creates GenerationJob record (PENDING); dispatches Celery task; returns `{job_id}`; validates all params |
| P1-006 | GenerationJob state machine | 3 | P1-004 | Backend | State transitions enforced: PENDING→QUEUED→RUNNING→COMPLETED/FAILED; invalid transitions rejected |
| P1-007 | Redis pub/sub for job progress events | 3 | P1-004 | Backend | Worker publishes `{step, total_steps, status}` to `job:{job_id}` channel at each diffusion step |
| P1-008 | SSE endpoint `GET /api/v1/jobs/{job_id}/stream` | 4 | P1-007 | Backend | Returns `text/event-stream`; streams progress events; sends `event: complete` with image URL on finish |
| P1-009 | MinIO image upload + pre-signed URL generation | 3 | P0-004 | Backend | Generated image uploaded to `images/` bucket; pre-signed URL valid for 1 hour; URL returned in job result |
| P1-010 | 3-panel workspace layout (Frontend) | 5 | P0-013 | Frontend | Left panel (tools/settings), center canvas, right panel (properties) render correctly at 1280px+ |
| P1-011 | Prompt textarea + negative prompt + generate button | 3 | P1-010 | Frontend | Textarea auto-resizes; negative prompt toggle shows/hides field; button disabled during generation |
| P1-012 | Aspect ratio + resolution selector | 2 | P1-011 | Frontend | Presets: 1:1 (1024×1024), 16:9 (1280×720), 9:16 (720×1280), 4:3; selection updates job params |
| P1-013 | `useJobProgress` SSE hook | 4 | P1-008 | Frontend | Hook connects to SSE stream; exposes `{progress, status, imageUrl}`; cleans up on unmount |
| P1-014 | Progress bar + status display | 2 | P1-013 | Frontend | Bar fills from 0–100% based on `step/total_steps`; status text shows QUEUED/RUNNING/DONE/FAILED |
| P1-015 | Generated image display in canvas | 3 | P1-013 | Frontend | On `event: complete`, displays full-resolution image centered in canvas; download button appears |
| P1-016 | TanStack Query setup + API client | 3 | P0-013 | Frontend | Axios instance with auth header interceptor; `QueryClientProvider` wrapping app; dev tools enabled |

### Phase 2 Tasks

| Task ID | Task Name | Est. Hours | Dependencies | Component | Acceptance Criteria |
|---------|-----------|------------|--------------|-----------|---------------------|
| P2-001 | Image upload endpoint (multipart) | 4 | P0-012 | Backend | Accepts PNG/JPG/WEBP up to 20MB; validates magic bytes; stores in MinIO; returns `{asset_id, url}` |
| P2-002 | Image-to-image Celery task | 5 | P1-004, P2-001 | AI/Backend | Loads source image from MinIO; runs real img2img inference; stores result; NOT a passthrough |
| P2-003 | `POST /api/v1/generate/image-to-image` endpoint | 3 | P2-002 | Backend | Accepts `source_asset_id`, `prompt`, `strength` (0.0–1.0), `guidance_scale`; returns `{job_id}` |
| P2-004 | Inpainting Celery task | 6 | P1-004 | AI/Backend | Accepts source image + mask PNG; runs real inpainting inference (not compositing); stores result |
| P2-005 | `POST /api/v1/generate/inpaint` endpoint | 3 | P2-004 | Backend | Accepts `source_asset_id`, `mask_asset_id`, `prompt`, `guidance_scale`; returns `{job_id}` |
| P2-006 | Outpainting Celery task | 5 | P1-004 | AI/Backend | Pads source image with neutral border; runs outpainting pipeline; returns expanded image at correct dimensions |
| P2-007 | `POST /api/v1/generate/outpaint` endpoint | 3 | P2-006 | Backend | Accepts `source_asset_id`, `direction` (top/bottom/left/right/all), `expand_px`; returns `{job_id}` |
| P2-008 | Konva canvas workspace (Frontend) | 6 | P1-010 | Frontend | `react-konva` Stage/Layer setup; image renders at correct scale; pan with space+drag; zoom with scroll |
| P2-009 | Brush tool (draw mask) | 5 | P2-008 | Frontend | Mouse down/move draws on mask layer; adjustable radius (slider 2–100px); smooth stroke rendering |
| P2-010 | Eraser tool (erase mask) | 2 | P2-009 | Frontend | Switches to erase mode; removes painted mask pixels; undo-able |
| P2-011 | Mask overlay display | 2 | P2-009 | Frontend | Mask renders as semi-transparent red (rgba 255,0,0,0.5) over source image in Konva |
| P2-012 | Inpaint UI workflow | 4 | P2-005, P2-011 | Frontend | "Inpaint" button: serializes mask canvas to PNG blob; uploads to `/images/upload`; submits inpaint request; SSE result |
| P2-013 | Image-to-image panel UI | 4 | P2-003, P2-008 | Frontend | Upload source image panel; strength slider; transform button; SSE result display |
| P2-014 | Outpaint panel UI | 3 | P2-007, P2-008 | Frontend | Direction selector (arrow buttons); expansion size input; preview border highlight; submit + SSE result |

### Phase 3 Tasks

| Task ID | Task Name | Est. Hours | Dependencies | Component | Acceptance Criteria |
|---------|-----------|------------|--------------|-----------|---------------------|
| P3-001 | SceneDocument JSON schema + SQLAlchemy model | 4 | P0-007 | Backend | Schema versioned (v1); validates layer array; `scene_data` stored as JSONB; migration written |
| P3-002 | Layer CRUD API endpoints | 5 | P3-001 | Backend | Full REST: list, create, update (position/size/rotation/opacity/visibility/lock), delete; all return layer objects |
| P3-003 | Scene save/load endpoints | 3 | P3-001 | Backend | `PUT /scenes/{id}` overwrites full document; `GET /scenes/{id}` returns full document with layers |
| P3-004 | EditOperation recording | 2 | P3-002 | Backend | Every layer mutation creates an `EditOperation` record (user_id, scene_id, op_type, payload, timestamp) |
| P3-005 | Konva layer renderer: raster layers | 4 | P2-008 | Frontend | `Image` Konva node renders at stored position/size/rotation/opacity; updates live on prop change |
| P3-006 | Konva layer renderer: text layers | 4 | P3-005 | Frontend | `Text` Konva node with configurable fontFamily, fontSize, fill, align; double-click to edit inline |
| P3-007 | Konva layer renderer: shape layers | 3 | P3-005 | Frontend | Rect, Ellipse Konva nodes; fill, stroke, strokeWidth configurable |
| P3-008 | Layer panel: list + visibility + lock | 4 | P3-005 | Frontend | Layer list reflects z-order; eye icon toggles `visible`; lock icon prevents selection; updates Konva |
| P3-009 | Layer panel: drag-to-reorder | 3 | P3-008 | Frontend | @dnd-kit drag reorders layers; Konva z-index updates immediately; reorder persisted via API |
| P3-010 | Layer panel: delete layer | 1 | P3-008 | Frontend | Delete button (with confirmation) removes layer from Konva stage and DB; undo restores it |
| P3-011 | Properties panel (position, size, rotation, opacity) | 5 | P3-005 | Frontend | Numeric inputs + sliders for all 5 properties; live Konva preview; debounced API save |
| P3-012 | Undo/redo stack (Zustand command pattern) | 6 | P3-005 | Frontend | Each edit creates a Command with `execute()/undo()`; Ctrl+Z / Ctrl+Shift+Z work; stack capped at 50 |
| P3-013 | Text layer editor UI | 4 | P3-006 | Frontend | Font family picker (Google Fonts); size spinner; bold/italic/underline toggles; color picker; alignment buttons |

### Phase 4 Tasks

| Task ID | Task Name | Est. Hours | Dependencies | Component | Acceptance Criteria |
|---------|-----------|------------|--------------|-----------|---------------------|
| P4-001 | Reference image upload panel UI | 4 | P2-001 | Frontend | Upload up to 5 images; each shows thumbnail + @1–@5 label; role dropdown (subject/style/composition/color/character); strength slider |
| P4-002 | Reference conditioning Celery task | 8 | P1-004, P4-001 | AI/Backend | Runs real model inference with IP-Adapter or reference conditioning; each reference image influences output; NOT placeholder |
| P4-003 | `POST /api/v1/generate/reference` endpoint | 3 | P4-002 | Backend | Accepts `prompt`, `references[]` (asset_id, role, strength); dispatches reference task; returns `{job_id}` |
| P4-004 | Google Fonts browser in typography panel | 4 | P3-006 | Frontend | Searchable font list; preview text renders in selected font; selected font stored in layer |
| P4-005 | Generation history API (paginated) | 3 | P1-005 | Backend | `GET /api/v1/jobs?page=&per_page=&search=&model=&date_from=&date_to=` returns paginated results with thumbnails |
| P4-006 | History UI: infinite scroll gallery | 5 | P4-005 | Frontend | Masonry grid; loads next page on scroll; each card shows prompt, thumbnail, model, date; click to open in workspace |
| P4-007 | Project gallery API | 2 | P0-006 | Backend | `GET/POST/PATCH/DELETE /api/v1/projects`; each project has name, thumbnail (latest job image), created_at |
| P4-008 | Project gallery UI (masonry grid) | 4 | P4-007 | Frontend | Projects grid; create dialog; rename inline; delete with confirm; thumbnail updates on new generation |
| P4-009 | Asset library API | 3 | P2-001 | Backend | `GET /api/v1/assets` returns paginated uploaded assets with thumbnail URLs; `DELETE /api/v1/assets/{id}` |
| P4-010 | Asset library UI panel | 4 | P4-009 | Frontend | Scrollable grid of thumbnails; search by name; drag-to-canvas creates raster layer; delete button |
| P4-011 | Model settings UI | 4 | P1-005 | Frontend | Collapsible panel: model selector, scheduler dropdown, CFG scale slider (1–20), steps slider (1–100), seed input |
| P4-012 | Usage tracking: API + DB | 2 | P0-007 | Backend | Every generation inserts a `UsageRecord` (user, model, steps, timestamp); `GET /api/v1/usage` aggregates by day/model |
| P4-013 | Usage dashboard widget | 2 | P4-012 | Frontend | Sidebar widget shows images generated today / this month; mini chart of daily usage |
| P4-014 | Prompt enhancement endpoint | 4 | P1-005 | Backend | `POST /api/v1/prompt/enhance` calls configured LLM (GPT-4o or local); returns enhanced prompt string; opt-in |
| P4-015 | Prompt enhancement UI | 2 | P4-014 | Frontend | ✨ button next to prompt textarea; replaces prompt text with enhanced version; can be undone (Ctrl+Z in textarea) |

### Phase 5 Tasks

| Task ID | Task Name | Est. Hours | Dependencies | Component | Acceptance Criteria |
|---------|-----------|------------|--------------|-----------|---------------------|
| P5-001 | Backend pytest suite (unit layer) | 10 | All P0–P4 backend | Backend | All service functions and utilities have unit tests; ≥ 90% line coverage per module |
| P5-002 | Backend pytest suite (integration layer) | 12 | P5-001 | Backend | Every API endpoint tested with real PostgreSQL + Redis + MinIO (testcontainers); no mocking of infrastructure |
| P5-003 | GPU inference integration tests | 6 | P5-002 | AI | `@pytest.mark.gpu` tests: text-to-image, inpaint, img2img each call real `LocalDiffusersProvider`; assert image is non-empty PIL Image |
| P5-004 | Frontend Vitest component tests | 10 | All P0–P4 frontend | Frontend | All React components tested; ≥ 80% branch coverage; no snapshot-only tests |
| P5-005 | Playwright E2E: full generation flow | 4 | P5-004 | Frontend | Script: register → login → type prompt → generate → wait for image → assert canvas displays real image |
| P5-006 | Playwright E2E: inpainting workflow | 4 | P5-004 | Frontend | Script: upload image → draw mask → type prompt → inpaint → assert new image differs from source |
| P5-007 | Playwright E2E: layer editing + undo | 3 | P5-004 | Frontend | Script: add text layer → reposition → undo → assert position reverted → save → reload → assert persisted |
| P5-008 | Playwright E2E: auth + project CRUD | 2 | P5-004 | Frontend | Script: register → create project → rename → delete → assert removed |
| P5-009 | Image lazy loading + virtualization | 4 | P4-006 | Frontend | History gallery uses `IntersectionObserver`; images outside viewport have no src; Lighthouse perf ≥ 85 |
| P5-010 | API response caching (Redis) | 3 | P4-005 | Backend | Read-only list endpoints cached in Redis with 60s TTL; cache-control headers set |
| P5-011 | Error boundary implementation | 3 | All Frontend | Frontend | `ErrorBoundary` on canvas, layer panel, properties panel; caught errors show friendly message + retry |
| P5-012 | Rate limiting middleware | 3 | P1-005 | Backend | FastAPI middleware: 10 req/min on `/generate/*`; 429 + `Retry-After` header on breach; tested in integration suite |
| P5-013 | Security audit + hardening | 6 | All | Infra | CORS whitelist; CSP headers; file magic-byte validation; `bandit` scan passes; `pip-audit` passes |
| P5-014 | Kubernetes manifests (optional) | 6 | P5-013 | Infra | Deployment + Service for backend, worker, frontend; HPA on worker; PVC for MinIO; manifests lint with `kubeval` |
| P5-015 | README + onboarding documentation | 4 | All | Docs | Setup from scratch in ≤ 10 commands; all env vars explained; troubleshooting section covers 5 common errors |

---

## 4. Dependencies Map

### Critical Path

```
P0-001 → P0-002 → P0-013 → P1-010 → P2-008 → P3-005 → P3-012 → P5-004 → P5-005..P5-008
                                                        ↗
P0-004 → P0-006 → P0-007 → P0-008
                 ↓
P0-009 → P0-010 → P0-011
                 ↓
         P1-001 → P1-002 → P1-004 → P1-005 → P1-007 → P1-008 → P1-013 → P1-015
                                   ↓
                            P2-002 → P2-003
                            P2-004 → P2-005
                            P2-006 → P2-007
                                   ↓
                            P3-001 → P3-002 → P3-004
                                   ↓
                            P4-002 → P4-003
```

### Key Blocking Dependencies

| Blocked Task | Blocked By | Reason |
|---|---|---|
| P1-004 (Celery task) | P1-002 (LocalDiffusersProvider) | Task must call real model, cannot proceed without working provider |
| P2-004 (Inpainting task) | P1-004 | Shares task infrastructure; inpainting is an extension of base generation |
| P3-012 (Undo/redo) | P3-005 (Konva renderer) | Nothing to undo until layers exist in Konva |
| P4-002 (Reference task) | P1-004 | Reference conditioning extends the generation task pipeline |
| P5-003 (GPU tests) | P5-002 (Integration tests) | GPU tests extend the integration test fixture setup |
| P5-005..P5-008 (E2E) | P5-004 (Component tests) | E2E builds on stable component behavior established by unit tests |

---

## 5. Testing Strategy

### Test Pyramid

```
                    ┌─────────────┐
                    │  E2E Tests  │  Playwright (8 scenarios)
                    │  (slowest)  │
                  ┌─┴─────────────┴─┐
                  │ Integration Tests│  pytest + real DB/Redis/MinIO
                  │                  │  Vitest API-integrated components
                ┌─┴──────────────────┴─┐
                │      Unit Tests       │  pytest (pure functions)
                │      (fastest)        │  Vitest (components, hooks)
              ┌─┴───────────────────────┴─┐
              │     Static Analysis        │  mypy, Ruff, ESLint, tsc
              └─────────────────────────────┘
```

### Layer-by-Layer Strategy

#### Unit Tests
- **Backend:** Pure functions, Pydantic validators, SQLAlchemy model methods, provider interface logic, state machine transitions
- **Frontend:** Utility functions, custom hooks (with mocked fetch), Zustand store reducers, command-pattern undo/redo stack
- **Tools:** pytest (Python), Vitest (TypeScript/React)
- **Coverage targets:** Backend ≥ 90%, Frontend ≥ 80%

#### Integration Tests
- **Backend:** Every FastAPI route tested against `testcontainers`-managed PostgreSQL, Redis, and MinIO
- **Auth flows:** Registration, login, token refresh, protected route rejection
- **Generation endpoints:** Create job → Celery task → status polling → result retrieval (with mock AI provider for speed, plus real AI for GPU-gated tests)
- **Storage:** Actual file upload to MinIO test bucket; pre-signed URL retrieval and verification
- **Frontend:** TanStack Query hooks tested against MSW (Mock Service Worker) for HTTP layer; Konva canvas interactions tested with `@testing-library/user-event`

#### AI Inference Tests
- Marked `@pytest.mark.gpu` and skipped automatically in CI environments without GPU
- Run on dedicated GPU runner or manually before release
- Each test asserts on **actual generated image properties** (not just "no exception raised"):
  - Output is a valid PIL Image
  - Dimensions match requested output size
  - Image contains non-uniform pixel data (is not blank)
  - Different seeds produce different outputs
- **Rule:** No generation feature may be declared complete unless a GPU inference test exists and passes for it

#### E2E Tests (Playwright)
| Scenario | Description |
|---|---|
| `auth.spec.ts` | Register, login, logout, protected route redirect |
| `generate.spec.ts` | Full text-to-image: prompt → generate → real image in canvas |
| `inpaint.spec.ts` | Upload → brush mask → inpaint → result displayed |
| `outpaint.spec.ts` | Upload → outpaint right → wider image returned |
| `img2img.spec.ts` | Upload source → transform → result differs from source |
| `layers.spec.ts` | Multi-layer compose, undo/redo, save, reload |
| `history.spec.ts` | Infinite scroll, search filter, open from history |
| `projects.spec.ts` | Create, rename, delete project; thumbnail updates |

#### Performance Tests (k6)
```javascript
// load_test.js target thresholds
http_req_duration: ['p(95)<2000'],  // excluding inference time
http_req_failed:   ['rate<0.01'],
vus: 50, duration: '5m'
```

---

## 6. Definition of Done

A feature is **Done** when ALL of the following are true:

| # | Criterion | Detail |
|---|---|---|
| 1 | **Code written and reviewed** | PR reviewed by at least one other developer; no open change requests |
| 2 | **Unit tests written and passing** | New code has unit test coverage; `pytest` / `vitest` green locally and in CI |
| 3 | **Integration tests written and passing** | API endpoints tested against real infrastructure (PostgreSQL, Redis, MinIO via testcontainers) |
| 4 | **AI features: real inference tested** | GPU inference test exists and passes; feature does NOT rely on mocked generation output |
| 5 | **No hardcoded images or fake generation** | `grep -r "placeholder\|fake_image\|mock_generate\|TODO.*real"` returns nothing in feature code |
| 6 | **Error handling implemented and tested** | 400/401/404/422/429/500 responses are tested; frontend shows appropriate error state/toast |
| 7 | **Loading states implemented** | Skeleton loaders or spinners shown during all async operations; button disabled during in-flight requests |
| 8 | **UI matches specification** | Reviewed against TRD component specs; no missing controls; no broken layout |
| 9 | **Responsive at 1280px+** | Manual check at 1280px, 1440px, 1920px; no horizontal scroll; panels reflow correctly |
| 10 | **Performance within targets** | API response (excluding inference) < 200ms p95; Lighthouse ≥ 85; canvas renders 50 layers at 60fps |

---

## 7. MVP Completion Criteria

The product is considered a **shippable MVP** when every checkbox below is checked:

### Core Generation
- [ ] User can register and log in with email/password
- [ ] User can type a text prompt and generate a real AI image (FLUX.1-dev or SDXL, real model, not mocked)
- [ ] User can set aspect ratio, steps, CFG scale, and seed before generating
- [ ] Generation progress is displayed in real time via SSE (step count / total)
- [ ] Generated image is stored in S3/MinIO and displayed in the canvas
- [ ] User can download the generated image

### Image Editing
- [ ] User can upload an image (PNG/JPG/WEBP, ≤ 20MB)
- [ ] User can run image-to-image transformation on an uploaded image
- [ ] User can draw a brush mask over an uploaded image and inpaint a region
- [ ] User can outpaint an image to expand its canvas in any direction
- [ ] All editing operations produce real AI inference results, not client-side compositing

### Layer Editor
- [ ] User can create a multi-layer scene with raster image layers and text layers
- [ ] User can reposition, resize, rotate, and adjust opacity of any layer
- [ ] User can toggle visibility and lock state of any layer
- [ ] User can reorder layers by dragging in the layer panel
- [ ] User can undo and redo any layer operation (Ctrl+Z / Ctrl+Shift+Z)
- [ ] User can save a scene and reload it with all layers intact

### Advanced Features
- [ ] User can upload up to 5 reference images and use them in a generation request
- [ ] User can browse generation history with infinite scroll and keyword search
- [ ] User can organize work into named projects
- [ ] User can upload and browse an asset library; assets can be inserted into the canvas
- [ ] User can select model, scheduler, and generation parameters from the UI

### Quality & Reliability
- [ ] All backend API tests pass with ≥ 90% coverage (real DB, real Redis, real MinIO)
- [ ] All frontend component tests pass with ≥ 80% coverage
- [ ] All 8 Playwright E2E scenarios pass against a local Docker Compose stack
- [ ] GPU inference tests exist and pass for text-to-image, inpainting, image-to-image, and reference generation
- [ ] No `TODO`, `FIXME`, or `# fake` comments remain in production code paths
- [ ] Rate limiting enforced on generation endpoints (10 req/min)
- [ ] File type validation uses magic bytes (not just MIME header)
- [ ] README enables a new developer to run the full stack from scratch in ≤ 10 commands

---

## 8. Future Enhancements (V2/V3)

### V2 Roadmap

| Feature | Description | Complexity |
|---|---|---|
| **Video Generation** | Text-to-video and image-to-video using CogVideoX or Wan2.1; timeline editor for frame control | Very High |
| **Real-Time Collaborative Editing** | WebSocket-based multi-user scene editing with operational transform (OT) or CRDTs; cursor presence indicators | Very High |
| **Custom Model Fine-Tuning** | LoRA training UI: upload subject images, trigger a fine-tune job, use the LoRA in generation | High |
| **Advanced Batch Processing** | Generate N variations in parallel; batch inpaint across a set of images; bulk export | Medium |
| **API Access for Developers** | REST API with API key auth; SDK (Python, JavaScript); usage metering per key; webhook callbacks | High |

### V3 Roadmap

| Feature | Description | Complexity |
|---|---|---|
| **Mobile App** | React Native app for prompt-to-image generation and gallery browsing (iOS + Android) | Very High |
| **Plugin / Extension System** | Marketplace for custom tools, custom providers, and custom panels; sandboxed iframe plugin API | Very High |
| **3D Object Integration** | Import GLTF/OBJ; render-to-image pipeline; use 3D render as reference image conditioning input | Very High |
| **AI-Assisted Prompt Builder** | Structured prompt composer (subject, style, lighting, camera, mood fields) with real-time preview | Medium |
| **Content Moderation Layer** | SafetyChecker integration; NSFW classification; configurable content policy per workspace | Medium |

---

## 9. Risk Register

| # | Risk | Probability | Impact | Mitigation Strategy |
|---|---|---|---|---|
| R-01 | **GPU/VRAM Availability** — Local GPU with insufficient VRAM (FLUX.1-dev requires 16+ GB VRAM in full precision) | High | Critical | Support 8-bit and 4-bit quantization via `bitsandbytes`; offer cloud provider fallback (Replicate, Together AI) via `BaseImageProvider` abstraction; document minimum hardware specs clearly |
| R-02 | **Model Licensing Changes** — FLUX.1-dev or SDXL license terms change, restricting commercial use | Medium | High | Architecture uses provider abstraction; swap model in one file; maintain a whitelist of verified open-weight models; legal review before production launch |
| R-03 | **Provider API Rate Limits** — Cloud AI provider (Replicate, Stability) throttles requests under load | Medium | High | Implement exponential backoff in Celery retry policy (max 3 retries, delays 10s/30s/90s); queue-side rate limiter; show user estimated wait time |
| R-04 | **Large File Storage Costs** — Generated images at 1024×1024 PNG accumulate rapidly; 10K users generating daily = hundreds of GB/month | Medium | Medium | Implement per-user storage quota; auto-convert PNG to JPEG (quality 92) for history thumbnails; lifecycle policy to archive images older than 90 days to cold storage |
| R-05 | **Celery Worker Failures** — Worker crashes mid-task leaving jobs in RUNNING state forever | Medium | High | `task_acks_late = True`; visibility timeout tuned to max inference time + buffer; dead-letter queue for failed tasks; `/api/v1/jobs/{id}` poll endpoint as SSE fallback |
| R-06 | **Database Migration Failures** — Alembic migration fails on production DB with live data | Low | Critical | Test migrations on production DB snapshot before deploy; run migrations in a transaction; maintain rollback migration; staging environment identical to production |
| R-07 | **Inference Latency Degradation** — Model inference time increases under load; p95 inference exceeds 120s | Medium | Medium | Queue depth monitoring and alerting; auto-scale Celery workers on queue depth (k8s HPA); expose honest wait time estimates to the user; model caching to avoid reload on each task |
| R-08 | **Frontend Canvas Performance** — Konva canvas with 50+ layers or large images slows to < 30fps | Medium | Medium | Virtual layer rendering (only render visible layers); use `requestAnimationFrame` for transform operations; offscreen canvas for mask drawing; profile with Chrome Performance tab at 50-layer benchmark |
| R-09 | **Security Vulnerabilities in File Uploads** — Malicious file uploads (polyglot files, zip bombs, SVG XSS) | Low | High | Magic-byte validation on all uploads; file size cap enforced at nginx/FastAPI level before reading body; never serve uploaded files as HTML; store files in isolated MinIO bucket with no public execute permissions |
| R-10 | **Dependency Supply Chain Attacks** — Malicious package versions introduced via PyPI or npm | Low | High | Pin all dependencies to exact versions in `requirements.txt` and `package-lock.json`; `pip-audit` and `npm audit` run in CI; Dependabot PRs reviewed before merge |

---

## 10. Environment Setup Guide

### Prerequisites

Ensure the following are installed before starting:

| Tool | Minimum Version | Install |
|---|---|---|
| Docker Desktop | 24.x | https://docs.docker.com/desktop/ |
| Docker Compose | v2.x (included in Docker Desktop) | — |
| Node.js | 20.x LTS | https://nodejs.org |
| Python | 3.11.x | https://www.python.org |
| Git | 2.40+ | https://git-scm.com |
| CUDA Toolkit *(GPU only)* | 12.x | https://developer.nvidia.com/cuda-downloads |

### Step-by-Step Setup

#### 1. Clone the Repository
```bash
git clone https://github.com/your-org/reve-platform.git
cd reve-platform
```

#### 2. Configure Environment Variables
```bash
cp .env.example .env
# Edit .env — required variables:
#   DATABASE_URL=postgresql+asyncpg://reve:reve@localhost:5432/reve
#   REDIS_URL=redis://localhost:6379/0
#   MINIO_ENDPOINT=localhost:9000
#   MINIO_ACCESS_KEY=minioadmin
#   MINIO_SECRET_KEY=minioadmin
#   MINIO_BUCKET_NAME=reve-images
#   JWT_SECRET_KEY=<generate with: python -c "import secrets; print(secrets.token_hex(32))">
#   JWT_ALGORITHM=HS256
#   JWT_EXPIRE_MINUTES=60
#   HF_MODEL_ID=black-forest-labs/FLUX.1-dev    # or stabilityai/stable-diffusion-xl-base-1.0
#   HF_TOKEN=<your Hugging Face token for gated models>
#   CELERY_BROKER_URL=redis://localhost:6379/1
#   CELERY_RESULT_BACKEND=redis://localhost:6379/2
#   CORS_ORIGINS=http://localhost:5173
#   MAX_FILE_SIZE_MB=20
```

#### 3. Start Infrastructure Services
```bash
docker compose up -d db redis minio
# Wait ~15 seconds for PostgreSQL to be ready
docker compose ps   # all three should show "healthy"
```

#### 4. Install Backend Dependencies
```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

#### 5. Run Database Migrations
```bash
# Still in backend/ with venv activated
alembic upgrade head
# Expected output: "Running upgrade -> <rev_id>, Initial migration"
```

#### 6. Download AI Model Weights
```bash
# This downloads ~24GB for FLUX.1-dev (or ~6.5GB for SDXL) to ~/.cache/huggingface
python -c "
from diffusers import FluxPipeline
import os
FluxPipeline.from_pretrained(os.getenv('HF_MODEL_ID'), token=os.getenv('HF_TOKEN'))
print('Model downloaded successfully')
"
# For SDXL alternative (faster, lower VRAM):
# python -c "from diffusers import StableDiffusionXLPipeline; StableDiffusionXLPipeline.from_pretrained('stabilityai/stable-diffusion-xl-base-1.0')"
```

#### 7. Start Backend and Celery Worker
```bash
# Terminal 1 — FastAPI
cd backend && source .venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2 — Celery Worker (requires GPU for inference)
cd backend && source .venv/bin/activate
celery -A app.worker worker --loglevel=info --concurrency=1
```

#### 8. Install Frontend Dependencies and Start Dev Server
```bash
# Terminal 3
cd frontend
npm install
npm run dev
# Frontend available at http://localhost:5173
```

#### 9. Verify Everything is Running
```bash
# Health check
curl http://localhost:8000/api/v1/health
# Expected: {"status":"ok","db":"connected","redis":"connected","storage":"connected"}

# Frontend
open http://localhost:5173   # or navigate manually
```

#### 10. Run the Test Suite
```bash
# Backend unit + integration tests (no GPU required)
cd backend && pytest --cov=app --cov-report=term-missing -x

# Frontend component tests
cd frontend && npm run test

# E2E tests (requires all services running)
cd frontend && npx playwright install chromium
npx playwright test

# GPU inference tests (requires GPU)
cd backend && pytest -m gpu --cov=app -x
```

### Troubleshooting Common Issues

| Issue | Cause | Fix |
|---|---|---|
| `Connection refused` on `localhost:5432` | PostgreSQL container not ready | Wait 20s after `docker compose up`; check `docker compose logs db` |
| `CUDA out of memory` | VRAM < 16GB for FLUX.1-dev | Add `load_in_8bit=True` to provider init; switch to SDXL for lower VRAM |
| `401 Unauthorized` on all API calls | JWT secret mismatch between backend restarts | Ensure `JWT_SECRET_KEY` is consistent in `.env`; clear browser localStorage |
| Celery tasks stuck in PENDING | Worker not running or wrong broker URL | Confirm `celery -A app.worker inspect ping` succeeds; check `CELERY_BROKER_URL` |
| MinIO bucket not found | Bucket not auto-created | Backend creates bucket on startup; check `docker compose logs backend` for bucket creation log |

---

*Document generated by the Reve Platform Engineering team. For questions, open an issue in the project repository or contact the Engineering Lead.*
