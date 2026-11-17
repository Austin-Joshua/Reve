import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BrandLogo } from "../../components/common/BrandLogo";
import { useAuthStore } from "../../stores/authStore";
import { useCanvasStore } from "../../stores/canvasStore";
import { api } from "../../services/api";
import {
  Wand2,
  Image as ImageIcon,
  Layers,
  History,
  Sliders,
  Sparkles,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Eye,
  EyeOff,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Copy,
  Check,
  Server,
  Cpu,
  ArrowRight,
  LogOut,
  User,
  HelpCircle,
  ChevronRight,
  ChevronDown,
  Dice5,
  X,
  ExternalLink,
} from "lucide-react";

interface GenerationRecord {
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

export const StudioWorkspace: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, fetchUser } = useAuthStore();
  const { layers, addLayer } = useCanvasStore();

  // Active View / Tool Mode
  const [activeTab, setActiveTab] = useState<"generate" | "layers" | "history">("generate");
  const [mode, setMode] = useState<"text2img" | "img2img">("text2img");

  // Core Generation Parameters
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [showNegative, setShowNegative] = useState(false);

  // Model configuration - Stable Diffusion 1.5 is the active working Colab model
  const [modelId, setModelId] = useState("SD-1.5");
  const [width, setWidth] = useState(512);
  const [height, setHeight] = useState(512);
  const [steps, setSteps] = useState(25);
  const [cfgScale, setCfgScale] = useState(7.5);
  const [strength, setStrength] = useState(0.70);
  const [seed, setSeed] = useState<string>("");

  // Source Image for Image-to-Image
  const [sourceImageId, setSourceImageId] = useState<string | null>(null);
  const [sourceImagePreview, setSourceImagePreview] = useState<string | null>(null);
  const [isUploadingSource, setIsUploadingSource] = useState(false);

  // Active Job State
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState(0);
  const [jobStage, setJobStage] = useState<string | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);
  const [activeImageResult, setActiveImageResult] = useState<any | null>(null);

  // Generation History
  const [history, setHistory] = useState<GenerationRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // UI States
  const [settingsOpen, setSettingsOpen] = useState(true);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<"fit" | "100" | "150">("fit");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [telemetryOpen, setTelemetryOpen] = useState(false);
  const [projectName, setProjectName] = useState("Untitled Studio 01");
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const promptInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchUser();
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const res = await api.get("/generations?limit=25");
      setHistory(res.data);
      if (res.data.length > 0 && !activeImageResult) {
        const latest = res.data[0];
        if (latest.images && latest.images.length > 0) {
          setActiveImageResult({
            ...latest.images[0],
            prompt: latest.prompt,
            seed: latest.seed,
            model_id: latest.model_id,
          });
        }
      }
    } catch {
      // Backend history fallback
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
      setMode("img2img");
    } catch (err: any) {
      alert("Failed to upload image: " + (err.response?.data?.detail?.message || err.message));
    } finally {
      setIsUploadingSource(false);
    }
  };

  const clearSourceImage = () => {
    setSourceImageId(null);
    setSourceImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const randomizeSeed = () => {
    setSeed(Math.floor(Math.random() * 2147483647).toString());
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || jobStatus === "PROCESSING" || jobStatus === "QUEUED") return;

    setJobError(null);
    setJobStatus("QUEUED");
    setJobStage("Submitting job to queue");
    setJobProgress(10);

    try {
      let res;
      if (mode === "text2img") {
        res = await api.post("/generations/text-to-image", {
          prompt: prompt.trim(),
          negative_prompt: showNegative && negativePrompt.trim() ? negativePrompt.trim() : undefined,
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
          alert("Please upload a source image for image-to-image synthesis.");
          setJobStatus(null);
          return;
        }
        res = await api.post("/generations/image-to-image", {
          source_image_id: sourceImageId,
          prompt: prompt.trim(),
          negative_prompt: showNegative && negativePrompt.trim() ? negativePrompt.trim() : undefined,
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
      setJobError(err.response?.data?.detail?.message || err.message || "Failed to submit generation job.");
    }
  };

  const pollJob = (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/jobs/${jobId}`);
        const data = res.data;
        setJobStatus(data.status);
        setJobProgress(data.progress || 20);
        setJobStage(data.stage || "Denoising latents on GPU");

        if (data.status === "COMPLETED") {
          clearInterval(interval);
          setJobProgress(100);
          if (data.result_images && data.result_images.length > 0) {
            setActiveImageResult({
              ...data.result_images[0],
              prompt: prompt,
              seed: seed ? parseInt(seed, 10) : undefined,
              model_id: modelId,
            });
          }
          fetchHistory();
          fetchUser();
        } else if (data.status === "FAILED") {
          clearInterval(interval);
          setJobError(data.error_message || "Inference error occurred on GPU worker.");
        } else if (data.status === "CANCELLED") {
          clearInterval(interval);
          setJobError("Job cancelled and credits refunded.");
        }
      } catch (e: any) {
        clearInterval(interval);
        setJobStatus("FAILED");
        setJobError("Lost connection to job status endpoint.");
      }
    }, 900);
  };

  const handleCancel = async () => {
    if (!activeJobId) return;
    try {
      await api.post(`/jobs/${activeJobId}/cancel`);
      setJobStatus("CANCELLED");
      setJobStage("Cancelled by user");
    } catch {
      // Ignored
    }
  };

  const handleCopyPrompt = () => {
    if (!activeImageResult?.prompt) return;
    navigator.clipboard.writeText(activeImageResult.prompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleRemix = (item: GenerationRecord) => {
    setPrompt(item.prompt);
    if (item.negative_prompt) {
      setNegativePrompt(item.negative_prompt);
      setShowNegative(true);
    }
    if (item.seed) setSeed(item.seed.toString());
    if (item.width) setWidth(item.width);
    if (item.height) setHeight(item.height);
    setActiveTab("generate");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleGenerate();
    }
  };

  const handleSendToImg2Img = (imgUrl: string) => {
    setSourceImagePreview(imgUrl);
    setMode("img2img");
  };

  const handleAddLayerFromActive = () => {
    if (!activeImageResult) return;
    addLayer({
      id: `layer-${Date.now()}`,
      type: "raster",
      name: `Diffusion Output #${layers.length + 1}`,
      visible: true,
      locked: false,
      opacity: 1.0,
      zIndex: layers.length,
      transform: { x: 0, y: 0, width: activeImageResult.width || 512, height: activeImageResult.height || 512, rotation: 0 },
      content: { url: activeImageResult.url },
    });
    setActiveTab("layers");
  };

  return (
    <div className="flex h-screen w-screen bg-raven-800 text-seagrass-50 flex-col font-sans overflow-hidden select-none">
      {/* ---------------------------------------------------------------------- */}
      {/* 1. TOP APPLICATION BAR                                                 */}
      {/* ---------------------------------------------------------------------- */}
      <header className="h-14 border-b border-raven-700 bg-raven-850 px-4 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-6">
          <BrandLogo size="sm" />

          {/* Project Title Editor */}
          <div className="hidden sm:flex items-center gap-2 pl-4 border-l border-raven-700">
            {isEditingProjectName ? (
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                onBlur={() => setIsEditingProjectName(false)}
                onKeyDown={(e) => e.key === "Enter" && setIsEditingProjectName(false)}
                autoFocus
                className="bg-raven-950 border border-apricot-500 rounded px-2 py-0.5 text-xs text-seagrass-50 font-mono focus:outline-none"
              />
            ) : (
              <button
                onClick={() => setIsEditingProjectName(true)}
                className="text-xs font-mono text-seagrass-300 hover:text-seagrass-50 transition-colors flex items-center gap-1.5"
                title="Click to rename project"
              >
                <span>{projectName}</span>
                <span className="text-[10px] text-seagrass-500 font-sans">(edit)</span>
              </button>
            )}
          </div>
        </div>

        {/* Center Remote Worker Status Indicator */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTelemetryOpen(true)}
            className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-raven-750 hover:bg-raven-700 border border-seagrass-400/20 text-xs font-mono text-seagrass-200 transition-colors"
            title="Inspect Remote Compute Worker Status"
          >
            <span className="w-2 h-2 rounded-full bg-semantic-success animate-pulse" />
            <span className="hidden md:inline text-seagrass-400">WORKER:</span>
            <span className="text-seagrass-100 font-medium">NVIDIA Tesla T4</span>
            <span className="text-seagrass-500 hidden sm:inline">|</span>
            <span className="text-apricot-400 font-semibold hidden sm:inline">SD 1.5 Online</span>
          </button>
        </div>

        {/* Right User & Actions */}
        <div className="flex items-center gap-3">
          {/* Credits remaining pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-raven-750 border border-raven-700 text-xs font-mono">
            <Sparkles className="w-3.5 h-3.5 text-apricot-500" />
            <span className="text-seagrass-300 font-semibold">{user?.credits_remaining ?? 50}</span>
            <span className="text-seagrass-500 text-[11px]">Credits</span>
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-8 h-8 rounded-lg bg-raven-700 hover:bg-raven-600 border border-seagrass-400/20 flex items-center justify-center text-seagrass-100 text-xs font-mono transition-colors"
            >
              {user?.full_name ? user.full_name.charAt(0).toUpperCase() : <User className="w-4 h-4 text-seagrass-300" />}
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-raven-900 border border-raven-700 shadow-modal p-2 z-50 text-xs">
                <div className="px-3 py-2 border-b border-raven-800">
                  <div className="font-semibold text-seagrass-50 truncate">{user?.full_name || "Creator"}</div>
                  <div className="text-seagrass-400 text-[11px] font-mono truncate">{user?.email || "creator@reve.ai"}</div>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      setTelemetryOpen(true);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-seagrass-300 hover:text-seagrass-50 hover:bg-raven-800 flex items-center gap-2"
                  >
                    <Server className="w-3.5 h-3.5 text-apricot-500" />
                    <span>Worker Telemetry</span>
                  </button>
                  <Link
                    to="/"
                    className="w-full text-left px-3 py-2 rounded-lg text-seagrass-300 hover:text-seagrass-50 hover:bg-raven-800 flex items-center gap-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-seagrass-400" />
                    <span>Landing Overview</span>
                  </Link>
                </div>
                <div className="pt-1 border-t border-raven-800">
                  <button
                    onClick={() => {
                      logout();
                      navigate("/");
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-[#EF4444] hover:bg-[#EF4444]/10 flex items-center gap-2 font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ---------------------------------------------------------------------- */}
      {/* 2. MAIN WORKSPACE CONTAINER                                            */}
      {/* ---------------------------------------------------------------------- */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT TOOLBAR */}
        <aside className="w-14 bg-raven-850 border-r border-raven-700 flex flex-col items-center py-3 gap-2 shrink-0 z-20">
          <button
            onClick={() => setActiveTab("generate")}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              activeTab === "generate"
                ? "bg-apricot-500 text-raven-950 shadow-glow font-bold"
                : "text-seagrass-400 hover:text-seagrass-50 hover:bg-raven-700"
            }`}
            title="Generate (Text & Image Diffusion)"
          >
            <Wand2 className="w-5 h-5" />
          </button>

          <button
            onClick={() => setActiveTab("layers")}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all relative ${
              activeTab === "layers"
                ? "bg-apricot-500 text-raven-950 shadow-glow font-bold"
                : "text-seagrass-400 hover:text-seagrass-50 hover:bg-raven-700"
            }`}
            title="Canvas Layers & Composition"
          >
            <Layers className="w-5 h-5" />
            {layers.length > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-apricot-500 border border-raven-850" />
            )}
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              activeTab === "history"
                ? "bg-apricot-500 text-raven-950 shadow-glow font-bold"
                : "text-seagrass-400 hover:text-seagrass-50 hover:bg-raven-700"
            }`}
            title="Generation History Vault"
          >
            <History className="w-5 h-5" />
          </button>

          <div className="my-auto" />

          {/* Toggle Right Settings Panel */}
          <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              settingsOpen
                ? "text-apricot-500 bg-raven-750 border border-apricot-500/30"
                : "text-seagrass-400 hover:text-seagrass-50 hover:bg-raven-700"
            }`}
            title="Toggle Parameter Inspector"
          >
            <Sliders className="w-5 h-5" />
          </button>
        </aside>

        {/* ------------------------------------------------------------------ */}
        {/* CENTER VIEWPORT / CREATIVE CANAVS                                  */}
        {/* ------------------------------------------------------------------ */}
        <main className="flex-1 flex flex-col overflow-hidden bg-raven-800 relative">
          {/* Main Visual Stage Area */}
          <div className="flex-1 flex items-center justify-center p-6 overflow-auto relative">
            {/* Generation Progress Overlay */}
            {(jobStatus === "QUEUED" || jobStatus === "PROCESSING") && (
              <div className="absolute inset-0 bg-raven-950/75 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6">
                <div className="w-full max-w-md rounded-2xl bg-raven-900 border border-raven-700 p-6 shadow-modal space-y-4 text-center">
                  <div className="w-12 h-12 rounded-full border-3 border-apricot-500 border-t-transparent animate-spin mx-auto" />
                  
                  <div>
                    <h3 className="text-base font-semibold text-seagrass-50 font-sans">
                      {jobStatus === "QUEUED" ? "Dispatching to Colab T4..." : "Denoising Raster Latents..."}
                    </h3>
                    <p className="mt-1 text-xs text-seagrass-300 font-mono">
                      {jobStage || "Stable Diffusion 1.5 pipeline active"}
                    </p>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="w-full h-2 rounded-full bg-raven-800 overflow-hidden border border-raven-700">
                      <div
                        className="h-full bg-gradient-to-r from-apricot-500 to-apricot-400 transition-all duration-300"
                        style={{ width: `${Math.max(jobProgress, 12)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] font-mono text-seagrass-400">
                      <span>PROGRESS</span>
                      <span>{jobProgress}%</span>
                    </div>
                  </div>

                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 rounded-lg bg-raven-800 hover:bg-[#EF4444]/20 border border-raven-700 hover:border-[#EF4444]/40 text-[#EF4444] text-xs font-mono transition-colors"
                  >
                    Cancel Inference & Refund Credit
                  </button>
                </div>
              </div>
            )}

            {/* Error Notification */}
            {jobError && (
              <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 max-w-lg w-full px-4">
                <div className="p-4 rounded-xl bg-raven-900 border border-[#EF4444]/50 shadow-modal flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-[#EF4444] shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs text-seagrass-200">
                    <div className="font-semibold text-[#EF4444]">Generation Error</div>
                    <p className="mt-0.5">{jobError}</p>
                  </div>
                  <button
                    onClick={() => setJobError(null)}
                    className="text-seagrass-400 hover:text-seagrass-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Stage View: If active image exists */}
            {activeImageResult ? (
              <div className="flex flex-col items-center justify-center max-w-full max-h-full">
                <div
                  className={`relative rounded-xl overflow-hidden border border-raven-700 bg-raven-900 shadow-modal transition-all ${
                    zoomLevel === "fit"
                      ? "max-h-[55vh] max-w-[55vw]"
                      : zoomLevel === "100"
                      ? "w-[512px] h-[512px]"
                      : "w-[768px] h-[768px]"
                  }`}
                >
                  <img
                    src={activeImageResult.url}
                    alt="Generated Diffusion Art"
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Canvas Floating Toolbar */}
                <div className="mt-4 flex flex-wrap items-center justify-center gap-3 bg-raven-900/90 backdrop-blur px-4 py-2 rounded-xl border border-raven-700 shadow-surface text-xs font-mono">
                  <span className="text-seagrass-300">
                    {activeImageResult.width || width}×{activeImageResult.height || height}px
                  </span>
                  <span className="text-seagrass-500">|</span>
                  <span className="text-apricot-400 font-semibold">{activeImageResult.model_id || "SD-1.5"}</span>

                  {/* Zoom controls */}
                  <div className="flex items-center gap-1 pl-2 border-l border-raven-700">
                    <button
                      onClick={() => setZoomLevel("fit")}
                      className={`px-2 py-0.5 rounded ${zoomLevel === "fit" ? "bg-raven-700 text-seagrass-50" : "text-seagrass-400"}`}
                    >
                      Fit
                    </button>
                    <button
                      onClick={() => setZoomLevel("100")}
                      className={`px-2 py-0.5 rounded ${zoomLevel === "100" ? "bg-raven-700 text-seagrass-50" : "text-seagrass-400"}`}
                    >
                      1:1
                    </button>
                    <button
                      onClick={() => setZoomLevel("150")}
                      className={`px-2 py-0.5 rounded ${zoomLevel === "150" ? "bg-raven-700 text-seagrass-50" : "text-seagrass-400"}`}
                    >
                      1.5x
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pl-2 border-l border-raven-700">
                    <a
                      href={activeImageResult.url}
                      download={`reve-diffusion-${Date.now()}.png`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded hover:bg-raven-750 text-seagrass-200 hover:text-seagrass-50 transition-colors"
                      title="Download Lossless PNG"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    <button
                      onClick={() => handleSendToImg2Img(activeImageResult.url)}
                      className="p-1.5 rounded hover:bg-raven-750 text-seagrass-200 hover:text-apricot-400 transition-colors"
                      title="Use as Image-to-Image Source"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleAddLayerFromActive}
                      className="p-1.5 rounded hover:bg-raven-750 text-seagrass-200 hover:text-apricot-400 transition-colors"
                      title="Send to Canvas Layers"
                    >
                      <Layers className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleCopyPrompt}
                      className="p-1.5 rounded hover:bg-raven-750 text-seagrass-200 hover:text-apricot-400 transition-colors"
                      title="Copy Prompt"
                    >
                      {copiedPrompt ? <Check className="w-4 h-4 text-semantic-success" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Empty Canvas State */
              <div className="max-w-md text-center p-8 rounded-2xl border border-dashed border-raven-600 bg-raven-900/40">
                <div className="w-12 h-12 rounded-xl bg-raven-750 border border-raven-700 flex items-center justify-center text-apricot-500 mx-auto mb-4">
                  <Wand2 className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-seagrass-50 font-sans">
                  The Canvas is Ready
                </h3>
                <p className="mt-2 text-xs text-seagrass-300 leading-relaxed">
                  Compose a descriptive prompt below or choose an architectural preset to begin generating genuine diffusion rasters.
                </p>

                {/* Quick inspiration chips */}
                <div className="mt-6 space-y-2 text-left">
                  <div className="text-[11px] font-mono uppercase text-seagrass-400">
                    Prompt Inspiration
                  </div>
                  {[
                    "Bioluminescent botanical glasshouse at dusk, photorealistic, intricate refractive lighting",
                    "Matte black mechanical camera with exposed brass dials, studio product photography",
                    "Minimalist brutalist concrete villa cantilevered over dark turquoise ocean",
                  ].map((idea, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setPrompt(idea);
                        promptInputRef.current?.focus();
                      }}
                      className="w-full text-left p-2 rounded-lg bg-raven-800 hover:bg-raven-750 border border-raven-700 text-xs text-seagrass-200 truncate transition-colors flex items-center justify-between"
                    >
                      <span className="truncate">{idea}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-apricot-500 shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ------------------------------------------------------------------ */}
          {/* BOTTOM PROMPT COMPOSER                                             */}
          {/* ------------------------------------------------------------------ */}
          <div className="p-4 bg-raven-850 border-t border-raven-700 shrink-0 z-20">
            <div className="max-w-4xl mx-auto space-y-2.5">
              {/* Negative prompt drawer */}
              {showNegative && (
                <div className="flex items-center gap-2 bg-raven-900 p-2 rounded-lg border border-raven-700 text-xs font-mono">
                  <span className="text-apricot-500 font-semibold uppercase text-[10px] shrink-0">
                    Negative &gt;
                  </span>
                  <input
                    type="text"
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="blurry, distorted, bad anatomy, artifacts, text, watermark..."
                    className="flex-1 bg-transparent border-none text-seagrass-100 placeholder-seagrass-500 focus:outline-none text-xs"
                  />
                  <button
                    onClick={() => setShowNegative(false)}
                    className="text-seagrass-500 hover:text-seagrass-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Main Prompt Bar Container */}
              <div className="rounded-xl border border-raven-600 bg-raven-900 p-2 shadow-modal flex flex-col md:flex-row items-stretch md:items-end gap-3 focus-within:border-apricot-500/60 transition-colors">
                {/* Source Thumbnail for Img2Img */}
                {mode === "img2img" && sourceImagePreview && (
                  <div className="relative w-14 h-14 rounded-lg overflow-hidden border border-apricot-500/50 shrink-0 group">
                    <img
                      src={sourceImagePreview}
                      alt="Source"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={clearSourceImage}
                      className="absolute inset-0 bg-raven-950/70 text-[#EF4444] opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                      title="Remove source image"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Textarea */}
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center justify-between text-[11px] font-mono text-seagrass-400 mb-1 px-1">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setMode("text2img")}
                        className={`font-semibold transition-colors ${mode === "text2img" ? "text-apricot-500" : "hover:text-seagrass-200"}`}
                      >
                        Text-to-Image
                      </button>
                      <span>/</span>
                      <button
                        onClick={() => {
                          setMode("img2img");
                          if (!sourceImagePreview) fileInputRef.current?.click();
                        }}
                        className={`font-semibold transition-colors ${mode === "img2img" ? "text-apricot-500" : "hover:text-seagrass-200"}`}
                      >
                        Image-to-Image
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {!showNegative && (
                        <button
                          onClick={() => setShowNegative(true)}
                          className="hover:text-apricot-400 transition-colors"
                        >
                          + Negative Prompt
                        </button>
                      )}
                      <span>·</span>
                      <span className="hidden sm:inline">Ctrl+Enter to Run</span>
                    </div>
                  </div>

                  <textarea
                    ref={promptInputRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={2}
                    placeholder={
                      mode === "text2img"
                        ? "Describe an image in rich detail (e.g. subject, lighting, composition, optics)..."
                        : "Describe the transformation or style changes for the uploaded source image..."
                    }
                    className="w-full bg-transparent border-none text-seagrass-50 placeholder-seagrass-500 text-sm focus:outline-none resize-none font-sans px-1"
                  />
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 self-end">
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleSourceUpload}
                    className="hidden"
                  />

                  {mode === "img2img" && !sourceImagePreview && (
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingSource}
                      className="px-3 py-2.5 rounded-lg bg-raven-800 hover:bg-raven-750 border border-raven-700 text-xs font-mono text-seagrass-200 flex items-center gap-1.5"
                    >
                      <Upload className="w-3.5 h-3.5 text-apricot-500" />
                      <span>{isUploadingSource ? "Uploading..." : "Upload Source"}</span>
                    </button>
                  )}

                  <button
                    onClick={handleGenerate}
                    disabled={!prompt.trim() || jobStatus === "QUEUED" || jobStatus === "PROCESSING"}
                    className="px-6 py-2.5 rounded-lg bg-apricot-500 hover:bg-apricot-400 active:bg-apricot-600 disabled:opacity-50 text-raven-950 font-semibold text-sm transition-all shadow-glow flex items-center gap-2"
                  >
                    <span>Generate</span>
                    <Sparkles className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* ------------------------------------------------------------------ */}
        {/* RIGHT CONTEXTUAL SETTINGS DRAWER (Progressive Disclosure)          */}
        {/* ------------------------------------------------------------------ */}
        {settingsOpen && (
          <aside className="w-80 bg-raven-850 border-l border-raven-700 flex flex-col justify-between p-5 overflow-y-auto shrink-0 z-20">
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-raven-700">
                <span className="text-xs font-mono uppercase tracking-wider text-seagrass-200 font-semibold">
                  Generation Controls
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-apricot-500/10 text-apricot-400 border border-apricot-500/30">
                  SD 1.5 Pipeline
                </span>
              </div>

              {/* Model Selection */}
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase text-seagrass-300">
                  Active Diffusion Model
                </label>
                <div className="space-y-1.5">
                  <div className="p-3 rounded-xl bg-raven-800 border border-apricot-500/60 shadow-surface flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-seagrass-50 font-sans">
                        Stable Diffusion 1.5
                      </span>
                      <span className="text-[10px] font-mono text-semantic-success px-1.5 py-0.2 rounded bg-semantic-success/10 border border-semantic-success/20">
                        ONLINE (Colab T4)
                      </span>
                    </div>
                    <span className="text-[11px] text-seagrass-400">
                      runwayml/stable-diffusion-v1-5
                    </span>
                  </div>

                  {/* Planned / Disabled Models for Transparency */}
                  <div className="p-2.5 rounded-lg bg-raven-900/60 border border-raven-700/60 opacity-60 flex items-center justify-between text-xs text-seagrass-400">
                    <span>FLUX.1-dev</span>
                    <span className="text-[10px] font-mono">24GB VRAM (Offline)</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-raven-900/60 border border-raven-700/60 opacity-60 flex items-center justify-between text-xs text-seagrass-400">
                    <span>SDXL 1.0</span>
                    <span className="text-[10px] font-mono">12GB VRAM (Offline)</span>
                  </div>
                </div>
              </div>

              {/* Dimensions Presets */}
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase text-seagrass-300">
                  Resolution & Aspect Ratio
                </label>
                <div className="grid grid-cols-3 gap-1.5 text-xs font-mono">
                  <button
                    onClick={() => {
                      setWidth(512);
                      setHeight(512);
                    }}
                    className={`py-2 rounded-lg border text-center transition-all ${
                      width === 512 && height === 512
                        ? "bg-raven-700 border-apricot-500 text-seagrass-50 font-semibold"
                        : "bg-raven-800 border-raven-700 text-seagrass-400 hover:text-seagrass-200"
                    }`}
                  >
                    <div>1:1</div>
                    <div className="text-[10px] text-seagrass-500">512×512</div>
                  </button>

                  <button
                    onClick={() => {
                      setWidth(768);
                      setHeight(512);
                    }}
                    className={`py-2 rounded-lg border text-center transition-all ${
                      width === 768 && height === 512
                        ? "bg-raven-700 border-apricot-500 text-seagrass-50 font-semibold"
                        : "bg-raven-800 border-raven-700 text-seagrass-400 hover:text-seagrass-200"
                    }`}
                  >
                    <div>3:2</div>
                    <div className="text-[10px] text-seagrass-500">768×512</div>
                  </button>

                  <button
                    onClick={() => {
                      setWidth(512);
                      setHeight(768);
                    }}
                    className={`py-2 rounded-lg border text-center transition-all ${
                      width === 512 && height === 768
                        ? "bg-raven-700 border-apricot-500 text-seagrass-50 font-semibold"
                        : "bg-raven-800 border-raven-700 text-seagrass-400 hover:text-seagrass-200"
                    }`}
                  >
                    <div>2:3</div>
                    <div className="text-[10px] text-seagrass-500">512×768</div>
                  </button>
                </div>
              </div>

              {/* Inference Steps */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-seagrass-300 uppercase">Inference Steps</span>
                  <span className="text-seagrass-50 font-semibold">{steps}</span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={50}
                  step={1}
                  value={steps}
                  onChange={(e) => setSteps(parseInt(e.target.value, 10))}
                  className="w-full accent-apricot-500 bg-raven-700 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-seagrass-500">
                  <span>15 (Draft)</span>
                  <span>25 (Standard)</span>
                  <span>50 (Max)</span>
                </div>
              </div>

              {/* Guidance Scale (CFG) */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-seagrass-300 uppercase">CFG Scale</span>
                  <span className="text-seagrass-50 font-semibold">{cfgScale.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min={1.0}
                  max={15.0}
                  step={0.5}
                  value={cfgScale}
                  onChange={(e) => setCfgScale(parseFloat(e.target.value))}
                  className="w-full accent-apricot-500 bg-raven-700 h-1.5 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Image-to-Image Strength (Conditional) */}
              {mode === "img2img" && (
                <div className="space-y-2 p-3 rounded-xl bg-raven-800 border border-apricot-500/30">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-apricot-400 uppercase font-semibold">Denoising Strength</span>
                    <span className="text-seagrass-50 font-semibold">{strength.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={0.1}
                    max={0.95}
                    step={0.05}
                    value={strength}
                    onChange={(e) => setStrength(parseFloat(e.target.value))}
                    className="w-full accent-apricot-500 bg-raven-700 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="text-[10px] font-mono text-seagrass-400">
                    Lower preserves structure; higher re-synthesizes.
                  </div>
                </div>
              )}

              {/* Seed Configuration */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-seagrass-300 uppercase">Seed</span>
                  <span className="text-seagrass-500">{seed ? `#${seed}` : "Random"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={seed}
                    onChange={(e) => setSeed(e.target.value)}
                    placeholder="Random seed"
                    className="flex-1 bg-raven-800 border border-raven-700 rounded-lg px-3 py-1.5 text-xs text-seagrass-50 font-mono focus:border-apricot-500 focus:outline-none"
                  />
                  <button
                    onClick={randomizeSeed}
                    className="p-2 rounded-lg bg-raven-800 hover:bg-raven-750 border border-raven-700 text-apricot-500 transition-colors"
                    title="Generate Random Seed"
                  >
                    <Dice5 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Status Tip */}
            <div className="pt-4 border-t border-raven-700 text-[11px] font-mono text-seagrass-400 flex items-center justify-between">
              <span>Cost: ₹0.00</span>
              <span className="text-semantic-success font-semibold">T4 Compute Active</span>
            </div>
          </aside>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* SLIDE-OUT HISTORY DRAWER                                           */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === "history" && (
          <div className="absolute inset-y-0 left-14 w-80 bg-raven-900 border-r border-raven-700 shadow-modal z-30 flex flex-col">
            <div className="p-4 border-b border-raven-700 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono uppercase font-semibold text-seagrass-50">
                <History className="w-4 h-4 text-apricot-500" />
                <span>Asset Vault ({history.length})</span>
              </div>
              <button
                onClick={() => setActiveTab("generate")}
                className="text-seagrass-400 hover:text-seagrass-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isLoadingHistory ? (
                <div className="text-center py-8 text-xs font-mono text-seagrass-400">
                  Loading generation history...
                </div>
              ) : history.length === 0 ? (
                <div className="text-center py-8 text-xs font-mono text-seagrass-400">
                  No generation history found.
                </div>
              ) : (
                history.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-raven-700 bg-raven-850 p-2.5 space-y-2 hover:border-apricot-500/40 transition-colors"
                  >
                    {item.images && item.images.length > 0 && (
                      <div
                        onClick={() => {
                          setActiveImageResult({
                            ...item.images[0],
                            prompt: item.prompt,
                            seed: item.seed,
                            model_id: item.model_id,
                          });
                          setActiveTab("generate");
                        }}
                        className="relative aspect-video rounded-lg overflow-hidden bg-raven-950 cursor-pointer group"
                      >
                        <img
                          src={item.images[0].url}
                          alt="History Artifact"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-raven-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xs font-mono text-seagrass-50">
                          Inspect Image
                        </div>
                      </div>
                    )}

                    <div className="text-xs text-seagrass-200 line-clamp-2 font-sans">
                      {item.prompt}
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-raven-800 text-[10px] font-mono text-seagrass-400">
                      <span>{item.model_id}</span>
                      <button
                        onClick={() => handleRemix(item)}
                        className="text-apricot-400 hover:underline"
                      >
                        Remix Settings
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------ */}
        {/* SLIDE-OUT CANVAS LAYERS DRAWER                                     */}
        {/* ------------------------------------------------------------------ */}
        {activeTab === "layers" && (
          <div className="absolute inset-y-0 left-14 w-80 bg-raven-900 border-r border-raven-700 shadow-modal z-30 flex flex-col">
            <div className="p-4 border-b border-raven-700 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono uppercase font-semibold text-seagrass-50">
                <Layers className="w-4 h-4 text-apricot-500" />
                <span>Composition Layers ({layers.length})</span>
              </div>
              <button
                onClick={() => setActiveTab("generate")}
                className="text-seagrass-400 hover:text-seagrass-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {layers.length === 0 ? (
                <div className="text-center py-8 text-xs font-mono text-seagrass-400">
                  No canvas layers created yet. Generate an image and click "Send to Canvas Layers".
                </div>
              ) : (
                layers.map((layer, idx) => (
                  <div
                    key={layer.id}
                    className="p-3 rounded-xl border border-raven-700 bg-raven-850 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-apricot-500 font-bold">#{idx + 1}</span>
                      <span className="text-seagrass-100 font-medium truncate max-w-[150px]">
                        {layer.name}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-seagrass-400 uppercase">
                      {layer.type}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* 3. WORKER TELEMETRY MODAL                                              */}
      {/* ---------------------------------------------------------------------- */}
      {telemetryOpen && (
        <div className="fixed inset-0 bg-raven-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-lg w-full rounded-2xl bg-raven-900 border border-raven-700 p-6 shadow-modal space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-raven-700">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-apricot-500" />
                <h3 className="text-base font-semibold text-seagrass-50 font-sans">
                  Remote GPU Worker Telemetry
                </h3>
              </div>
              <button
                onClick={() => setTelemetryOpen(false)}
                className="text-seagrass-400 hover:text-seagrass-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between py-1.5 border-b border-raven-800">
                <span className="text-seagrass-400">WORKER IDENTIFIER:</span>
                <span className="text-seagrass-50 font-semibold">reve-colab-t4-01</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-raven-800">
                <span className="text-seagrass-400">HARDWARE ACCELERATOR:</span>
                <span className="text-seagrass-50 font-semibold">NVIDIA Tesla T4</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-raven-800">
                <span className="text-seagrass-400">VRAM CAPACITY / FREE:</span>
                <span className="text-semantic-success font-semibold">15.0 GB / 14.2 GB</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-raven-800">
                <span className="text-seagrass-400">CHECKPOINT:</span>
                <span className="text-apricot-400 font-semibold">runwayml/stable-diffusion-v1-5</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-raven-800">
                <span className="text-seagrass-400">CONNECTION TOPOLOGY:</span>
                <span className="text-seagrass-200">Outbound Polling (HTTP 204 Long-Poll)</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-raven-800">
                <span className="text-seagrass-400">AUTHENTICATION:</span>
                <span className="text-seagrass-200">Constant-Time SHA-256 Token Verify</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setTelemetryOpen(false)}
                className="px-4 py-2 rounded-lg bg-raven-800 hover:bg-raven-750 border border-raven-700 text-xs font-mono text-seagrass-200"
              >
                Close Telemetry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
