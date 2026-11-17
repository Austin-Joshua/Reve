import React from "react";
import { MessageSquare, Sliders, History, Layers, Cpu, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const WorkspaceSection: React.FC = () => {
  const navigate = useNavigate();

  const workspaceCapabilities = [
    {
      icon: MessageSquare,
      title: "Prompt composition",
      description: "Write clear descriptions with positive details and negative exclusions. Use Ctrl+Enter for rapid generation triggers.",
    },
    {
      icon: Cpu,
      title: "Image generation",
      description: "Dispatches requests directly to the Stable Diffusion 1.5 pipeline, producing genuine 512 × 512 pixel-space raster images.",
    },
    {
      icon: Sliders,
      title: "Model configuration",
      description: "Adjust inference steps, guidance scale (CFG), and seeds. Re-run identical seeds to verify repeatability or test variations.",
    },
    {
      icon: History,
      title: "Generation history",
      description: "Every generated image is preserved with its prompt, seed and settings. Click any past output to inspect or remix parameters.",
    },
    {
      icon: Layers,
      title: "Canvas & layer workspace",
      description: "Send generated images to the multi-layer canvas. Organize raster layers and vector typography with opacity and z-index controls.",
    },
  ];

  return (
    <section id="product" className="py-24 bg-raven-850 border-t border-raven-700/60 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="text-xs font-mono uppercase tracking-widest text-apricot-500 mb-2 font-semibold">
            Product
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-seagrass-50 font-sans tracking-tight">
            The workspace.
          </h2>
          <p className="mt-3 text-seagrass-300 text-sm sm:text-base leading-relaxed">
            Designed around the needs of creative exploration. A clean layout with direct access to your controls.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {workspaceCapabilities.map((cap) => {
            const Icon = cap.icon;
            return (
              <div
                key={cap.title}
                className="rounded-2xl border border-raven-700 bg-raven-900 p-6 flex flex-col justify-between hover:border-seagrass-400/30 transition-all shadow-surface"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-raven-800 border border-raven-700 flex items-center justify-center text-apricot-500 mb-4">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-bold text-seagrass-50 font-sans mb-2">
                    {cap.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-seagrass-300 leading-relaxed">
                    {cap.description}
                  </p>
                </div>
              </div>
            );
          })}

          {/* Quick Studio Callout Box */}
          <div className="rounded-2xl border border-apricot-500/40 bg-raven-800 p-6 flex flex-col justify-between shadow-surface">
            <div>
              <div className="text-xs font-mono uppercase tracking-wider text-apricot-400 font-semibold mb-2">
                Live environment
              </div>
              <h3 className="text-lg font-bold text-seagrass-50 font-sans mb-2">
                Test the studio interface
              </h3>
              <p className="text-xs sm:text-sm text-seagrass-300 leading-relaxed">
                Launch the workspace and start exploring prompts directly on the canvas.
              </p>
            </div>
            <button
              onClick={() => navigate("/studio")}
              className="mt-6 w-full py-2.5 rounded-lg bg-apricot-500 hover:bg-apricot-400 text-raven-950 font-semibold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <span>Enter Reve Studio</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
