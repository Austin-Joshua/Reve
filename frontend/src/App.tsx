import React, { useState, useEffect } from "react";
import {
  Wand2,
  Layers,
  Sparkles,
  Settings,
  History,
  FolderOpen,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Plus,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  MousePointer,
  Paintbrush,
  Eraser,
  Type,
  Move,
  Server,
  Cpu,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { GenerationWorkspace } from "./features/generation/GenerationWorkspace";
import { useCanvasStore } from "./stores/canvasStore";
import { api } from "./services/api";

export function App() {
  const [activeTab, setActiveTab] = useState<"generate" | "editor">("generate");
  const [healthStatus, setHealthStatus] = useState<any>(null);
  const [credits, setCredits] = useState(50);

  const {
    activeTool,
    setActiveTool,
    layers,
    addLayer,
    removeLayer,
    updateLayer,
    activeLayerId,
    setActiveLayerId,
    zoom,
    setZoom,
  } = useCanvasStore();

  useEffect(() => {
    checkHealth();
    // Default demo layers for canvas editor
    if (layers.length === 0) {
      addLayer({
        id: "layer-bg",
        type: "raster",
        name: "Base Canvas",
        visible: true,
        locked: true,
        opacity: 1.0,
        zIndex: 0,
        transform: { x: 0, y: 0, width: 800, height: 800, rotation: 0 },
        content: { color: "#111113" },
      });
      addLayer({
        id: "layer-txt",
        type: "text",
        name: "Poster Title",
        visible: true,
        locked: false,
        opacity: 1.0,
        zIndex: 1,
        transform: { x: 100, y: 120, width: 600, height: 80, rotation: 0 },
        content: { text: "REVE GENERATIVE STUDIO", fontSize: 36, color: "#7C5CFC" },
      });
    }
  }, []);

  const checkHealth = async () => {
    try {
      const res = await api.get("/health");
      setHealthStatus(res.data);
    } catch (e: any) {
      setHealthStatus({
        status: "degraded",
        services: { database: { status: "connected" }, ai_provider: { status: "ready" } },
      });
    }
  };

  return (
    <div className="flex h-screen w-screen bg-[#0A0A0B] text-white flex-col font-sans select-none overflow-hidden">
      {/* Top Header */}
      <header className="h-12 border-b border-[#25252A] bg-[#111113] px-4 flex items-center justify-between z-20">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded bg-gradient-to-tr from-[#7C5CFC] to-[#9B7FFF] flex items-center justify-center font-bold text-xs">
              R
            </div>
            <span className="font-bold tracking-wider text-sm bg-gradient-to-r from-white to-[#A1A1AA] bg-clip-text text-transparent">
              REVE STUDIO
            </span>
            <span className="text-[10px] bg-[#25252A] text-[#7C5CFC] px-1.5 py-0.5 rounded font-mono font-medium">
              PHASE 1
            </span>
          </div>

          {/* Mode Switcher */}
          <div className="flex bg-[#1A1A1E] p-0.5 rounded-lg border border-[#25252A]">
            <button
              onClick={() => setActiveTab("generate")}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                activeTab === "generate"
                  ? "bg-[#7C5CFC] text-white shadow-sm"
                  : "text-[#A1A1AA] hover:text-white"
              }`}
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Generation Pipeline</span>
            </button>
            <button
              onClick={() => setActiveTab("editor")}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                activeTab === "editor"
                  ? "bg-[#7C5CFC] text-white shadow-sm"
                  : "text-[#A1A1AA] hover:text-white"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Canvas & Layers</span>
            </button>
          </div>
        </div>

        {/* Header Right: Status & Credits */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5 text-xs text-[#A1A1AA]">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono text-white font-medium">{credits}</span>
            <span>credits</span>
          </div>

          <div className="flex items-center space-x-1.5 text-xs">
            {healthStatus?.status === "healthy" ? (
              <span className="flex items-center space-x-1 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="text-[11px]">System Online</span>
              </span>
            ) : (
              <span className="flex items-center space-x-1 text-amber-400">
                <AlertCircle className="w-3.5 h-3.5" />
                <span className="text-[11px]">Local Zero-Cost Mode</span>
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Toolbar */}
        <aside className="w-12 border-r border-[#25252A] bg-[#111113] flex flex-col items-center py-3 space-y-4 z-10">
          <button
            onClick={() => setActiveTab("generate")}
            className={`p-2 rounded-lg transition-colors ${
              activeTab === "generate" ? "bg-[#7C5CFC]/20 text-[#7C5CFC]" : "text-[#71717A] hover:text-white"
            }`}
            title="Generate Pipeline"
          >
            <Wand2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setActiveTab("editor")}
            className={`p-2 rounded-lg transition-colors ${
              activeTab === "editor" ? "bg-[#7C5CFC]/20 text-[#7C5CFC]" : "text-[#71717A] hover:text-white"
            }`}
            title="Layer & Canvas Editor"
          >
            <Layers className="w-5 h-5" />
          </button>
          <button className="p-2 rounded-lg text-[#71717A] hover:text-white transition-colors" title="Projects">
            <FolderOpen className="w-5 h-5" />
          </button>
          <button className="p-2 rounded-lg text-[#71717A] hover:text-white transition-colors" title="Generation History">
            <History className="w-5 h-5" />
          </button>
          <div className="flex-1" />
          <button className="p-2 rounded-lg text-[#71717A] hover:text-white transition-colors" title="Settings">
            <Settings className="w-5 h-5" />
          </button>
        </aside>

        {/* Central Workspace: Generation View */}
        {activeTab === "generate" && <GenerationWorkspace />}

        {/* Central Workspace: Canvas & Layer Editor */}
        {activeTab === "editor" && (
          <div className="flex-1 flex overflow-hidden">
            {/* Editor Canvas Area */}
            <main className="flex-1 bg-[#0A0A0B] flex flex-col relative overflow-hidden">
              {/* Canvas Toolbar */}
              <div className="h-10 border-b border-[#25252A] bg-[#111113] px-3 flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  {[
                    { id: "select", icon: MousePointer, label: "Select (V)" },
                    { id: "brush", icon: Paintbrush, label: "Inpaint Brush (B)" },
                    { id: "eraser", icon: Eraser, label: "Eraser (E)" },
                    { id: "text", icon: Type, label: "Text Layer (T)" },
                    { id: "pan", icon: Move, label: "Pan (H)" },
                  ].map((tool) => {
                    const Icon = tool.icon;
                    return (
                      <button
                        key={tool.id}
                        onClick={() => setActiveTool(tool.id as any)}
                        className={`p-1.5 rounded transition-colors ${
                          activeTool === tool.id
                            ? "bg-[#7C5CFC] text-white"
                            : "text-[#71717A] hover:text-white hover:bg-[#1A1A1E]"
                        }`}
                        title={tool.label}
                      >
                        <Icon className="w-4 h-4" />
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center space-x-2 text-xs text-[#A1A1AA]">
                  <button
                    onClick={() => setZoom(Math.max(0.25, zoom - 0.1))}
                    className="p-1 hover:text-white"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-mono text-[11px] w-12 text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    onClick={() => setZoom(Math.min(3.0, zoom + 0.1))}
                    className="p-1 hover:text-white"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setZoom(1.0)}
                    className="p-1 hover:text-white ml-1"
                    title="Reset Zoom"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Visual Canvas Representation */}
              <div className="flex-1 flex items-center justify-center p-8 overflow-auto bg-[#070708] relative">
                <div
                  className="w-[500px] h-[500px] bg-[#111113] border border-[#25252A] rounded shadow-2xl relative overflow-hidden transition-transform duration-75"
                  style={{ transform: `scale(${zoom})` }}
                >
                  {/* Render Layers in Z-Index Order */}
                  {layers
                    .filter((l) => l.visible)
                    .map((layer) => (
                      <div
                        key={layer.id}
                        onClick={() => setActiveLayerId(layer.id)}
                        className={`absolute cursor-pointer transition-all ${
                          activeLayerId === layer.id ? "ring-2 ring-[#7C5CFC]" : ""
                        }`}
                        style={{
                          left: `${layer.transform.x}px`,
                          top: `${layer.transform.y}px`,
                          width: `${layer.transform.width}px`,
                          height: `${layer.transform.height}px`,
                          opacity: layer.opacity,
                          zIndex: layer.zIndex,
                        }}
                      >
                        {layer.type === "raster" && (
                          <div
                            className="w-full h-full flex items-center justify-center text-xs text-[#71717A] border border-[#25252A]"
                            style={{ background: layer.content.color || "#111113" }}
                          >
                            [Raster Element: {layer.name}]
                          </div>
                        )}
                        {layer.type === "text" && (
                          <div
                            className="w-full h-full font-bold flex items-center"
                            style={{
                              color: layer.content.color || "#FFFFFF",
                              fontSize: `${layer.content.fontSize || 24}px`,
                            }}
                          >
                            {layer.content.text}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            </main>

            {/* Right-Hand Layer Panel */}
            <aside className="w-72 border-l border-[#25252A] bg-[#111113] flex flex-col z-10">
              <div className="h-10 border-b border-[#25252A] px-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Layers</span>
                <button
                  onClick={() =>
                    addLayer({
                      id: `layer-${Date.now()}`,
                      type: "text",
                      name: `New Text Layer ${layers.length + 1}`,
                      visible: true,
                      locked: false,
                      opacity: 1.0,
                      zIndex: layers.length,
                      transform: { x: 50, y: 50, width: 300, height: 60, rotation: 0 },
                      content: { text: "Editable Text Layer", fontSize: 24, color: "#FFFFFF" },
                    })
                  }
                  className="p-1 rounded text-[#71717A] hover:text-white hover:bg-[#1A1A1E]"
                  title="Add Layer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Layer List */}
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {layers
                  .slice()
                  .reverse()
                  .map((layer) => (
                    <div
                      key={layer.id}
                      onClick={() => setActiveLayerId(layer.id)}
                      className={`flex items-center justify-between p-2 rounded text-xs transition-colors cursor-pointer ${
                        activeLayerId === layer.id
                          ? "bg-[#7C5CFC]/20 border border-[#7C5CFC]/40 text-white"
                          : "hover:bg-[#1A1A1E] text-[#A1A1AA]"
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        <span className="text-[10px] uppercase font-mono px-1 py-0.5 rounded bg-[#1A1A1E] text-[#71717A]">
                          {layer.type}
                        </span>
                        <span className="truncate">{layer.name}</span>
                      </div>

                      <div className="flex items-center space-x-1 text-[#71717A]">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateLayer(layer.id, { visible: !layer.visible });
                          }}
                          className="p-1 hover:text-white"
                        >
                          {layer.visible ? (
                            <Eye className="w-3.5 h-3.5" />
                          ) : (
                            <EyeOff className="w-3.5 h-3.5 text-red-400" />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateLayer(layer.id, { locked: !layer.locked });
                          }}
                          className="p-1 hover:text-white"
                        >
                          {layer.locked ? (
                            <Lock className="w-3.5 h-3.5 text-amber-400" />
                          ) : (
                            <Unlock className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeLayer(layer.id);
                          }}
                          className="p-1 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Properties Panel for Selected Layer */}
              {activeLayerId && (
                <div className="border-t border-[#25252A] p-3 bg-[#0E0E10] text-xs space-y-2">
                  <div className="font-semibold text-[11px] text-[#71717A] uppercase tracking-wider">
                    Transform & Properties
                  </div>
                  {(() => {
                    const l = layers.find((x) => x.id === activeLayerId);
                    if (!l) return null;
                    return (
                      <div className="space-y-2 text-[11px]">
                        <div className="flex justify-between">
                          <span className="text-[#71717A]">Opacity:</span>
                          <span className="font-mono text-white">
                            {Math.round(l.opacity * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={l.opacity}
                          onChange={(e) =>
                            updateLayer(l.id, { opacity: parseFloat(e.target.value) })
                          }
                          className="w-full accent-[#7C5CFC]"
                        />
                        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-[#71717A]">
                          <div>X: {l.transform.x}px</div>
                          <div>Y: {l.transform.y}px</div>
                          <div>W: {l.transform.width}px</div>
                          <div>H: {l.transform.height}px</div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </aside>
          </div>
        )}
      </div>

      {/* Bottom Status Bar */}
      <footer className="h-6 border-t border-[#25252A] bg-[#0E0E10] px-3 flex items-center justify-between text-[10px] text-[#71717A] font-mono z-20">
        <div className="flex items-center space-x-4">
          <span className="flex items-center space-x-1">
            <Server className="w-3 h-3 text-emerald-400" />
            <span>FastAPI: localhost:8000</span>
          </span>
          <span>PostgreSQL 16: Active</span>
          <span>Storage: Local Filesystem Fallback Active</span>
        </div>
        <div>Reve AI Architecture • Phase 1 Core Pipeline</div>
      </footer>
    </div>
  );
}

export default App;
