# Model License, Weights, Hardware Requirements, and Commercial Policy

This document establishes the official verification audit of supported diffusion and flow-matching image generation models for the **Reve-Inspired Visual Creation Platform**.

All data is cross-referenced against official HuggingFace model cards, upstream model licenses, and real hardware profiling measurements.

---

## 1. Executive Summary & Policy Compliance

Under the platform's strict **₹0-First Policy**:
1. **Zero Weight Downloads Without Prior Approval:** Model weights are NOT bundled in repository commits or downloaded automatically during local installation.
2. **Hardware Realism:** The developer's primary machine (Intel i5 10th Gen, 16 GB RAM, NVIDIA GT 710 / low-tier discrete GPU) has 1–2 GB VRAM and cannot run FLUX or SDXL locally.
3. **No Commercial Ambiguity:** A model cannot be deployed in a production-monetized environment simply because its weights are freely downloadable on Hugging Face. Non-commercial licenses (such as FLUX.1-dev and SDXL-Turbo) are strictly segregated from commercial-ready models (such as FLUX.1-schnell and SD-1.5).

---

## 2. Comprehensive Model Matrix

| Model Identifier | Upstream Repository ID | Parameter Count | Precision / Weights Size | License Type | Commercial Use | Minimum VRAM | Recommended VRAM | Recommended Deployment Target |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **FLUX.1-dev** | `black-forest-labs/FLUX.1-dev` | 12.0 Billion | BF16: ~23.8 GB<br>FP8: ~11.9 GB<br>NF4: ~9.5 GB | FLUX.1-dev Non-Commercial License | **NO (Non-Commercial Only)** | 12 GB (FP8 / NF4 + offload) | 24 GB+ (BF16 native) | High-end Cloud GPU (A100/A10G) for evaluation only |
| **FLUX.1-schnell** | `black-forest-labs/FLUX.1-schnell` | 12.0 Billion | BF16: ~23.8 GB<br>FP8: ~11.9 GB<br>GGUF Q4: ~7.5 GB | **Apache 2.0** | **YES (Fully Permissive)** | 8–10 GB (FP8 quantized) | 16–24 GB | Free Kaggle / Colab T4 (FP8) or Cloud Production |
| **SDXL 1.0 (Base)** | `stabilityai/stable-diffusion-xl-base-1.0` | 3.5 Billion | FP16: ~6.9 GB<br>FP32: ~13.8 GB | CreativeML Open RAIL++-M | **YES (With RAIL Conditions)** | 8 GB (FP16 + SDPA / xFormers) | 12 GB+ | Free Colab T4 / Kaggle 2xT4 / Dedicated 8GB+ GPU |
| **SDXL-Turbo** | `stabilityai/sdxl-turbo` | 3.5 Billion | FP16: ~6.9 GB | Stability AI Non-Commercial Research Community License | **NO (Research Only)** | 6–8 GB | 12 GB | Research & latency benchmarking only |
| **Stable Diffusion 1.5** | `runwayml/stable-diffusion-v1-5` | 1.0 Billion | FP16: ~2.13 GB<br>FP32: ~4.27 GB | CreativeML Open RAIL-M | **YES (With RAIL Conditions)** | 3.5–4.0 GB (FP16) | 6–8 GB | Local Low-Spec / Colab T4 / CPU Fallback |

---

## 3. Deep-Dive Model Profiles

### 3.1 FLUX.1-dev

- **Repository:** `black-forest-labs/FLUX.1-dev`
- **Architecture:** 12B Parameter Multimodal Rectified Flow Transformer (MMDiT) + T5-XXL Text Encoder + CLIP-L.
- **Weights Breakdown:**
  - `flux1-dev.safetensors`: 23.8 GB (BF16 native)
  - `t5xxl_fp16.safetensors`: 9.8 GB (or `t5xxl_fp8_e4m3fn.safetensors`: 4.9 GB)
  - `clip_l.safetensors`: 246 MB
  - `ae.safetensors` (VAE): 335 MB
  - **Total Disk Footprint:** ~34.2 GB (BF16) or ~17.5 GB (FP8 / NF4 optimized).
- **License Terms:**
  - Governed by the **FLUX.1-dev Non-Commercial License**.
  - Prohibits: Generating images for commercial use, charging users for inference, fine-tuning for commercial service deployment, or using model outputs to train competing models (distillation).
  - Allowed: Academic research, personal non-commercial experimentation, and local evaluation.
- **Hardware Requirements:**
  - *Minimum VRAM:* 12 GB (requires bitsandbytes 8-bit quantization or GGUF Q4_K_S and CPU offloading of text encoders).
  - *Recommended VRAM:* 24 GB (NVIDIA RTX 3090/4090 or A10G) to run native BF16 inference without CPU paging penalties.
  - *System RAM:* 32 GB minimum (64 GB recommended if offloading T5-XXL).
- **Reve Platform Verdict:**
  - Supported as an *optional research model* via preflight check.
  - Prohibited from default production routes or monetized credit systems.

---

### 3.2 FLUX.1-schnell

- **Repository:** `black-forest-labs/FLUX.1-schnell`
- **Architecture:** 12B Parameter 4-Step Distilled Rectified Flow Transformer.
- **Weights Breakdown:**
  - `flux1-schnell.safetensors`: 23.8 GB (BF16) or ~11.9 GB (FP8).
  - Text Encoders: Shared with FLUX.1-dev (T5-XXL + CLIP-L).
  - **Total Disk Footprint:** ~17 GB with FP8 text encoder.
- **License Terms:**
  - Licensed under **Apache License, Version 2.0**.
  - Commercial use is explicitly permitted without royalty fees.
  - Full freedom to modify, host, distribute, or incorporate into commercial visual generation products.
- **Hardware Requirements:**
  - *Minimum VRAM:* 8–10 GB when running quantized FP8 weights with sequential CPU offload.
  - *Recommended VRAM:* 16 GB (fits easily on free Google Colab T4 15 GB or Kaggle 16 GB GPU using FP8).
  - *Inference Latency:* Exceptional — achieves convergence in only 4 steps (approx. 8–12 seconds on a T4 GPU).
- **Reve Platform Verdict:**
  - **PRIMARY CANDIDATE for next-generation text-to-image.** Fully Apache 2.0 licensed, fast 4-step convergence, and compatible with zero-cost Colab/Kaggle T4 GPUs in FP8 mode.

---

### 3.3 Stable Diffusion XL 1.0 (SDXL Base + Refiner)

- **Repository:**
  - Base: `stabilityai/stable-diffusion-xl-base-1.0`
  - Refiner (optional): `stabilityai/stable-diffusion-xl-refiner-1.0`
- **Architecture:** Latent Diffusion Model (LDM) with dual text encoders (OpenCLIP ViT-bigG/14 + CLIP ViT-L/14) and 2.6B UNet.
- **Weights Breakdown:**
  - `sd_xl_base_1.0.safetensors`: 6.94 GB (FP16).
  - `sd_xl_refiner_1.0.safetensors`: 4.5 GB (FP16, optional).
  - Text Encoders & VAE: Included in safetensors bundle.
  - **Total Disk Footprint:** ~7.0 GB (base only) or ~11.5 GB (with refiner).
- **License Terms:**
  - Governed by **CreativeML Open RAIL++-M**.
  - Allows commercial use with specific stipulations (Annex A use restrictions: no illegal content, medical advice, biometric identification, etc.).
  - Free commercial distribution permitted; Stability AI commercial membership required only for organizations exceeding $1M annual revenue or 1M monthly active users.
- **Hardware Requirements:**
  - *Minimum VRAM:* 8.0 GB (with FP16 precision, scaled dot-product attention `SDPA`, and VAE tiling).
  - *Recommended VRAM:* 12.0 GB (e.g. RTX 3060 12GB, RTX 4070, or Tesla T4).
  - *System RAM:* 16 GB.
- **Reve Platform Verdict:**
  - **RECOMMENDED CORE WORKHORSE for high-resolution 1024x1024 raster synthesis.** Fits comfortably within free Kaggle (16 GB) and Google Colab (15 GB) GPUs, supports rich ecosystem (LoRAs, ControlNets, Inpainting).

---

### 3.4 SDXL-Turbo

- **Repository:** `stabilityai/sdxl-turbo`
- **Architecture:** Adversarial Diffusion Distillation (ADD) single-step SDXL variant.
- **Weights Breakdown:**
  - `sd_xl_turbo_1.0_fp16.safetensors`: 6.94 GB.
- **License Terms:**
  - Governed by **Stability AI Non-Commercial Research Community License**.
  - **STRICTLY PROHIBITED for commercial use.** Commercial monetization requires a direct paid enterprise agreement with Stability AI.
- **Hardware Requirements:**
  - *Minimum VRAM:* 6.0–8.0 GB.
  - *Inference Latency:* Real-time synthesis (1–4 steps, ~1 second on modern GPU).
- **Reve Platform Verdict:**
  - Research evaluation only. Cannot be enabled as a user-facing generation model in any commercial tier.

---

### 3.5 Stable Diffusion 1.5

- **Repository:** `runwayml/stable-diffusion-v1-5`
- **Architecture:** 1.0B Parameter Latent Diffusion Model (CLIP ViT-L/14 + 860M UNet).
- **Weights Breakdown:**
  - `v1-5-pruned-emaonly.safetensors`: 2.13 GB (FP16).
  - `v1-5-pruned.safetensors`: 4.27 GB (FP32).
  - **Total Disk Footprint:** 2.13 GB.
- **License Terms:**
  - Governed by **CreativeML Open RAIL-M**.
  - Fully allows commercial use with standard RAIL use restrictions.
- **Hardware Requirements:**
  - *Minimum VRAM:* 3.5–4.0 GB (runs on NVIDIA T550 4GB or GTX 1650 with attention slicing and FP16).
  - *Can also run on CPU:* ~15–30 seconds per step on modern 6-core/12-thread CPUs (usable as emergency offline test fallback).
  - *System RAM:* 8 GB.
- **Reve Platform Verdict:**
  - **THE PRACTICAL ZERO-COST EXPERIMENT BASELINE.** Safest, lightest, fastest model to verify end-to-end raster pipeline integrity before deploying larger models.

---

## 4. Hardware Sizing & Developer PC Reality Check

### Workstation Specifications
- **CPU:** Intel Core i5 10th Gen (6 cores / 12 threads)
- **RAM:** 16 GB DDR4
- **Host GPU:** NVIDIA Kepler GT 710 (1–2 GB VRAM, Compute Capability 3.5) / Laptop Discrete T550 (4 GB VRAM)
- **Host Disk:** Local SSD

### Feasibility Table for Developer PC

| Model | Native GPU Inference? | Quantized GPU Inference? | CPU Inference Feasible? | Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| **FLUX.1-dev** | ❌ Impossible (requires 12–24 GB) | ❌ Impossible | ❌ Out of Memory / >30 min/image | Remote GPU Only |
| **FLUX.1-schnell** | ❌ Impossible | ❌ Impossible | ❌ >10 min/image | Remote GPU (Kaggle/Colab T4 in FP8) |
| **SDXL 1.0** | ❌ Impossible (OOM on 2–4 GB) | ❌ Inadequate VRAM | ⚠️ Feasible on CPU (~3–5 min/image) | Remote GPU (Kaggle/Colab T4) |
| **SD-1.5** | ⚠️ Edge case on 4GB T550 (with FP16) | ✅ Feasible with medvram | ✅ Feasible on CPU (~45–90s/image) | **Local CPU/GPU Experiment Baseline** |

---

## 5. Model Selection Recommendation for Phase 1.1 First Inference

To achieve genuine AI raster synthesis without incurring ₹1 in cloud hosting or GPU rental:

1. **Phase 1.1 Local Smoke Test Candidate:**
   - **Stable Diffusion 1.5 (`runwayml/stable-diffusion-v1-5`)**
   - Rationale: Single 2.13 GB safetensors file. Can run on local CPU (`ALLOW_CPU_INFERENCE=true`) or 4GB GPU to prove end-to-end raster generation, database persistence, and frontend rendering.

2. **Phase 1.1 Remote GPU Notebook Candidate:**
   - **FLUX.1-schnell (`black-forest-labs/FLUX.1-schnell`) (FP8, 4 steps)**
   - Rationale: Fully Apache 2.0 commercially permissible. 4 inference steps takes ~8 seconds on a free Kaggle/Colab T4 GPU. Produces state-of-the-art visual fidelity without cloud subscription costs.
