import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Sliders, CheckCircle2 } from "lucide-react";

export const HeroSection: React.FC = () => {
  const navigate = useNavigate();
  const [activePreset, setActivePreset] = useState<number>(0);

  const demonstrationCases = [
    {
      title: "Architectural Pavilion",
      prompt: "Minimalist concrete pavilion over dark turquoise water, overcast morning light, raw board-formed architectural finish, sharp geometric shadows",
      model: "Stable Diffusion 1.5",
      steps: 25,
      cfg: 7.5,
      resolution: "512 × 512",
      imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1000&q=80",
    },
    {
      title: "Tactile Product Study",
      prompt: "Studio macro photography of an audio synthesizer, matte black anodized aluminum, brass rotary dials, amber indicator lamps, soft directional fill",
      model: "Stable Diffusion 1.5",
      steps: 25,
      cfg: 7.0,
      resolution: "512 × 512",
      imageUrl: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1000&q=80",
    },
    {
      title: "Cinematic Atmosphere",
      prompt: "Rain-slicked coastal highway at twilight, distant amber fog lights reflected on wet asphalt, atmospheric mist, 35mm film still",
      model: "Stable Diffusion 1.5",
      steps: 28,
      cfg: 7.5,
      resolution: "512 × 512",
      imageUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1000&q=80",
    },
  ];

  const current = demonstrationCases[activePreset];

  return (
    <section className="relative pt-16 pb-24 overflow-hidden bg-raven-800">
      {/* Background radial ambiance */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,rgba(39,71,74,0.3),transparent_70%)] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Hero Headings */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-seagrass-50 font-sans leading-[1.1]">
            Make the image you have in mind.
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-seagrass-300 max-w-2xl mx-auto leading-relaxed">
            Start with a description. Shape the details. Create images with a diffusion workflow built around your ideas.
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => navigate("/studio")}
              className="px-6 py-3.5 rounded-xl bg-apricot-500 hover:bg-apricot-400 active:bg-apricot-600 text-raven-950 font-semibold text-base flex items-center gap-2.5 transition-all shadow-surface hover:scale-[1.01]"
            >
              <span>Open Studio</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="#how-it-works"
              className="px-6 py-3.5 rounded-xl bg-raven-750 hover:bg-raven-700 border border-seagrass-400/20 text-seagrass-100 font-medium text-base transition-colors flex items-center gap-2"
            >
              <span>Explore the workflow</span>
            </a>
          </div>
        </div>

        {/* Honest Product Demonstration Window */}
        <div className="max-w-5xl mx-auto">
          <div className="rounded-2xl border border-raven-700 bg-raven-900 shadow-modal overflow-hidden">
            {/* Window Top Titlebar */}
            <div className="h-10 bg-raven-850 border-b border-raven-700 px-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-raven-700" />
                <div className="w-3 h-3 rounded-full bg-raven-700" />
                <div className="w-3 h-3 rounded-full bg-raven-700" />
                <span className="ml-3 text-xs font-mono text-seagrass-400">
                  Reve Studio — Workspace preview
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-seagrass-400">
                <span>Model:</span>
                <span className="text-seagrass-100 font-medium">Stable Diffusion 1.5</span>
              </div>
            </div>

            {/* Window Studio Body */}
            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[440px]">
              {/* Left Canvas Preview Area */}
              <div className="lg:col-span-8 p-6 flex flex-col justify-between bg-raven-950 border-b lg:border-b-0 lg:border-r border-raven-700 relative">
                {/* Visual Viewport */}
                <div className="relative rounded-xl overflow-hidden border border-raven-700 bg-raven-900 aspect-square max-w-[380px] mx-auto w-full shadow-surface">
                  <img
                    src={current.imageUrl}
                    alt={current.title}
                    className="w-full h-full object-cover"
                  />

                  {/* Resolution badge */}
                  <div className="absolute bottom-3 left-3 px-2 py-1 rounded bg-raven-950/80 backdrop-blur border border-seagrass-400/20 text-[11px] font-mono text-seagrass-200">
                    {current.resolution} · Raster Output
                  </div>
                </div>

                {/* Demonstration Prompt Strip */}
                <div className="mt-4 p-3 rounded-lg bg-raven-900 border border-raven-700 text-xs text-seagrass-200 font-mono">
                  <span className="text-apricot-500 font-semibold mr-1.5">IMAGE DESCRIPTION &gt;</span>
                  <span className="text-seagrass-100">{current.prompt}</span>
                </div>
              </div>

              {/* Right Settings Inspector */}
              <div className="lg:col-span-4 p-5 flex flex-col justify-between bg-raven-850">
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-raven-700">
                    <span className="text-xs font-mono uppercase tracking-wider text-seagrass-300 font-semibold">
                      Sample Direction
                    </span>
                    <span className="text-[11px] font-mono text-seagrass-400">
                      Demonstration
                    </span>
                  </div>

                  {/* Preset Selector */}
                  <div className="space-y-1.5">
                    {demonstrationCases.map((p, idx) => (
                      <button
                        key={p.title}
                        onClick={() => setActivePreset(idx)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between border ${
                          activePreset === idx
                            ? "bg-raven-750 border-apricot-500/50 text-seagrass-50"
                            : "bg-raven-900/60 border-raven-700/60 text-seagrass-400 hover:text-seagrass-200 hover:bg-raven-800"
                        }`}
                      >
                        <span className="truncate">{p.title}</span>
                        {activePreset === idx && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-apricot-500 shrink-0 ml-2" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Configuration parameters */}
                  <div className="pt-2 border-t border-raven-700/60 space-y-2 text-xs font-mono">
                    <div className="flex justify-between py-1 text-seagrass-300">
                      <span className="text-seagrass-400">STEPS:</span>
                      <span className="text-seagrass-100">{current.steps}</span>
                    </div>
                    <div className="flex justify-between py-1 text-seagrass-300">
                      <span className="text-seagrass-400">GUIDANCE:</span>
                      <span className="text-seagrass-100">{current.cfg}</span>
                    </div>
                    <div className="flex justify-between py-1 text-seagrass-300">
                      <span className="text-seagrass-400">OUTPUT SIZE:</span>
                      <span className="text-seagrass-100">{current.resolution}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-raven-700">
                  <button
                    onClick={() => navigate("/studio")}
                    className="w-full py-2.5 rounded-lg bg-apricot-500 hover:bg-apricot-400 text-raven-950 font-semibold text-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <span>Try this in the studio</span>
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
