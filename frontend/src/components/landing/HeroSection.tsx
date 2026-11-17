import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Sparkles,
  Sliders,
  CheckCircle2,
  Terminal,
  Cpu,
  Layers,
  Zap,
  Play,
  RotateCcw,
} from "lucide-react";

export const HeroSection: React.FC = () => {
  const navigate = useNavigate();
  const [activePreset, setActivePreset] = useState<number>(0);
  const [isDenoising, setIsDenoising] = useState<boolean>(false);

  const presets = [
    {
      title: "Bioluminescent Architecture",
      prompt: "Bioluminescent glass pavilion at twilight, sharp obsidian reflections, architectural photography, volumetric haze",
      model: "Stable Diffusion 1.5",
      gpu: "NVIDIA Tesla T4",
      steps: 25,
      cfg: 7.5,
      resolution: "512×512",
      accent: "#FF8A1F",
      artUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1000&q=80",
    },
    {
      title: "Industrial Cybernetics",
      prompt: "Matte titanium mechanical lens aperture with exposed brass gears, macro precision industrial design, studio lighting",
      model: "Stable Diffusion 1.5",
      gpu: "NVIDIA Tesla T4",
      steps: 28,
      cfg: 8.0,
      resolution: "512×512",
      accent: "#9FB3AB",
      artUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1000&q=80",
    },
    {
      title: "Atmospheric Landscape",
      prompt: "Terraced emerald valley in morning fog, solitary brutalist monolith, cinematic lighting, national geographic contest winner",
      model: "Stable Diffusion 1.5",
      gpu: "NVIDIA Tesla T4",
      steps: 30,
      cfg: 7.0,
      resolution: "512×512",
      accent: "#FF8A1F",
      artUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1000&q=80",
    },
  ];

  const current = presets[activePreset];

  const triggerSimulation = () => {
    setIsDenoising(true);
    setTimeout(() => {
      setIsDenoising(false);
    }, 900);
  };

  return (
    <section className="relative pt-12 pb-24 overflow-hidden bg-raven-800">
      {/* Subtle background ambiance */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(39,71,74,0.35),transparent_70%)] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Top telemetry indicator */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-raven-700/80 border border-seagrass-400/20 text-xs font-mono text-seagrass-200">
            <span className="w-2 h-2 rounded-full bg-semantic-success animate-pulse" />
            <span className="text-seagrass-400">REMOTE WORKER:</span>
            <span className="text-seagrass-50 font-semibold">Tesla T4 Online</span>
            <span className="text-seagrass-400 mx-1">·</span>
            <span className="text-apricot-500 font-semibold">Zero-Cost Pipeline</span>
          </div>
        </div>

        {/* Hero Headings */}
        <div className="text-center max-w-4xl mx-auto mb-12">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-seagrass-50 font-sans leading-[1.08]">
            Your imagination.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-seagrass-50 via-seagrass-200 to-apricot-400">
              Without boundaries.
            </span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-seagrass-300 max-w-2xl mx-auto leading-relaxed">
            Transform ideas into extraordinary visuals with an intelligent creative workspace
            engineered for genuine raster diffusion inference, structured layers, and rapid iteration.
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => navigate("/studio")}
              className="px-6 py-3.5 rounded-xl bg-apricot-500 hover:bg-apricot-400 active:bg-apricot-600 text-raven-950 font-semibold text-base flex items-center gap-2.5 transition-all shadow-glow hover:scale-[1.01]"
            >
              <span>Start Creating Free</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="#features"
              className="px-6 py-3.5 rounded-xl bg-raven-700 hover:bg-raven-650 border border-seagrass-400/20 text-seagrass-100 font-medium text-base transition-colors flex items-center gap-2"
            >
              <Sliders className="w-4 h-4 text-seagrass-400" />
              <span>Explore Architecture</span>
            </a>
          </div>
        </div>

        {/* Interactive Faux Studio Window (Stageshow Specification) */}
        <div className="max-w-5xl mx-auto">
          <div className="rounded-2xl border border-raven-500/50 bg-raven-900 shadow-modal overflow-hidden transition-all">
            {/* Window Top Titlebar */}
            <div className="h-10 bg-raven-850 border-b border-raven-700/80 px-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#EF4444]/60" />
                <div className="w-3 h-3 rounded-full bg-[#F59E0B]/60" />
                <div className="w-3 h-3 rounded-full bg-[#22C55E]/60" />
                <span className="ml-3 text-xs font-mono text-seagrass-400">
                  reve-studio // SD-1.5 Latent Diffusion Pipeline
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="text-seagrass-400 hidden sm:inline">WORKER:</span>
                <span className="text-apricot-500 font-medium">{current.gpu}</span>
                <span className="px-1.5 py-0.5 rounded bg-semantic-success/10 border border-semantic-success/20 text-semantic-success text-[10px]">
                  ONLINE
                </span>
              </div>
            </div>

            {/* Window Studio Body */}
            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[460px]">
              {/* Left Canvas Preview Area */}
              <div className="lg:col-span-8 p-6 flex flex-col justify-between bg-raven-950/60 border-b lg:border-b-0 lg:border-r border-raven-700/60 relative">
                {/* Visual Viewport */}
                <div className="relative rounded-xl overflow-hidden border border-raven-600 bg-raven-900 aspect-square max-w-[420px] mx-auto w-full group shadow-surface">
                  <img
                    src={current.artUrl}
                    alt={current.title}
                    className={`w-full h-full object-cover transition-all duration-700 ${
                      isDenoising ? "filter blur-md scale-95 opacity-60" : "filter-none scale-100 opacity-100"
                    }`}
                  />

                  {/* Latent Simulation Overlay */}
                  {isDenoising && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-raven-950/70 backdrop-blur-sm">
                      <div className="w-8 h-8 rounded-full border-2 border-apricot-500 border-t-transparent animate-spin mb-3" />
                      <span className="text-xs font-mono text-seagrass-200">
                        DENOISING LATENTS: STEP 18/25...
                      </span>
                    </div>
                  )}

                  {/* Resolution chip */}
                  <div className="absolute bottom-3 left-3 px-2 py-1 rounded bg-raven-950/80 backdrop-blur border border-seagrass-400/20 text-[11px] font-mono text-seagrass-200">
                    {current.resolution} · RGB RASTER
                  </div>

                  {/* Re-simulate button */}
                  <button
                    onClick={triggerSimulation}
                    className="absolute top-3 right-3 p-2 rounded-lg bg-raven-950/80 hover:bg-raven-850 border border-seagrass-400/20 text-seagrass-200 hover:text-apricot-500 transition-colors"
                    title="Simulate Generation Step"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Prompt strip */}
                <div className="mt-4 p-3 rounded-lg bg-raven-850 border border-raven-700/80 text-xs text-seagrass-200 font-mono">
                  <span className="text-apricot-500 font-semibold mr-1.5">PROMPT &gt;</span>
                  <span className="text-seagrass-100">{current.prompt}</span>
                </div>
              </div>

              {/* Right Settings & Telemetry Inspector */}
              <div className="lg:col-span-4 p-5 flex flex-col justify-between bg-raven-900">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-raven-700">
                    <span className="text-xs uppercase font-mono tracking-wider text-seagrass-400">
                      Inference Config
                    </span>
                    <span className="text-xs font-mono text-apricot-500 font-semibold">
                      ₹0.00 / FREE
                    </span>
                  </div>

                  {/* Preset Pills */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-mono uppercase text-seagrass-400">
                      Sample Composition
                    </label>
                    <div className="flex flex-col gap-1.5">
                      {presets.map((p, idx) => (
                        <button
                          key={p.title}
                          onClick={() => setActivePreset(idx)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-between border ${
                            activePreset === idx
                              ? "bg-raven-700 border-apricot-500/60 text-seagrass-50"
                              : "bg-raven-850/60 border-raven-700/60 text-seagrass-400 hover:text-seagrass-200 hover:bg-raven-800"
                          }`}
                        >
                          <span className="truncate">{p.title}</span>
                          {activePreset === idx && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-apricot-500 shrink-0 ml-2" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Parameters Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2">
                    <div className="p-2.5 rounded-lg bg-raven-850 border border-raven-700/60">
                      <div className="text-[10px] text-seagrass-400">STEPS</div>
                      <div className="font-semibold text-seagrass-100">{current.steps}</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-raven-850 border border-raven-700/60">
                      <div className="text-[10px] text-seagrass-400">CFG SCALE</div>
                      <div className="font-semibold text-seagrass-100">{current.cfg}</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-raven-850 border border-raven-700/60">
                      <div className="text-[10px] text-seagrass-400">SAMPLER</div>
                      <div className="font-semibold text-seagrass-100 truncate">Euler_A</div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-raven-850 border border-raven-700/60">
                      <div className="text-[10px] text-seagrass-400">PRECISION</div>
                      <div className="font-semibold text-seagrass-100">FP16 CUDA</div>
                    </div>
                  </div>
                </div>

                {/* Bottom CTA within Window */}
                <div className="pt-4 border-t border-raven-700">
                  <button
                    onClick={() => navigate("/studio")}
                    className="w-full py-2.5 rounded-lg bg-apricot-500 hover:bg-apricot-400 text-raven-950 font-semibold text-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <span>Open Live Studio Canvas</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
