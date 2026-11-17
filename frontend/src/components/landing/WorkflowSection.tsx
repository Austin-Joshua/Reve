import React, { useState } from "react";
import { MessageSquare, Cpu, Sliders, Download, ArrowRight, Check } from "lucide-react";

interface WorkflowStep {
  step: string;
  number: string;
  title: string;
  action: string;
  description: string;
  icon: React.ElementType;
  previewSnippet: {
    badge: string;
    content: string;
    meta: string;
  };
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    step: "01",
    number: "STEP 1",
    title: "Describe",
    action: "Prompt & Condition",
    description: "Input structured prompts, style tokens, and negative exclusions. Configure exact guidance scale, seed, and resolution parameters.",
    icon: MessageSquare,
    previewSnippet: {
      badge: "PROMPT COMPOSITION",
      content: "prompt: \"Minimalist coastal pavilion, raw concrete, turquoise ocean, overcast morning light\"\nnegative_prompt: \"blurry, low quality, cartoon, artifact, text\"\ncfg_scale: 7.5 · steps: 25",
      meta: "CLIP Text Encoder → 77-Token Latent Embeddings",
    },
  },
  {
    step: "02",
    number: "STEP 2",
    title: "Generate",
    action: "GPU Latent Denoising",
    description: "Job is dispatched to the authenticated Google Colab NVIDIA Tesla T4 remote worker. Denoises gaussian latents across scheduled steps.",
    icon: Cpu,
    previewSnippet: {
      badge: "TESLA T4 EXECUTION",
      content: "worker_id: \"reve-colab-t4-01\"\nengine: runwayml/stable-diffusion-v1-5\nlatents: 64×64×4 → VAE Decode → 512×512×3 RGB Raster\nstatus: COMPLETED (4.2s)",
      meta: "SSE Telemetry: 100% · Peak VRAM: 3.4 GB",
    },
  },
  {
    step: "03",
    number: "STEP 3",
    title: "Refine",
    action: "Image-to-Image & Variation",
    description: "Iterate by feeding the raster output into the image-to-image pipeline. Perturb latents with controlled strength or modify seeds for composition variants.",
    icon: Sliders,
    previewSnippet: {
      badge: "LATENT PERTURBATION",
      content: "source_image: \"img_9a8f1b2c\"\nstrength: 0.65\nvariation_seed: #4829104\nmode: style_preservation",
      meta: "Preserved Structural Geometry · Re-synthesized Lighting",
    },
  },
  {
    step: "04",
    number: "STEP 4",
    title: "Export",
    action: "Canvas Layers & Output",
    description: "Arrange generated imagery into structured canvas layers. Composite text, inspect pixels at 1:1, and export lossless PNGs to your project vault.",
    icon: Download,
    previewSnippet: {
      badge: "CANVAS COMPOSITION",
      content: "layer_01: Raster [Base Art] (100% Opacity)\nlayer_02: Vector Text [Typography Overlay]\nexport_format: PNG (24-bit Lossless RGB)\nstorage: Local Disk & S3 Fallback Synchronized",
      meta: "Production Artifact Ready for Deployment",
    },
  },
];

export const WorkflowSection: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const current = WORKFLOW_STEPS[activeStep];
  const Icon = current.icon;

  return (
    <section id="workflow" className="py-24 bg-raven-850 border-t border-raven-700/60 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-apricot-500 mb-2 font-semibold">
            <span>Production Lifecycle</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-seagrass-50 font-sans tracking-tight">
            From Idea to Verified Raster in 4 Steps
          </h2>
          <p className="mt-3 text-seagrass-300 text-sm sm:text-base">
            Reve blends the agility of generative diffusion with the rigor of structured creative editing.
          </p>
        </div>

        {/* Step Selector Ribbon */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
          {WORKFLOW_STEPS.map((s, idx) => (
            <button
              key={s.step}
              onClick={() => setActiveStep(idx)}
              className={`p-4 rounded-xl text-left border transition-all flex flex-col justify-between ${
                activeStep === idx
                  ? "bg-raven-700 border-apricot-500/70 shadow-surface"
                  : "bg-raven-900 border-raven-700/70 hover:bg-raven-800 hover:border-seagrass-400/30"
              }`}
            >
              <div className="flex items-center justify-between w-full mb-3">
                <span
                  className={`text-xs font-mono font-bold ${
                    activeStep === idx ? "text-apricot-500" : "text-seagrass-500"
                  }`}
                >
                  {s.step}
                </span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    activeStep === idx
                      ? "bg-apricot-500/10 text-apricot-400 border border-apricot-500/30"
                      : "bg-raven-800 text-seagrass-400"
                  }`}
                >
                  {s.action}
                </span>
              </div>
              <div className="text-base font-semibold text-seagrass-50 font-sans">
                {s.title}
              </div>
            </button>
          ))}
        </div>

        {/* Detailed Stage Breakdown Card */}
        <div className="rounded-2xl border border-raven-700 bg-raven-900 p-6 sm:p-8 shadow-modal">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Step Story Info */}
            <div className="lg:col-span-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-raven-800 border border-raven-700 text-apricot-500">
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-mono text-apricot-500 font-semibold">
                    {current.number} · {current.action}
                  </div>
                  <h3 className="text-2xl font-bold text-seagrass-50 font-sans">
                    {current.title}
                  </h3>
                </div>
              </div>

              <p className="text-sm sm:text-base text-seagrass-300 leading-relaxed">
                {current.description}
              </p>

              <div className="pt-2 flex items-center gap-3 text-xs font-mono text-seagrass-400">
                <span className="w-1.5 h-1.5 rounded-full bg-apricot-500" />
                <span>Zero mock data · Pure pixel synthesis</span>
              </div>
            </div>

            {/* Interactive Terminal / Code Box */}
            <div className="lg:col-span-6">
              <div className="rounded-xl border border-raven-700/80 bg-raven-950 p-4 font-mono text-xs shadow-surface">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-raven-800 text-seagrass-400">
                  <span className="text-apricot-500 font-semibold">{current.previewSnippet.badge}</span>
                  <span className="text-[10px] text-seagrass-500">REVE_PIPELINE_V1</span>
                </div>
                <pre className="text-seagrass-200 whitespace-pre-wrap leading-relaxed">
                  {current.previewSnippet.content}
                </pre>
                <div className="mt-4 pt-3 border-t border-raven-800 text-[11px] text-seagrass-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-semantic-success" />
                  <span>{current.previewSnippet.meta}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
