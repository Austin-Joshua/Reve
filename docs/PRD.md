# Product Requirements Document (PRD)
## Reve-Inspired AI Image Generation & Visual Editing Platform

**Version:** 1.0  
**Status:** Draft  
**Author:** Product Management  
**Date:** 2026-11-17  

---

## Table of Contents

1. [Product Vision](#1-product-vision)
2. [Problem Statement](#2-problem-statement)
3. [Target Users](#3-target-users)
4. [Goals and Non-Goals](#4-goals-and-non-goals)
5. [Functional Requirements](#5-functional-requirements)
6. [Non-Functional Requirements](#6-non-functional-requirements)
7. [User Stories](#7-user-stories)
8. [Acceptance Criteria](#8-acceptance-criteria)
9. [Feature Priorities (MoSCoW)](#9-feature-priorities-moscow)
10. [MVP Definition](#10-mvp-definition)

---

## 1. Product Vision

We are building a unified AI-powered visual creation platform that places a professional-grade, pixel-space generative engine at its core — delivering text-to-image, image-to-image, inpainting, and outpainting through real diffusion-model inference — and seamlessly layers a structured, Photoshop-style editing environment on top of that raster foundation. Users compose scenes not by choosing between AI generation and manual editing, but by using both together: generating a background with a prompt, inpainting a character via a brush mask, pulling references from multiple uploaded images using @1/@2/@3 labeling, stacking the results as independently editable raster and text layers, adjusting opacity, z-index, and blend modes, and embedding typographically precise text suitable for posters, packaging, and logos — all within a single cohesive workspace. The platform is built for the full creative spectrum, from solo digital artists and social media content creators to professional marketers, product designers, and AI researchers, and it delivers a UX that is immediately approachable for newcomers while exposing the deep parametric controls (CFG scale, scheduler, seed, step count, resolution) that power users demand.

---

## 2. Problem Statement

### Why Existing Tools Fall Short

Today's creative software landscape is fractured. Users must stitch together multiple tools to accomplish what should be a single cohesive workflow, and even then each tool imposes painful compromises:

| Pain Point | Manifestation in Existing Tools |
|---|---|
| **Limited AI output quality** | Consumer AI image tools (Canva AI, Adobe Firefly) optimize for safety and speed at the cost of output fidelity, fine-grained prompt adherence, and resolution. Power-user tools (Automatic1111, ComfyUI) deliver quality but require local GPU setup and have no accessible UX. |
| **No unified pixel + layer editing** | Photoshop and Figma offer excellent layer editing but have limited, bolt-on AI features. Midjourney and Stable Diffusion-based web UIs offer strong generation but have no native structured layer composition after generation. Users must export and reimport between tools for every iteration. |
| **Poor typography integration** | AI image tools uniformly produce poor embedded text — garbled letterforms, inconsistent font rendering, no editability after generation. Creating a poster or product label that combines AI imagery with precise typographic control requires exporting to Illustrator or Figma and rebuilding manually. |
| **No multi-reference compositional input** | Most tools accept one reference image or none. Compositing a scene where subject identity comes from Image A, artistic style from Image B, and color palette from Image C is impossible without complex ControlNet pipelines that require engineering expertise. |
| **Complex or inaccessible UX** | Professional-grade tools (ComfyUI, Automatic1111) have node-graph or settings-panel UIs that overwhelm non-technical users. Consumer tools hide all controls and produce one-size-fits-all results. There is no tool that is simultaneously approachable and powerful. |
| **Siloed generation history and project management** | No existing tool offers a coherent project model that ties generation history, layer states, reference images, and exported assets together in a single persistent workspace. |

The result: professionals waste hours per project context-switching between tools, and non-technical creators are locked out of professional-quality output entirely. This platform eliminates that gap.

---

## 3. Target Users

### Persona 1 — Alex, the Independent Digital Artist

- **Role:** Freelance illustrator and concept artist
- **Tools today:** Stable Diffusion (local), Photoshop, Procreate
- **Goals:** Generate high-fidelity base images from complex prompts, inpaint specific regions to fix anatomy or lighting, stack multiple generated layers into a composite illustration, maintain a personal style across projects using reference images
- **Pain Points:** Setting up and maintaining a local SD environment is time-consuming; Photoshop AI tools lack depth; exporting between tools breaks the creative flow; no way to inject style references without ControlNet expertise
- **Success Metric:** Can complete a finished composite illustration in one workspace without leaving the app

### Persona 2 — Jordan, the Social Media Content Creator

- **Role:** Full-time Instagram/TikTok content creator, lifestyle brand
- **Tools today:** Canva, Adobe Express, ChatGPT (for copy)
- **Goals:** Produce eye-catching images and branded graphics quickly; overlay clean, stylized text on AI-generated backgrounds; resize and reframe images for different aspect ratios; batch produce consistent-style imagery for campaigns
- **Pain Points:** Canva AI produces generic, low-fidelity results; embedding readable, on-brand text into AI images is impossible without manual editing; no way to maintain a consistent visual character across posts without a reference system
- **Success Metric:** Can produce a week's worth of branded content in under two hours without touching another tool

### Persona 3 — Morgan, the Growth Marketer

- **Role:** Marketing lead at a Series B SaaS startup
- **Tools today:** Figma, Midjourney (via Discord), Photoshop
- **Goals:** Create ad creatives, landing page hero images, and product mockup visuals; iterate rapidly on concepts; ensure brand color palette and typography are consistent; export production-ready assets at multiple resolutions
- **Pain Points:** Midjourney Discord workflow is chaotic and not project-managed; Figma has no generative AI for image content; getting consistent output with a brand palette requires tedious prompt engineering; no way to inject a brand's existing product photography as a style reference alongside a generative prompt
- **Success Metric:** Can go from brief to production-ready ad creative in under 30 minutes

### Persona 4 — Sam, the Product / UX Designer

- **Role:** Senior product designer at a consumer app company
- **Tools today:** Figma, Moodboard tools, Adobe Stock
- **Goals:** Rapidly visualize product concepts and UI illustrations; create placeholder imagery that matches the actual final direction; use inpainting to swap product variants into scene photos; compose multi-element scenes with precise positional control
- **Pain Points:** Stock imagery is generic and expensive; AI tools don't allow precise positional composition; inpainting in existing tools lacks quality; no layer system means post-generation editing requires Figma/PS
- **Success Metric:** Can mock up a product visualization scene with AI-generated background + inpainted product + text overlay in a single session

### Persona 5 — Riley, the AI/ML Researcher & Developer

- **Role:** ML engineer and AI hobbyist, building side projects
- **Tools today:** Hugging Face diffusers, Gradio, ComfyUI
- **Goals:** Experiment with model parameters (scheduler, CFG, steps, seed); test image quality across different generation settings; integrate with or fork the platform for custom research workflows; access generation history with metadata for analysis
- **Pain Points:** Gradio UIs are throwaway; ComfyUI requires deep graph knowledge; no production-quality UI that exposes full model parameters without being a research prototype
- **Success Metric:** Can run controlled parameter experiments and inspect full generation metadata without touching the command line

---

## 4. Goals and Non-Goals

### Goals

1. **G1 — Real Pixel-Space AI Generation:** Deliver text-to-image, image-to-image, inpainting, and outpainting through actual diffusion model inference (FLUX.1-dev, SDXL, or equivalent). Pixel-space generation is the core capability and is **not** replaced by scene graph rendering, procedural compositing, or stock image retrieval.
2. **G2 — Unified Canvas:** Provide a single persistent workspace where AI-generated raster content and structured layer editing (raster layers, text layers, shape layers) coexist and are complementary — not mutually exclusive.
3. **G3 — Multi-Reference Compositional Input:** Allow users to upload multiple reference images labeled @1, @2, @3 (up to 5) and assign each a semantic role (subject identity, artistic style, color palette, composition, character likeness), which the generation engine conditions on simultaneously.
4. **G4 — Advanced Typography:** Support fully editable text layers with real font rendering (system fonts + uploaded fonts), multilingual text, and typographic controls suitable for professional poster, logo, and packaging design.
5. **G5 — Full Parametric Control:** Expose generation parameters (prompt, negative prompt, seed, CFG scale, scheduler, number of steps, aspect ratio, resolution, number of variations) to users with appropriate defaults and advanced mode.
6. **G6 — Project Management & History:** Persist all generation runs with full metadata (prompt, parameters, model, timestamp, references used) in a searchable history; organize work into named projects with gallery views.
7. **G7 — Accessible UX:** Design a UI that is immediately usable by non-technical creators within 5 minutes of first use, while revealing advanced controls progressively for power users.
8. **G8 — Provider Abstraction:** Implement an inference provider abstraction layer supporting local diffusers, Replicate API, Together AI, and Stability AI API, so the platform is not locked to a single backend.
9. **G9 — Asset Library:** Provide a personal asset library for uploading, organizing, and re-using reference images, brand kits, and exported assets across projects.
10. **G10 — Subscription & Usage Architecture:** Build a usage tracking and subscription management system that supports metered generation (credits), free tier, and paid tiers.

### Non-Goals

1. **NG1 — NOT a video generation platform.** No text-to-video, image-to-video, or animated output is in scope for V1 or V2. Video may be revisited in V3+.
2. **NG2 — NOT a 3D modeling or rendering tool.** No mesh generation, scene graph 3D rendering, volumetric lighting, or point cloud support. All output is 2D raster imagery.
3. **NG3 — NOT a real-time collaborative editing platform.** V1 is single-user per workspace. Multi-user real-time collaboration (operational transform, presence cursors) is deferred.
4. **NG4 — NOT a custom model fine-tuning service.** Users cannot upload training datasets or trigger fine-tuning jobs within the platform in V1. DreamBooth or LoRA training is a V3 consideration.
5. **NG5 — NOT a mobile-native application.** The platform targets desktop web browsers (1280px+ viewport). A responsive mobile experience is not required for V1; a dedicated mobile app is out of scope.
6. **NG6 — NOT an audio or music generation tool.** The platform is exclusively visual.

---

## 5. Functional Requirements

### FR-01: Text-to-Image Generation

- **FR-01.1** Users shall input a text prompt (up to 1,500 characters) describing the desired image.
- **FR-01.2** Users shall optionally input a negative prompt (up to 1,000 characters) specifying elements to exclude.
- **FR-01.3** Users shall set a seed value (integer or "random") for reproducible generation.
- **FR-01.4** Users shall configure CFG (Classifier-Free Guidance) scale in the range 1.0–20.0 with 0.5 step precision.
- **FR-01.5** Users shall configure the number of inference steps (1–150, default 30).
- **FR-01.6** Users shall select aspect ratio from presets (1:1, 4:3, 3:4, 16:9, 9:16, 3:2, 2:3, 21:9) or enter a custom resolution (512px–2048px per side).
- **FR-01.7** Users shall request 1–4 image variations per generation run, returned as a grid.
- **FR-01.8** The system shall submit the generation request to the inference backend and poll/stream status updates (queued → running → complete/failed).
- **FR-01.9** Completed images shall be automatically saved to the project's generation history with all parameters.

### FR-02: Image-to-Image Transformation

- **FR-02.1** Users shall upload a source image (JPEG, PNG, WebP; max 20 MB) as the img2img base.
- **FR-02.2** Users shall configure a denoising strength (0.0–1.0, default 0.75) controlling how much the output deviates from the source.
- **FR-02.3** All text-to-image parameters (FR-01.1–FR-01.9) shall apply equally to img2img runs.
- **FR-02.4** The source image shall be displayed alongside the output for direct comparison.

### FR-03: Inpainting

- **FR-03.1** Users shall load a base image into the inpainting canvas.
- **FR-03.2** Users shall paint a mask over the region to be replaced using a configurable round brush (size 1px–300px, hardness 0–100%).
- **FR-03.3** Users shall erase parts of the painted mask using an eraser tool.
- **FR-03.4** Users shall provide a text prompt describing the content to generate within the masked region.
- **FR-03.5** The system shall perform masked-region diffusion inference, leaving unmasked pixels pixel-perfectly intact.
- **FR-03.6** Object replacement: users shall select a region containing an object and replace it with a prompted alternative (e.g., "replace the red chair with a wooden bench").
- **FR-03.7** Background replacement: users shall mask the entire background and replace it via prompt while preserving the foreground subject.
- **FR-03.8** Users shall accept, reject, or regenerate any inpainting result.

### FR-04: Outpainting / Canvas Expansion

- **FR-04.1** Users shall expand the canvas in any direction (left, right, top, bottom) by a configurable pixel amount (64px–1024px per side).
- **FR-04.2** The system shall generate content to fill the expanded region, conditioned on the existing image content and an optional extension prompt.
- **FR-04.3** Users shall iteratively expand in multiple directions in sequence.
- **FR-04.4** The seam between original and generated content shall be seamless (no visible hard edge).

### FR-05: Structured Layer Editing

> [!IMPORTANT]
> Structured layer editing **coexists** with raster pixel-space generation. Layers are a compositional and organizational tool on top of generated raster content — they do **not** replace AI diffusion inference.

- **FR-05.1** The canvas shall support an unlimited number of named layers organized in a z-indexed stack.
- **FR-05.2** Layer types supported: Raster Image Layer (from generation, upload, or asset library), Text Layer, and Shape Layer (rectangle, ellipse).
- **FR-05.3** Each layer shall support: position (x, y), size (w, h with constrain-proportions toggle), rotation (0°–360°), opacity (0–100%), visibility toggle, lock toggle.
- **FR-05.4** Users shall reorder layers via drag-and-drop in the layer panel; z-index shall update immediately.
- **FR-05.5** Layers shall support a subset of blend modes: Normal, Multiply, Screen, Overlay, Soft Light, Hard Light, Color Dodge, Color Burn.
- **FR-05.6** Users shall add, duplicate, merge-down, flatten-to-raster, group, and delete layers.
- **FR-05.7** The system shall maintain a full undo/redo stack (minimum 50 steps) for all layer operations.
- **FR-05.8** A "Generate into layer" action shall run any generation type (text-to-image, inpaint, etc.) and place the result as a new raster layer above the current selection.

### FR-06: Multi-Reference Image Input

- **FR-06.1** Users shall upload up to 5 reference images per generation job, labeled automatically @1 through @5.
- **FR-06.2** Users shall assign each reference a semantic role from: `subject` (identity/likeness), `style` (artistic style), `composition` (layout/framing), `color` (palette), `character` (character design).
- **FR-06.3** Users shall set a conditioning strength (0.0–1.0) per reference image.
- **FR-06.4** Users shall reference images in the prompt text using their label (e.g., "a portrait of @1 in the style of @2").
- **FR-06.5** Reference images shall be stored in the project's asset library for reuse across generation runs.
- **FR-06.6** The system shall pass reference image conditioning to the inference backend via the provider abstraction layer.

### FR-07: Advanced Typography

- **FR-07.1** Users shall add editable Text Layers to the canvas at any position.
- **FR-07.2** Text layers shall support font family selection from a library of minimum 50 Google Fonts plus any user-uploaded fonts (OTF, TTF).
- **FR-07.3** Text controls shall include: font size (6pt–500pt), weight, style (italic/oblique), letter spacing, line height, horizontal/vertical alignment, text color, stroke color and width.
- **FR-07.4** The platform shall support multilingual text rendering for Latin, Cyrillic, CJK (Chinese, Japanese, Korean), Arabic (RTL), and Devanagari scripts.
- **FR-07.5** Users shall apply text to curved paths or inside bounding shapes.
- **FR-07.6** Text layers shall be rendered at vector precision at any canvas zoom level and rasterized only on final export.
- **FR-07.7** The platform shall ship with poster, logo, and packaging typographic layout templates.

### FR-08: Generation History & Project Management

- **FR-08.1** Every generation job shall be persisted with: job ID, timestamp, project ID, user ID, prompt, negative prompt, seed, CFG, steps, model, provider, aspect ratio, resolution, reference image IDs, output image URL(s), status (complete/failed), and inference duration.
- **FR-08.2** Users shall browse history in an infinite-scroll grid with filter by: date range, project, model, aspect ratio, and full-text prompt search.
- **FR-08.3** Users shall re-run any historical job (with the same parameters) or fork it (edit parameters and re-run).
- **FR-08.4** Projects shall be named workspaces; users can create, rename, duplicate, archive, and delete projects.
- **FR-08.5** Each project shall display a masonry gallery of its generation outputs.
- **FR-08.6** Users shall export any generated image at original resolution as PNG, JPEG (quality 60–100), or WebP.
- **FR-08.7** Users shall export the full canvas (all layers composited) as a flattened PNG or JPEG.

### FR-09: Asset Library

- **FR-09.1** Users shall upload images (JPEG, PNG, WebP, SVG; max 20 MB each) to a personal asset library.
- **FR-09.2** Assets shall be organized in named collections.
- **FR-09.3** Users shall insert any asset directly into the canvas as a new raster layer.
- **FR-09.4** Assets shall be searchable by filename and tag.
- **FR-09.5** The asset library shall be accessible from the generation panel as a reference image source.

### FR-10: Model & Provider Settings

- **FR-10.1** Users shall select the active generation model from a configured list (e.g., FLUX.1-dev, SDXL 1.0, SDXL Turbo).
- **FR-10.2** Users shall select the inference scheduler (Euler, Euler A, DPM++ 2M Karras, DDIM, LMS).
- **FR-10.3** Administrators shall configure available inference providers (local diffusers endpoint, Replicate, Together AI, Stability AI) in a backend settings panel.
- **FR-10.4** Users shall see the estimated credit cost of a generation run before submitting.
- **FR-10.5** The system shall surface inference latency and queue position in real time during generation.

### FR-11: Subscription & Usage Management

- **FR-11.1** The system shall implement a credit-based usage model: each generation job consumes credits proportional to resolution × steps × number of variations.
- **FR-11.2** Users shall see their remaining credits and usage history in an account dashboard.
- **FR-11.3** The system shall support: Free Tier (N credits/month), Pro Tier (unlimited or high-credit-cap), and Enterprise Tier (custom).
- **FR-11.4** When a user's credit balance reaches zero, generation shall be blocked with a clear upgrade CTA.
- **FR-11.5** The system shall integrate with a payment processor (Stripe) for subscription management and credit top-up purchases.
- **FR-11.6** Usage data shall be retained for a minimum of 90 days for billing dispute resolution.

---

## 6. Non-Functional Requirements

### Performance

| Metric | Target |
|---|---|
| Text-to-image (512×512, 30 steps, local GPU) | ≤ 8 seconds p95 |
| Text-to-image (1024×1024, 30 steps, cloud provider) | ≤ 25 seconds p95 |
| Canvas layer operation (move, resize, reorder) | ≤ 16 ms (60 fps) |
| Page initial load (LCP) | ≤ 2.5 seconds on 50 Mbps connection |
| API response (non-generation endpoints) | ≤ 200 ms p99 |
| Image upload (20 MB file) | ≤ 5 seconds on 50 Mbps connection |

### Scalability

- Backend API shall be stateless and horizontally scalable behind a load balancer.
- Celery workers for inference jobs shall scale independently from the API tier.
- Storage shall use S3-compatible object storage with no capacity ceiling.
- The system shall support up to 10,000 concurrent registered users in V1 with infrastructure scaling to 100,000 users via auto-scaling groups.

### Reliability

- API availability: ≥ 99.5% monthly uptime SLA (excluding scheduled maintenance).
- Inference job durability: failed jobs shall be retried up to 3 times with exponential backoff; persistent failures shall surface a user-facing error with job ID for support.
- Generation history shall never be lost; all job records shall be persisted to PostgreSQL before the job is submitted.

### Security

- All API endpoints shall require JWT bearer token authentication (except public auth endpoints).
- Uploaded images shall be scanned for malicious file types (polyglot files, embedded scripts) before storage.
- All stored images shall be served via signed, time-limited URLs (expiry ≤ 1 hour) from S3-compatible storage.
- User data shall be encrypted at rest (AES-256) and in transit (TLS 1.3+).
- Input prompts shall be passed through a content moderation filter before inference submission.
- OWASP Top 10 mitigations shall be applied and verified before production launch.

### Accessibility

- UI shall conform to WCAG 2.1 Level AA for all non-canvas UI elements.
- All interactive controls shall be keyboard-accessible.
- Generated image thumbnails shall carry machine-generated alt text.

### Browser Support

- Primary: Chrome 120+, Firefox 120+, Safari 17+, Edge 120+ on desktop (macOS, Windows, Linux).
- Minimum viewport: 1280×720.
- Mobile browsers: not supported in V1 (graceful degradation with "desktop required" message).

---

## 7. User Stories

| ID | User Story |
|---|---|
| US-01 | As a **digital artist**, I want to type a detailed prompt and generate 4 image variations so that I can explore different visual directions quickly without committing to one result. |
| US-02 | As a **digital artist**, I want to set a fixed seed for a generation so that I can reproduce an exact output later and iterate on it systematically. |
| US-03 | As a **content creator**, I want to upload my own photo and transform it with a style prompt so that I can create on-brand imagery from my own raw shots. |
| US-04 | As a **content creator**, I want to add a text layer with a custom font on top of my AI-generated background so that I can create a finished social post without opening another tool. |
| US-05 | As a **marketer**, I want to upload a product image as a reference (@1) and generate a lifestyle scene around it so that I can create ad creatives that feature my actual product. |
| US-06 | As a **marketer**, I want to run outpainting to extend a hero image horizontally so that I can adapt a 1:1 social image to a 16:9 banner without distorting the original content. |
| US-07 | As a **product designer**, I want to inpaint a masked region of an interface mockup with a different UI component so that I can rapidly prototype visual alternatives without redoing the whole composition. |
| US-08 | As a **product designer**, I want to drag-reorder layers and adjust opacity so that I can compose a layered scene with precise control over what appears in front of what. |
| US-09 | As a **researcher**, I want to set CFG scale, scheduler, and step count manually so that I can run controlled experiments on model parameter sensitivity. |
| US-10 | As a **researcher**, I want to access generation history with full parameter metadata so that I can analyze which settings produced the highest quality outputs. |
| US-11 | As a **digital artist**, I want to upload two reference images — one for the character's face (@1) and one for the art style (@2) — so that the system generates an image that combines both references. |
| US-12 | As a **content creator**, I want to browse my project's generation history in a visual grid so that I can find and re-use a past output without searching through downloaded files. |
| US-13 | As a **marketer**, I want to fork a previous generation job, change the prompt, and re-run it so that I can iterate on a campaign direction without starting from scratch. |
| US-14 | As a **product designer**, I want to export the full canvas as a flattened PNG at the original resolution so that I can hand off a production-ready asset to my engineering team. |
| US-15 | As a **content creator**, I want to use an inpainting brush to erase the background behind a subject and replace it with a beach scene prompt so that I can create composite travel content. |
| US-16 | As a **digital artist**, I want to merge multiple raster layers into one so that I can flatten intermediate work and reduce canvas complexity. |
| US-17 | As a **marketer**, I want to see my remaining generation credits and usage history so that I can manage my subscription budget across a month. |
| US-18 | As a **researcher**, I want to select a different inference scheduler (DPM++ 2M Karras vs Euler A) so that I can compare output quality and sampling efficiency. |
| US-19 | As a **content creator**, I want to upload a custom font to the asset library so that I can render my brand's proprietary typeface in text layers. |
| US-20 | As a **digital artist**, I want to use the undo/redo stack across at least 50 steps so that I can experiment freely with layer edits without fear of irreversible mistakes. |
| US-21 | As a **product designer**, I want to assign an aspect ratio of 9:16 before generating so that my output is immediately sized for a mobile screen mockup. |
| US-22 | As a **marketer**, I want to organize generated images into named projects so that I can keep different campaign deliverables cleanly separated. |
| US-23 | As a **researcher**, I want to see real-time queue position and inference progress so that I can gauge wait time and plan accordingly. |
| US-24 | As a **content creator**, I want to adjust text letter spacing and line height on a text layer so that I can achieve typographic precision for a poster layout. |

---

## 8. Acceptance Criteria

### AC-01: Text-to-Image Generation

- Given a valid prompt and default parameters, when the user submits a generation request, then the system must dispatch the job to the actual inference backend (not a mock or placeholder); a real model-generated image must be returned.
- The returned image must match the requested aspect ratio (± 1px).
- If the user requests 4 variations, exactly 4 distinct images must be returned.
- The generation history record must include all parameters (seed, CFG, steps, model, provider) and must be queryable via the history UI within 5 seconds of job completion.
- If the inference backend returns an error, the UI must display a human-readable error message and the job must be marked `failed` in history.

### AC-02: Image-to-Image Transformation

- Given an uploaded source image and a denoising strength of 0.75, the output must be a real diffusion-model transformation of the source, visibly related to the source but modified per the prompt. Static, unmodified, or placeholder output fails this criterion.
- The source image must remain displayed in the UI alongside the output for comparison.
- All text-to-image parameters must apply without error.

### AC-03: Inpainting

- Given a base image and a user-drawn mask over a region, when the user submits the inpaint job, the system must perform real masked-region diffusion inference; pixels outside the mask must be bit-for-bit identical to the original in the output.
- Object replacement: given a prompt "a wooden bench", the inpainted region must contain a bench-like object as generated by the model — not a stock image, not a clip-art lookup.
- Background replacement: unmasked foreground pixels must be preserved exactly; background pixels must be AI-generated per the prompt.

### AC-04: Outpainting / Canvas Expansion

- Given a 512×512 source image and a right-side expansion of 256px, the output must be a 768×512 image where the left 512px are pixel-identical to the source and the right 256px are real AI-generated content that visually continues the scene.
- The seam between original and expanded content must not exhibit a visible hard edge (no abrupt color or tone jump at the seam boundary as assessed by QA review).

### AC-05: Structured Layer Editing

- Layer add, move, resize, rotate, opacity, and visibility operations must render at ≥ 60 fps on a canvas with up to 20 layers on a standard 2023 laptop.
- Undo must revert the last operation exactly; redo must re-apply it. This must hold for a chain of 50 consecutive operations.
- Drag-to-reorder in the layer panel must immediately update the canvas z-order.
- "Generate into layer" must call the actual inference API and place the returned raster result as a new layer — it must never place a placeholder or stock image.

### AC-06: Multi-Reference Image Input

- Users must be able to upload 2 reference images, label them @1 and @2, assign roles "subject" and "style" respectively, and include "@1 in the style of @2" in the prompt.
- The generation request sent to the backend must include both reference images and their role assignments.
- The output must be a real model inference result conditioned on both references — not a simple image blend or composite.

### AC-07: Advanced Typography

- A text layer with the font "Playfair Display", size 72pt, color #FFFFFF, applied on a dark background, must render with correct letterforms at all canvas zoom levels (25%–400%).
- Multilingual: a text layer set to Arabic must render RTL with correct Unicode shaping.
- Font upload: a user-uploaded OTF file must be usable in a text layer within 10 seconds of upload.
- Text must remain fully editable (content, font, size, color) at any time before export.

### AC-08: Generation History & Project Management

- Every completed or failed generation job must appear in the history within 5 seconds of status change.
- Filtering by date range must return only jobs within that range (inclusive, UTC).
- Re-running a historical job must submit an identical parameter set to the inference backend.
- Exporting an image as PNG must produce a lossless file at the original generation resolution.

### AC-09: Asset Library

- Uploading a 10 MB PNG must complete within 5 seconds on a 50 Mbps connection.
- Inserted asset must appear as a new raster layer on the canvas within 1 second of insertion.
- Asset search by filename must return results within 500 ms.

### AC-10: Model & Provider Settings

- Switching the model selector from SDXL to FLUX.1-dev must cause the next generation job to invoke the FLUX.1-dev model (verifiable via generation history metadata).
- Changing the scheduler must be reflected in the job metadata stored in history.
- Estimated credit cost must be displayed before submission and must match the actual credits deducted post-job within 5%.

### AC-11: Subscription & Usage Management

- When a user's credit balance reaches 0, the "Generate" button must be disabled and an upgrade prompt must appear.
- Credit deduction must occur atomically with job submission (no race condition allowing over-spend).
- Usage history must display all jobs and their credit cost for the last 90 days.

---

## 9. Feature Priorities (MoSCoW)

| Feature | Priority | Rationale |
|---|---|---|
| Text-to-image generation (real inference) | **Must Have** | Core product value; nothing ships without it |
| Pixel-space AI generation (not scene-graph) | **Must Have** | Foundational architecture requirement |
| CFG, seed, steps, aspect ratio controls | **Must Have** | Required for quality control and reproducibility |
| Generation history with full metadata | **Must Have** | Critical for iteration; also required for billing |
| Inpainting (brush mask + real inference) | **Must Have** | Differentiating editing capability; MVP must include |
| Structured layer editor (raster + text) | **Must Have** | Core UX differentiator; coexists with generation |
| Undo/redo (50+ steps) | **Must Have** | Table stakes for any editing tool |
| Project management (create/rename/delete) | **Must Have** | Required for organized multi-session work |
| Image export (PNG/JPEG) | **Must Have** | Without export, the tool has no output |
| User authentication (JWT, registration, login) | **Must Have** | Required before any user data can exist |
| Subscription/credit system | **Must Have** | Required for monetization and cost control |
| Image-to-image transformation | **Must Have** | Key creative workflow; pairs with inpainting |
| Multi-reference image input (@1 @2 @3) | **Should Have** | Differentiating feature; complex to implement fully |
| Outpainting / canvas expansion | **Should Have** | High-value editing workflow; deferred if timeline tight |
| Advanced typography (font library, multilingual) | **Should Have** | Key for content creators; CJK/Arabic complexity |
| Asset library with collections | **Should Have** | Improves workflow but not blocking for MVP |
| Negative prompt support | **Should Have** | Standard feature; easy to add, high user expectation |
| Number of variations (1–4) | **Should Have** | Improves exploration but not blocking |
| Provider abstraction (Replicate, Together AI) | **Should Have** | Reduces single-provider risk |
| Scheduler selection (DPM++, Euler, etc.) | **Should Have** | Power user feature; straightforward to expose |
| Blend modes on layers | **Could Have** | Nice creative capability; not core |
| Text on curved path | **Could Have** | Advanced typography; niche but high impact for designers |
| Poster/logo/packaging templates | **Could Have** | Accelerates onboarding for non-designers |
| Prompt enhancement (LLM rewrite) | **Could Have** | Quality-of-life; not core to the value proposition |
| Shape layers (rect, ellipse) | **Could Have** | Useful compositional tool; low complexity |
| Video generation | **Won't Have** | Explicitly out of scope for V1 and V2 |
| 3D modeling / scene graph rendering | **Won't Have** | Out of scope; contradicts pixel-space architecture |
| Real-time collaborative editing | **Won't Have** | Infrastructure complexity; deferred to V3 |
| Custom model fine-tuning (DreamBooth/LoRA) | **Won't Have** | Out of scope for V1; V3 consideration |
| Mobile native application | **Won't Have** | Out of scope for V1 |
| Plugin / extension system | **Won't Have** | Out of scope for V1 |

---

## 10. MVP Definition

### MVP Scope

The MVP delivers a functional, end-to-end AI visual creation platform that proves the core value proposition: **real pixel-space AI generation combined with structured layer editing in a single workspace**.

#### Included in MVP

| Feature | Included | Rationale |
|---|---|---|
| User registration, login, JWT auth | ✅ | No product without identity |
| Text-to-image generation (real FLUX.1-dev or SDXL inference) | ✅ | The entire product is built on this |
| Prompt, negative prompt, seed, CFG, steps, aspect ratio, resolution | ✅ | Required parameter set for quality control |
| 1–4 output variations per generation | ✅ | Low-cost, high-value addition |
| Image-to-image transformation (real inference) | ✅ | Core creative workflow, low marginal effort |
| Inpainting with brush mask (real inference) | ✅ | MVP differentiator; must ship |
| Structured layer editor: raster layers, z-order, position, size, rotation, opacity | ✅ | Core UX differentiator |
| Text layers: font selection (Google Fonts, min 50 fonts), size, color | ✅ | Required for content creator persona |
| Undo/redo (50 steps) | ✅ | Table stakes |
| Generation history (full metadata, infinite scroll, re-run, fork) | ✅ | Required for iteration and billing |
| Project management (create, rename, delete, gallery view) | ✅ | Required for organized multi-session work |
| Image export (PNG, JPEG) | ✅ | Without this, no deliverable leaves the platform |
| Credit-based usage system + Free and Pro tiers | ✅ | Required for sustainable operation |
| Basic asset library (upload, insert to canvas) | ✅ | Needed for reference image workflow |
| Multi-reference input (up to 2 images, @1 @2, subject/style roles) | ✅ | Minimum viable reference feature |
| Real-time generation status (queue position, progress) | ✅ | Required UX for async jobs |

#### Deferred to V2

| Feature | Rationale for Deferral |
|---|---|
| Outpainting / canvas expansion | High value but higher complexity; not blocking core workflows |
| Multi-reference input for @3–@5 and additional roles | 2-reference support proves the concept; @3–@5 is incremental |
| Full multilingual typography (CJK, Arabic, Devanagari) | Latin/Cyrillic ships in MVP; CJK/RTL text shaping requires additional validation |
| Advanced blend modes | Layer editing is functional without them; add in V2 |
| Scheduler selection UI | Defaults to DPM++ 2M Karras; selection exposed in V2 |
| Provider abstraction UI (Replicate, Together AI toggle) | Backend abstraction ships in MVP; user-facing switcher in V2 |
| Poster/logo/packaging templates | Accelerates onboarding; not blocking |
| Asset library collections and tagging | Simple upload/browse ships in MVP; organization in V2 |
| Shape layers | Low priority; added in V2 |

#### Deferred to V3

| Feature | Rationale for Deferral |
|---|---|
| Custom model fine-tuning (DreamBooth, LoRA) | Significant infrastructure investment; niche use case at launch |
| Real-time collaborative editing | Requires OT/CRDT infrastructure overhaul |
| Video generation | Out of scope per Non-Goals |
| Plugin / extension system | Ecosystem feature; requires stable API surface first |
| Mobile native application | Separate platform; requires separate product investment |
| API access for developers (public REST API + SDK) | Valuable after platform stabilizes; V3 |

### MVP Success Criteria

The MVP is considered shippable when all of the following are true:

- [ ] A user can register, log in, and create a project.
- [ ] A user can generate a real AI image (not mocked) from a text prompt with adjustable parameters and see it appear in the UI.
- [ ] A user can perform a real inpainting operation on an uploaded image using a brush mask.
- [ ] A user can compose a canvas with at least 2 raster layers and 1 text layer, reorder them, and adjust opacity.
- [ ] A user can undo and redo 10 consecutive layer operations correctly.
- [ ] A user can browse their generation history and re-run a past job.
- [ ] A user can export a finished canvas as a PNG.
- [ ] Credit deduction is enforced; users on the free tier cannot generate after exhausting credits.
- [ ] All acceptance criteria in Section 8 for FR-01, FR-03, FR-05, FR-07, FR-08, and FR-11 pass QA review.
- [ ] No code path produces fake, hardcoded, or stock-image output in lieu of real model inference.
- [ ] API response times meet NFR targets at a load of 50 concurrent users.

---

*End of PRD — Reve-Inspired AI Image Generation & Visual Editing Platform v1.0*
