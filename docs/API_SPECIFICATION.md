# API Specification — Reve-Inspired AI Image Generation & Visual Editing Platform

**Version:** 1.0.0  
**Last Updated:** 2026-11-17  
**Base URL:** `/api/v1`  
**Format:** REST / JSON + SSE  

---

## Table of Contents

1. [API Conventions](#1-api-conventions)
2. [Authentication Endpoints](#2-authentication-endpoints)
3. [User Endpoints](#3-user-endpoints)
4. [Project Endpoints](#4-project-endpoints)
5. [Generation Endpoints](#5-generation-endpoints)
6. [Generation Job Endpoints](#6-generation-job-endpoints)
7. [Image Upload Endpoints](#7-image-upload-endpoints)
8. [Reference Image Endpoints](#8-reference-image-endpoints)
9. [Layer and Scene Document Endpoints](#9-layer-and-scene-document-endpoints)
10. [Asset Endpoints](#10-asset-endpoints)
11. [Model Provider Endpoints](#11-model-provider-endpoints)
12. [WebSocket / SSE Event Reference](#12-websocket--sse-event-reference)
13. [Error Codes Reference](#13-error-codes-reference)
14. [Rate Limiting](#14-rate-limiting)

---

## 1. API Conventions

### Base URL

```
https://<host>/api/v1
```

All paths in this document are relative to this base.

### Authentication

Every protected endpoint requires a Bearer JWT in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

JWTs are short-lived (15 minutes). Use `POST /auth/refresh` with the HTTP-only `refresh_token` cookie to obtain a new access token.

### Content-Type

| Scenario | Content-Type |
|---|---|
| JSON body requests | `application/json` |
| File uploads | `multipart/form-data` |
| SSE streams | `text/event-stream` |

### Pagination

All list endpoints use **cursor-based pagination**:

**Query Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `cursor` | string | null | Opaque cursor from previous response |
| `limit` | integer | 20 | Items per page (max 100) |

**Response envelope for lists:**

```json
{
  "data": [...],
  "pagination": {
    "cursor": "eyJpZCI6IjEyMyJ9",
    "has_more": true,
    "total_count": 150
  }
}
```

### Timestamps

All timestamps are **ISO 8601 UTC** strings:

```
2026-11-17T04:07:42Z
```

### Error Format

All errors follow this envelope:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description of the error.",
    "details": {
      "field": "prompt",
      "reason": "must not be empty"
    }
  }
}
```

### HTTP Status Codes

| Code | Meaning |
|---|---|
| 200 | OK — Successful GET, PATCH, DELETE |
| 201 | Created — Successful POST that creates a resource |
| 400 | Bad Request — Malformed JSON or missing required fields |
| 401 | Unauthorized — Missing or invalid JWT |
| 403 | Forbidden — Valid JWT but insufficient permissions |
| 404 | Not Found — Resource does not exist |
| 409 | Conflict — Duplicate resource (e.g., email already registered) |
| 422 | Unprocessable Entity — Field-level validation failure |
| 429 | Too Many Requests — Rate limit exceeded |
| 500 | Internal Server Error — Unexpected server failure |
| 503 | Service Unavailable — AI provider offline or overloaded |

---

## 2. Authentication Endpoints

### POST /api/v1/auth/register

Register a new user account.

**Request:**

```json
{
  "email": "alice@example.com",
  "password": "S3cur3P@ssw0rd!",
  "display_name": "Alice Maker",
  "accept_terms": true
}
```

**Response `201`:**

```json
{
  "user": {
    "id": "usr_01HZ9X7KQPBC4N",
    "email": "alice@example.com",
    "display_name": "Alice Maker",
    "avatar_url": null,
    "plan": "free",
    "created_at": "2026-11-17T04:07:42Z"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 900
}
```

**Errors:** `409 AUTH_EMAIL_TAKEN`, `422 VALIDATION_FIELD_INVALID`

---

### POST /api/v1/auth/login

Authenticate with email and password.

**Request:**

```json
{
  "email": "alice@example.com",
  "password": "S3cur3P@ssw0rd!"
}
```

**Response `200`:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 900,
  "user": {
    "id": "usr_01HZ9X7KQPBC4N",
    "email": "alice@example.com",
    "display_name": "Alice Maker",
    "plan": "free"
  }
}
```

> Sets an HTTP-only `refresh_token` cookie (7-day TTL, `SameSite=Strict`).

**Errors:** `401 AUTH_INVALID_CREDENTIALS`, `429 RATE_LIMIT_AUTH`

---

### POST /api/v1/auth/refresh

Exchange a valid refresh token cookie for a new access token.

**Request:** _(no body; refresh token read from cookie)_

**Response `200`:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 900
}
```

**Errors:** `401 AUTH_REFRESH_TOKEN_INVALID`, `401 AUTH_REFRESH_TOKEN_EXPIRED`

---

### POST /api/v1/auth/logout

Invalidate the current refresh token.

**Request:** _(no body)_

**Response `200`:**

```json
{ "message": "Logged out successfully." }
```

---

### GET /api/v1/auth/me

Return the authenticated user's identity.

**Response `200`:**

```json
{
  "id": "usr_01HZ9X7KQPBC4N",
  "email": "alice@example.com",
  "display_name": "Alice Maker",
  "avatar_url": "https://cdn.example.com/avatars/usr_01HZ9X7KQPBC4N.webp",
  "plan": "pro",
  "created_at": "2026-11-17T04:07:42Z",
  "email_verified": true
}
```

---

### POST /api/v1/auth/forgot-password

Send a password-reset email.

**Request:**

```json
{ "email": "alice@example.com" }
```

**Response `200`:** _(always, to prevent email enumeration)_

```json
{ "message": "If that email exists, a reset link has been sent." }
```

---

### POST /api/v1/auth/reset-password

Set a new password using a reset token.

**Request:**

```json
{
  "token": "a1b2c3d4e5f6...",
  "new_password": "N3wS3cur3P@ss!"
}
```

**Response `200`:**

```json
{ "message": "Password updated successfully." }
```

**Errors:** `400 AUTH_RESET_TOKEN_INVALID`, `400 AUTH_RESET_TOKEN_EXPIRED`, `422 VALIDATION_PASSWORD_TOO_WEAK`

---

## 3. User Endpoints

### GET /api/v1/users/me

Retrieve the full user profile.

**Response `200`:**

```json
{
  "id": "usr_01HZ9X7KQPBC4N",
  "email": "alice@example.com",
  "display_name": "Alice Maker",
  "avatar_url": "https://cdn.example.com/avatars/usr_01HZ9X7KQPBC4N.webp",
  "bio": "Digital artist specializing in concept art.",
  "plan": "pro",
  "created_at": "2026-11-17T04:07:42Z",
  "updated_at": "2026-11-17T04:07:42Z"
}
```

---

### PATCH /api/v1/users/me

Update the authenticated user's profile. Only provide fields to change.

**Request:**

```json
{
  "display_name": "Alice M.",
  "bio": "AI artist and prompt engineer.",
  "avatar_url": "https://cdn.example.com/avatars/new.webp"
}
```

**Response `200`:** _(updated user object as above)_

**Errors:** `422 VALIDATION_FIELD_INVALID`

---

### GET /api/v1/users/me/usage

Retrieve current billing period usage statistics.

**Response `200`:**

```json
{
  "period_start": "2026-11-01T00:00:00Z",
  "period_end": "2026-11-30T23:59:59Z",
  "generations": {
    "used": 142,
    "limit": 1000,
    "unit": "images"
  },
  "storage": {
    "used_bytes": 2147483648,
    "limit_bytes": 10737418240
  },
  "api_calls": {
    "used": 892,
    "limit": 50000
  }
}
```

---

### GET /api/v1/users/me/subscription

Retrieve the user's active subscription details.

**Response `200`:**

```json
{
  "plan": "pro",
  "status": "active",
  "current_period_start": "2026-11-01T00:00:00Z",
  "current_period_end": "2026-11-30T23:59:59Z",
  "cancel_at_period_end": false,
  "features": ["unlimited_history", "reference_images", "priority_queue", "api_access"]
}
```

---

## 4. Project Endpoints

### GET /api/v1/projects

List the authenticated user's projects (paginated).

**Query Parameters:** `cursor`, `limit`, `sort` (`created_at`|`updated_at`), `order` (`asc`|`desc`)

**Response `200`:**

```json
{
  "data": [
    {
      "id": "proj_01HZ9X",
      "name": "Fantasy Landscape Series",
      "description": "Concept art for my RPG world.",
      "thumbnail_url": "https://cdn.example.com/thumbs/proj_01HZ9X.webp",
      "generation_count": 47,
      "created_at": "2026-11-01T10:00:00Z",
      "updated_at": "2026-11-15T14:32:00Z"
    }
  ],
  "pagination": { "cursor": "eyJpZCI6InByb2pfMDFIWjlYIn0=", "has_more": false, "total_count": 1 }
}
```

---

### POST /api/v1/projects

Create a new project.

**Request:**

```json
{
  "name": "Product Ad Campaign",
  "description": "Imagery for Q1 product launch."
}
```

**Response `201`:**

```json
{
  "id": "proj_01HZ9Y",
  "name": "Product Ad Campaign",
  "description": "Imagery for Q1 product launch.",
  "thumbnail_url": null,
  "generation_count": 0,
  "created_at": "2026-11-17T04:07:42Z",
  "updated_at": "2026-11-17T04:07:42Z"
}
```

---

### GET /api/v1/projects/{id}

Retrieve a single project.

**Response `200`:** _(full project object as above)_

**Errors:** `404 RESOURCE_NOT_FOUND`, `403 PERMISSION_DENIED`

---

### PATCH /api/v1/projects/{id}

Update project metadata.

**Request:**

```json
{ "name": "Q1 Campaign — Final" }
```

**Response `200`:** _(updated project object)_

---

### DELETE /api/v1/projects/{id}

Delete a project and all its associated data.

**Response `200`:**

```json
{ "message": "Project deleted.", "deleted_generation_count": 47 }
```

---

### GET /api/v1/projects/{id}/generations

List generations belonging to a project (paginated).

**Query Parameters:** `cursor`, `limit`, `status`, `model_id`

**Response `200`:** _(paginated list of generation summary objects — see Section 5)_

---

## 5. Generation Endpoints

> **This is the core of the platform.** Every generation endpoint is asynchronous — the response returns a `job_id`. Poll `GET /api/v1/jobs/{job_id}` or subscribe to `GET /api/v1/jobs/{job_id}/stream` for results.

---

### POST /api/v1/generations/text-to-image

Generate one or more images from a text prompt.

**Request:**

```json
{
  "prompt": "A cinematic close-up of a lone samurai standing on a foggy mountain peak at dawn, dramatic lighting, volumetric mist, 8k",
  "negative_prompt": "blurry, low quality, watermark, text, deformed",
  "seed": 42,
  "cfg_scale": 7.5,
  "steps": 30,
  "scheduler": "DPMSolverMultistep",
  "width": 1024,
  "height": 1024,
  "num_images": 2,
  "model_id": "flux-1-dev",
  "project_id": "proj_01HZ9X",
  "enhance_prompt": true,
  "reference_images": [
    {
      "id": "ref_01HZAA",
      "role": "style",
      "strength": 0.75
    },
    {
      "id": "ref_01HZAB",
      "role": "subject",
      "strength": 0.9
    }
  ]
}
```

**Field Reference:**

| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `prompt` | string | ✅ | 1–2000 chars | Main generation prompt |
| `negative_prompt` | string | ❌ | max 1000 chars | Things to exclude |
| `seed` | integer | ❌ | -1 for random | Deterministic seed |
| `cfg_scale` | float | ❌ | 1.0–20.0, default 7.5 | Classifier-free guidance scale |
| `steps` | integer | ❌ | 1–150, default 30 | Diffusion steps |
| `scheduler` | string | ❌ | enum below | Noise scheduler |
| `width` | integer | ❌ | 256–2048 (px), default 1024 | Output width |
| `height` | integer | ❌ | 256–2048 (px), default 1024 | Output height |
| `num_images` | integer | ❌ | 1–8, default 1 | Images per request |
| `model_id` | string | ✅ | — | Model to run inference on |
| `project_id` | string | ❌ | — | Assign to project |
| `enhance_prompt` | boolean | ❌ | default false | Run LLM prompt expansion before inference |
| `reference_images` | array | ❌ | max 5 entries | Multi-reference conditioning |
| `reference_images[].id` | string | ✅ | — | Reference resource ID |
| `reference_images[].role` | string | ✅ | `subject`\|`style`\|`composition`\|`color`\|`character` | Conditioning role |
| `reference_images[].strength` | float | ✅ | 0.0–1.0 | Conditioning weight |

**Supported schedulers:** `DDIM`, `PNDM`, `Euler`, `EulerAncestral`, `DPMSolverMultistep`, `UniPCMultistep`, `KDPM2Ancestral`

**Response `201`:**

```json
{
  "job_id": "job_01HZAC9PQR",
  "status": "PENDING",
  "estimated_duration_seconds": 18,
  "generation_id": "gen_01HZAC9ABC",
  "created_at": "2026-11-17T04:07:42Z"
}
```

**Errors:** `422 VALIDATION_FIELD_INVALID`, `422 GENERATION_RESOLUTION_TOO_LARGE`, `503 PROVIDER_UNAVAILABLE`, `429 RATE_LIMIT_GENERATION`

---

### POST /api/v1/generations/image-to-image

Transform an existing image guided by a prompt.

**Request:**

```json
{
  "source_image_id": "img_01HZBA",
  "prompt": "Transform into a watercolor painting with soft pastel tones",
  "negative_prompt": "sharp edges, photorealistic, dark colors",
  "strength": 0.65,
  "seed": -1,
  "cfg_scale": 8.0,
  "steps": 25,
  "model_id": "flux-1-dev",
  "project_id": "proj_01HZ9X"
}
```

**Field Reference:**

| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `source_image_id` | string | ✅ | — | Uploaded image to transform |
| `prompt` | string | ✅ | 1–2000 chars | Transformation description |
| `negative_prompt` | string | ❌ | max 1000 chars | Things to exclude |
| `strength` | float | ❌ | 0.0–1.0, default 0.75 | How much to deviate from source (1.0 = full replacement) |
| `seed` | integer | ❌ | -1 for random | Deterministic seed |
| `cfg_scale` | float | ❌ | 1.0–20.0 | Guidance scale |
| `steps` | integer | ❌ | 1–150 | Diffusion steps |
| `model_id` | string | ✅ | — | Model ID |
| `project_id` | string | ❌ | — | Project assignment |

**Response `201`:**

```json
{
  "job_id": "job_01HZBC2XYZ",
  "status": "PENDING",
  "estimated_duration_seconds": 14,
  "generation_id": "gen_01HZBC2DEF"
}
```

**Errors:** `404 RESOURCE_NOT_FOUND` (source image), `422 VALIDATION_FIELD_INVALID`, `503 PROVIDER_UNAVAILABLE`

---

### POST /api/v1/generations/inpaint

Replace a masked region of an image using AI diffusion.

**Request:**

```json
{
  "source_image_id": "img_01HZCA",
  "mask_image_base64": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "prompt": "Replace with a glowing neon street sign in Japanese",
  "negative_prompt": "blurry, pixelated, low quality",
  "seed": 7,
  "cfg_scale": 9.0,
  "steps": 35,
  "model_id": "flux-1-dev"
}
```

**Field Reference:**

| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `source_image_id` | string | ✅ | — | Base image to inpaint |
| `mask_image_base64` | string | ✅ | Base64 PNG, same dimensions as source | White = inpaint region, black = keep |
| `prompt` | string | ✅ | 1–2000 chars | What to generate in masked area |
| `negative_prompt` | string | ❌ | max 1000 chars | Exclusions |
| `seed` | integer | ❌ | -1 for random | Seed |
| `cfg_scale` | float | ❌ | 1.0–20.0 | Guidance scale |
| `steps` | integer | ❌ | 1–150 | Diffusion steps |
| `model_id` | string | ✅ | — | Model with inpaint capability |

**Response `201`:**

```json
{
  "job_id": "job_01HZCB7MNO",
  "status": "PENDING",
  "estimated_duration_seconds": 20
}
```

**Errors:** `422 GENERATION_MASK_DIMENSION_MISMATCH`, `422 GENERATION_MODEL_NO_INPAINT`, `503 PROVIDER_UNAVAILABLE`

---

### POST /api/v1/generations/outpaint

Expand the canvas of an existing image in one or more directions.

**Request:**

```json
{
  "source_image_id": "img_01HZDA",
  "direction": "right",
  "pixels": 512,
  "prompt": "Continue the foggy mountain landscape with pine trees"
}
```

**Field Reference:**

| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `source_image_id` | string | ✅ | — | Source image |
| `direction` | string | ✅ | `top`\|`bottom`\|`left`\|`right`\|`all` | Expansion direction |
| `pixels` | integer | ✅ | 64–1024 | Pixels to expand (per side if `all`) |
| `prompt` | string | ❌ | max 2000 chars | Description for expanded region |

**Response `201`:**

```json
{
  "job_id": "job_01HZDC3PQR",
  "status": "PENDING",
  "estimated_duration_seconds": 22
}
```

**Errors:** `422 GENERATION_OUTPAINT_EXCEEDS_MAX_RESOLUTION`, `503 PROVIDER_UNAVAILABLE`

---

### GET /api/v1/generations

List all generations for the authenticated user (paginated, filterable).

**Query Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `cursor` | string | Pagination cursor |
| `limit` | integer | Items per page (max 100) |
| `project_id` | string | Filter by project |
| `status` | string | Filter by status (`COMPLETED`, `FAILED`, etc.) |
| `model_id` | string | Filter by model |
| `type` | string | `text2img`\|`img2img`\|`inpaint`\|`outpaint` |

**Response `200`:**

```json
{
  "data": [
    {
      "id": "gen_01HZAC9ABC",
      "type": "text2img",
      "status": "COMPLETED",
      "prompt": "A cinematic close-up of a lone samurai...",
      "model_id": "flux-1-dev",
      "project_id": "proj_01HZ9X",
      "result_image_ids": ["img_01HZAE", "img_01HZAF"],
      "thumbnail_url": "https://cdn.example.com/thumbs/img_01HZAE.webp",
      "created_at": "2026-11-17T04:07:42Z",
      "completed_at": "2026-11-17T04:08:02Z"
    }
  ],
  "pagination": { "cursor": "eyJpZCI6Imdlbl8wMUhaQUM5QUJDJ9", "has_more": true, "total_count": 142 }
}
```

---

### GET /api/v1/generations/{id}

Retrieve full detail for a single generation.

**Response `200`:**

```json
{
  "id": "gen_01HZAC9ABC",
  "type": "text2img",
  "status": "COMPLETED",
  "prompt": "A cinematic close-up of a lone samurai...",
  "negative_prompt": "blurry, low quality, watermark",
  "seed": 42,
  "cfg_scale": 7.5,
  "steps": 30,
  "scheduler": "DPMSolverMultistep",
  "width": 1024,
  "height": 1024,
  "num_images": 2,
  "model_id": "flux-1-dev",
  "project_id": "proj_01HZ9X",
  "enhanced_prompt": "A hyperrealistic, cinematic close-up portrait of a lone samurai warrior standing resolute...",
  "reference_images": [
    { "id": "ref_01HZAA", "role": "style", "strength": 0.75 }
  ],
  "result_image_ids": ["img_01HZAE", "img_01HZAF"],
  "result_images": [
    {
      "id": "img_01HZAE",
      "url": "https://cdn.example.com/images/img_01HZAE.webp",
      "thumbnail_url": "https://cdn.example.com/thumbs/img_01HZAE.webp",
      "width": 1024,
      "height": 1024,
      "size_bytes": 2097152
    }
  ],
  "job_id": "job_01HZAC9PQR",
  "created_at": "2026-11-17T04:07:42Z",
  "completed_at": "2026-11-17T04:08:02Z"
}
```

**Errors:** `404 RESOURCE_NOT_FOUND`, `403 PERMISSION_DENIED`

---

### DELETE /api/v1/generations/{id}

Delete a generation and its associated result images.

**Response `200`:**

```json
{ "message": "Generation deleted.", "deleted_image_count": 2 }
```

---

## 6. Generation Job Endpoints

### GET /api/v1/jobs/{job_id}

Poll the status of an async generation job.

**Response `200`:**

```json
{
  "job_id": "job_01HZAC9PQR",
  "generation_id": "gen_01HZAC9ABC",
  "status": "PROCESSING",
  "progress": 65,
  "stage": "diffusion_step_20_of_30",
  "result_image_ids": [],
  "error_message": null,
  "created_at": "2026-11-17T04:07:42Z",
  "updated_at": "2026-11-17T04:07:58Z",
  "estimated_completion": "2026-11-17T04:08:05Z"
}
```

**Job Status State Machine:**

```
PENDING → QUEUED → PROCESSING → POST_PROCESSING → COMPLETED
                 ↘ FAILED
       ← CANCELLED (from PENDING or QUEUED)
```

| Status | Description |
|---|---|
| `PENDING` | Job created, not yet picked up by a worker |
| `QUEUED` | Assigned to a Celery worker, waiting for GPU |
| `PROCESSING` | Active diffusion inference running |
| `POST_PROCESSING` | Upscaling, watermarking, thumbnail generation |
| `COMPLETED` | Images ready, `result_image_ids` populated |
| `FAILED` | Inference failed; `error_message` populated |
| `CANCELLED` | Cancelled by user before processing began |

---

### POST /api/v1/jobs/{job_id}/cancel

Cancel a pending or queued job.

**Request:** _(no body)_

**Response `200`:**

```json
{ "job_id": "job_01HZAC9PQR", "status": "CANCELLED" }
```

**Errors:** `409 JOB_CANNOT_CANCEL` (if already PROCESSING or COMPLETED)

---

### GET /api/v1/jobs/{job_id}/stream

Server-Sent Events (SSE) stream for real-time job progress. Connect with `Accept: text/event-stream`.

**Response:** Streaming `text/event-stream`

```
event: job.queued
data: {"job_id":"job_01HZAC9PQR","queue_position":3,"estimated_wait_seconds":12}

event: job.started
data: {"job_id":"job_01HZAC9PQR","model_id":"flux-1-dev","total_steps":30}

event: job.progress
data: {"job_id":"job_01HZAC9PQR","progress":33,"stage":"diffusion_step_10_of_30"}

event: job.progress
data: {"job_id":"job_01HZAC9PQR","progress":66,"stage":"diffusion_step_20_of_30"}

event: job.progress
data: {"job_id":"job_01HZAC9PQR","progress":100,"stage":"post_processing"}

event: job.completed
data: {"job_id":"job_01HZAC9PQR","images":[{"id":"img_01HZAE","url":"https://cdn.example.com/images/img_01HZAE.webp","thumbnail_url":"https://cdn.example.com/thumbs/img_01HZAE.webp","width":1024,"height":1024}]}
```

The stream closes after `job.completed` or `job.failed`.

---

## 7. Image Upload Endpoints

### POST /api/v1/images/upload

Upload an image for use as a source, reference, or mask.

**Request:** `multipart/form-data`

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | file | ✅ | Image file (JPG, PNG, WebP) |
| `purpose` | string | ❌ | `source`\|`reference`\|`mask`\|`asset` (default: `source`) |

**Constraints:** Max file size 20 MB. Accepted MIME types: `image/jpeg`, `image/png`, `image/webp`.

**Response `201`:**

```json
{
  "image_id": "img_01HZBA",
  "url": "https://cdn.example.com/images/img_01HZBA.webp",
  "thumbnail_url": "https://cdn.example.com/thumbs/img_01HZBA.webp",
  "width": 2048,
  "height": 1536,
  "size_bytes": 3145728,
  "mime_type": "image/webp",
  "purpose": "source",
  "created_at": "2026-11-17T04:07:42Z"
}
```

**Errors:** `422 STORAGE_FILE_TOO_LARGE`, `422 STORAGE_INVALID_FILE_TYPE`, `503 STORAGE_UNAVAILABLE`

---

### GET /api/v1/images/{id}

Retrieve image metadata.

**Response `200`:**

```json
{
  "image_id": "img_01HZBA",
  "url": "https://cdn.example.com/images/img_01HZBA.webp",
  "thumbnail_url": "https://cdn.example.com/thumbs/img_01HZBA.webp",
  "width": 2048,
  "height": 1536,
  "size_bytes": 3145728,
  "mime_type": "image/webp",
  "purpose": "source",
  "created_at": "2026-11-17T04:07:42Z"
}
```

---

### DELETE /api/v1/images/{id}

Delete an uploaded image. Fails if the image is used in an active generation.

**Response `200`:**

```json
{ "message": "Image deleted." }
```

**Errors:** `409 STORAGE_IMAGE_IN_USE`

---

### GET /api/v1/images/{id}/download

Redirect to a short-lived pre-signed download URL.

**Response `302`:** Redirect to `https://storage.example.com/images/img_01HZBA.webp?X-Amz-Expires=300&...`

---

## 8. Reference Image Endpoints

### POST /api/v1/references

Register an uploaded image as a named reference with a conditioning role.

**Request:**

```json
{
  "image_id": "img_01HZBA",
  "label": "@1",
  "role": "style",
  "strength": 0.75
}
```

**Field Reference:**

| Field | Type | Required | Constraints | Description |
|---|---|---|---|---|
| `image_id` | string | ✅ | — | Uploaded image to use |
| `label` | string | ✅ | `@1`–`@5` | Prompt token to invoke this reference |
| `role` | string | ✅ | `subject`\|`style`\|`composition`\|`color`\|`character` | Conditioning purpose |
| `strength` | float | ✅ | 0.0–1.0 | Conditioning weight |

**Response `201`:**

```json
{
  "id": "ref_01HZAA",
  "image_id": "img_01HZBA",
  "label": "@1",
  "role": "style",
  "strength": 0.75,
  "thumbnail_url": "https://cdn.example.com/thumbs/img_01HZBA.webp",
  "created_at": "2026-11-17T04:07:42Z"
}
```

---

### GET /api/v1/references

List the authenticated user's reference images.

**Response `200`:**

```json
{
  "data": [
    {
      "id": "ref_01HZAA",
      "image_id": "img_01HZBA",
      "label": "@1",
      "role": "style",
      "strength": 0.75,
      "thumbnail_url": "https://cdn.example.com/thumbs/img_01HZBA.webp",
      "created_at": "2026-11-17T04:07:42Z"
    }
  ],
  "pagination": { "cursor": null, "has_more": false, "total_count": 1 }
}
```

---

### PATCH /api/v1/references/{id}

Update a reference's role, label, or strength.

**Request:**

```json
{ "role": "character", "strength": 0.9 }
```

**Response `200`:** _(updated reference object)_

---

### DELETE /api/v1/references/{id}

Remove a reference.

**Response `200`:**

```json
{ "message": "Reference deleted." }
```

---

## 9. Layer and Scene Document Endpoints

### GET /api/v1/projects/{id}/scene

Retrieve the full SceneDocument JSON for a project.

**Response `200`:**

```json
{
  "project_id": "proj_01HZ9X",
  "canvas": { "width": 1920, "height": 1080, "background_color": "#000000" },
  "layers": [
    {
      "id": "layer_01HZFA",
      "type": "raster",
      "name": "Background Mountain",
      "zIndex": 0,
      "visible": true,
      "locked": false,
      "opacity": 1.0,
      "transform": { "x": 0, "y": 0, "width": 1920, "height": 1080, "rotation": 0 },
      "content": { "image_id": "img_01HZAE", "url": "https://cdn.example.com/images/img_01HZAE.webp" }
    },
    {
      "id": "layer_01HZFB",
      "type": "text",
      "name": "Title Text",
      "zIndex": 1,
      "visible": true,
      "locked": false,
      "opacity": 1.0,
      "transform": { "x": 100, "y": 80, "width": 600, "height": 120, "rotation": 0 },
      "content": {
        "text": "Into the Mist",
        "font_family": "Inter",
        "font_size": 72,
        "font_weight": "bold",
        "color": "#FFFFFF",
        "alignment": "left",
        "line_height": 1.2
      }
    }
  ],
  "version": 14,
  "updated_at": "2026-11-17T04:07:42Z"
}
```

---

### PUT /api/v1/projects/{id}/scene

Replace the entire SceneDocument. Used for undo/redo checkpoints or bulk save.

**Request:** _(full SceneDocument object as above)_

**Response `200`:** _(saved SceneDocument with updated `version` and `updated_at`)_

---

### POST /api/v1/projects/{id}/layers

Add a new layer to the scene.

**Request:**

```json
{
  "type": "raster",
  "name": "Sky Overlay",
  "zIndex": 2,
  "transform": { "x": 0, "y": 0, "width": 1920, "height": 400, "rotation": 0 },
  "content": { "image_id": "img_01HZAF" }
}
```

**Response `201`:** _(new layer object with generated `id`)_

---

### PATCH /api/v1/projects/{id}/layers/{layer_id}

Update a layer's properties.

**Request:**

```json
{
  "opacity": 0.7,
  "visible": true,
  "transform": { "x": 0, "y": 50, "width": 1920, "height": 400, "rotation": 5 }
}
```

**Response `200`:** _(updated layer object)_

---

### DELETE /api/v1/projects/{id}/layers/{layer_id}

Remove a layer from the scene.

**Response `200`:**

```json
{ "message": "Layer deleted.", "layer_id": "layer_01HZFA" }
```

---

### POST /api/v1/projects/{id}/layers/reorder

Batch-update `zIndex` for multiple layers atomically.

**Request:**

```json
{
  "order": [
    { "layer_id": "layer_01HZFB", "zIndex": 0 },
    { "layer_id": "layer_01HZFA", "zIndex": 1 }
  ]
}
```

**Response `200`:**

```json
{ "message": "Layer order updated.", "updated_count": 2 }
```

---

### POST /api/v1/projects/{id}/scene/operations

Record an edit operation for the undo history log.

**Request:**

```json
{
  "operation_type": "layer.transform",
  "layer_id": "layer_01HZFA",
  "before": { "transform": { "x": 0, "y": 0, "width": 1920, "height": 1080, "rotation": 0 } },
  "after": { "transform": { "x": 10, "y": 20, "width": 1920, "height": 1080, "rotation": 2 } },
  "client_timestamp": "2026-11-17T04:07:40Z"
}
```

**Response `201`:**

```json
{
  "operation_id": "op_01HZGA",
  "scene_version": 15,
  "created_at": "2026-11-17T04:07:42Z"
}
```

---

## 10. Asset Endpoints

### GET /api/v1/assets

List the user's uploaded assets (paginated).

**Query Parameters:** `cursor`, `limit`, `type` (`image`|`font`|`svg`)

**Response `200`:**

```json
{
  "data": [
    {
      "id": "asset_01HZHA",
      "name": "brand-logo.svg",
      "type": "svg",
      "url": "https://cdn.example.com/assets/asset_01HZHA.svg",
      "thumbnail_url": "https://cdn.example.com/thumbs/asset_01HZHA.webp",
      "size_bytes": 24576,
      "created_at": "2026-11-17T04:07:42Z"
    }
  ],
  "pagination": { "cursor": null, "has_more": false, "total_count": 1 }
}
```

---

### POST /api/v1/assets/upload

Upload a reusable asset. `multipart/form-data`.

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | file | ✅ | Asset file |
| `name` | string | ❌ | Display name (defaults to filename) |

**Response `201`:** _(asset object as above)_

**Errors:** `422 STORAGE_FILE_TOO_LARGE`, `422 STORAGE_INVALID_FILE_TYPE`

---

### DELETE /api/v1/assets/{id}

Delete an asset.

**Response `200`:**

```json
{ "message": "Asset deleted." }
```

---

## 11. Model Provider Endpoints

### GET /api/v1/models

List all available AI models with their capabilities and status.

**Response `200`:**

```json
{
  "data": [
    {
      "model_id": "flux-1-dev",
      "name": "FLUX.1-dev",
      "provider": "huggingface_local",
      "description": "High-quality 12B parameter diffusion transformer. Best for photorealism and complex compositions.",
      "capabilities": ["text2img", "img2img", "inpaint", "outpaint"],
      "default_steps": 30,
      "default_cfg_scale": 7.5,
      "supported_schedulers": ["DPMSolverMultistep", "UniPCMultistep", "Euler"],
      "max_resolution": 2048,
      "min_vram_gb": 24,
      "status": "available",
      "is_default": true
    },
    {
      "model_id": "sdxl-base-1.0",
      "name": "Stable Diffusion XL 1.0",
      "provider": "huggingface_local",
      "description": "Versatile 6.6B model. Good balance of quality and speed.",
      "capabilities": ["text2img", "img2img", "inpaint"],
      "default_steps": 30,
      "default_cfg_scale": 7.0,
      "supported_schedulers": ["DDIM", "Euler", "EulerAncestral", "DPMSolverMultistep"],
      "max_resolution": 1536,
      "min_vram_gb": 10,
      "status": "available",
      "is_default": false
    },
    {
      "model_id": "replicate-flux-schnell",
      "name": "FLUX.1-schnell (Replicate)",
      "provider": "replicate",
      "description": "Fast 4-step distilled model via Replicate API.",
      "capabilities": ["text2img"],
      "default_steps": 4,
      "default_cfg_scale": 1.0,
      "supported_schedulers": ["Euler"],
      "max_resolution": 1024,
      "min_vram_gb": 0,
      "status": "available",
      "is_default": false
    }
  ]
}
```

---

### GET /api/v1/models/{model_id}/health

Check real-time health and GPU readiness for a specific model.

**Response `200`:**

```json
{
  "model_id": "flux-1-dev",
  "status": "available",
  "loaded": true,
  "gpu_vram_free_gb": 18.4,
  "queue_depth": 2,
  "avg_inference_time_seconds": 16.3,
  "last_checked": "2026-11-17T04:07:40Z"
}
```

**Response `200` (unhealthy):**

```json
{
  "model_id": "flux-1-dev",
  "status": "loading",
  "loaded": false,
  "queue_depth": 0,
  "estimated_ready_seconds": 45,
  "last_checked": "2026-11-17T04:07:40Z"
}
```

---

## 12. WebSocket / SSE Event Reference

All real-time events are delivered over the SSE stream at `GET /api/v1/jobs/{job_id}/stream`.

Events use the standard SSE format: `event: <name>\ndata: <JSON>\n\n`.

### TypeScript Interface Definitions

```typescript
// All events include a discriminated "event" field for type narrowing

interface JobQueuedEvent {
  event: "job.queued";
  data: {
    job_id: string;
    queue_position: number;
    estimated_wait_seconds: number;
  };
}

interface JobStartedEvent {
  event: "job.started";
  data: {
    job_id: string;
    model_id: string;
    total_steps: number;
  };
}

interface JobProgressEvent {
  event: "job.progress";
  data: {
    job_id: string;
    progress: number;        // 0–100 integer
    stage: string;           // e.g. "diffusion_step_15_of_30" | "post_processing"
    current_step?: number;
    total_steps?: number;
  };
}

interface GeneratedImage {
  id: string;
  url: string;
  thumbnail_url: string;
  width: number;
  height: number;
}

interface JobCompletedEvent {
  event: "job.completed";
  data: {
    job_id: string;
    generation_id: string;
    images: GeneratedImage[];
    duration_seconds: number;
  };
}

interface JobFailedEvent {
  event: "job.failed";
  data: {
    job_id: string;
    error_code: string;      // matches error codes in Section 13
    message: string;
    is_retryable: boolean;
  };
}

interface JobCancelledEvent {
  event: "job.cancelled";
  data: {
    job_id: string;
  };
}

// Union type for all possible SSE events
type JobEvent =
  | JobQueuedEvent
  | JobStartedEvent
  | JobProgressEvent
  | JobCompletedEvent
  | JobFailedEvent
  | JobCancelledEvent;
```

### SSE Client Example (TypeScript)

```typescript
const source = new EventSource(
  `/api/v1/jobs/${jobId}/stream`,
  { withCredentials: true }
);

source.addEventListener("job.progress", (e) => {
  const data = JSON.parse(e.data) as JobProgressEvent["data"];
  console.log(`Progress: ${data.progress}% — ${data.stage}`);
});

source.addEventListener("job.completed", (e) => {
  const data = JSON.parse(e.data) as JobCompletedEvent["data"];
  data.images.forEach(img => console.log(img.url));
  source.close();
});

source.addEventListener("job.failed", (e) => {
  const data = JSON.parse(e.data) as JobFailedEvent["data"];
  console.error(`Generation failed: ${data.error_code} — ${data.message}`);
  source.close();
});
```

---

## 13. Error Codes Reference

### AUTH Errors

| Code | HTTP Status | Description |
|---|---|---|
| `AUTH_EMAIL_TAKEN` | 409 | Email address already registered |
| `AUTH_INVALID_CREDENTIALS` | 401 | Email/password combination is incorrect |
| `AUTH_TOKEN_MISSING` | 401 | No Authorization header present |
| `AUTH_TOKEN_INVALID` | 401 | JWT signature or format is invalid |
| `AUTH_TOKEN_EXPIRED` | 401 | JWT access token has expired |
| `AUTH_REFRESH_TOKEN_INVALID` | 401 | Refresh token not found or already revoked |
| `AUTH_REFRESH_TOKEN_EXPIRED` | 401 | Refresh token TTL has passed |
| `AUTH_RESET_TOKEN_INVALID` | 400 | Password reset token not found |
| `AUTH_RESET_TOKEN_EXPIRED` | 400 | Password reset token TTL has passed |
| `AUTH_EMAIL_NOT_VERIFIED` | 403 | Account email has not been verified |

### VALIDATION Errors

| Code | HTTP Status | Description |
|---|---|---|
| `VALIDATION_FIELD_REQUIRED` | 422 | A required field is missing from the request |
| `VALIDATION_FIELD_INVALID` | 422 | A field value fails validation (type, range, format) |
| `VALIDATION_FIELD_TOO_LONG` | 422 | A string field exceeds maximum length |
| `VALIDATION_PASSWORD_TOO_WEAK` | 422 | Password does not meet complexity requirements |
| `VALIDATION_JSON_MALFORMED` | 400 | Request body is not valid JSON |
| `VALIDATION_CONTENT_TYPE` | 400 | Wrong Content-Type for this endpoint |

### GENERATION Errors

| Code | HTTP Status | Description |
|---|---|---|
| `GENERATION_RESOLUTION_TOO_LARGE` | 422 | Requested width×height exceeds model limit |
| `GENERATION_INVALID_SCHEDULER` | 422 | Scheduler not supported by selected model |
| `GENERATION_MODEL_NO_INPAINT` | 422 | Selected model does not support inpainting |
| `GENERATION_MODEL_NO_IMG2IMG` | 422 | Selected model does not support image-to-image |
| `GENERATION_MASK_DIMENSION_MISMATCH` | 422 | Mask image dimensions differ from source image |
| `GENERATION_OUTPAINT_EXCEEDS_MAX_RESOLUTION` | 422 | Outpaint would exceed maximum canvas size |
| `GENERATION_INFERENCE_FAILED` | 500 | Model inference raised an exception |
| `GENERATION_TIMEOUT` | 500 | Inference exceeded maximum allowed duration |
| `GENERATION_REF_LIMIT_EXCEEDED` | 422 | More than 5 reference images provided |
| `GENERATION_REF_INVALID_LABEL` | 422 | Reference label not in `@1`–`@5` range |

### PROVIDER Errors

| Code | HTTP Status | Description |
|---|---|---|
| `PROVIDER_UNAVAILABLE` | 503 | AI provider is offline or unreachable |
| `PROVIDER_MODEL_LOADING` | 503 | Model is loading; retry after `Retry-After` seconds |
| `PROVIDER_QUOTA_EXCEEDED` | 429 | External provider API quota exhausted |
| `PROVIDER_INVALID_RESPONSE` | 500 | Provider returned unexpected data |
| `PROVIDER_GPU_OOM` | 500 | Out of GPU memory during inference |

### STORAGE Errors

| Code | HTTP Status | Description |
|---|---|---|
| `STORAGE_FILE_TOO_LARGE` | 422 | Uploaded file exceeds 20 MB limit |
| `STORAGE_INVALID_FILE_TYPE` | 422 | File MIME type not in allowed list |
| `STORAGE_UNAVAILABLE` | 503 | Object storage (S3/MinIO) is unreachable |
| `STORAGE_IMAGE_IN_USE` | 409 | Cannot delete image referenced by an active generation |
| `STORAGE_QUOTA_EXCEEDED` | 422 | User storage quota has been reached |

### RATE_LIMIT Errors

| Code | HTTP Status | Description |
|---|---|---|
| `RATE_LIMIT_AUTH` | 429 | Auth endpoint rate limit exceeded |
| `RATE_LIMIT_GENERATION` | 429 | Generation endpoint rate limit exceeded |
| `RATE_LIMIT_UPLOAD` | 429 | Upload endpoint rate limit exceeded |
| `RATE_LIMIT_GLOBAL` | 429 | Global per-user rate limit exceeded |

### RESOURCE Errors

| Code | HTTP Status | Description |
|---|---|---|
| `RESOURCE_NOT_FOUND` | 404 | Requested resource does not exist |
| `PERMISSION_DENIED` | 403 | User does not own the requested resource |
| `JOB_CANNOT_CANCEL` | 409 | Job is already PROCESSING, COMPLETED, or FAILED |

### Rate Limit Response Headers

All rate-limited responses include:

```
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1731816600
Retry-After: 47
```

---

## 14. Rate Limiting

Rate limits are enforced per authenticated user (by JWT subject claim). Anonymous requests (pre-login) are rate-limited by IP address.

| Endpoint Group | Endpoints | Limit | Window |
|---|---|---|---|
| **Auth** | POST /auth/login, /auth/register, /auth/forgot-password | 5 requests | per minute |
| **Auth (tokens)** | POST /auth/refresh, /auth/reset-password | 10 requests | per minute |
| **Generations** | POST /generations/* | 10 requests | per minute |
| **Generations (list/read)** | GET /generations, GET /generations/{id} | 60 requests | per minute |
| **Jobs** | GET /jobs/{id}, POST /jobs/{id}/cancel | 60 requests | per minute |
| **Job SSE streams** | GET /jobs/{id}/stream | 20 concurrent connections | — |
| **Image Uploads** | POST /images/upload | 20 requests | per minute |
| **Asset Uploads** | POST /assets/upload | 10 requests | per minute |
| **Projects** | POST /projects | 20 requests | per hour |
| **Scene Operations** | POST /projects/{id}/scene/operations | 120 requests | per minute |
| **Model Health** | GET /models/{id}/health | 30 requests | per minute |
| **Global** | All authenticated endpoints combined | 500 requests | per minute |

**Quota by Plan:**

| Resource | Free Plan | Pro Plan | Enterprise |
|---|---|---|---|
| Generations / month | 100 images | 1,000 images | Unlimited |
| Storage | 1 GB | 10 GB | 100 GB |
| Concurrent SSE streams | 2 | 10 | Unlimited |
| Reference images | 5 total | Unlimited | Unlimited |
| Projects | 3 | Unlimited | Unlimited |
| Max resolution | 512×512 | 2048×2048 | 2048×2048 |
| Priority queue | ❌ | ✅ | ✅ |

---

## Appendix: Scheduler Reference

| Scheduler ID | Full Name | Best For |
|---|---|---|
| `DDIM` | Denoising Diffusion Implicit Models | Fast, deterministic generation |
| `PNDM` | Pseudo Numerical Diffusion Models | Smooth, general-purpose |
| `Euler` | Euler Ancestral | Balanced quality/speed |
| `EulerAncestral` | Euler Ancestral Stochastic | Creative variation |
| `DPMSolverMultistep` | DPM-Solver++ (Multi-step) | High quality, fewer steps |
| `UniPCMultistep` | UniPC (Multi-step) | Fast + high quality |
| `KDPM2Ancestral` | KDPM2 Ancestral | High detail, stochastic |

## Appendix: Supported Image Formats

| Format | MIME Type | Max Size | Notes |
|---|---|---|---|
| JPEG | `image/jpeg` | 20 MB | Recommended for photos |
| PNG | `image/png` | 20 MB | Required for masks (alpha channel) |
| WebP | `image/webp` | 20 MB | Recommended for web delivery |

---

*End of API Specification v1.0.0*
