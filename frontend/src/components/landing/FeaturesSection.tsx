import React from "react";
import {
  Wand2,
  Image as ImageIcon,
  Layers,
  Paintbrush,
  History,
  Sliders,
  Sparkles,
  Server,
  Zap,
  CheckCircle2,
  Clock,
  Compass,
} from "lucide-react";

interface FeatureCard {
  icon: React.ElementType;
  title: string;
  description: string;
  status: "LIVE" | "PLANNED";
  details: string[];
}

const FEATURES: FeatureCard[] = [
  {
    icon: Wand2,
    title: "Text-to-Image Diffusion",
    description: "Generate genuine raster imagery from natural language descriptions with fine-grained control over seeds, steps, CFG scale, and negative conditioning.",
    status: "LIVE",
    details: ["Stable Diffusion 1.5 checkpoints", "Deterministic reproducible seeds", "Configurable CFG & step counts"],
  },
  {
    icon: ImageIcon,
    title: "Image-to-Image Synthesis",
    description: "Transform existing compositions through latent perturbation. Upload base rasters, adjust denoising strength, and re-guide styles seamlessly.",
    status: "LIVE",
    details: ["Latent perturbation engine", "Adjustable denoising strength (0.1–0.95)", "MIME & dimension validation"],
  },
  {
    icon: Server,
    title: "Outbound Remote GPU Worker",
    description: "Zero-cost compute integration connecting Google Colab NVIDIA Tesla T4 GPUs via authenticated long-polling architecture without opening incoming ports.",
    status: "LIVE",
    details: ["Constant-time token security", "Heartbeat & stale worker detection", "Automatic credit refund on failure"],
  },
  {
    icon: History,
    title: "Asset Vault & Generation History",
    description: "Comprehensive history tracking every generation parameter, prompt, seed, and resolution. Inspect past artifacts and remix directly in canvas.",
    status: "LIVE",
    details: ["Persistent SQLite / S3 storage", "One-click prompt remixing", "Real-time SSE progress streaming"],
  },
  {
    icon: Layers,
    title: "Multi-Layer Canvas Studio",
    description: "Hybrid canvas combining raster diffusion generations with vector text overlays, opacity management, and layer reordering.",
    status: "LIVE",
    details: ["Raster & vector composition", "Z-index & visibility controls", "Interactive canvas pan & zoom"],
  },
  {
    icon: Paintbrush,
    title: "Inpainting & Brush Masking",
    description: "Localized diffusion synthesis driven by brush-drawn alpha masks. Selectively replace subjects, backgrounds, or artifacts with precision.",
    status: "PLANNED",
    details: ["Brush size & feather controls", "Binary mask generation", "Planned Phase 2 implementation"],
  },
  {
    icon: Compass,
    title: "Multi-Reference Guidance",
    description: "Condition diffusion pipelines with multiple reference images for character consistency, style transfer, and architectural layout guidance.",
    status: "PLANNED",
    details: ["IP-Adapter style embeddings", "Character identity retention", "Planned Phase 3 milestone"],
  },
  {
    icon: Zap,
    title: "High-Resolution Tiled Upscaling",
    description: "Super-resolution diffusion upscale pipeline with latent tile overlap to preserve micro-textures and export print-ready assets.",
    status: "PLANNED",
    details: ["4K detail synthesis", "Tiled latent decoding", "Planned Phase 4 milestone"],
  },
];

export const FeaturesSection: React.FC = () => {
  return (
    <section id="features" className="py-24 bg-raven-800 border-t border-raven-700/60 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-apricot-500 mb-2 font-semibold">
            <Sliders className="w-3.5 h-3.5" />
            <span>Platform Capabilities</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-seagrass-50 font-sans tracking-tight">
            Engineered for Precision & Creative Control
          </h2>
          <p className="mt-3 text-seagrass-300 text-sm sm:text-base leading-relaxed">
            Every capability in Reve is built on verified system architecture. We clearly distinguish
            between working production pipelines and planned roadmap features.
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((feat) => {
            const Icon = feat.icon;
            const isLive = feat.status === "LIVE";

            return (
              <div
                key={feat.title}
                className="rounded-xl border border-raven-700 bg-raven-750 p-5 flex flex-col justify-between hover:border-seagrass-400/35 transition-all shadow-surface group"
              >
                <div>
                  {/* Top Header with Icon & Status Pill */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2.5 rounded-lg bg-raven-700 border border-raven-600 text-seagrass-200 group-hover:text-apricot-500 transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold tracking-wider ${
                        isLive
                          ? "bg-semantic-success/10 border border-semantic-success/20 text-semantic-success"
                          : "bg-seagrass-400/10 border border-seagrass-400/20 text-seagrass-300"
                      }`}
                    >
                      {feat.status}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-base font-semibold text-seagrass-50 font-sans">
                    {feat.title}
                  </h3>
                  <p className="mt-2 text-xs text-seagrass-300 leading-relaxed">
                    {feat.description}
                  </p>
                </div>

                {/* Details List */}
                <div className="mt-5 pt-4 border-t border-raven-700/80 space-y-2">
                  {feat.details.map((detail, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 text-[11px] text-seagrass-400 font-mono"
                    >
                      <CheckCircle2
                        className={`w-3.5 h-3.5 shrink-0 ${
                          isLive ? "text-apricot-500" : "text-seagrass-500"
                        }`}
                      />
                      <span className="truncate">{detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
