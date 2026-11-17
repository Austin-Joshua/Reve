import React, { useState } from "react";
import { Sparkles, Eye, Copy, Check, ArrowUpRight, Sliders } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ShowcaseItem {
  id: string;
  category: string;
  title: string;
  prompt: string;
  model: string;
  steps: number;
  cfg: number;
  seed: number;
  imageUrl: string;
}

const SHOWCASE_ITEMS: ShowcaseItem[] = [
  {
    id: "sc-1",
    category: "Cinematic",
    title: "Tokyo Obsidian Twilight",
    prompt: "Cinematic 35mm film photograph of rain-slicked Tokyo street at dusk, neon cyan and amber signage reflected in puddles, atmospheric haze, shallow depth of field, photorealistic",
    model: "SD-1.5",
    steps: 25,
    cfg: 7.5,
    seed: 4829103,
    imageUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "sc-2",
    category: "Architecture",
    title: "Brutalist Coastal Pavilion",
    prompt: "Minimalist concrete cantilevered villa overlooking dark turquoise ocean, overcast northern light, raw board-formed architectural finish, sharp geometric shadows",
    model: "SD-1.5",
    steps: 28,
    cfg: 8.0,
    seed: 9182371,
    imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "sc-3",
    category: "Product Design",
    title: "Tactile Mechanical Instrument",
    prompt: "Studio macro photography of a matte black aerospace aluminum audio synthesizer, brass knurled rotary knobs, illuminated amber LED meters, 8k commercial catalogue",
    model: "SD-1.5",
    steps: 26,
    cfg: 7.0,
    seed: 3719284,
    imageUrl: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "sc-4",
    category: "Digital Art",
    title: "Monolithic Mineral Suspension",
    prompt: "Surreal basalt monolith floating above a mirror-calm obsidian lake, glowing veins of raw quartz and amber resin, ethereal twilight fog, intricate digital painting",
    model: "SD-1.5",
    steps: 30,
    cfg: 7.5,
    seed: 6291048,
    imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "sc-5",
    category: "Portraits",
    title: "Cybernetic Sensor Specialist",
    prompt: "Close-up portrait of a woman engineer with subtle ceramic biometric ocular implants, ambient teal fill light, warm rim light, natural skin texture, dramatic studio lighting",
    model: "SD-1.5",
    steps: 25,
    cfg: 7.5,
    seed: 1049283,
    imageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80",
  },
  {
    id: "sc-6",
    category: "Conceptual",
    title: "Subterranean Geothermal Spire",
    prompt: "Monumental underground geothermal research cathedral, carved basalt columns, molten amber channels in stone floor, rising steam caught in shafts of moonlight",
    model: "SD-1.5",
    steps: 32,
    cfg: 8.5,
    seed: 8472910,
    imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80",
  },
];

const CATEGORIES = ["All", "Cinematic", "Architecture", "Product Design", "Digital Art", "Portraits", "Conceptual"];

export const ShowcaseSection: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const navigate = useNavigate();

  const filteredItems =
    selectedCategory === "All"
      ? SHOWCASE_ITEMS
      : SHOWCASE_ITEMS.filter((item) => item.category === selectedCategory);

  const handleCopyPrompt = (id: string, prompt: string) => {
    navigator.clipboard.writeText(prompt);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <section id="showcase" className="py-24 bg-raven-850 border-t border-raven-700/60 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-widest text-apricot-500 mb-2 font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Creative Showcase</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-seagrass-50 font-sans tracking-tight">
              Real Diffusion Outputs. Pure Fidelity.
            </h2>
            <p className="mt-2 text-seagrass-300 max-w-xl text-sm sm:text-base">
              Explore raster-space diffusion generated using genuine inference parameters.
              Each output reflects exact model checkpoints and deterministic seeds.
            </p>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-raven-900 p-1.5 rounded-xl border border-raven-700/60">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedCategory === cat
                    ? "bg-raven-700 text-seagrass-50 font-semibold border border-apricot-500/30"
                    : "text-seagrass-400 hover:text-seagrass-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="group rounded-xl border border-raven-700 bg-raven-900 overflow-hidden shadow-surface flex flex-col justify-between hover:border-seagrass-400/40 transition-all duration-300"
            >
              {/* Image Frame */}
              <div className="relative aspect-square w-full overflow-hidden bg-raven-950">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />

                {/* Top badges */}
                <div className="absolute top-3 left-3 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-raven-950/80 backdrop-blur border border-seagrass-400/20 text-[10px] font-mono text-seagrass-200">
                    {item.category}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-apricot-500/20 border border-apricot-500/30 text-[10px] font-mono text-apricot-400 font-semibold">
                    {item.model}
                  </span>
                </div>

                {/* Quick copy overlay on hover */}
                <div className="absolute inset-0 bg-raven-950/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 p-4">
                  <button
                    onClick={() => handleCopyPrompt(item.id, item.prompt)}
                    className="px-3 py-2 rounded-lg bg-raven-800 hover:bg-raven-700 border border-seagrass-400/30 text-xs font-mono text-seagrass-100 flex items-center gap-1.5 transition-colors shadow-surface"
                  >
                    {copiedId === item.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-semantic-success" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-apricot-500" />
                        <span>Copy Prompt</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => navigate("/studio")}
                    className="px-3 py-2 rounded-lg bg-apricot-500 hover:bg-apricot-400 text-raven-950 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-surface"
                  >
                    <span>Remix</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Card Meta Footer */}
              <div className="p-4 bg-raven-900 flex-1 flex flex-col justify-between border-t border-raven-700/60">
                <div>
                  <h3 className="text-sm font-semibold text-seagrass-50 font-sans truncate">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-xs text-seagrass-400 line-clamp-2 leading-relaxed">
                    {item.prompt}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-raven-800 flex items-center justify-between text-[11px] font-mono text-seagrass-400">
                  <span>STEPS: {item.steps}</span>
                  <span>CFG: {item.cfg}</span>
                  <span>SEED: #{item.seed}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
