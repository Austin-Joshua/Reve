import React, { useState, useEffect } from "react";
import {
  Wand2,
  Image as ImageIcon,
  Sparkles,
  Sliders,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Clock,
  XCircle,
  Upload,
  Download,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { api } from "@/services/api";

interface GenerationItem {
  id: string;
  generation_type: string;
  prompt: string;
  negative_prompt?: string;
  model_id: string;
  status: string;
  width: number;
  height: number;
  seed?: number;
  created_at: string;
  images: Array<{
    id: string;
    url: string;
    thumbnail_url?: string;
    width: number;
    height: number;
  }>;
}

export function GenerationWorkspace() {
  const [mode, setMode] = useState<"text2img" | "img2img">("text2img");
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [showNegative, setShowNegative] = useState(false);
  const [modelId, setModelId] = useState("FLUX.1-dev");
  const [width, setWidth] = useState(1024);
  const [height, setHeight] = useState(1024);
  const [steps, setSteps] = useState(28);
  const [cfgScale, setCfgScale] = useState(3.5);
  const [strength, setStrength] = useState(0.75);
  const [seed, setSeed] = useState<string>("");

  // Source image for img2img
  const [sourceImageId, setSourceImageId] = useState<string | null>(null);
  const [sourceImagePreview, setSourceImagePreview] = useState<string | null>(null);
  const [isUploadingSource, setIsUploadingSource] = useState(false);

  // Active Job State
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState(0);
  const [jobStage, setJobStage] = useState<string | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [resultImages, setResultImages] = useState<any[]>([]);

  // Generation History
  const [history, setHistory] = useState<GenerationItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [selectedResult, setSelectedResult] = useState<any | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await api.get("/generations?limit=15");
      setHistory(res.data);
    } catch {
      // Unauthenticated or local fallback
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSourceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingSource(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post("/images/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSourceImageId(res.data.image_id);
      setSourceImagePreview(res.data.url);
    } catch (err: any) {
      alert("Failed to upload image: " + (err.response?.data?.detail?.message || err.message));
    } finally {
      setIsUploadingSource(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setJobError(null);
    setResultImages([]);
    setJobStatus("QUEUED");
    setJobStage("submitting_job");
    setJobProgress(5);

    try {
      let res;
      if (mode === "text2img") {
        res = await api.post("/generations/text-to-image", {
          prompt,
          negative_prompt: showNegative && negativePrompt.trim() ? negativePrompt : undefined,
          model_id: modelId,
          width,
          height,
          steps,
          cfg_scale: cfgScale,
          seed: seed ? parseInt(seed, 10) : undefined,
          num_images: 1,
        });
      } else {
        if (!sourceImageId) {
          alert("Please upload a source image for image-to-image transformation.");
          setJobStatus(null);
          return;
        }
        res = await api.post("/generations/image-to-image", {
          source_image_id: sourceImageId,
          prompt,
          negative_prompt: showNegative && negativePrompt.trim() ? negativePrompt : undefined,
          model_id: modelId,
          strength,
          steps,
          cfg_scale: cfgScale,
          seed: seed ? parseInt(seed, 10) : undefined,
        });
      }

      const jobId = res.data.job_id;
      setActiveJobId(jobId);
      pollJob(jobId);
    } catch (err: any) {
      setJobStatus("FAILED");
      setJobError(err.response?.data?.detail?.message || "Failed to submit generation job.");
    }
  };

  const pollJob = (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/jobs/${jobId}`);
        const data = res.data;
        setJobStatus(data.status);
        setJobProgress(data.progress || 0);
        setJobStage(data.stage || "processing");

        if (data.status === "COMPLETED") {
          clearInterval(interval);
          setResultImages(data.result_images || []);
          if (data.result_images && data.result_images.length > 0) {
            setSelectedResult(data.result_images[0]);
          }
          fetchHistory();
        } else if (data.status === "FAILED") {
          clearInterval(interval);
          setJobError(data.error_message || "Generation job failed.");
        } else if (data.status === "CANCELLED") {
          clearInterval(interval);
          setJobError("Job was cancelled.");
        }
      } catch (e: any) {
        clearInterval(interval);
        setJobStatus("FAILED");
        setJobError("Lost connection to job status endpoint.");
      }
    }, 800);
  };

  const handleCancel = async () => {
    if (!activeJobId) return;
    try {
      await api.post(`/jobs/${activeJobId}/cancel`);
      setJobStatus("CANCELLED");
      setJobStage("cancelled");
    } catch (e) {
      // Ignored
    }
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-[#0A0A0B]">
      {/* Center Generation Canvas & Output Display */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-auto">
          {/* Active Result View */}
          {selectedResult ? (
            <div className="flex flex-col items-center max-h-full">
              <div className="relative rounded-xl overflow-hidden border border-[#25252A] shadow-2xl bg-[#111113] max-w-[650px] max-h-[500px]">
                <img
                  src={selectedResult.url}
                  alt="Generated Artwork"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex items-center space-x-4 mt-3 text-xs text-[#A1A1AA]">
                <span>
                  {selectedResult.width}×{selectedResult.height}px
                </span>
                <a
                  href={selectedResult.url}
                  download="reve_generation.png"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center space-x-1 text-[#7C5CFC] hover:underline"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Full Resolution</span>
                </a>
              </div>
            </div>
          ) : jobStatus === "PROCESSING" || jobStatus === "QUEUED" ? (
            /* Active Job In-Flight Card */
            <div className="w-[480px] p-6 rounded-2xl border border-[#25252A] bg-[#111113] shadow-2xl flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#7C5CFC]/10 border border-[#7C5CFC]/30 flex items-center justify-center text-[#7C5CFC] mb-4 animate-pulse">
                <Sparkles className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-semibold text-white mb-1">
                {jobStatus === "QUEUED" ? "Job Queued in Worker Engine" : "Executing Latent Diffusion"}
              </h4>
              <p className="text-xs text-[#71717A] mb-4 capitalize">
                Stage: {jobStage?.replace("_", " ") || "Processing"}
              </p>

              {/* Real Progress Bar */}
              <div className="w-full bg-[#1A1A1E] h-2 rounded-full overflow-hidden mb-2 border border-[#25252A]">
                <div
                  className="bg-gradient-to-r from-[#7C5CFC] to-[#9B7FFF] h-full transition-all duration-300"
                  style={{ width: `${Math.max(5, jobProgress)}%` }}
                />
              </div>
              <div className="flex justify-between w-full text-[10px] text-[#71717A] font-mono mb-4">
                <span>Status: {jobStatus}</span>
                <span>{jobProgress}%</span>
              </div>

              <button
                onClick={handleCancel}
                className="text-xs text-red-400 hover:text-red-300 hover:bg-red-400/10 px-3 py-1.5 rounded-lg border border-red-500/20 transition-colors"
              >
                Cancel Job
              </button>
            </div>
          ) : jobStatus === "FAILED" ? (
            /* Honest Failure Card (Zero Fake-AI Policy) */
            <div className="w-[520px] p-6 rounded-2xl border border-red-500/30 bg-[#160E10] shadow-2xl flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-3">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-white mb-1">
                Generation Preflight Check
              </h4>
              <p className="text-xs text-[#A1A1AA] mb-4 leading-relaxed font-mono text-[11px] bg-[#0A0A0B] p-3 rounded-lg border border-[#25252A] w-full text-left">
                {jobError}
              </p>
              <div className="flex items-center space-x-2 text-[11px] text-[#71717A] mb-4">
                <Info className="w-3.5 h-3.5 text-amber-400" />
                <span>Under ₹0-first rules, hardware limits are honestly enforced without mock fallbacks.</span>
              </div>
              <button
                onClick={() => {
                  setJobStatus(null);
                  setJobError(null);
                }}
                className="text-xs bg-[#25252A] hover:bg-[#323238] text-white px-4 py-2 rounded-lg transition-colors"
              >
                Dismiss & Change Configuration
              </button>
            </div>
          ) : (
            /* Empty State */
            <div className="w-[480px] h-[360px] rounded-2xl border border-dashed border-[#25252A] bg-[#111113]/50 flex flex-col items-center justify-center p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#1A1A1E] flex items-center justify-center mb-3 text-[#7C5CFC]">
                <Wand2 className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-white mb-1">Ready to Synthesize</h4>
              <p className="text-xs text-[#71717A] max-w-xs mb-4">
                Configure your prompt and generation parameters. The latent diffusion engine will generate genuine raster imagery.
              </p>
              <div className="text-[11px] font-mono text-[#71717A] flex items-center space-x-2 bg-[#1A1A1E] px-3 py-1.5 rounded-lg border border-[#25252A]">
                <span>Active Model:</span>
                <span className="text-[#7C5CFC] font-semibold">{modelId}</span>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Prompt Composer Bar */}
        <div className="border-t border-[#25252A] bg-[#111113] p-4 flex flex-col space-y-3 z-10">
          {/* Mode Selector and Negative Prompt Toggle */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setMode("text2img")}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  mode === "text2img"
                    ? "bg-[#7C5CFC]/20 text-[#7C5CFC] border border-[#7C5CFC]/40"
                    : "text-[#71717A] hover:text-white"
                }`}
              >
                Text-to-Image
              </button>
              <button
                onClick={() => setMode("img2img")}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  mode === "img2img"
                    ? "bg-[#7C5CFC]/20 text-[#7C5CFC] border border-[#7C5CFC]/40"
                    : "text-[#71717A] hover:text-white"
                }`}
              >
                Image-to-Image
              </button>
            </div>

            <button
              onClick={() => setShowNegative(!showNegative)}
              className="text-[#71717A] hover:text-white flex items-center space-x-1"
            >
              <span>Negative Prompt</span>
              {showNegative ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Optional Img2Img Source Upload Strip */}
          {mode === "img2img" && (
            <div className="flex items-center space-x-3 p-2.5 bg-[#1A1A1E] rounded-xl border border-[#25252A]">
              <label className="cursor-pointer bg-[#25252A] hover:bg-[#323238] text-white px-3 py-1.5 rounded-lg text-xs flex items-center space-x-1.5 transition-colors">
                <Upload className="w-3.5 h-3.5 text-[#7C5CFC]" />
                <span>{isUploadingSource ? "Uploading..." : "Upload Source Image"}</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleSourceUpload}
                  className="hidden"
                />
              </label>

              {sourceImagePreview ? (
                <div className="flex items-center space-x-2 text-xs text-[#A1A1AA]">
                  <img
                    src={sourceImagePreview}
                    alt="Source Preview"
                    className="w-8 h-8 rounded object-cover border border-[#25252A]"
                  />
                  <span>Source loaded. Adjust strength slider (currently {strength}).</span>
                </div>
              ) : (
                <span className="text-xs text-[#71717A]">
                  Select an input photograph or artwork to transform.
                </span>
              )}
            </div>
          )}

          {/* Negative Prompt Input Field */}
          {showNegative && (
            <input
              type="text"
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              placeholder="Negative prompt (elements to avoid: blurry, low quality, distorted, extra limbs)..."
              className="w-full bg-[#1A1A1E] border border-[#25252A] rounded-lg px-3 py-2 text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-[#7C5CFC]"
            />
          )}

          {/* Main Prompt Bar */}
          <div className="flex items-center space-x-3">
            <div className="flex-1 relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
                rows={2}
                placeholder="Describe your vision in detail (e.g. A futuristic glass greenhouse in a cyberpunk metropolis, rainy night, volumetric cinematic lighting, 8k)..."
                className="w-full bg-[#1A1A1E] border border-[#25252A] rounded-xl px-4 py-2.5 text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-[#7C5CFC] resize-none"
              />
              <div className="absolute right-3 bottom-2 text-[10px] text-[#71717A] font-mono">
                ↵ ENTER
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || jobStatus === "PROCESSING" || jobStatus === "QUEUED"}
              className="bg-[#7C5CFC] hover:bg-[#9B7FFF] active:bg-[#5B3FD4] disabled:opacity-50 text-white font-medium text-xs px-6 py-4 rounded-xl flex items-center space-x-2 transition-all shadow-lg shadow-[#7C5CFC]/20 cursor-pointer h-[58px]"
            >
              <Wand2 className="w-4 h-4 fill-current" />
              <span>{jobStatus === "PROCESSING" ? "Processing..." : "Generate"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Right-Hand Parameters & History Drawer */}
      <aside className="w-80 border-l border-[#25252A] bg-[#111113] flex flex-col z-10">
        {/* Tab Header: Parameters vs History */}
        <div className="h-10 border-b border-[#25252A] px-3 flex items-center justify-between text-xs font-semibold text-white">
          <div className="flex items-center space-x-1.5">
            <Sliders className="w-3.5 h-3.5 text-[#7C5CFC]" />
            <span>Generation Parameters</span>
          </div>
        </div>

        {/* Parameter Controls */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1 text-xs">
          {/* Model Selection */}
          <div>
            <label className="text-[11px] text-[#71717A] font-medium block mb-1.5 uppercase tracking-wider">
              AI Diffusion Model
            </label>
            <select
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              className="w-full bg-[#1A1A1E] border border-[#25252A] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7C5CFC] cursor-pointer"
            >
              <option value="FLUX.1-dev">FLUX.1 [dev] (12B Params - High Quality)</option>
              <option value="FLUX.1-schnell">FLUX.1 [schnell] (4-Step Fast)</option>
              <option value="SDXL-1.0">Stable Diffusion XL 1.0 (6.6B Params)</option>
              <option value="SDXL-Turbo">SDXL Turbo (1-Step Realtime)</option>
              <option value="SD-1.5">Stable Diffusion 1.5 (Lightweight Baseline)</option>
            </select>
          </div>

          {/* Aspect Ratio & Dimensions */}
          <div>
            <label className="text-[11px] text-[#71717A] font-medium block mb-1.5 uppercase tracking-wider">
              Dimensions & Aspect Ratio
            </label>
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              {[
                { label: "1:1 Square", w: 1024, h: 1024 },
                { label: "16:9 Landscape", w: 1024, h: 576 },
                { label: "9:16 Portrait", w: 576, h: 1024 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => {
                    setWidth(preset.w);
                    setHeight(preset.h);
                  }}
                  className={`py-1.5 px-2 rounded text-[11px] text-center border transition-colors ${
                    width === preset.w && height === preset.h
                      ? "bg-[#7C5CFC]/20 border-[#7C5CFC] text-white"
                      : "bg-[#1A1A1E] border-[#25252A] text-[#71717A] hover:text-white"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="text-[10px] font-mono text-[#71717A] flex justify-between">
              <span>Width: {width}px</span>
              <span>Height: {height}px</span>
            </div>
          </div>

          {/* Steps */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-[#71717A]">Inference Steps:</span>
              <span className="font-mono text-white">{steps}</span>
            </div>
            <input
              type="range"
              min="10"
              max="50"
              step="1"
              value={steps}
              onChange={(e) => setSteps(parseInt(e.target.value, 10))}
              className="w-full accent-[#7C5CFC]"
            />
          </div>

          {/* CFG Guidance Scale */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-[#71717A]">CFG Guidance Scale:</span>
              <span className="font-mono text-white">{cfgScale}</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="15.0"
              step="0.5"
              value={cfgScale}
              onChange={(e) => setCfgScale(parseFloat(e.target.value))}
              className="w-full accent-[#7C5CFC]"
            />
          </div>

          {/* Img2Img Strength (if in img2img mode) */}
          {mode === "img2img" && (
            <div>
              <div className="flex justify-between text-[11px] mb-1">
                <span className="text-[#71717A]">Transformation Strength:</span>
                <span className="font-mono text-white">{Math.round(strength * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={strength}
                onChange={(e) => setStrength(parseFloat(e.target.value))}
                className="w-full accent-[#7C5CFC]"
              />
            </div>
          )}

          {/* Seed Input */}
          <div>
            <label className="text-[11px] text-[#71717A] font-medium block mb-1">
              Seed (Blank for Random)
            </label>
            <input
              type="text"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              placeholder="Random seed..."
              className="w-full bg-[#1A1A1E] border border-[#25252A] rounded-lg px-3 py-1.5 text-xs text-white font-mono placeholder-[#71717A] focus:outline-none focus:border-[#7C5CFC]"
            />
          </div>

          {/* Recent History Section */}
          <div className="pt-4 border-t border-[#25252A]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] text-[#71717A] font-semibold uppercase tracking-wider">
                Recent Generations
              </span>
              <button
                onClick={fetchHistory}
                className="text-[10px] text-[#7C5CFC] hover:underline"
              >
                Refresh
              </button>
            </div>

            {history.length === 0 ? (
              <p className="text-[11px] text-[#71717A] italic">No past generations recorded.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (item.images && item.images.length > 0) {
                        setSelectedResult(item.images[0]);
                      }
                    }}
                    className="p-2 rounded-lg bg-[#1A1A1E] hover:bg-[#25252A] cursor-pointer transition-colors border border-[#25252A]"
                  >
                    <div className="flex items-center justify-between text-[10px] mb-1">
                      <span className="font-mono text-[#7C5CFC] uppercase">
                        {item.generation_type}
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-medium ${
                          item.status === "COMPLETED"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : item.status === "FAILED"
                            ? "bg-red-500/10 text-red-400"
                            : "bg-amber-500/10 text-amber-400"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-white line-clamp-2 mb-1.5">
                      {item.prompt}
                    </p>
                    <div className="flex justify-between text-[10px] text-[#71717A] font-mono">
                      <span>{item.model_id}</span>
                      <span>
                        {item.width}×{item.height}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
